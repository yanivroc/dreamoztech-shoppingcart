import { createFileRoute } from "@tanstack/react-router";

const PATHS = ["/Member/Get", "/Member/Products", "/Member/Posts"];

// Cache-refresh endpoint. Upstream API responses are cached indefinitely, so this
// is the only way to pull fresh data. Requires the CACHE_BUST_TOKEN shared secret,
// passed as ?token=... or an `x-cache-bust-token` header.
async function bust(token: string | null, redirect: string | null) {
  const { clearDreamozCache, isValidBustToken } = await import("@/lib/dreamoz.server");

  if (!isValidBustToken(token)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid or missing token" }), {
      status: 401,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  await clearDreamozCache(PATHS);

  if (redirect) {
    return new Response(null, {
      status: 302,
      headers: { location: redirect, "cache-control": "no-store" },
    });
  }
  return new Response(
    JSON.stringify({ ok: true, cleared: PATHS, clearedAt: new Date().toISOString() }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } },
  );
}

function readToken(request: Request, url: URL): string | null {
  return url.searchParams.get("token") ?? request.headers.get("x-cache-bust-token");
}

export const Route = createFileRoute("/api/public/bustcache")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const redirect = url.searchParams.get("redirect");
        return bust(
          readToken(request, url),
          redirect && redirect.startsWith("/") ? redirect : "/",
        );
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        return bust(readToken(request, url), null);
      },
    },
  },
});
