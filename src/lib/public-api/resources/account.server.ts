import "server-only";

import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { resolvePreferences } from "@/lib/public-api/preference-defaults";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

export async function getMe(userId: string) {
  return toResource(await userQuery(userId, api.users.getMe, {}));
}

export async function getPreferences(userId: string) {
  return toResource(await userQuery(userId, api.userPreferences.get, {}));
}

export async function getResolvedPreferences(userId: string) {
  return resolvePreferences(
    await userQuery(userId, api.userPreferences.get, {}),
  );
}

export async function updatePreferences(
  userId: string,
  input: Record<string, unknown>,
) {
  return toResource(
    await userMutation(
      userId,
      api.userPreferences.update,
      input as UserArgs<typeof api.userPreferences.update>,
    ),
  );
}
