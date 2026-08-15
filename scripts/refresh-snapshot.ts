/**
 * Refreshes the committed fallback snapshot of the upstream API.
 *
 * Run with the API online:
 *   bun scripts/refresh-snapshot.ts
 *
 * Requires DT_API_KEY, DT_API_SECRET and (optionally) DT_API_BASE_URL in the env.
 * The result is written to src/data/api-snapshot.json and committed, so the site
 * can still render when the upstream API is unreachable.
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_API_BASE =
  "https://dtapicoreappservice-b7cqgucahsbnckdh.australiaeast-01.azurewebsites.net";

const PATHS = ["/Member/Get", "/Member/Products", "/Member/Posts"] as const;

const apiBase =
  process.env.DT_API_BASE_URL?.trim().replace(/\/+$/, "") || DEFAULT_API_BASE;

async function main() {
  const key = process.env.DT_API_KEY?.trim();
  const secret = process.env.DT_API_SECRET?.trim();
  if (!key || !secret) throw new Error("DT_API_KEY / DT_API_SECRET are required");

  const tokenRes = await fetch(`${apiBase}/Client/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ APIKey: key, APISecret: secret }),
  });
  if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);
  const tokenJson: any = await tokenRes.json();
  const token = tokenJson.token ?? tokenJson.Token ?? tokenJson.access_token;
  if (!token) throw new Error("No token in response");

  const data: Record<string, unknown> = {};
  for (const path of PATHS) {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
    data[path] = await res.json();
    console.log(`captured ${path}`);
  }

  const out = { capturedAt: new Date().toISOString(), data };
  const target = resolve(process.cwd(), "src/data/api-snapshot.json");
  await writeFile(target, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`wrote ${target}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
