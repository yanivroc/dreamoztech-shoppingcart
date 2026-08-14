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

// ---------------------------------------------------------------------------
// Caching: the upstream API hits a SQL database, so every response is cached
// indefinitely (no TTL) until explicitly busted with the CACHE_BUST_TOKEN. Two layers:
//   1. in-memory (per worker isolate) — fastest, zero cost
//   2. the platform HTTP cache (shared across isolates) when available
// Both are bypassed and refilled when `bust` is true (see /bustcache).
// No expiry: entries live until a cache bust. The HTTP cache still needs a
// max-age header, so use one year (the practical maximum).
const CACHE_MAX_AGE_S = 365 * 24 * 60 * 60;

/** Shared secret required to bust the cache. Set CACHE_BUST_TOKEN in the env. */
export function isValidBustToken(token: string | null | undefined): boolean {
  const expected = (process.env['CACHE_BUST_TOKEN'] ?? '').trim();
  if (!expected) return false;
  const given = (token ?? '').trim();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
const CACHE_ORIGIN = "https://dreamoz-cache.internal";

const memory = new Map<string, { data: any }>();

function cacheKey(path: string) {
  return `${CACHE_ORIGIN}/${encodeURIComponent(path)}`;
}

async function httpCache(): Promise<Cache | null> {
  try {
    const c = (globalThis as any).caches?.default ?? null;
    return c ?? null;
  } catch {
    return null;
  }
}

async function readHttpCache(path: string): Promise<any | null> {
  const cache = await httpCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(cacheKey(path));
    return hit ? await hit.json() : null;
  } catch {
    return null;
  }
}

async function writeHttpCache(path: string, data: any): Promise<void> {
  const cache = await httpCache();
  if (!cache) return;
  try {
    await cache.put(
      cacheKey(path),
      new Response(JSON.stringify(data), {
        headers: {
          "content-type": "application/json",
          "cache-control": `public, max-age=${CACHE_MAX_AGE_S}, immutable`,
        },
      }),
    );
  } catch {
    // caching is best-effort
  }
}

export async function clearDreamozCache(paths: string[]): Promise<void> {
  memory.clear();
  const cache = await httpCache();
  if (!cache) return;
  for (const path of paths) {
    try {
      await cache.delete(cacheKey(path));
    } catch {
      // ignore
    }
  }
}

export async function dreamozGet(path: string, opts?: { bust?: boolean }): Promise<any> {
  const bust = opts?.bust === true;

  if (!bust) {
    const hit = memory.get(path);
    if (hit) return hit.data;
    const shared = await readHttpCache(path);
    if (shared !== null) {
      memory.set(path, { data: shared });
      return shared;
    }
  }

  const token = await getToken();
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  const data = await res.json();
  memory.set(path, { data });
  await writeHttpCache(path, data);
  return data;
}

