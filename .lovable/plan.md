# Checkout tweaks + phone number placement

## 1. Phone mandatory at checkout
Phone becomes a required field on the checkout form (marked with *), and the "Please fill in..." validation now also blocks submit when phone is empty.

## 2. Field order: City above Postcode
Reorder the shipping fields so it reads Full name, Email, Phone, Address, City, Postcode — postcode moves under city, matching the order Google fills them in after an address is picked.

## 3. Address suggestions need two clicks to close
Cause (confirmed in the component): picking a suggestion writes the chosen address back into the input, which re-runs the suggestion effect (text is longer than 3 chars), so a fresh dropdown opens right after the first click. Fix: after a selection, mark the current value as "just selected" and skip the lookup for that value, so the list closes on the first click. Typing again resumes lookups normally.

## 4. Move the phone number from the nav to the Contact section
Remove the phone icon + number from the site header. Show it instead in the Contact Us section on the home page, directly under the contact form card: the same phone icon plus tap-to-call number, using the member's `mobileNumber`. Footer and social links stay as they are.

## Technical notes
- `src/routes/checkout.tsx`: `Field label="Phone"` gets `required`; validation adds `!form.phone`; swap the Postcode/City field order.
- `src/components/AddressAutocomplete.tsx`: add a `justSelectedRef` holding the selected text; the debounce effect returns early when `value` matches it.
- `src/components/SiteChrome.tsx`: delete the `mobileNumber` list item from `SiteHeader`.
- `src/routes/index.tsx`: inside the `contact` section, render the call link below the contact form card (all layout variants reuse the same `contact` block, so one edit covers them).
- No API, cart, payment, or email logic changes.
