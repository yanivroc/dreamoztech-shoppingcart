# Fix "API key not valid" on the address autocomplete

## What the console is telling us

`InvalidKeyMapError` + `API key not valid. Please pass a valid API key.` means Google rejected the key string itself — not the domain and not the API list. So this is not a referrer/restriction problem (your key is already unrestricted), and enabling more APIs won't change it.

Most likely reasons, in order:

1. The `GOOGLE_MAPS_BROWSER_KEY` value in Vercel was updated 19 minutes ago, but Vercel only picks up env-var changes on a **new deployment**. The live site is still serving the old build/value. A redeploy is required.
2. The stored value has stray characters (a copied space, newline, quotes, or a truncated key), or belongs to a different Google Cloud project than the one where the APIs are enabled.
3. Billing is not enabled on the Google Cloud project holding the key — Maps returns an invalid-key style failure in that case.
4. The `channel` parameter, taken from `GOOGLE_MAPS_TRACKING_ID`, can make Google reject the request if the value contains characters outside `a-z A-Z 0-9 . _ -`.

## Plan

### 1. Add a safe self-check (no key exposure)

Extend the existing server-side config function so it also reports diagnostic facts about the key without revealing it: whether it is set, its length, its first 6 characters, and whether it contains whitespace/quotes. Surface this only in a small dev-visible message under the address field when the Places load fails, so we can immediately tell "key missing", "key mangled", or "key rejected by Google".

### 2. Harden the script loading

- Sanitise the tracking id before using it as `channel`, and drop it entirely if it doesn't match Google's allowed character set (this removes cause #4 as a variable).
- Trim/strip surrounding quotes from the key value server-side.
- Improve the error message shown to the shopper: instead of the generic "blocked" text, show "Address lookup is temporarily unavailable — enter your address manually", and keep the manual Address/City/Postcode fields fully usable so checkout is never blocked.

### 3. Verify the key from the server

Add a one-off diagnostic run (not shipped UI) that calls Google's Places API with the stored key from the server and prints the exact status/body. That distinguishes "the key value is wrong" from "the browser is sending it wrong" definitively.

### 4. Your side (only you can do these)

- In Vercel: after confirming `GOOGLE_MAPS_BROWSER_KEY`, trigger a **Redeploy** of production (Deployments → ... → Redeploy) so the updated variable is used.
- In Google Cloud: confirm the key lives in the same project (`DreamozTech`) where Maps JavaScript API and Places API (New) are enabled, and that the project has **billing enabled**.

## Notes

The same key is used on the Lovable preview and on `dreamoztech-lovable.vercel.app`; once step 3 tells us whether the stored value is accepted by Google, the fix is either a redeploy (Vercel-side) or a corrected key value — I'll confirm which before touching anything else.
