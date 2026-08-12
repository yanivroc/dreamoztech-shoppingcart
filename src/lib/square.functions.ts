import { createServerFn } from "@tanstack/react-start";

export const getSquarePublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    applicationId: process.env.SQUARE_APPLICATION_ID ?? "",
    locationId: process.env.SQUARE_LOCATION_ID ?? "",
    environment: (process.env.SQUARE_ENVIRONMENT ?? "sandbox").toLowerCase(),
  };
});

type PayInput = {
  sourceId: string;
  amount: number; // in major units (e.g. 35.50)
  currency: string;
  buyer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  note?: string;
};

export const createSquarePayment = createServerFn({ method: "POST" })
  .inputValidator((d: PayInput) => {
    if (!d?.sourceId || typeof d.sourceId !== "string") throw new Error("sourceId required");
    if (!d?.amount || d.amount <= 0) throw new Error("amount required");
    if (!d?.currency) throw new Error("currency required");
    return d;
  })
  .handler(async ({ data }) => {
    const { squareFetch } = await import("./square.server");
    const locationId = process.env.SQUARE_LOCATION_ID;
    const idempotencyKey =
      (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`) + "";

    const amountMinor = Math.round(data.amount * 100);

    const body: any = {
      source_id: data.sourceId,
      idempotency_key: idempotencyKey,
      amount_money: { amount: amountMinor, currency: data.currency.toUpperCase() },
      location_id: locationId,
      autocomplete: true,
    };
    if (data.buyer?.email) body.buyer_email_address = data.buyer.email;
    if (data.note) body.note = data.note.slice(0, 500);
    if (data.buyer?.address) {
      body.shipping_address = {
        address_line_1: data.buyer.address,
        locality: data.buyer.city,
        postal_code: data.buyer.postcode,
        country: data.buyer.country || "AU",
      };
    }

    const result = await squareFetch("/v2/payments", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const p = result?.payment;
    return {
      id: p?.id,
      status: p?.status,
      receiptUrl: p?.receipt_url,
      amount: p?.amount_money,
    };
  });
