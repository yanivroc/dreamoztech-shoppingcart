import { createServerFn } from "@tanstack/react-start";

export const getGoogleMapsConfig = createServerFn({ method: "GET" }).handler(async () => {
  const clean = (raw: string | undefined) =>
    (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim();
  const rawKey = process.env.GOOGLE_MAPS_BROWSER_KEY ?? "";
  const browserKey = clean(rawKey);

  return {
    browserKey,
    diagnostics: {
      keySet: browserKey.length > 0,
      keyLength: browserKey.length,
      keyPrefix: browserKey.slice(0, 6),
      keyLooksLikeGoogleKey: /^AIza[\w-]{35}$/.test(browserKey),
      keyHadWhitespace: /\s/.test(rawKey),
      keyHadQuotes: /^['"]|['"]$/.test(rawKey.trim()),
    },
  };
});
