// Server-only mail sender.
// The app runs in an edge runtime that cannot open SMTP connections, so sends
// are relayed to the same deployment's Node serverless function
// (api/send-mail.ts) which talks SMTP to Namecheap Private Email.
// No extra env vars: the relay lives on this origin and both sides derive the
// same internal token from SMTP_PASSWORD.
import { getRequestUrl } from "@tanstack/react-start/server";

type Address = { email: string; name?: string };
type Attachment = { name: string; content: string }; // content = base64

export function getMailConfig() {
  return {
    emailFrom: process.env.MAIL_FROM_EMAIL?.trim() || "support@dreamoztech.com",
    fromName: process.env.MAIL_FROM_NAME?.trim() || "DreamozTech",
  };
}

const RELAY_TOKEN_LABEL = "dreamoztech-mail-relay-v1";

async function relayToken(smtpPassword: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(smtpPassword),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(RELAY_TOKEN_LABEL));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function relayUrl() {
  // Same-origin relay on the current deployment.
  try {
    const url = getRequestUrl();
    if (url?.origin && !url.origin.includes("localhost")) return `${url.origin}/api/send-mail`;
  } catch {
    // no request context (e.g. build time)
  }
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  return host ? `https://${host.replace(/^https?:\/\//, "")}/api/send-mail` : null;
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
  const relaySecret = process.env.MAIL_RELAY_SECRET;
  let relayUrl = process.env.MAIL_RELAY_URL?.trim();

  // Fall back to the same-origin relay on the current deployment, so
  // MAIL_RELAY_URL only needs setting for a non-standard host.
  if (!relayUrl) {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
    if (host) relayUrl = `https://${host.replace(/^https?:\/\//, "")}/api/send-mail`;
  }

  if (!relayUrl || !relaySecret) {
    throw new Error(
      relaySecret
        ? "Email sending is only available on the deployed site (no relay URL could be resolved; set MAIL_RELAY_URL)."
        : "Email sending is not configured (MAIL_RELAY_SECRET is missing)."
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
