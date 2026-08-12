import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_IMAGE_HOSTS = /(^|\.)blob\.vercel-storage\.com$/i;

export const Route = createFileRoute("/image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
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

        // Private Vercel Blob objects require the store token; keep it server-side.
        if (ALLOWED_IMAGE_HOSTS.test(srcUrl.hostname)) {
          const token =
            src.match(/(vercel_blob_[A-Za-z0-9_-]+)/i)?.[1] ??
            process.env.VERCEL_BLOB_TOKEN?.trim() ??
            process.env.VITE_VERCEL_BLOB_TOKEN?.trim();
          if (token) {
            headers.set("authorization", `Bearer ${token}`);
          }
        }

        let fetched: Response;
        try {
          fetched = await fetch(src, {
            method: "GET",
            headers,
            redirect: "follow",
          });
        } catch (error) {
          console.error("Image proxy fetch failed:", error);
          return new Response("Failed to fetch image", { status: 502 });
        }

        if (!fetched.ok) {
          console.error(`Image proxy upstream ${fetched.status} for ${srcUrl.hostname}`);
          return new Response("Image unavailable", { status: fetched.status === 404 ? 404 : 502 });
        }

        const responseHeaders = new Headers();
        const contentType = fetched.headers.get("content-type");
        if (contentType) {
          responseHeaders.set("content-type", contentType);
        }
        responseHeaders.set("cache-control", "public, max-age=86400");

        return new Response(fetched.body, {
          status: 200,
          headers: responseHeaders,
        });
      },
    },
  },
});
