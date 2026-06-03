import { cookies } from "next/headers";
import { z } from "zod";

export const PLANA_CONFIG_COOKIE_KEY = "_ba_tools__plana_config";

export const planaProviderSchema = z.enum(["openrouter", "gateway"]);

export const planaConfigSchema = z.object({
  provider: planaProviderSchema,
  apiKey: z.string().trim().min(1),
  chatModel: z.string().trim().optional(),
});

export type PlanaProviderId = z.infer<typeof planaProviderSchema>;
export type PlanaConfig = z.infer<typeof planaConfigSchema>;

export type PlanaConfigStatus = {
  provider: PlanaProviderId | null;
  hasKey: boolean;
  chatModel?: string;
};

export const PLANA_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export function encodePlanaConfig(config: PlanaConfig) {
  return encodeURIComponent(JSON.stringify(config));
}

export function decodePlanaConfig(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return planaConfigSchema.parse(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

export async function readPlanaConfig() {
  const cookieStore = await cookies();

  return decodePlanaConfig(cookieStore.get(PLANA_CONFIG_COOKIE_KEY)?.value);
}
