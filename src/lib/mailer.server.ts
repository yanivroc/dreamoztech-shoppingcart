// Server-only mail sender.
// The app runs in an edge runtime that cannot open SMTP connections, so sends
// are relayed to a Vercel Node serverless function (api/send-mail.ts) which
// talks SMTP to Namecheap Private Email.

type Address = { email: string; name?: string };
type Attachment = { name: string; content: string }; // content = base64

export function getMailConfig() {
  return {
    emailFrom: process.env.MAIL_FROM_EMAIL?.trim() || "support@dreamoztech.com",
    fromName: process.env.MAIL_FROM_NAME?.trim() || "DreamozTech",
  };
}

export async function sendMail(opts: {
  from: Address;
  to: Address[];
  replyTo?: Address;
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: Attachment[];
}) {
  const relayUrl = process.env.MAIL_RELAY_URL?.trim();
  const relaySecret = process.env.MAIL_RELAY_SECRET;

  if (!relayUrl || !relaySecret) {
    throw new Error(
      "Email sending is only available on the deployed site (MAIL_RELAY_URL / MAIL_RELAY_SECRET are not configured)."
    );
  }

  const res = await fetch(relayUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mail-secret": relaySecret,
    },
    body: JSON.stringify({
      // The relay owns the From identity (it must match the SMTP mailbox);
      // the display name is still taken from config there.
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      textContent: opts.textContent,
      attachment: opts.attachment,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed: ${res.status} ${body}`);
  }
  return res.json();
}

// Base64-encode a UTF-8 string in a runtime-agnostic way.
export function toBase64(str: string) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
