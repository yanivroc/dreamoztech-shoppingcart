const SANDBOX_BASE = "https://connect.squareupsandbox.com";
const PROD_BASE = "https://connect.squareup.com";

export function squareBase() {
  const env = (process.env.SQUARE_ENVIRONMENT ?? "sandbox").toLowerCase();
  return env === "production" || env === "live" ? PROD_BASE : SANDBOX_BASE;
}

export async function squareFetch(path: string, init: RequestInit = {}) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("SQUARE_ACCESS_TOKEN not configured");
  const res = await fetch(`${squareBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-10-17",
      ...(init.headers || {}),
    },
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.detail ?? json?.errors?.[0]?.code ?? `Square ${res.status}`;
    throw new Error(msg);
  }
  return json;
}
