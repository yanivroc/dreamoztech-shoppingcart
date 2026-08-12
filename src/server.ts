import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

const ALLOWED_IMAGE_HOSTS = /(^|\.)blob\.vercel-storage\.com$/i;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleImageProxy(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/image") return null;

  const src = url.searchParams.get("src");
  if (!src || !/^https?:\/\//i.test(src)) {
    return new Response("Invalid image source", { status: 400 });
  }

  let srcUrl: URL;
  try {
    srcUrl = new URL(src);
  } catch {
    return new Response("Invalid image source", { status: 400 });
  }

  const headers = new Headers();
  headers.set("accept", request.headers.get("accept") ?? "*/*");

  // Private Vercel Blob URLs are not publicly readable: attach the store token
  // server-side. Read env inside the handler (injected per request on Workers).
  if (ALLOWED_IMAGE_HOSTS.test(srcUrl.hostname)) {
    const token =
      src.match(/(vercel_blob_[A-Za-z0-9_-]+)/i)?.[1] ??
      process.env.VERCEL_BLOB_TOKEN?.trim() ??
      process.env.VITE_VERCEL_BLOB_TOKEN?.trim();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }


  async function load(target: string): Promise<Response | null> {
    try {
      return await fetch(target, { method: "GET", headers, redirect: "follow" });
    } catch (error) {
      console.error("Image proxy fetch failed:", error);
      return null;
    }
  }

  let fetched = await load(src);
  if (!fetched) return new Response("Failed to fetch image", { status: 502 });

  // Some records point at a `_thumbnail_` variant that was never uploaded;
  // fall back to the full-size object instead of showing a broken image.
  if (fetched.status === 404 && src.includes("_thumbnail_")) {
    const fallback = await load(src.replace("_thumbnail_", "_"));
    if (fallback && fallback.ok) fetched = fallback;
  }

  const responseHeaders = new Headers();
  const contentType = fetched.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  responseHeaders.set("cache-control", "public, max-age=86400");

  return new Response(fetched.body, {
    status: fetched.status,
    headers: responseHeaders,
  });

}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const proxyResponse = await handleImageProxy(request);
      if (proxyResponse) return proxyResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
