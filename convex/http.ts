import type { WebhookEvent } from "@clerk/nextjs/server";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();
const BMC_COFFEE_EVENTS = new Set(["donation.created", "coffee-purchase"]);

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id") as string,
    "svix-timestamp": req.headers.get("svix-timestamp") as string,
    "svix-signature": req.headers.get("svix-signature") as string,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET as string);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

function normalizeBmcSignature(signature: string): string {
  return signature
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
}

function hexToBytes(hex: string): ArrayBuffer | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }

  return bytes.buffer;
}

async function verifyBmcSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const normalizedSignature = normalizeBmcSignature(signature);
  const signatureBytes = hexToBytes(normalizedSignature);

  if (!signatureBytes) {
    return false;
  }

  const encoder = new TextEncoder();
  const payloadBytes = new Uint8Array(encoder.encode(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return await crypto.subtle.verify("HMAC", key, signatureBytes, payloadBytes);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSupportCreatedOn(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    // BMAC uses unix seconds in newer webhook payloads.
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const numericValue = Number(value.trim());
  if (Number.isFinite(numericValue)) {
    return parseSupportCreatedOn(numericValue);
  }

  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T").concat("Z");
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCoffeePurchase(
  payload: string,
  rawEvent: string,
): {
  supporterName?: string;
  amount: number;
  currency: string;
  numberOfCoffees?: number;
  supportNote?: string;
  supportCreatedOn: number;
  bmcSupportId?: string;
  rawEvent: string;
} | null {
  try {
    const parsedPayload = JSON.parse(payload);
    if (!parsedPayload || typeof parsedPayload !== "object") {
      return null;
    }

    const root = parsedPayload as Record<string, unknown>;
    const data =
      (root.data as Record<string, unknown> | undefined) ??
      (root.response as Record<string, unknown> | undefined);

    if (!data) {
      return null;
    }

    const amount =
      parseNumber(data.amount) ??
      parseNumber(data.total_amount) ??
      parseNumber(data.total_amount_charged);
    const supportCreatedOn =
      parseSupportCreatedOn(data.created_at) ??
      parseSupportCreatedOn(data.support_created_on) ??
      parseSupportCreatedOn(root.created);

    if (amount === null || supportCreatedOn === null) {
      return null;
    }

    const numberOfCoffees =
      parseNumber(data.coffee_count) ?? parseNumber(data.number_of_coffees);
    const supporterName =
      typeof data.supporter_name === "string" && data.supporter_name.trim()
        ? data.supporter_name.trim()
        : undefined;
    const supportNote =
      typeof data.support_note === "string" && data.support_note.trim()
        ? data.support_note.trim()
        : undefined;
    const bmcSupportIdRaw = data.support_id ?? data.transaction_id ?? data.id;
    const bmcSupportId =
      typeof bmcSupportIdRaw === "string" || typeof bmcSupportIdRaw === "number"
        ? String(bmcSupportIdRaw)
        : undefined;

    return {
      supporterName,
      amount,
      currency:
        typeof data.currency === "string" && data.currency.trim()
          ? data.currency.trim().toUpperCase()
          : "USD",
      numberOfCoffees: numberOfCoffees ?? undefined,
      supportNote,
      supportCreatedOn,
      bmcSupportId,
      rawEvent,
    };
  } catch (error) {
    console.error("Error parsing BMC webhook payload", error);
    return null;
  }
}

function parseBmcEventType(payload: string): string {
  try {
    const parsedPayload = JSON.parse(payload) as {
      type?: unknown;
    };
    return typeof parsedPayload.type === "string"
      ? parsedPayload.type.toLowerCase()
      : "";
  } catch {
    return "";
  }
}

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const event = await validateRequest(req);
    if (!event) {
      return new Response("Invalid webhook event", { status: 400 });
    }

    switch (event.type) {
      case "user.created": // fallthrough
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;

      case "user.deleted": {
        const externalId = event.data.id as string;
        await ctx.runMutation(internal.users.deleteFromClerk, { externalId });
        break;
      }
      default:
        console.log("Ignored Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/webhooks/buymeacoffee",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.BUY_ME_A_COFFEE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing BUY_ME_A_COFFEE_WEBHOOK_SECRET in Convex env");
      return new Response("Webhook not configured", { status: 500 });
    }

    const payload = await req.text();
    const signature =
      req.headers.get("x-bmc-signature") ??
      req.headers.get("x-signature-sha256") ??
      "";

    const isValid = await verifyBmcSignature(payload, signature, secret);
    if (!isValid) {
      return new Response("Invalid signature", { status: 400 });
    }

    const event = parseBmcEventType(payload);

    if (!BMC_COFFEE_EVENTS.has(event)) {
      console.log("Ignored BMAC webhook event", event);
      return new Response(null, { status: 200 });
    }

    const donation = parseCoffeePurchase(payload, event);
    if (!donation) {
      return new Response("Invalid payload", { status: 400 });
    }

    await ctx.runMutation(internal.donations.recordDonation, donation);
    return new Response(null, { status: 200 });
  }),
});

export default http;
