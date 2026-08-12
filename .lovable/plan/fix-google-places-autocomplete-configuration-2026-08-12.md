# Fix Google Places autocomplete configuration

## Confirmed configuration

- `GOOGLE_MAPS_BROWSER_KEY` is the required Google API credential used by checkout autocomplete.
- `GOOGLE_MAPS_TRACKING_ID` is optional. It only adds a Google Maps `channel` label for usage reporting and is not an API key.
- The current Lovable environment contains `GOOGLE_MAPS_BROWSER_KEY` but no tracking ID. The app already drops an invalid tracking ID, so the screenshot's HTTP 400 is coming from the Places request rather than a missing tracking value.

## Plan

1. Remove the optional tracking ID from the Maps script URL and configuration path so there is only one relevant Google Maps setting.
2. Keep `GOOGLE_MAPS_BROWSER_KEY` sanitized server-side and continue exposing only the browser-authorized key to the Maps JavaScript SDK.
3. Improve the console diagnostic to retain Google's actual error message alongside safe facts such as key format and length, without printing the key.
4. Verify checkout autocomplete with an Australian address and confirm suggestions populate without HTTP 400 errors.
5. Confirm the published deployment uses the updated build and environment value.

## Vercel setting

Keep `GOOGLE_MAPS_BROWSER_KEY`. `GOOGLE_MAPS_TRACKING_ID` can be removed because this app does not need channel-based usage reporting. After changing the variable or code, redeploy Vercel so production receives the new value.
