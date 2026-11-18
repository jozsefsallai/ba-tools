import { createHash } from "node:crypto";
import { logger } from "@trigger.dev/sdk";

const API_URL = "https://discord.com/api/v10";

const ALREADY_CROSSPOSTED = 40033;

const MAX_RATE_LIMIT_RETRIES = 5;

type DiscordError = {
  code?: number;
  message?: string;
  retry_after?: number;
};

class DiscordApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: DiscordError,
  ) {
    super(
      `Discord API error ${status}${body.code ? ` (${body.code})` : ""}: ${body.message ?? "unknown error"}`,
    );
  }
}

async function discordRequest<T>(
  token: string,
  path: string,
  body?: unknown,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    const error = (await res.json().catch(() => ({}))) as DiscordError;

    if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryAfter = error.retry_after ?? 1;
      logger.warn(`Rate limited by Discord, retrying in ${retryAfter}s`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    throw new DiscordApiError(res.status, error);
  }
}

export async function publishAnnouncement(
  messages: string[],
  nonceSeed: string,
): Promise<string[]> {
  const token = process.env.ARONABOT_DISCORD_TOKEN;
  const channelId = process.env.ARONABOT_ANNOUNCEMENT_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error(
      "ARONABOT_DISCORD_TOKEN and ARONABOT_ANNOUNCEMENT_CHANNEL_ID must be set",
    );
  }

  const messageIds: string[] = [];

  for (const [index, content] of messages.entries()) {
    // Discord accepts nonces of up to 25 characters
    const nonce = createHash("sha256")
      .update(`${nonceSeed}:${index}`)
      .digest("hex")
      .slice(0, 25);

    const message = await discordRequest<{
      id: string;
    }>(token, `/channels/${channelId}/messages`, {
      content,
      nonce,
      enforce_nonce: true,
      allowed_mentions: {
        parse: [],
      },
    });

    try {
      await discordRequest(
        token,
        `/channels/${channelId}/messages/${message.id}/crosspost`,
      );
    } catch (error) {
      if (
        !(error instanceof DiscordApiError) ||
        error.body.code !== ALREADY_CROSSPOSTED
      ) {
        throw error;
      }
    }

    logger.info(`Published announcement message ${message.id}`);
    messageIds.push(message.id);
  }

  return messageIds;
}
