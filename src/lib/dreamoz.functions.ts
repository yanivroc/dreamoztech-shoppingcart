import { createServerFn } from "@tanstack/react-start";

export const getDreamozData = createServerFn({ method: "GET" }).handler(async () => {
  const { dreamozGet } = await import("./dreamoz.server");
  const [member, products, posts] = await Promise.all([
    dreamozGet("/Member/Get"),
    dreamozGet("/Member/Products"),
    dreamozGet("/Member/Posts"),
  ]);
  const rawPosts = posts?.posts ?? posts?.Posts ?? [];
  const visiblePosts = rawPosts.filter(
    (p: any) =>
      p.bizEnable === true &&
      p.bizPublic === true &&
      String(p.postType ?? "").toLowerCase() !== "product"
  );
  const rawProducts = products?.products?.posts ?? products?.posts ?? [];
  const visibleProducts = rawProducts.filter((p: any) => {
    const t = String(p.bizDisplayTitle ?? "").trim().toLowerCase();
    return t.length > 0 && t !== "new-product";
  });
  return {
    member: member?.member ?? null,
    products: visibleProducts,
    posts: visiblePosts,
  };
});
