# Make the site survive the API being switched off

## What happened

"Failed to load: Token fetch failed: 403" is the app's token request to the Azure API being rejected because the API is off. It worked "for a while" because the cache lives only in the memory of the running server instance: while that warm instance kept serving, pages came from cache. Once the platform started a fresh instance (idle scale-down, new region, redeploy), its cache was empty, the upstream call failed, there was no cached value to fall back to, and the error surfaced.

This is exactly the durable-snapshot piece we deliberately skipped earlier. Without it, "API off" will keep breaking at unpredictable moments.

## What to build

1. Durable snapshot layer (Lovable Cloud)
   - Enable Lovable Cloud and add a small `api_cache` table keyed by path, holding the last good payload plus a timestamp.
   - After a successful upstream fetch, write the snapshot; on a cold instance, read from it before ever calling the API.
   - Order of lookup: memory -> platform HTTP cache -> durable snapshot -> upstream API.
   - Cache busting with your token clears all three layers, then the next request refills them.

2. Never error when a snapshot exists
   - Any upstream failure (403, 500, timeout, API off) falls back through the layers and only errors when every layer is empty.
   - Token fetch failures also invalidate the cached access token so a restarted API doesn't get hit with a stale token.

3. Better failure surface
   - If truly nothing is cached, show a friendly "content temporarily unavailable" state instead of a raw error string.
   - `/api/public/cachestatus?token=...` gains a `durable` field per path so you can confirm the snapshot exists before switching the API off.

## Test after this ships

1. With the API on: `GET /api/public/bustcache?token=...`, load `/`, then check cachestatus — all three paths cached, `durable: true`.
2. Turn the API off, reload `/` — page still renders from the snapshot; `staleServed` increases, `upstreamFetches` does not.
3. Turn it back on and bust the cache to pull fresh data.

## Technical notes

- `src/lib/dreamoz.server.ts`: add `readDurable`/`writeDurable`/`clearDurable` helpers using the Cloud service-role client loaded inside the function, wire them into `dreamozGet`, `clearDreamozCache`, and `getCacheStatus`; clear the module-level token cache on token failure.
- Migration: `public.api_cache (path text primary key, payload jsonb, cached_at timestamptz)`, RLS on, no anon/authenticated grants — server-only access via the service role.
- `src/routes/index.tsx` / `$slug.tsx`: replace the raw `error.message` error component with a friendly fallback.

## Alternative if you'd rather not add a backend

Commit a build-time JSON snapshot of the three endpoints and read it as the last resort. Zero infrastructure, but it only refreshes when the app is redeployed.
