# Marketing email consent on contact + checkout

Add an explicit, unchecked marketing-consent checkbox wherever an email address is collected, so contacts satisfy Brevo's Anti-Spam Policy.

## Consent wording

Checkbox label (unchecked by default):

"I agree to receive marketing emails from DreamozTech about our products, services, updates and promotions. I can unsubscribe at any time."

Small helper line under it:

"We'll only use your details to respond to you and, with your consent, to send occasional updates. See how we handle your data — we never share it with third parties."

## Contact form

- New checkbox above the Send button, unchecked, required — the form cannot be submitted until it's ticked, with an inline message if the user tries.
- The consent value (plus the exact wording shown and a timestamp) is included in the notification email so there's a record of what was agreed to.

## Checkout

- Same checkbox and wording in the Shipping & Payment form, placed under the contact fields, unchecked.
- Required before payment, matching the existing "please fill in..." validation style.
- The consent flag, wording and timestamp are added to the order confirmation email sent to DreamozTech.

## Note worth flagging

Brevo (and GDPR/Australian Spam Act practice) treat consent as valid only when freely given. Forcing the tick before someone can buy or ask a question is technically "bundled" consent and can be challenged. The safer setup is: keep the checkbox unchecked and optional, and only add the person to marketing lists when it's ticked. Say the word and I'll switch checkout (or both) to optional instead of mandatory.

## Technical notes

- `src/components/ContactForm.tsx`: add a `consent` checkbox (`required`), include `marketingConsent` in the `sendContactEmail` payload.
- `src/lib/contact.functions.ts`: extend the zod schema with `marketingConsent: z.literal(true)` and render a "Marketing consent: Yes — <wording> (<ISO timestamp>)" line in the email body.
- `src/routes/checkout.tsx`: add consent state + checkbox, block `handlePay` when unticked, pass `marketingConsent` to `sendOrderEmails`.
- `src/lib/order-email.functions.ts`: add `marketingConsent` to the schema and print it in the internal order email.
- Consent text lives in one shared constant (`src/lib/consent.ts`) so both forms and both emails use identical wording.
- No database, payment or cache logic changes.
