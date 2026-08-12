import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDreamozData } from "@/lib/dreamoz.functions";
import { SiteHeader, SiteFooter, resolveImg } from "@/components/SiteChrome";
import { currencyForCountry, formatPrice } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const dataQuery = queryOptions({
  queryKey: ["dreamoz"],
  queryFn: () => getDreamozData(),
});

function findProduct(products: any[], slug: string) {
  const s = decodeURIComponent(slug).toLowerCase();
  return products.find(
    (p: any) => String(p.bizDisplayTitle ?? "").toLowerCase() === s
  );
}

export const Route = createFileRoute("/$slug")({
  head: ({ loaderData, params }: any) => {
    const m = loaderData?.member;
    const brand = m?.memberFullName ?? "DreamozTech";
    const product = loaderData?.products
      ? findProduct(loaderData.products, params.slug)
      : null;
    const name = product?.bizName ?? "Product";
    const title = `${name} | ${brand}`;
    const desc = product?.metaDesc ?? product?.bizDesc ?? m?.metaDesc ?? "";
    const plainDesc = typeof desc === "string" ? desc.replace(/<[^>]*>/g, "").slice(0, 300) : "";
    const keywords = product?.metaKey ?? "";
    const url = `https://dreamoztech.lovable.app/${params.slug}`;
    const pics = Array.isArray(product?.pics) ? product.pics : [];
    const firstPic = pics.length
      ? [...pics].sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))[0]
      : null;
    const rawImg = firstPic?.picPath ?? firstPic?.picThumbPath ?? null;
    const img = rawImg
      ? (String(rawImg).startsWith("http") ? rawImg : `https://dreamoztech.com${rawImg}`)
      : null;
    const priceAttr = Array.isArray(product?.attributes)
      ? product.attributes.find(
          (a: any) => String(a.title ?? a.name ?? a.key ?? "").toLowerCase() === "price"
        )
      : null;
    const price = priceAttr?.value ?? priceAttr?.price;
    return {
      meta: [
        { title },
        ...(plainDesc ? [{ name: "description", content: plainDesc }] : []),
        ...(keywords ? [{ name: "keywords", content: keywords }] : []),
        { property: "og:title", content: title },
        ...(plainDesc ? [{ property: "og:description", content: plainDesc }] : []),
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        ...(img ? [{ property: "og:image", content: img }] : []),
        { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        ...(plainDesc ? [{ name: "twitter:description", content: plainDesc }] : []),
        ...(img ? [{ name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: product
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name,
                description: plainDesc || undefined,
                image: img || undefined,
                url,
                brand: { "@type": "Brand", name: brand },
                ...(price != null
                  ? {
                      offers: {
                        "@type": "Offer",
                        price: String(price),
                        priceCurrency: currencyForCountry(m?.country),
                        availability: "https://schema.org/InStock",
                        url,
                      },
                    }
                  : {}),
              }),
            },
          ]
        : [],
    };
  },
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(dataQuery),
  component: ProductPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Product not found</div>,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(dataQuery);
  const { member, products } = data;
  const item = findProduct(products, slug);

  if (!item) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteHeader member={member} />
        <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1">
          <p className="text-muted-foreground">Product not found.</p>
          <Link to="/" className="text-primary hover:underline">Back to home</Link>
        </main>
        <SiteFooter member={member} />
      </div>
    );
  }

  const pics: any[] = Array.isArray(item.pics)
    ? [...item.pics].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    : [];
  const title = item.bizName ?? "Untitled";
  const attrs: any[] = Array.isArray(item.attributes) ? item.attributes : [];
  const getAttr = (name: string) =>
    attrs.find((a: any) => String(a.title ?? a.name ?? a.key ?? "").toLowerCase() === name.toLowerCase());
  const priceAttr = getAttr("price");
  const price = priceAttr?.value ?? priceAttr?.price;
  const minQty = Math.max(1, Number(getAttr("minquantity")?.value ?? 1) || 1);
  const maxQtyRaw = Number(getAttr("maxquantity")?.value);
  const maxQty = Number.isFinite(maxQtyRaw) && maxQtyRaw > 0 ? maxQtyRaw : undefined;
  const desc = item.bizDesc ?? item.description;
  const categories: any[] = Array.isArray(item.categories) ? item.categories : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader member={member} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1 space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">&larr; Back</Link>
        <article className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          {pics.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {pics.map((pic, i) => {
                const src = resolveImg(pic.picPath ?? pic.picThumbPath);
                if (!src) return null;
                return (
                  <img
                    key={i}
                    src={src}
                    alt={pic.picDescription ?? `${title} image ${i + 1}`}
                    className="w-full max-h-96 object-contain rounded border bg-background"
                    loading={i === 0 ? "eager" : "lazy"}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                );
              })}
            </div>
          )}
          {price != null && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-primary text-xl font-semibold">{formatPrice(price, member?.country)}</div>
              <AddToCartButton
                id={String(item.id ?? slug)}
                slug={slug}
                title={title}
                price={Number(price)}
                image={resolveImg(pics[0]?.picThumbPath ?? pics[0]?.picPath) ?? undefined}
                minQty={minQty}
                maxQty={maxQty}
              />
            </div>
          )}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {categories.map((c, i) => (
                <span key={i} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {c.categoryTitle}
                </span>
              ))}
            </div>
          )}
          {desc ? (
            <div
              className="rich-content"
              dangerouslySetInnerHTML={{ __html: String(desc) }}
            />

          ) : (
            <p className="text-sm text-muted-foreground">No description available.</p>
          )}
        </article>
      </main>
      <SiteFooter member={member} />
    </div>
  );
}

function AddToCartButton({
  id, slug, title, price, image, minQty = 1, maxQty,
}: { id: string; slug: string; title: string; price: number; image?: string; minQty?: number; maxQty?: number }) {
  const { add, setOpen } = useCart();
  function handle() {
    if (!isFinite(price) || price <= 0) {
      toast.error("Price unavailable");
      return;
    }
    add({ id, slug, title, price, image, minQty, maxQty }, minQty);
    toast.success(`${title} added to cart`);
    setOpen(true);
  }
  return <Button onClick={handle}>Add to Cart</Button>;
}
