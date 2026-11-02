import "server-only";

import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

export async function getMe(userId: string) {
  return toResource(await userQuery(userId, api.users.getMe, {}));
}

export async function getPreferences(userId: string) {
  return toResource(await userQuery(userId, api.userPreferences.get, {}));
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
