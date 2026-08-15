import { createFileRoute } from "@tanstack/react-router";

const PATHS = ["/Member/Get", "/Member/Products", "/Member/Posts"];

// Cache diagnostics. Token-gated (same CACHE_BUST_TOKEN as /api/public/bustcache),
// passed as ?token=... or an `x-cache-bust-token` header. Returns only counters
// and timestamps — never upstream data.
async function status(token: string | null) {
  const { getCacheStatus, isValidBustToken } = await import("@/lib/dreamoz.server");

  if (!isValidBustToken(token)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid or missing token" }), {
      status: 401,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  const result = await getCacheStatus(PATHS);
  return new Response(JSON.stringify({ ok: true, ...result }, null, 2), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function readToken(request: Request, url: URL): string | null {
  return url.searchParams.get("token") ?? request.headers.get("x-cache-bust-token");
}

export const Route = createFileRoute("/api/public/cachestatus")({
  server: {
    handlers: {
      GET: async ({ request }) => status(readToken(request, new URL(request.url))),
    },
  },
});
