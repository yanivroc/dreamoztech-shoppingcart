const DEFAULT_API_BASE =
  "https://dtapicoreappservice-b7cqgucahsbnckdh.australiaeast-01.azurewebsites.net";

// Read env per call: on the edge runtime env is injected at request time.
function apiBase(): string {
  return process.env.DT_API_BASE_URL?.trim().replace(/\/+$/, "") || DEFAULT_API_BASE;
}


// Credentials live in the encrypted secret store, never in code.
// Read env per call: on the edge runtime env is injected at request time.
function credentials(): { key: string; secret: string } {
  const key = process.env.DT_API_KEY?.trim();
  const secret = process.env.DT_API_SECRET?.trim();
  if (!key) throw new Error("DT_API_KEY is not configured.");
  if (!secret) throw new Error("DT_API_SECRET is not configured.");
  return { key, secret };
}

let cached: { token: string; exp: number } | null = null;

export async function getToken(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.token;
  const { key, secret } = credentials();
  const res = await fetch(`${apiBase()}/Client/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ APIKey: key, APISecret: secret }),
  });

  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const json: any = await res.json();
  const token = json.token ?? json.Token ?? json.access_token;
  if (!token) throw new Error("No token in response");
  cached = { token, exp: Date.now() + 10 * 60 * 1000 };
  return token;
}

export async function dreamozGet(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}
