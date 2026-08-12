import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type InvoiceData = {
  orderId: string;
  brand: string;
  brandEmail: string;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  buyer: {
    name: string;
    email: string;
    phone?: string;
    address: string;
    city?: string;
    postcode?: string;
  };
  items: { title: string; qty: number; price: number }[];
};

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: cur }).format(n);

export async function buildInvoicePdfBase64(data: InvoiceData): Promise<string> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const cur = data.currency.toUpperCase();
  const black = rgb(0.07, 0.07, 0.07);
  const gray = rgb(0.4, 0.4, 0.4);
  const line = rgb(0.85, 0.85, 0.85);

  const margin = 40;
  let y = 800;

  page.drawText("INVOICE", { x: margin, y, size: 24, font: bold, color: black });
  page.drawText(data.brand, {
    x: 595 - margin - bold.widthOfTextAtSize(data.brand, 12),
    y: y + 8,
    size: 12,
    font: bold,
    color: black,
  });
  page.drawText(data.brandEmail, {
    x: 595 - margin - font.widthOfTextAtSize(data.brandEmail, 10),
    y: y - 6,
    size: 10,
    font,
    color: gray,
  });

  y -= 30;
  const orderDate = new Date().toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(`Invoice #: ${data.orderId}`, { x: margin, y, size: 10, font, color: gray });
  y -= 12;
  page.drawText(`Date: ${orderDate}`, { x: margin, y, size: 10, font, color: gray });

  y -= 24;
  page.drawLine({ start: { x: margin, y }, end: { x: 595 - margin, y }, thickness: 1.5, color: black });

  y -= 20;
  page.drawText("Bill To", { x: margin, y, size: 12, font: bold, color: black });
  y -= 16;
  const buyerLines = [
    data.buyer.name,
    data.buyer.email,
    data.buyer.phone || "",
    [data.buyer.address, data.buyer.city, data.buyer.postcode].filter(Boolean).join(", "),
  ].filter(Boolean);
  for (const l of buyerLines) {
    page.drawText(l, { x: margin, y, size: 10, font, color: black });
    y -= 13;
  }

  y -= 14;
  page.drawText("Order Details", { x: margin, y, size: 12, font: bold, color: black });
  y -= 16;

  // Table header
  const colItem = margin;
  const colQty = 360;
  const colPrice = 555;
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: 595 - margin * 2,
    height: 20,
    color: rgb(0.96, 0.96, 0.96),
  });
  page.drawText("Item", { x: colItem + 6, y: y + 2, size: 10, font: bold, color: black });
  page.drawText("Qty", { x: colQty, y: y + 2, size: 10, font: bold, color: black });
  const priceLabel = "Price";
  page.drawText(priceLabel, {
    x: colPrice - bold.widthOfTextAtSize(priceLabel, 10),
    y: y + 2,
    size: 10,
    font: bold,
    color: black,
  });
  y -= 18;

  const wrap = (text: string, maxWidth: number, size: number) => {
    const words = text.split(/\s+/);
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const trial = cur ? cur + " " + w : w;
      if (font.widthOfTextAtSize(trial, size) > maxWidth) {
        if (cur) out.push(cur);
        cur = w;
      } else cur = trial;
    }
    if (cur) out.push(cur);
    return out;
  };

  for (const it of data.items) {
    const rowTop = y;
    const lines = wrap(it.title, colQty - colItem - 12, 10);
    const rowHeight = Math.max(16, lines.length * 12 + 4);
    let ly = rowTop;
    for (const l of lines) {
      page.drawText(l, { x: colItem + 6, y: ly, size: 10, font, color: black });
      ly -= 12;
    }
    page.drawText(String(it.qty), { x: colQty, y: rowTop, size: 10, font, color: black });
    const priceText = fmt(it.qty * it.price, cur);
    page.drawText(priceText, {
      x: colPrice - font.widthOfTextAtSize(priceText, 10),
      y: rowTop,
      size: 10,
      font,
      color: black,
    });
    y = rowTop - rowHeight;
    page.drawLine({
      start: { x: margin, y },
      end: { x: 595 - margin, y },
      thickness: 0.5,
      color: line,
    });
    y -= 10;
  }

  y -= 2;
  const row = (label: string, value: string, isBold = false) => {
    const f = isBold ? bold : font;
    page.drawText(label, {
      x: colQty,
      y,
      size: 10,
      font: f,
      color: black,
    });
    page.drawText(value, {
      x: colPrice - f.widthOfTextAtSize(value, 10),
      y,
      size: 10,
      font: f,
      color: black,
    });
    y -= 14;
  };
  row("Subtotal", fmt(data.subtotal, cur));
  row("Delivery", fmt(data.deliveryFee, cur));
  page.drawLine({
    start: { x: colQty, y: y + 4 },
    end: { x: 595 - margin, y: y + 4 },
    thickness: 1.5,
    color: black,
  });
  y -= 12;
  row("Total", fmt(data.total, cur), true);

  y -= 30;
  const thanks = "Thank you for your business!";
  page.drawText(thanks, {
    x: (595 - font.widthOfTextAtSize(thanks, 10)) / 2,
    y,
    size: 10,
    font,
    color: gray,
  });

  const bytes = await pdf.save();
  // base64 encode
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
