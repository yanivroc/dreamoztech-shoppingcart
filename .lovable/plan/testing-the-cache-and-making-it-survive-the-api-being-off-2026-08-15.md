# Testing the cache — and making it survive the API being off

## Short answer

Turning the Azure API off is a valid test, but with the cache as it stands today it will only pass sometimes:

- The cache lives in **memory of the running server instance**, plus the platform HTTP cache when the host provides one (Cloudflare does; Vercel's Node/Edge runtime does not expose `caches.default`).
- So on Vercel: as long as the same warm instance keeps serving, pages load from cache with the API off. As soon as Vercel spins up a fresh instance (deploy, idle scale-down, new region), the cache is empty and the page fails because the API is unreachable.

That makes "switch the API off and browse" an unreliable pass/fail signal, and it can show a broken site to real visitors.

## What to build

### 1. A cache status endpoint (safe test without touching the API)

New token-protected route `/api/public/cachestatus?token=CACHE_BUST_TOKEN`, returning per path (`/Member/Get`, `/Member/Products`, `/Member/Posts`):

- whether it is in memory, in the shared HTTP cache, or missing
- when it was first cached
- whether a shared HTTP cache exists in this runtime at all

Test flow: bust the cache, load the home page, then hit the status endpoint. All three paths cached = the site is serving from cache and not hitting SQL.

### 2. Prove no upstream calls happen

Add an internal counter of upstream fetches (`hits`, `misses`, `upstreamFetches`) reported by the same endpoint. Load the home page several times and confirm `upstreamFetches` does not increase — this is the real proof the SQL database isn't being touched, and it needs no downtime.

### 3. A durable snapshot so the API can genuinely be off

Persist the last good response so a cold instance can still serve without the API:

- Recommended: store the snapshot in Lovable Cloud (a small `api_cache` table keyed by path). Survives deploys, cold starts and instance churn, and works on both Vercel and Lovable hosting. This needs Lovable Cloud enabled.
- If you would rather not add a backend, the fallback is a build-time JSON snapshot committed with the app — free and instant, but only refreshes on redeploy.

### 4. Serve stale rather than error

If the upstream call fails (API off, 500, timeout), fall back to memory, then shared cache, then the durable snapshot, and only show an error if all are empty. Today a cold instance with the API off throws.

## Technical notes

- `src/lib/dreamoz.server.ts`: add fetch/hit counters and metadata (`cachedAt`) alongside the cached payload, a `getCacheStatus()` helper, and a try/catch in `dreamozGet` that returns the last known good value on upstream failure.
- New `src/routes/api/public/cachestatus.ts`, reusing `isValidBustToken` for auth, `cache-control: no-store`, no upstream data in the response body (counts and timestamps only).
- Durable layer sits behind the existing two layers, so `clearDreamozCache` must clear it too (bust then refill on the next request).

## Suggested test after this ships

1. `GET /api/public/bustcache?token=…` — clears everything.
2. Load `/` — first load fetches upstream once.
3. `GET /api/public/cachestatus?token=…` — all three paths cached, `upstreamFetches: 3`.
4. Reload `/` a few times, re-check status — `upstreamFetches` unchanged.
5. Only then, if you still want the end-to-end proof, turn the API off and reload; with the durable layer in place this now works even on a fresh instance.
