## Merge Theme + Layout into one dropdown

Replace the two separate dropdowns in the header with a single **Style** dropdown that contains two labeled sections: **Layout** (5 options) and **Theme** (12 colors). Each section still lets you pick independently, so all 60 combinations remain possible.

### Menu structure
```
[ ✨ Style ▾ ]
├─ Layout
│   ○ Classic
│   ● Sidebar        ← check on active
│   ○ Magazine
│   ○ Compact
│   ○ Showcase
├─ ─────────────
├─ Theme
│   ○ 🟡 Sunny
│   ● 🔵 Paramount
│   ○ ⚫ Dark
│   ...  (12 total)
```

Uses shadcn `DropdownMenu` with `DropdownMenuLabel` + `DropdownMenuSeparator` to divide the two sections. Each item still shows its icon/swatch, name, description, and a check on the current selection. Selecting an item does NOT close the menu (uses `onSelect={(e) => e.preventDefault()}`) so users can change both without reopening.

Trigger button: small button showing the current layout icon + current theme swatch, so at-a-glance you see both active choices.

### Files
- **New** `src/components/StyleSwitcher.tsx` — the combined dropdown; internally calls `useTheme()` and `useLayout()`.
- **Edit** `src/components/SiteChrome.tsx` — replace the two `<li>` entries (`<LayoutSwitcher />` and `<ThemeSwitcher />`) with a single `<StyleSwitcher />`.
- **Delete** `src/components/LayoutSwitcher.tsx` and `src/components/ThemeSwitcher.tsx` (no longer referenced).

No changes to `layout-theme.tsx`, `theme.tsx`, storage keys, or any page/render logic — the underlying providers stay identical.
