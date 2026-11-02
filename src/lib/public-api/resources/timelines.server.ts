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
  "description",
  "visibility",
  "showCreator",
  "items",
  "itemSpacing",
  "verticalSeparatorSize",
  "horizontalSeparatorSize",
  "exportWithTransparentBackground",
  "exportBackgroundColor",
  "exportBackgroundOpacity",
] as const;

async function findTimeline(userId: string, id: string) {
  return await userQuery(userId, api.timeline.getOwnById, {
    id: id as Id<"timeline">,
  });
}

export async function listTimelines(
  userId: string,
  paginationOpts: PaginationOptions,
) {
  return toPage(
    await userQuery(userId, api.timeline.getOwnPaginated, {
      paginationOpts,
    }),
  );
}

export async function getTimeline(userId: string, id: string) {
  return toResource(await findTimeline(userId, id));
}

export async function createTimeline(
  userId: string,
  input: Record<string, unknown>,
) {
  return toResource(
    await userMutation(
      userId,
      api.timeline.create,
      input as UserArgs<typeof api.timeline.create>,
    ),
  );
}

export async function updateTimeline(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const current = await findTimeline(userId, id);

  return toResource(
    await userMutation(userId, api.timeline.update, {
      ...mergeForUpdate(current, UPDATE_KEYS, patch),
      id: current._id,
    } as UserArgs<typeof api.timeline.update>),
  );
}

export async function deleteTimeline(userId: string, id: string) {
  await userMutation(userId, api.timeline.destroy, {
    id: id as Id<"timeline">,
  });
}
