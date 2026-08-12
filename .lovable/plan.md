# Hide products where bizEnable/bizPublic are false

## What's happening now

No — the product list does not check those flags. Confirmed in `src/lib/dreamoz.functions.ts`:

- Posts are filtered on `bizEnable === true && bizPublic === true` (lines 11-16).
- Products are filtered only on having a real `bizDisplayTitle` (not empty, not `new-product`) — lines 17-21. No flag check.

Confirmed in the live preview: Brown Butter Treat, Cookies And Cream Bliss and The Og Cookie are all still rendered on the home page.

## Fix

Apply the same visibility rule to products in `src/lib/dreamoz.functions.ts`:

- Keep a product only when `bizEnable === true` AND `bizPublic === true`, in addition to the existing title check.
- Flags are treated strictly: anything other than `true` (false, missing, string) hides the product, matching how posts already behave.

## Verify

Reload the home page and confirm the three named items no longer appear, and that the remaining enabled/public products (and the cart flow) still work.
