import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  image?: string | null;
  qty: number;
  minQty?: number;
  maxQty?: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "dreamoz_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    return {
      items,
      isOpen,
      setOpen,
      count,
      subtotal,
      add: (item, qty = 1) =>
        setItems((prev) => {
          const ex = prev.find((p) => p.id === item.id);
          const max = item.maxQty ?? ex?.maxQty;
          if (ex) {
            const target = ex.qty + qty;
            const capped = max != null ? Math.min(target, max) : target;
            if (capped === ex.qty) return prev;
            return prev.map((p) => (p.id === item.id ? { ...p, qty: capped, minQty: item.minQty ?? p.minQty, maxQty: max } : p));
          }
          const initial = max != null ? Math.min(Math.max(qty, item.minQty ?? 1), max) : Math.max(qty, item.minQty ?? 1);
          return [...prev, { ...item, qty: initial }];
        }),
      remove: (id) => setItems((p) => p.filter((i) => i.id !== id)),
      setQty: (id, qty) =>
        setItems((p) =>
          p.flatMap((i) => {
            if (i.id !== id) return [i];
            if (qty <= 0) return [];
            const min = i.minQty ?? 1;
            const max = i.maxQty;
            const next = Math.max(min, max != null ? Math.min(qty, max) : qty);
            return [{ ...i, qty: next }];
          }),
        ),
      clear: () => setItems([]),
    };
  }, [items, isOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export const DELIVERY_FEE = 10;
