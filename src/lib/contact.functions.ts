import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
  captchaAnswer: z.coerce.number().int(),
  captchaA: z.coerce.number().int().min(0).max(99),
  captchaB: z.coerce.number().int().min(0).max(99),
});

export const sendContactEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    if (data.captchaAnswer !== data.captchaA + data.captchaB) {
      throw new Error("Captcha verification failed. Please try again.");
    }

    const { BREVO_EMAIL_CONFIG, sendBrevoEmail } = await import("./brevo.server");
    const { dreamozGet } = await import("./dreamoz.server");

    const memberResp = await dreamozGet("/Member/Get");
    const member = memberResp?.member ?? memberResp;
    const toEmail =
      member?.memberEmail ?? member?.email ?? "support@dreamoztech.com";

    const safe = (s: string) =>
      s.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
      );

    await sendBrevoEmail({
      from: {
        email: BREVO_EMAIL_CONFIG.emailFrom,
        name: `${data.name} via ${BREVO_EMAIL_CONFIG.fromName}`,
      },
      to: [{ email: toEmail }],
      replyTo: { email: data.email, name: data.name },
      subject: `[Contact] ${data.subject}`,
      textContent: `Name: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
      htmlContent: `<p><strong>Name:</strong> ${safe(data.name)}<br/>
<strong>Email:</strong> ${safe(data.email)}</p>
<p><strong>Subject:</strong> ${safe(data.subject)}</p>
<p>${safe(data.message).replace(/\n/g, "<br/>")}</p>`,
    });

    return { ok: true };
  });
