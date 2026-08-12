# One-time merge of this project's code into `dreamoztech-lovable`

Goal: get the changes made here (private Blob image proxy, Azure API base, credentials from secrets) into the original repo `yanivroc/dreamoztech-lovable`, while Lovable keeps syncing to `yanivroc/dreamoztech-image-fetcher`.

## Why it's manual

Lovable's GitHub sync can only create a new repository; it can't be re-pointed at an existing one. So the new repo is the synced source, and the old repo receives a one-time push via git.

## Steps (run locally)

```bash
git clone https://github.com/yanivroc/dreamoztech-lovable.git
cd dreamoztech-lovable
git remote add lovable https://github.com/yanivroc/dreamoztech-image-fetcher.git
git fetch lovable
git checkout -b lovable-image-proxy lovable/main   # use the new repo's default branch
git push origin lovable-image-proxy
```

Then open a PR from `lovable-image-proxy` into the old repo's default branch and merge. The two histories are unrelated, so review the diff rather than merging blind.

## Files that carry the changes

- `src/lib/dreamoz.server.ts` — Azure API base via `DT_API_BASE_URL` (with fallback), API key/secret read from `DT_API_KEY` / `DT_API_SECRET` instead of hardcoded values.
- `src/server.ts` — image proxy: allowlist restricted to `*.blob.vercel-storage.com`, token attached server-side, fallback from a missing `_thumbnail_` variant to the full-size image.
- `src/routes/image.ts` — proxy route wiring.
- `src/start.ts` — removed the unused Supabase auth middleware.

## After merging

Add these environment variables in Vercel (Production + Preview) for whichever repo Vercel deploys, then redeploy:

- `DT_API_KEY`
- `DT_API_SECRET`
- `DT_API_BASE_URL`
- `VERCEL_BLOB_TOKEN`

Secret values never travel with the code, so this step is required even though the code is identical.

## Ongoing

Future edits made in Lovable land in `dreamoztech-image-fetcher` only. To keep the old repo current, repeat the `git fetch lovable` + branch + PR cycle, or switch Vercel's deployment to the new repo so Lovable changes deploy automatically.

## Changes in this project

None — this is a repository/deployment workflow, no code edits required here.
