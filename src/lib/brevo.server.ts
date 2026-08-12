// Server-only Brevo configuration & HTTP API sender.
// Cloudflare Workers don't allow outbound SMTP, so we use Brevo's HTTP API.

export const BREVO_EMAIL_CONFIG = {
  emailFrom: process.env.BREVO_FROM_EMAIL?.trim() || "support@dreamoztech.com",
  fromName: process.env.BREVO_FROM_NAME?.trim() || "DreamozTech",
};

type Attachment = { name: string; content: string }; // content = base64

export async function sendBrevoEmail(opts: {
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  replyTo?: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: Attachment[];
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured. Add it in Vercel Environment Variables.");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: opts.from,
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
    throw new Error(`Brevo send failed: ${res.status} ${body}`);
  }
  return res.json();
}

// Base64-encode a UTF-8 string in a runtime-agnostic way.
export function toBase64(str: string) {
  // Workers have global btoa; encode UTF-8 first via TextEncoder.
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
