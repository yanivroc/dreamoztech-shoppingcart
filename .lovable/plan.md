# Make the site survive the API being switched off (build-time snapshot)

## What happened

"Failed to load: Token fetch failed: 403" is the app's token request to the Azure API being rejected because the API is off. It worked for a while because the cache lives only in the memory of the running server instance: while that warm instance kept serving, pages came from cache. Once a fresh instance started (idle scale-down, new region, redeploy), its cache was empty, the upstream call failed, there was nothing to fall back to, and the error surfaced.

Chosen fix: no backend — commit a JSON snapshot of the three endpoints and read it as the last resort.

## What to build

1. Snapshot file committed with the app
   - `src/data/api-snapshot.json` holding the raw responses for `/Member/Get`, `/Member/Products`, `/Member/Posts`, plus a `capturedAt` timestamp.
   - A script (`scripts/refresh-snapshot.ts`, run manually with the API on) fetches the three endpoints using the same credentials and rewrites the file. Refreshing the site's fallback data = re-run the script and redeploy.

2. Snapshot as the last cache layer
   - Lookup order becomes: memory -> platform HTTP cache -> upstream API -> committed snapshot.
   - The snapshot is only used when the upstream call fails and nothing is cached, so live data always wins; the page renders instead of erroring.
   - Cache busting with your token still clears the live layers; the snapshot is static and left alone.

3. Token cache correctness and friendlier errors
   - On a token failure, drop the cached access token so a restarted API isn't hit with a stale one.
   - `/api/public/cachestatus?token=...` reports `snapshotAvailable` and `capturedAt`, plus a `snapshotServed` counter so you can tell when the site is running on fallback data.
   - If a path is missing from the snapshot too, show a friendly "content temporarily unavailable" message rather than a raw error string.

## Test after this ships

1. With the API on: `GET /api/public/bustcache?token=...`, load `/`, check cachestatus — paths cached, `snapshotAvailable: true`.
2. Turn the API off and load `/` in a fresh session — page renders; `snapshotServed` (or `staleServed`) increases, `upstreamFetches` does not rise beyond the failed attempt.
3. Turn it back on, bust the cache — live data returns.

## Trade-offs

- Fallback data is only as fresh as the last snapshot refresh + redeploy.
- The snapshot is committed to the repo, so it must contain only publicly visible catalogue data (products, posts, member profile) — no private fields.

## Technical notes

- `src/lib/dreamoz.server.ts`: import the JSON snapshot, add `readSnapshot(path)`, use it in the `catch` branch of `dreamozGet` after memory/HTTP-cache lookups, reset the token cache on token errors, and extend `getCacheStatus`.
- `scripts/refresh-snapshot.ts`: reads `DT_API_KEY`, `DT_API_SECRET`, `DT_API_BASE_URL` from the environment, writes formatted JSON.
- `src/routes/index.tsx` and `src/routes/$slug.tsx`: replace the raw `error.message` error component with a friendly fallback.
