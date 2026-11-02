import "server-only";

import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { toResource } from "@/lib/public-api/serialize";
import { invalidatePublicRosters } from "@/lib/roster-cache.server";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

async function findRoster(userId: string, id: string) {
  return await userQuery(userId, api.roster.getOwnById, {
    id: id as Id<"roster">,
  });
}

export async function listRosters(userId: string) {
  return toResource(await userQuery(userId, api.roster.getOwn, {}));
}

export async function getRoster(userId: string, id: string) {
  return toResource(await findRoster(userId, id));
}

export async function createRoster(
  userId: string,
  input: Record<string, unknown>,
) {
  const id = await userMutation(
    userId,
    api.roster.create,
    input as UserArgs<typeof api.roster.create>,
  );

  const roster = await findRoster(userId, id);
  invalidatePublicRosters(roster);

  return toResource(roster);
}

export async function updateRoster(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const previous = await findRoster(userId, id);

  const roster = await userMutation(userId, api.roster.update, {
    ...patch,
    id: previous._id,
  } as UserArgs<typeof api.roster.update>);

  if (roster) {
    invalidatePublicRosters(previous, roster);
  }

  return toResource(roster);
}

export async function deleteRoster(userId: string, id: string) {
  const roster = await findRoster(userId, id);

  await userMutation(userId, api.roster.destroy, { id: roster._id });

  invalidatePublicRosters(roster);
}
