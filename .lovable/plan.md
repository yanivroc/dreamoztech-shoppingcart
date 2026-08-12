# Move the DreamozTech API credentials into secrets

The API key and secret used to get an access token from the DreamozTech API are currently written directly in the code (`src/lib/dreamoz.server.ts`). Anyone who gets a copy of the repository can read them. They should live in the project's encrypted secret store instead, like the Blob token and API base URL already do.

## What changes

- Store two new backend secrets in this project: `DT_API_KEY` and `DT_API_SECRET`, using the values currently in the code.
- The token request reads both values from the environment at call time (server-side only, never sent to the browser).
- Remove the hardcoded key and secret strings from the file.
- If either secret is missing at runtime, the API call fails with a clear message naming the missing variable — no silent fallback to a baked-in value.
- Verify afterwards that the homepage still loads member info and products from the API.

## Notes

- Since the values were previously committed to the GitHub repo, rotating them on the DreamozTech API side is recommended once you're ready; the app will pick up a new value by updating the secret.
- The same two variables should also be added to Vercel's Environment Variables (Production and Preview) for the deployment of that repo.

## Technical detail

- `src/lib/dreamoz.server.ts`: replace the `KEY` / `SECRET` constants with a small accessor that reads `process.env.DT_API_KEY` and `process.env.DT_API_SECRET` inside `getToken()` (env is injected per request on the edge runtime, so it cannot be read at module scope), and throws if either is absent.
- No change to `dreamozGet`, the token cache, or any calling code.
