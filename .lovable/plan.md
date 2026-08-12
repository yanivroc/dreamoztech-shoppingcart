# Fix Google address autocomplete on checkout

## Confirmed diagnosis

There are two separate messages:

1. **`API key not valid` is the real failure.** The deployed browser request reaches Places API (New), but Google rejects the key used by that deployment.
2. **The legacy Autocomplete message is secondary.** `AddressAutocomplete.tsx` deliberately falls back to `google.maps.places.Autocomplete` after the modern request fails. Google now warns that this legacy class is unavailable to new customers.

The deployed checkout is serving the current `checkout-Cs430XEm.js` bundle, so this is not an old cached JavaScript file.

## Changes

### 1. Remove the deprecated fallback

- Delete all use of `google.maps.places.Autocomplete` and its listener-based implementation.
- Keep only Places API (New): `AutocompleteSuggestion.fetchAutocompleteSuggestions()`, `Place.toPlace()`, and `fetchFields()`.
- Do not retry a modern API authentication failure through a legacy API; show the existing manual-address fallback instead.

### 2. Make deployment diagnostics conclusive and safe

- Keep the key server-side until the checkout asks for the browser configuration.
- Return only safe diagnostic properties in errors: whether a key exists, expected key format/length, and whether quotes or whitespace were removed. Never log or display the complete key.
- Classify Google failures clearly: missing/malformed key, rejected key, referrer restriction, disabled API, or billing/project configuration.
- Remove the direct server-side Places probe using the browser key because browser keys may be intentionally referrer-restricted and that probe does not reproduce a browser request.

### 3. Harden Maps JavaScript loading

- Load Maps JavaScript once with `loading=async`, the sanitized key, and the modern Places library.
- Reset the shared loading promise after a load failure so navigation or a corrected deployment can retry cleanly.
- Omit an invalid tracking `channel` value rather than sending it to Google.

### 4. Verify locally and on Vercel

- Verify checkout still permits manual address entry when Places is unavailable.
- Verify typing at least three characters produces modern address suggestions with no legacy warning.
- After deployment, inspect the Maps script safely by key presence/length/prefix only and confirm the suggestion RPC returns success.
- If Vercel still returns `API key not valid`, replace `GOOGLE_MAPS_BROWSER_KEY` with the actual Google key value (not a variable name, secret reference, quoted value, or connector key), apply it to Production, and redeploy.

## Expected result

Checkout uses only Google Places API (New). The deprecated warning disappears, invalid-key failures remain non-blocking, and the deployment exposes enough safe diagnostics to identify a bad Vercel value without leaking the key.
