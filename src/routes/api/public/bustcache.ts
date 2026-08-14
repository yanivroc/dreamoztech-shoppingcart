import { createFileRoute } from "@tanstack/react-router";

const PATHS = ["/Member/Get", "/Member/Products", "/Member/Posts"];

// Public cache-refresh endpoint: clears the cached upstream API responses so the
// next page view fetches fresh data. Read-only side effects (cache eviction only),
// so no secret is required — worst case someone triggers one extra upstream fetch.
async function bust(redirect: string | null) {
  const { clearDreamozCache } = await import("@/lib/dreamoz.server");
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

export const Route = createFileRoute("/api/public/bustcache")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const redirect = url.searchParams.get("redirect");
        return bust(redirect && redirect.startsWith("/") ? redirect : "/");
      },
      POST: async () => bust(null),
    },
  },
});
