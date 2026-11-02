import "server-only";

import type { PaginationOptions } from "convex/server";
import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { mergeForUpdate } from "@/lib/public-api/route";
import { toPage, toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const UPDATE_KEYS = [
  "name",
  "type",
  "strikers",
  "specials",
  "rows",
  "rowGap",
  "displayOverline",
  "noDisplayRole",
  "groupsVertical",
] as const;

async function findFormation(userId: string, id: string) {
  return await userQuery(userId, api.formation.getById, {
    id: id as Id<"formation">,
  });
}

export async function listFormations(
  userId: string,
  paginationOpts: PaginationOptions,
) {
  return toPage(
    await userQuery(userId, api.formation.getOwnPaginated, {
      paginationOpts,
    }),
  );
}

export async function getFormation(userId: string, id: string) {
  return toResource(await findFormation(userId, id));
}

export async function createFormation(
  userId: string,
  input: Record<string, unknown>,
) {
  return toResource(
    await userMutation(
      userId,
      api.formation.create,
      input as UserArgs<typeof api.formation.create>,
    ),
  );
}

export async function updateFormation(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const current = await findFormation(userId, id);

  return toResource(
    await userMutation(userId, api.formation.update, {
      ...mergeForUpdate(current, UPDATE_KEYS, patch),
      id: current._id,
    } as UserArgs<typeof api.formation.update>),
  );
}

export async function deleteFormation(userId: string, id: string) {
  await userMutation(userId, api.formation.destroy, {
    id: id as Id<"formation">,
  });
}
