# Import dreamoztech-lovable and fix private Vercel Blob images

## Goal

Bring the dreamoztech app into this Lovable project, point it at the new API host, and make the private Vercel Blob images (`*.private.blob.vercel-storage.com`) render instead of returning Forbidden.

## Important constraint (read first)

The GitHub repo could not be read from here (clone blocked in planning; it may also be private). Two things follow:

1. I need repo access — either make it public, or paste/upload a zip of the source. Until then the import step can't start.
2. This Lovable project runs on TanStack Start (React + Vite). If the repo is a Next.js app, files can't be copied over as-is: pages, API routes and server code get ported to TanStack routes/server functions. I'll port screen by screen rather than one big lift-and-shift, starting with the Posts/pics screens that show the blob images.

## Why the images fail

Private Vercel Blob URLs are not publicly readable. A browser `<img src="...">` sends no `Authorization` header, so Vercel returns Forbidden. Adding the token in frontend code is not an option — it's a read-write token and would be exposed to every visitor.

Fix: the browser never calls the blob host. It calls our own server, which attaches the token and streams the image back.

## Plan

1. **Secrets in this project**
   - `VERCEL_BLOB_TOKEN` — the blob token (saved server-side only).
   - `DT_API_BASE_URL` — `https://dtapicoreappservice-b7cqgucahsbnckdh.australiaeast-01.azurewebsites.net` (replaces `https://dreamoz.com.au`).
   - Rotate the token in Vercel afterwards, since it was pasted in chat; I'll re-save the new value.

2. **Image proxy route** — `src/routes/api/blob-image.ts`
   - `GET /api/blob-image?url=<encoded blob url>`.
   - Validates the URL host against an allowlist (`*.blob.vercel-storage.com` only) so it can't be used as an open proxy.
   - Fetches with `Authorization: Bearer <VERCEL_BLOB_TOKEN>` (token read inside the handler), streams the bytes back with the upstream `Content-Type` and long-lived caching.
   - Returns clean 400/403/404 instead of leaking upstream error bodies.

3. **Posts data via server function** — `src/lib/posts.functions.ts`
   - Server-side fetch of `${DT_API_BASE_URL}/Member/Posts` so the API host and any API auth stay off the client.
   - Rewrites each `pics[].picPath` / `picThumbPath` to `/api/blob-image?url=...` before returning to the UI.

4. **Ported UI**
   - Route loader + `useSuspenseQuery` reading the posts server function; components render the proxied image URLs.
   - Home route (`src/routes/index.tsx`) replaces the placeholder with the first ported screen.

5. **Verify** — hit `/api/blob-image` with a real `picPath` and confirm 200 + `image/png`, then confirm the page renders the QR image in preview.

## Technical notes

- Token is read inside the handler (`process.env['VERCEL_BLOB_TOKEN']`), never at module scope — server env is injected per request.
- Proxy responses are public, non-user-specific images: `Cache-Control: public, max-age=31536000, immutable` keyed on the blob URL.
- Other Vercel env vars in the screenshot (Brevo, Square, Google Maps) are only added later if we port those features.
