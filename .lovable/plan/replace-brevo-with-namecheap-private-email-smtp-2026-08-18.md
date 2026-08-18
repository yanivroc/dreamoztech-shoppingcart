# Replace Brevo with Namecheap (Private Email) SMTP

All contact-form and order emails move off Brevo and go out through your own mailbox on `mail.privateemail.com`, sent from `support@dreamoztech.com`.

## Why an extra piece is needed

The app's server code runs in an edge runtime that cannot open SMTP connections — that is the reason the current code talks to Brevo over HTTP instead of SMTP. So SMTP sending lives in a small standalone Node function deployed alongside the app on Vercel, and the app calls it over HTTPS with a shared secret.

```text
Contact form / Checkout
   -> app server function (edge)
   -> POST /api/send-mail  (Vercel Node function, shared-secret protected)
   -> SMTP mail.privateemail.com:465 (SSL)
   -> inbox
```

Consequence to be aware of: emails will only send on the Vercel deployment. In the Lovable preview the send will fail with a clear "email sending is only available on the deployed site" message instead of silently pretending to succeed.

## What changes for you

- Emails come from `support@dreamoztech.com` (display name DreamozTech); customer replies go to the same mailbox. Nothing is sent from a `no-reply` address, per your answer.
- Order confirmation to the customer, order notification to you, and contact-form notifications all keep their current content and the PDF invoice attachment.
- Brevo is removed entirely — code, config, and its environment variables become unused.

## Environment variables to set in Vercel

| Name | Value |
| --- | --- |
| `SMTP_HOST` | `mail.privateemail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `support@dreamoztech.com` |
| `SMTP_PASSWORD` | your mailbox password |
| `MAIL_FROM_EMAIL` | `support@dreamoztech.com` |
| `MAIL_FROM_NAME` | `DreamozTech` |
| `MAIL_RELAY_SECRET` | a long random string you generate |
| `MAIL_RELAY_URL` | `https://<your-vercel-domain>/api/send-mail` |

`BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` can be deleted after the switch is verified.

Security note: the mailbox password was pasted in chat, so change it in Namecheap and use the new one in Vercel. If port 465 is blocked, 587 with `SMTP_SECURE=false` is the fallback.

## Technical notes

- New `api/send-mail.ts` at the repo root: Vercel Node serverless function (`nodemailer`, already installed) that checks an `x-mail-secret` header against `MAIL_RELAY_SECRET`, validates the payload with zod (to, subject, html, text, replyTo, base64 attachments), and sends via SMTP. Returns provider status/body text on failure.
- New `src/lib/mailer.server.ts` replaces `src/lib/brevo.server.ts`: exports `MAIL_CONFIG` (from address/name read inside the function, not at module scope) and `sendMail()` which POSTs to `MAIL_RELAY_URL` with the secret header and surfaces non-OK status plus body. `toBase64` helper carried over.
- `src/lib/contact.functions.ts` and `src/lib/order-email.functions.ts`: swap the dynamic `./brevo.server` import for `./mailer.server` and rename `sendBrevoEmail` -> `sendMail`; email bodies, consent recording, and invoice attachment logic stay as they are.
- Delete `src/lib/brevo.server.ts`. Update the email section of `README.md` to the SMTP variables above.
- No database, cache, or payment changes.
