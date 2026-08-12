# Make Azure API calls resilient to stale tokens

## What's happening

The API credentials are fine: a live check just now returned a token (200) and all three member endpoints (`/Member/Get`, `/Member/Products`, `/Member/Posts`) returned 200 with real data. So the earlier `failed: 400` errors in the preview were not a credential problem.

The likely cause is the in-memory token cache. The app fetches a token and reuses it for 10 minutes. If the Azure API restarts or invalidates that token sooner (a common behaviour on Azure App Service), every request keeps sending the dead token until the 10 minutes run out — and the API rejects it, which surfaces as a 400. There is currently no retry.

Note: this cause is inferred from the code and the fact that the same calls now succeed unchanged; it is not directly confirmed from an upstream error body.

## What to change

1. On a failed member request (status 400/401/403), clear the cached token, fetch a fresh one, and retry the request once. If the retry also fails, surface the error as today.
2. Shorten the token cache lifetime slightly and refresh a little before expiry so a borderline-expired token is not sent.
3. Include the upstream response body text in the thrown error message so future failures say *why* the API rejected the call instead of just the status code.

## Technical details

- Single file: `src/lib/dreamoz.server.ts`.
- `getToken(force?: boolean)` gains an option to bypass/reset `cached`.
- `dreamozGet(path)` wraps its fetch: on `!res.ok` with 400/401/403, call `getToken(true)` and re-issue once.
- Error messages become `${path} failed: ${status} ${bodySnippet}`.
- No UI, route, or secret changes; nothing else in the app is touched.
