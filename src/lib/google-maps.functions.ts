import { createServerFn } from "@tanstack/react-start";

function clean(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim();
}

// Google only accepts channel values made of ASCII letters, digits, ".", "_" and "-".
function cleanChannel(raw: string | undefined): string {
  const value = clean(raw);
  return /^[A-Za-z0-9._-]+$/.test(value) ? value : "";
}

export const getGoogleMapsConfig = createServerFn({ method: "GET" }).handler(async () => {
  const browserKey = clean(process.env.GOOGLE_MAPS_BROWSER_KEY);
  const rawKey = process.env.GOOGLE_MAPS_BROWSER_KEY ?? "";
  return {
    browserKey,
    trackingId: cleanChannel(process.env.GOOGLE_MAPS_TRACKING_ID),
    diagnostics: {
      keySet: browserKey.length > 0,
      keyLength: browserKey.length,
      keyPrefix: browserKey.slice(0, 6),
      keyHadWhitespace: /\s/.test(rawKey),
      keyHadQuotes: /^['"]|['"]$/.test(rawKey.trim()),
    },
  };
});

// Server-side check: does Google accept the stored key at all?
// Never returns the key itself — only Google's status and message.
export const checkGoogleMapsKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = clean(process.env.GOOGLE_MAPS_BROWSER_KEY);
  if (!key) return { ok: false, status: 0, message: "GOOGLE_MAPS_BROWSER_KEY is not set on the server." };
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({ input: "1 George St", includedRegionCodes: ["au"] }),
    });
    const text = await res.text();
    let message = text.slice(0, 300);
    try {
      message = JSON.parse(text)?.error?.message ?? message;
    } catch {}
    return { ok: res.ok, status: res.status, message: res.ok ? "Key accepted by Google." : message };
  } catch (e: any) {
    return { ok: false, status: -1, message: e?.message ?? "Request to Google failed." };
  }
});
