import { createServerFn } from "@tanstack/react-start";

const PATHS = ["/Member/Get", "/Member/Products", "/Member/Posts"] as const;

export const getDreamozData = createServerFn({ method: "GET" })
  .inputValidator((data: { bustToken?: string } | undefined) => ({
    bustToken: typeof data?.bustToken === "string" ? data.bustToken : "",
  }))
  .handler(async ({ data }) => {
    const { dreamozGet, isValidBustToken } = await import("./dreamoz.server");
    // Cache is permanent; only a valid CACHE_BUST_TOKEN can force a fresh fetch.
    const opts = { bust: isValidBustToken(data.bustToken) };
    const [member, products, posts] = await Promise.all(
      PATHS.map((p) => dreamozGet(p, opts)),
    );
    const rawPosts = posts?.posts ?? posts?.Posts ?? [];
    const visiblePosts = rawPosts.filter(
      (p: any) =>
        p.bizEnable === true &&
        p.bizPublic === true &&
        String(p.postType ?? "").toLowerCase() !== "product"
    );
    const rawProducts = products?.products?.posts ?? products?.posts ?? [];
    const visibleProducts = rawProducts.filter((p: any) => {
      if (p.bizEnable !== true || p.bizPublic !== true) return false;
      const t = String(p.bizDisplayTitle ?? "").trim().toLowerCase();
      return t.length > 0 && t !== "new-product";
    });
    return {
      member: member?.member ?? null,
      products: visibleProducts,
      posts: visiblePosts,
    };
  });

export const bustDreamozCache = createServerFn({ method: "POST" })
  .inputValidator((data: { token?: string } | undefined) => ({
    token: typeof data?.token === "string" ? data.token : "",
  }))
  .handler(async ({ data }) => {
    const { clearDreamozCache, isValidBustToken } = await import("./dreamoz.server");
    if (!isValidBustToken(data.token)) return { ok: false as const, error: "Invalid token" };
    await clearDreamozCache([...PATHS]);
    return { ok: true as const, clearedAt: new Date().toISOString() };
  });
