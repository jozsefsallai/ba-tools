import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";

const http = httpRouter();

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

export default http;
