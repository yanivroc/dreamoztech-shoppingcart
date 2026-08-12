// Map a country name to an ISO 4217 currency code.
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  australia: "AUD",
  "united states": "USD",
  usa: "USD",
  "united kingdom": "GBP",
  uk: "GBP",
  canada: "CAD",
  "new zealand": "NZD",
  india: "INR",
  singapore: "SGD",
  germany: "EUR",
  france: "EUR",
  spain: "EUR",
  italy: "EUR",
  ireland: "EUR",
  netherlands: "EUR",
  japan: "JPY",
  china: "CNY",
};

const COUNTRY_TO_ISO2: Record<string, string> = {
  australia: "au",
  "united states": "us",
  usa: "us",
  "united kingdom": "gb",
  uk: "gb",
  canada: "ca",
  "new zealand": "nz",
  india: "in",
  singapore: "sg",
  germany: "de",
  france: "fr",
  spain: "es",
  italy: "it",
  ireland: "ie",
  netherlands: "nl",
  japan: "jp",
  china: "cn",
};

export function iso2ForCountry(country?: string | null): string {
  if (!country) return "au";
  const s = String(country).trim().toLowerCase();
  if (s.length === 2) return s;
  return COUNTRY_TO_ISO2[s] ?? "au";
}

export function currencyForCountry(country?: string | null): string {
  if (!country) return "USD";
  return COUNTRY_TO_CURRENCY[String(country).trim().toLowerCase()] ?? "USD";
}

export function formatPrice(value: unknown, country?: string | null): string {
  const num = typeof value === "number" ? value : Number(value);
  const code = currencyForCountry(country);
  if (!isFinite(num)) return `${code} ${value}`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(num);
  } catch {
    return `${code} ${num.toFixed(2)}`;
  }
}
