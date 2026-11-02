"use server";

import { cookies } from "next/headers";
import {
  decodePlanaConfig,
  encodePlanaConfig,
  PLANA_CONFIG_COOKIE_KEY,
  PLANA_COOKIE_MAX_AGE_SECONDS,
  type PlanaConfig,
  type PlanaConfigStatus,
  planaConfigSchema,
} from "@/lib/ai/plana-config";

const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: PLANA_COOKIE_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function savePlanaConfig(input: PlanaConfig) {
  const config = planaConfigSchema.parse(input);
  const cookieStore = await cookies();

  cookieStore.set(PLANA_CONFIG_COOKIE_KEY, encodePlanaConfig(config), {
    ...COOKIE_OPTIONS,
  });
}

export async function clearPlanaConfig() {
  const cookieStore = await cookies();

  cookieStore.delete(PLANA_CONFIG_COOKIE_KEY);
}

export async function getPlanaConfigStatus(): Promise<PlanaConfigStatus> {
  const cookieStore = await cookies();
  const config = decodePlanaConfig(
    cookieStore.get(PLANA_CONFIG_COOKIE_KEY)?.value,
  );

  if (!config) {
    return {
      hasKey: false,
      provider: null,
    };
  }

  return {
    chatModel: config.chatModel,
    hasKey: true,
    provider: config.provider,
  };
}
