const API_BASE =
  process.env.DT_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://dtapicoreappservice-b7cqgucahsbnckdh.australiaeast-01.azurewebsites.net";

const KEY = "DT-e351hJUDe3Kuo19k7BJlaIC36Eqo73qhD";
const SECRET =
  "B575D44AA500816322EE8FABF9CCA01461AB780CB1115675C9D2F241B0DCF77FB237F44815F6FA3F1A82F575EC1022E0D8C619034E95EFC5B1165411FA1AF1A3";

let cached: { token: string; exp: number } | null = null;

export async function getToken(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.token;
  const res = await fetch(`${API_BASE}/Client/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ APIKey: KEY, APISecret: SECRET }),
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
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}
