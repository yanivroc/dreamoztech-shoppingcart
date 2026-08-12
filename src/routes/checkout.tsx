import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getDreamozData } from "@/lib/dreamoz.functions";
import { getSquarePublicConfig, createSquarePayment } from "@/lib/square.functions";
import { sendOrderEmails } from "@/lib/order-email.functions";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useCart, DELIVERY_FEE } from "@/lib/cart";
import { currencyForCountry, formatPrice, iso2ForCountry } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const dataQuery = queryOptions({ queryKey: ["dreamoz"], queryFn: () => getDreamozData() });

// Build a friendly order id: "firstname-DDMMYYHHmm" in Sydney time.
// Example: richard-2906261018
function buildOrderId(fullName: string): string {
  const first = (fullName || "order")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) || "order";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Australia/Sydney",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  const stamp = `${parts.day}${parts.month}${parts.year}${parts.hour}${parts.minute}`;
  return `${first}-${stamp}`;
}

const squareCfgQuery = queryOptions({
  queryKey: ["square-config"],
  queryFn: () => getSquarePublicConfig(),
});

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout | DreamozTech" }] }),
  ssr: false,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(dataQuery),
      context.queryClient.ensureQueryData(squareCfgQuery),
    ]),
  component: CheckoutPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
});

declare global {
  interface Window {
    Square?: any;
  }
}

function loadSquareSdk(env: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.Square) return resolve();
    const src =
      env === "production" || env === "live"
        ? "https://web.squarecdn.com/v1/square.js"
        : "https://sandbox.web.squarecdn.com/v1/square.js";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Square SDK load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Square SDK load failed"));
    document.head.appendChild(s);
  });
}

function CheckoutPage() {
  const { data: appData } = useSuspenseQuery(dataQuery);
  const { data: cfg } = useSuspenseQuery(squareCfgQuery);
  const member = (appData as any).member;
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const country = member?.country;
  const countryIso2 = iso2ForCountry(country);
  const currency = currencyForCountry(country);
  const total = subtotal + (items.length > 0 ? DELIVERY_FEE : 0);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
  });
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<{ id?: string; receiptUrl?: string } | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const cardRef = useRef<any>(null);
  const cardContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (done) return;
    if (!cfg.applicationId || !cfg.locationId) {
      setSdkError("Square is not configured.");
      return;
    }
    let cancelled = false;
    let card: any;
    (async () => {
      try {
        await loadSquareSdk(cfg.environment);
        if (cancelled || !window.Square) return;
        const payments = window.Square.payments(cfg.applicationId, cfg.locationId);
        card = await payments.card();
        if (cancelled) return;
        await card.attach(cardContainerRef.current);
        cardRef.current = card;
      } catch (e: any) {
        setSdkError(e?.message ?? "Failed to load card form");
      }
    })();
    return () => {
      cancelled = true;
      try {
        card?.destroy?.();
      } catch {}
    };
  }, [cfg.applicationId, cfg.locationId, cfg.environment, done]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (paying) return;
    if (!form.name || !form.email || !form.address) {
      toast.error("Please fill in name, email and address.");
      return;
    }
    if (!cardRef.current) {
      toast.error("Card form not ready.");
      return;
    }
    setPaying(true);
    const orderId = buildOrderId(form.name);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK") {
        const msg = result.errors?.[0]?.message ?? "Card tokenization failed";
        throw new Error(msg);
      }
      const note = `Order ${orderId}: ` + items.map((i) => `${i.qty} x ${i.title}`).join(", ");
      const payment = await createSquarePayment({
        data: {
          sourceId: result.token,
          amount: total,
          currency,
          buyer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            postcode: form.postcode,
            country: "AU",
          },
          note,
        },
      });
      toast.success("Payment successful!");
      setDone({ id: orderId, receiptUrl: payment.receiptUrl });
      try {
        await sendOrderEmails({
          data: {
            orderId,
            receiptUrl: payment.receiptUrl ?? null,
            currency,
            subtotal,
            deliveryFee: DELIVERY_FEE,
            total,
            buyer: {
              name: form.name,
              email: form.email,
              phone: form.phone,
              address: form.address,
              city: form.city,
              postcode: form.postcode,
            },
            items: items.map((i) => ({ title: i.title, qty: i.qty, price: i.price })),
          },
        });
      } catch (err) {
        console.error("Order email failed", err);
      }
      clear();
    } catch (e: any) {
      toast.error(e?.message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader member={member} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 flex-1 space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">&larr; Continue shopping</Link>
        <h1 className="text-2xl font-bold">Checkout</h1>

        {done ? (
          <div className="rounded-xl border bg-card p-8 shadow-sm text-center space-y-4">
            <h2 className="text-xl font-semibold text-primary">Order Successful</h2>
            <p className="text-muted-foreground">
              Thank you! Your order has been placed successfully. You will receive
              a confirmation email with your invoice shortly.
            </p>
            <p className="text-muted-foreground text-sm">
              Order ID: <span className="font-mono">{done.id}</span>
            </p>
            <div>
              <Button onClick={() => navigate({ to: "/" })}>Back to home</Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 shadow-sm text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button className="mt-4" onClick={() => navigate({ to: "/" })}>Shop now</Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <form onSubmit={handlePay} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold">Shipping & Payment</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="Postcode" value={form.postcode} onChange={(v) => setForm({ ...form, postcode: v })} />
                <div className="sm:col-span-2">
                  <Label className="mb-1 block text-xs">Address *</Label>
                  <AddressAutocomplete
                    value={form.address}
                    onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                    onSelect={(p) =>
                      setForm((f) => ({
                        ...f,
                        address: p.address,
                        city: p.city || f.city,
                        postcode: p.postcode || f.postcode,
                      }))
                    }
                    required
                    country={countryIso2}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Powered by Google Maps</p>
                </div>
                <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              </div>

              <div className="pt-2">
                <Label className="mb-2 block">Card details</Label>
                {sdkError ? (
                  <p className="text-sm text-destructive">{sdkError}</p>
                ) : (
                  <div
                    ref={cardContainerRef}
                    className="min-h-[90px] rounded-md border bg-background p-2"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Sandbox test card: 4111 1111 1111 1111 · any future date · any CVV
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={paying || !!sdkError}>
                {paying ? "Processing..." : `Pay ${formatPrice(total, country)}`}
              </Button>
            </form>

            <aside className="rounded-xl border bg-card p-6 shadow-sm h-fit space-y-3">
              <h2 className="text-lg font-semibold">Order Summary</h2>
              <ul className="space-y-2 text-sm">
                {items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span className="truncate">{i.qty} × {i.title}</span>
                    <span>{formatPrice(i.qty * i.price, country)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t pt-3 space-y-1 text-sm">
                <Row label="Subtotal" value={formatPrice(subtotal, country)} />
                <Row label="Delivery" value={formatPrice(DELIVERY_FEE, country)} />
                <Row label="Total" value={formatPrice(total, country)} bold />
              </div>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter member={member} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}{required && " *"}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-base" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}
