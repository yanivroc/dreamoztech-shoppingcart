import { createContext, useContext, useEffect, useState } from "react";
import { LayoutGrid, PanelLeft, Newspaper, Rows3, Presentation } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LayoutId = "classic" | "sidebar" | "magazine" | "compact" | "showcase";

export const LAYOUTS: { id: LayoutId; name: string; description: string; icon: LucideIcon }[] = [
  { id: "classic", name: "Classic", description: "Top nav + product grid", icon: LayoutGrid },
  { id: "sidebar", name: "Sidebar", description: "Left rail nav, 2-col grid", icon: PanelLeft },
  { id: "magazine", name: "Magazine", description: "Editorial hero + masonry", icon: Newspaper },
  { id: "compact", name: "Compact", description: "Dense horizontal list", icon: Rows3 },
  { id: "showcase", name: "Showcase", description: "Big cards, snap scroll", icon: Presentation },
];

export const DEFAULT_LAYOUT: LayoutId = "classic";
export const LAYOUT_STORAGE_KEY = "site-layout";

type Ctx = { layout: LayoutId; setLayout: (l: LayoutId) => void };
const LayoutCtx = createContext<Ctx | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutId>(DEFAULT_LAYOUT);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY) as LayoutId | null;
      const initial = stored && LAYOUTS.some((l) => l.id === stored) ? stored : DEFAULT_LAYOUT;
      setLayoutState(initial);
      document.documentElement.dataset.layout = initial;
    } catch {}
  }, []);

  const setLayout = (l: LayoutId) => {
    setLayoutState(l);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, l);
      document.documentElement.dataset.layout = l;
    } catch {}
  };

  return <LayoutCtx.Provider value={{ layout, setLayout }}>{children}</LayoutCtx.Provider>;
}

export function useLayout() {
  const ctx = useContext(LayoutCtx);
  if (!ctx) throw new Error("useLayout must be used inside LayoutProvider");
  return ctx;
}

export const LAYOUT_INIT_SCRIPT = `(function(){try{var l=localStorage.getItem('${LAYOUT_STORAGE_KEY}');var allowed=${JSON.stringify(
  LAYOUTS.map((l) => l.id),
)};if(!l||allowed.indexOf(l)===-1){l='${DEFAULT_LAYOUT}';}document.documentElement.setAttribute('data-layout',l);}catch(e){}})();`;
