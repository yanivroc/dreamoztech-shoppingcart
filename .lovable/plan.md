# Phone in header, tidier footer, SEO polish

## 1. Call link in the top bar
The member record from the API returns `mobileNumber` (currently `0401924959`), which the site never shows. Add it to the site header, next to the nav items: a phone icon plus the number, as a tap-to-call link (`tel:`). On narrow screens the icon stays visible and the digits collapse away so the header doesn't wrap.

## 2. Footer: drop "Follow", balance the columns
Remove the "Follow" column and its social icons from the footer. The remaining two blocks (brand/copyright and Shortcuts) get equal-width columns with matching spacing so they read as a balanced row on desktop and stack cleanly on mobile. Social links stay available in the header, unchanged.

## 3. SEO tags from metaDesc / metaKey
- Home page already uses the member's `metaDesc` and `metaKey`; keep as is.
- Product pages (`/<product-slug>`): confirm each product's own `metaDesc` and `metaKey` are used for `description`, `keywords`, and the Open Graph / Twitter description, falling back to the member values and then the product description when a product leaves them blank.
- Verify a couple of individual product pages in the preview and confirm the rendered `<head>` shows the product-specific title, description, keywords, canonical, image and Product JSON-LD.

## Technical notes
- `src/components/SiteChrome.tsx`: header gets a `tel:` link with the lucide `Phone` icon driven by `member.mobileNumber`; footer grid changes from 3 columns to 2 equal columns and the Follow block is deleted.
- `src/routes/$slug.tsx`: head() description/keywords chain becomes product `metaDesc` -> product `bizDesc` -> member `metaDesc`, and `metaKey` -> member `metaKey`.
- No API, cart, or checkout logic changes.
