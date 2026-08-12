import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDreamozData } from "@/lib/dreamoz.functions";
import { SiteHeader, SiteFooter, resolveImg } from "@/components/SiteChrome";
import { ContactForm } from "@/components/ContactForm";
import { formatPrice } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLayout } from "@/lib/layout-theme";
import { CartButton } from "@/components/CartButton";
import { StyleSwitcher } from "@/components/StyleSwitcher";
import { Facebook, Twitter, Instagram, Home, ShoppingBag, Mail } from "lucide-react";

const dataQuery = queryOptions({
  queryKey: ["dreamoz"],
  queryFn: () => getDreamozData(),
});

export const Route = createFileRoute("/")({
  head: ({ loaderData }: any) => {
    const m = loaderData?.member;
    const brand = m?.memberFullName ?? "DreamozTech";
    const title = `Home | ${brand}`;
    const desc = m?.metaDesc ?? "DreamozTech is your all-in-one digital tech mart, bringing everything from everyday accessories to the latest gadgets straight to your doorstep.";
    const keywords = m?.metaKey ?? "";
    const url = "https://dreamoztech.lovable.app/";
    const img = m?.profilePicture ? (String(m.profilePicture).startsWith("http") ? m.profilePicture : `https://dreamoztech.com${m.profilePicture}`) : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        ...(keywords ? [{ name: "keywords", content: keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        ...(img ? [{ property: "og:image", content: img }] : []),
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(img ? [{ name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(dataQuery),
  component: Index,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Index() {
  const { data } = useSuspenseQuery(dataQuery);
  const { member, products } = data;
  const { layout } = useLayout();

  const lat = member?.bizLat;
  const lng = member?.bizLong;
  const hasCoords = lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng));
  const mapSrc = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`
    : null;

  const hero = (
    <section id="home" className="rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-3xl font-bold text-center mb-4">
        {member?.memberFullName ?? "DreamozTech"}: Your All-in-One Digital Tech Mart
      </h1>
      {member?.description && (
        <div className="mt-6 flex flex-col items-center gap-6 text-center">
          <div
            className="rich-content text-left w-full"
            dangerouslySetInnerHTML={{ __html: member.description }}
          />
        </div>
      )}
    </section>
  );

  const contact = (
    <section id="contact" className="space-y-4">
      <h2 className="text-xl font-semibold">Contact Us</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <ContactForm />
        </div>
        {mapSrc ? (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <iframe
              title="Location map"
              src={mapSrc}
              className="h-full min-h-[420px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6 shadow-sm text-sm text-muted-foreground">
            Location coming soon.
          </div>
        )}
      </div>
    </section>
  );

  // === SIDEBAR LAYOUT ===
  if (layout === "sidebar") {
    return (
      <div className="min-h-screen bg-background text-foreground flex">
        <aside className="sticky top-0 h-screen w-56 shrink-0 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            {member?.profilePicture ? (
              <img
                src={resolveImg(member.profilePicture) ?? undefined}
                alt={member?.memberFullName ?? "Logo"}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span className="font-semibold">{member?.memberFullName ?? "DreamozTech"}</span>
            )}
          </div>
          <nav className="flex-1 p-3 space-y-1 text-sm">
            <a href="#home" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"><Home className="h-4 w-4" /> Home</a>
            <a href="#products" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"><ShoppingBag className="h-4 w-4" /> Products</a>
            <a href="#contact" className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"><Mail className="h-4 w-4" /> Contact</a>
          </nav>
          <div className="border-t p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CartButton />
              <StyleSwitcher />
            </div>
            <div className="flex gap-2 pt-2">
              {member?.facebookProfile && <a href={member.facebookProfile} target="_blank" rel="noreferrer"><Facebook className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
              {member?.twitterProfile && <a href={member.twitterProfile} target="_blank" rel="noreferrer"><Twitter className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
              {member?.instagramProfile && <a href={member.instagramProfile} target="_blank" rel="noreferrer"><Instagram className="h-4 w-4 text-muted-foreground hover:text-primary" /></a>}
            </div>
          </div>
        </aside>
        <main className="flex-1 min-w-0 px-6 py-8 space-y-12">
          {hero}
          <section id="products" className="space-y-4">
            <h2 className="text-xl font-semibold">Products</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p: any, i: number) => (
                <ItemCard key={p.id ?? i} item={p} country={member?.country} />
              ))}
            </div>
          </section>
          {contact}
          <SiteFooter member={member} />
        </main>
      </div>
    );
  }

  // === MAGAZINE LAYOUT ===
  if (layout === "magazine") {
    const [featured, ...rest] = products;
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteHeader member={member} />
        <main className="mx-auto w-full max-w-6xl px-4 py-10 space-y-14 flex-1">
          <section id="home" className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Featured Journal</div>
              <h1 className="text-5xl font-bold leading-[1.05] mb-6">
                {member?.memberFullName ?? "DreamozTech"}
              </h1>
              {member?.description && (
                <div className="rich-content" dangerouslySetInnerHTML={{ __html: member.description }} />
              )}
            </div>
            {featured && <FeaturedTile item={featured} country={member?.country} />}
          </section>
          <section id="products" className="space-y-6">
            <h2 className="text-2xl font-bold border-b pb-3">More in Store</h2>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
              {rest.map((p: any, i: number) => (
                <div key={p.id ?? i} className={i % 5 === 0 ? "h-auto" : ""}>
                  <ItemCard item={p} country={member?.country} />
                </div>
              ))}
            </div>
          </section>
          {contact}
        </main>
        <SiteFooter member={member} />
      </div>
    );
  }

  // === COMPACT LAYOUT ===
  if (layout === "compact") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteHeader member={member} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-8 flex-1">
          <section id="home" className="rounded-lg border bg-card p-4">
            <h1 className="text-xl font-semibold">
              {member?.memberFullName ?? "DreamozTech"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Browse the full catalog below.</p>
          </section>
          <section id="products" className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Products ({products.length})</h2>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {products.map((p: any, i: number) => (
                <CompactRow key={p.id ?? i} item={p} country={member?.country} />
              ))}
            </div>
          </section>
          {contact}
        </main>
        <SiteFooter member={member} />
      </div>
    );
  }

  // === SHOWCASE LAYOUT ===
  if (layout === "showcase") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader member={member} />
        <main>
          <section id="home" className="min-h-[85vh] flex items-center justify-center px-6">
            <div className="max-w-3xl text-center space-y-6">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Presenting</div>
              <h1 className="text-6xl font-bold leading-[1.05]">
                {member?.memberFullName ?? "DreamozTech"}
              </h1>
              {member?.description && (
                <div className="rich-content text-left" dangerouslySetInnerHTML={{ __html: member.description }} />
              )}
              <a href="#products" className="inline-block rounded-full bg-primary px-6 py-3 text-primary-foreground font-medium">
                Explore Products ↓
              </a>
            </div>
          </section>
          <section id="products" className="snap-y snap-mandatory">
            {products.map((p: any, i: number) => (
              <div key={p.id ?? i} className="snap-start min-h-[85vh] flex items-center justify-center px-6 py-12 border-t">
                <ShowcaseCard item={p} country={member?.country} index={i} total={products.length} />
              </div>
            ))}
          </section>
          <section id="contact" className="border-t px-6 py-16">
            <div className="mx-auto max-w-5xl">{contact}</div>
          </section>
        </main>
        <SiteFooter member={member} />
      </div>
    );
  }

  // === CLASSIC (default) ===
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader member={member} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-12 flex-1">
        {hero}
        <section id="products" className="space-y-4">
          <h2 className="text-xl font-semibold">Products</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p: any, i: number) => (
                <ItemCard key={p.id ?? i} item={p} country={member?.country} />
              ))}
            </div>
          )}
        </section>
        {contact}
      </main>
      <SiteFooter member={member} />
    </div>
  );
}

function useItemBits(item: any) {
  const pic = Array.isArray(item.pics) && item.pics.length > 0
    ? [...item.pics].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))[0]
    : null;
  const img = resolveImg(pic?.picThumbPath ?? pic?.picPath ?? item.image);
  const title = item.bizName ?? item.title ?? "Untitled";
  const attrs: any[] = Array.isArray(item.attributes) ? item.attributes : [];
  const getAttr = (name: string) =>
    attrs.find((a) => String(a.title ?? a.name ?? a.key ?? "").toLowerCase() === name.toLowerCase());
  const priceAttr = getAttr("price");
  const priceRaw = priceAttr?.value ?? priceAttr?.price;
  const priceNum = Number(priceRaw);
  const minQty = Math.max(1, Number(getAttr("minquantity")?.value ?? 1) || 1);
  const maxQtyRaw = Number(getAttr("maxquantity")?.value);
  const maxQty = Number.isFinite(maxQtyRaw) && maxQtyRaw > 0 ? maxQtyRaw : undefined;
  const categories: any[] = Array.isArray(item.categories) ? item.categories : [];
  const slug = String(item.bizDisplayTitle ?? "");
  const id = String(item.id ?? slug);
  return { img, title, priceRaw, priceNum, minQty, maxQty, categories, slug, id };
}

function useAddToCart(item: any) {
  const { add, setOpen } = useCart();
  const bits = useItemBits(item);
  return () => {
    if (!isFinite(bits.priceNum) || bits.priceNum <= 0) {
      toast.error("Price unavailable");
      return;
    }
    add({ id: bits.id, slug: bits.slug, title: bits.title, price: bits.priceNum, image: bits.img, minQty: bits.minQty, maxQty: bits.maxQty }, bits.minQty);
    toast.success(`${bits.title} added to cart`);
    setOpen(true);
  };
}

function ItemCard({ item, country }: { item: any; country?: string | null }) {
  const { img, title, priceRaw, categories, slug } = useItemBits(item);
  const handleAdd = useAddToCart(item);

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm transition hover:shadow-md flex flex-col text-left">
      <Link to="/$slug" params={{ slug }} className="block">
        {img && (
          <img
            src={img}
            alt={`${title}${categories.length > 0 ? ` - ${categories[0].categoryTitle}` : " product image"}`}
            className="h-44 w-full object-cover"
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
      </Link>
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <Link to="/$slug" params={{ slug }}>
          <h3 className="font-medium line-clamp-2 hover:text-primary">{title}</h3>
        </Link>
        {priceRaw != null && (
          <div className="text-primary font-semibold">{formatPrice(priceRaw, country)}</div>
        )}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 4).map((c, i) => (
              <span key={i} className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                {c.categoryTitle}
              </span>
            ))}
          </div>
        )}
        <Button size="sm" className="mt-auto w-full" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdd(); }}>
          Add to Cart
        </Button>
      </div>
    </div>
  );
}

function FeaturedTile({ item, country }: { item: any; country?: string | null }) {
  const { img, title, priceRaw, slug } = useItemBits(item);
  const handleAdd = useAddToCart(item);
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-lg">
      <Link to="/$slug" params={{ slug }}>
        {img && <img src={img} alt={title} className="h-80 w-full object-cover" />}
      </Link>
      <div className="p-5 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Featured</div>
        <Link to="/$slug" params={{ slug }}>
          <h3 className="text-xl font-bold hover:text-primary">{title}</h3>
        </Link>
        {priceRaw != null && <div className="text-primary text-lg font-semibold">{formatPrice(priceRaw, country)}</div>}
        <Button onClick={handleAdd} className="mt-2">Add to Cart</Button>
      </div>
    </div>
  );
}

function CompactRow({ item, country }: { item: any; country?: string | null }) {
  const { img, title, priceRaw, categories, slug } = useItemBits(item);
  const handleAdd = useAddToCart(item);
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-2 hover:shadow-sm transition">
      <Link to="/$slug" params={{ slug }} className="shrink-0">
        {img ? (
          <img src={img} alt={title} className="h-16 w-16 rounded object-cover" />
        ) : (
          <div className="h-16 w-16 rounded bg-muted" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to="/$slug" params={{ slug }}>
          <h3 className="truncate text-sm font-medium hover:text-primary">{title}</h3>
        </Link>
        {categories[0] && (
          <div className="text-[10px] text-muted-foreground truncate">{categories[0].categoryTitle}</div>
        )}
        {priceRaw != null && (
          <div className="text-primary text-sm font-semibold">{formatPrice(priceRaw, country)}</div>
        )}
      </div>
      <Button size="sm" variant="secondary" onClick={handleAdd} className="shrink-0">Add</Button>
    </div>
  );
}

function ShowcaseCard({ item, country, index, total }: { item: any; country?: string | null; index: number; total: number }) {
  const { img, title, priceRaw, categories, slug } = useItemBits(item);
  const handleAdd = useAddToCart(item);
  return (
    <div className="grid gap-8 lg:grid-cols-2 items-center max-w-5xl w-full">
      <Link to="/$slug" params={{ slug }} className="block">
        {img && <img src={img} alt={title} className="w-full aspect-square object-cover rounded-2xl shadow-xl" />}
      </Link>
      <div className="space-y-5">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
        <Link to="/$slug" params={{ slug }}>
          <h3 className="text-4xl font-bold leading-tight hover:text-primary">{title}</h3>
        </Link>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 4).map((c, i) => (
              <span key={i} className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                {c.categoryTitle}
              </span>
            ))}
          </div>
        )}
        {priceRaw != null && (
          <div className="text-primary text-2xl font-semibold">{formatPrice(priceRaw, country)}</div>
        )}
        <Button size="lg" onClick={handleAdd}>Add to Cart</Button>
      </div>
    </div>
  );
}
