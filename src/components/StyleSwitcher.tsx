import { Check, ChevronDown, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LAYOUTS, useLayout } from "@/lib/layout-theme";
import { THEMES, useTheme } from "@/lib/theme";

export function StyleSwitcher() {
  const { layout, setLayout } = useLayout();
  const { theme, setTheme } = useTheme();
  const currentLayout = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[0];
  const currentTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const CurrentLayoutIcon = currentLayout.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium hover:bg-accent"
        aria-label={`Style: ${currentLayout.name} layout, ${currentTheme.name} theme`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <CurrentLayoutIcon className="h-3.5 w-3.5" />
        <span
          className="inline-block h-3 w-3 rounded-full border border-border"
          style={{ background: currentTheme.swatch }}
        />
        <span className="hidden sm:inline">Style</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel>Layout</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LAYOUTS.map((l) => {
          const Icon = l.icon;
          return (
            <DropdownMenuItem
              key={l.id}
              onSelect={(e) => {
                e.preventDefault();
                setLayout(l.id);
              }}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                <span className="block text-sm">{l.name}</span>
                <span className="block text-[11px] text-muted-foreground">{l.description}</span>
              </span>
              {l.id === layout && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={(e) => {
              e.preventDefault();
              setTheme(t.id);
            }}
            className="flex items-center gap-2"
          >
            <span
              className="inline-block h-4 w-4 rounded-full border border-border shrink-0"
              style={{ background: t.swatch }}
            />
            <span className="flex-1">
              <span className="block text-sm">{t.name}</span>
              <span className="block text-[11px] text-muted-foreground">{t.description}</span>
            </span>
            {t.id === theme && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
