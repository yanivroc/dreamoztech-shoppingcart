import { createServerFn } from "@tanstack/react-start";

const PATHS = ["/Member/Get", "/Member/Products", "/Member/Posts"] as const;

export const getDreamozData = createServerFn({ method: "GET" })
  .inputValidator((data: { bust?: boolean } | undefined) => ({
    bust: data?.bust === true,
  }))
  .handler(async ({ data }) => {
    const { dreamozGet } = await import("./dreamoz.server");
    const opts = { bust: data.bust };
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

export const bustDreamozCache = createServerFn({ method: "POST" }).handler(async () => {
  const { clearDreamozCache } = await import("./dreamoz.server");
  await clearDreamozCache([...PATHS]);
  return { ok: true, clearedAt: new Date().toISOString() };
});
