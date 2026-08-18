# Drop MAIL_RELAY_SECRET and MAIL_RELAY_URL

You don't want to add two extra variables just to make the mail relay work. Fair — they can both go away.

## Why the relay exists at all

The email itself is always sent from your Namecheap mailbox over SMTP. The only reason there is a small internal endpoint (`/api/send-mail`) is that the app's own server runtime cannot open SMTP connections; that endpoint runs in a Node runtime on the same deployment and does the SMTP send. Nothing is sent by any third-party email service.

## What changes

- `MAIL_RELAY_URL` is no longer read at all. The app calls its own deployment's `/api/send-mail` (same origin), resolved from the incoming request.
- `MAIL_RELAY_SECRET` is no longer needed. Instead of a separate shared secret, both sides derive the same internal token from the SMTP credentials you already set in Vercel — the app and the endpoint share the same environment, so the check still works and outsiders (who don't have your mailbox password) cannot use the endpoint to send mail.

This keeps the endpoint closed. Leaving it fully unauthenticated is not acceptable, because order confirmations go to customer-supplied addresses — an open endpoint would be usable by anyone as a spam relay from your domain.

## Environment variables after this change

Only the SMTP set stays:

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`

`MAIL_RELAY_URL` and `MAIL_RELAY_SECRET` can be deleted from Vercel.

Note: in the Lovable preview there is no Node relay endpoint, so sends there will still report that email works only on the deployed site.

## Technical notes

- `src/lib/mailer.server.ts`: remove both `MAIL_RELAY_*` reads. Build the target URL from the current request origin (`getRequest()` from `@tanstack/react-start`), falling back to `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`. Compute the internal token as an HMAC-SHA256 of a fixed label keyed by `SMTP_PASSWORD` (Web Crypto, available in the edge runtime) and send it as the `x-mail-secret` header.
- `api/send-mail.ts`: replace the `MAIL_RELAY_SECRET` comparison with the same derived token, compared with `crypto.timingSafeEqual`. Keep existing payload validation, attachment limits, and SMTP config handling unchanged.
- `README.md`: drop the two relay variables from the email section and explain the same-origin relay.
- No database, payment, or checkout changes.
