import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId =
  | "sunny"
  | "paramount"
  | "dark"
  | "nightly"
  | "starry"
  | "ocean"
  | "forest"
  | "sunset"
  | "noir"
  | "rose"
  | "mono"
  | "cyber";

export const THEMES: { id: ThemeId; name: string; swatch: string; description: string }[] = [
  { id: "sunny", name: "Sunny", swatch: "#f5b04a", description: "Warm cream & amber" },
  { id: "paramount", name: "Paramount", swatch: "#1e3a8a", description: "Crisp navy & white" },
  { id: "dark", name: "Dark", swatch: "#1f2937", description: "Comfortable dark" },
  { id: "nightly", name: "Nightly", swatch: "#6366f1", description: "Sleek indigo tech" },
  { id: "starry", name: "Starry", swatch: "#eab308", description: "Midnight & gold" },
  { id: "ocean", name: "Ocean", swatch: "#0891b2", description: "Calm teals & blues" },
  { id: "forest", name: "Forest", swatch: "#2f6b3a", description: "Off-white & deep green" },
  { id: "sunset", name: "Sunset", swatch: "#ef4444", description: "Peach & magenta" },
  { id: "noir", name: "Noir", swatch: "#dc2626", description: "Black, white, red" },
  { id: "rose", name: "Rose", swatch: "#be185d", description: "Blush & burgundy" },
  { id: "mono", name: "Mono", swatch: "#525252", description: "Pure grayscale" },
  { id: "cyber", name: "Cyber", swatch: "#22d3ee", description: "Neon mint & cyan" },
];

export const DEFAULT_THEME: ThemeId = "paramount";
export const STORAGE_KEY = "site-theme";

type Ctx = { theme: ThemeId; setTheme: (t: ThemeId) => void };
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      const initial =
        stored && THEMES.some((t) => t.id === stored) ? stored : DEFAULT_THEME;
      setThemeState(initial);
      document.documentElement.dataset.theme = initial;
    } catch {}
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
      document.documentElement.dataset.theme = t;
    } catch {}
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

// Inline script for no-flash theme init. Runs before hydration.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var allowed=${JSON.stringify(
  THEMES.map((t) => t.id),
)};if(!t||allowed.indexOf(t)===-1){t='${DEFAULT_THEME}';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
