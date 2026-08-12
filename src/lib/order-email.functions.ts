import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  title: z.string().max(300),
  qty: z.number().int().min(1).max(999),
  price: z.number().min(0),
});

const schema = z.object({
  orderId: z.string().max(200),
  receiptUrl: z.string().url().optional().nullable(),
  currency: z.string().max(8),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  total: z.number().min(0),
  buyer: z.object({
    name: z.string().max(120),
    email: z.string().email().max(255),
    phone: z.string().max(60).optional().default(""),
    address: z.string().max(300),
    city: z.string().max(120).optional().default(""),
    postcode: z.string().max(40).optional().default(""),
  }),
  items: z.array(itemSchema).min(1).max(100),
});

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: cur }).format(n);

export const sendOrderEmails = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const { BREVO_EMAIL_CONFIG, sendBrevoEmail } = await import("./brevo.server");
    const { dreamozGet } = await import("./dreamoz.server");
    const { buildInvoicePdfBase64 } = await import("./invoice-pdf.server");


    const memberResp = await dreamozGet("/Member/Get");
    const member = memberResp?.member ?? memberResp;
    const ownerEmail: string =
      member?.memberEmail ?? "support@dreamoztech.com";
    const brand: string = member?.memberFullName ?? "DreamozTech";

    const cur = data.currency.toUpperCase();
    const rows = data.items
      .map(
        (i) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #eee;">${esc(i.title)}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
  <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmt(i.qty * i.price, cur)}</td>
</tr>`
      )
      .join("");

    const summary = `
<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
  <thead>
    <tr style="background:#f7f7f7;">
      <th style="padding:8px;text-align:left;">Item</th>
      <th style="padding:8px;text-align:center;">Qty</th>
      <th style="padding:8px;text-align:right;">Price</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr><td colspan="2" style="padding:6px 8px;text-align:right;">Subtotal</td><td style="padding:6px 8px;text-align:right;">${fmt(data.subtotal, cur)}</td></tr>
    <tr><td colspan="2" style="padding:6px 8px;text-align:right;">Delivery</td><td style="padding:6px 8px;text-align:right;">${fmt(data.deliveryFee, cur)}</td></tr>
    <tr><td colspan="2" style="padding:8px;text-align:right;font-weight:bold;border-top:2px solid #333;">Total</td><td style="padding:8px;text-align:right;font-weight:bold;border-top:2px solid #333;">${fmt(data.total, cur)}</td></tr>
  </tfoot>
</table>`;

    const buyerBlock = `
<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">
  <strong>Name:</strong> ${esc(data.buyer.name)}<br/>
  <strong>Email:</strong> ${esc(data.buyer.email)}<br/>
  ${data.buyer.phone ? `<strong>Phone:</strong> ${esc(data.buyer.phone)}<br/>` : ""}
  <strong>Address:</strong> ${esc(data.buyer.address)}${data.buyer.city ? ", " + esc(data.buyer.city) : ""}${data.buyer.postcode ? " " + esc(data.buyer.postcode) : ""}
</p>`;

    const orderDate = new Date().toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const invoiceHtml = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Invoice ${esc(data.orderId)}</title></head>
<body style="font-family:Arial,sans-serif;color:#111;max-width:720px;margin:24px auto;padding:0 16px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px;">
    <div>
      <h1 style="margin:0;font-size:28px;">INVOICE</h1>
      <p style="margin:4px 0;color:#666;font-size:13px;">Invoice #: ${esc(data.orderId)}<br/>Date: ${orderDate}</p>
    </div>
    <div style="text-align:right;">
      <strong>${esc(brand)}</strong><br/>
      <span style="color:#666;font-size:13px;">${esc(BREVO_EMAIL_CONFIG.emailFrom)}</span>
    </div>
  </div>
  <h3 style="margin:0 0 8px;">Bill To</h3>
  ${buyerBlock}
  <h3 style="margin:24px 0 8px;">Order Details</h3>
  ${summary}
  <p style="color:#666;font-size:12px;margin-top:32px;text-align:center;">Thank you for your business!</p>
</body></html>`;

    const customerHtml = `
<div style="font-family:Arial,sans-serif;color:#111;max-width:640px;margin:0 auto;">
  <h2 style="color:#111;">Thank you for your order, ${esc(data.buyer.name)}!</h2>
  <p>We've received your order <strong>#${esc(data.orderId)}</strong> and it's being processed. Your invoice is attached to this email.</p>
  ${summary}
  <h3 style="margin-top:24px;">Delivery details</h3>
  ${buyerBlock}
  <p style="color:#666;font-size:12px;margin-top:24px;">If you have any questions, reply to this email.</p>
  <p style="color:#666;font-size:12px;">— ${esc(brand)}</p>
</div>`;

    // 2) Owner notification
    const ownerHtml = `
<div style="font-family:Arial,sans-serif;color:#111;max-width:640px;margin:0 auto;">
  <h2>New order received #${esc(data.orderId)}</h2>
  ${summary}
  <h3 style="margin-top:24px;">Customer</h3>
  ${buyerBlock}
</div>`;

    const pdfBase64 = await buildInvoicePdfBase64({
      orderId: data.orderId,
      brand,
      brandEmail: BREVO_EMAIL_CONFIG.emailFrom,
      currency: cur,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      total: data.total,
      buyer: data.buyer,
      items: data.items,
    });
    const invoiceAttachment = [
      { name: `invoice-${data.orderId}.pdf`, content: pdfBase64 },
    ];

    const from = { email: BREVO_EMAIL_CONFIG.emailFrom, name: brand };

    await Promise.all([
      sendBrevoEmail({
        from,
        to: [{ email: data.buyer.email, name: data.buyer.name }],
        subject: `Order Confirmation #${data.orderId} - ${brand}`,
        htmlContent: customerHtml,
        attachment: invoiceAttachment,
      }),
      sendBrevoEmail({
        from,
        to: [{ email: ownerEmail }],
        replyTo: { email: data.buyer.email, name: data.buyer.name },
        subject: `New Order #${data.orderId} - ${fmt(data.total, cur)}`,
        htmlContent: ownerHtml,
        attachment: invoiceAttachment,
      }),
    ]);

    return { ok: true };
  });
