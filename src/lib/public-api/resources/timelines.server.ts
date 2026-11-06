import "server-only";

import type { PaginationOptions } from "convex/server";
import { withRaidTypesResolved } from "@/lib/combat-colors";
import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import {
  formationDefaults,
  timelineDefaults,
  withDefaultLevels,
} from "@/lib/public-api/preference-defaults";
import { getResolvedPreferences } from "@/lib/public-api/resources/account.server";
import { withManualName } from "@/lib/public-api/resources/manual-name";
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
  "formation",
  "formationId",
  "exportIncludeFormation",
  "raid",
  "autoName",
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
  const preferences = await getResolvedPreferences(userId);
  const formation = input.formation as Record<string, unknown> | undefined;

  return toResource(
    await userMutation(userId, api.timeline.create, {
      ...timelineDefaults(preferences),
      ...withRaidTypesResolved(input),
      ...(formation && {
        formation: {
          ...formationDefaults(preferences),
          ...withDefaultLevels(formation, preferences),
        },
      }),
    } as UserArgs<typeof api.timeline.create>),
  );
}

export async function updateTimeline(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const current = await findTimeline(userId, id);
  const formation = patch.formation as Record<string, unknown> | undefined;
  const preferences = formation && (await getResolvedPreferences(userId));
  const resolved = withRaidTypesResolved(withManualName(patch));

  return toResource(
    await userMutation(userId, api.timeline.update, {
      ...mergeForUpdate(current, UPDATE_KEYS, resolved),
      ...(formation &&
        preferences && {
          formation: {
            ...formationDefaults(preferences),
            ...current.formation,
            ...withDefaultLevels(formation, preferences, current.formation),
          },
        }),
      id: current._id,
    } as UserArgs<typeof api.timeline.update>),
  );
}

export async function deleteTimeline(userId: string, id: string) {
  await userMutation(userId, api.timeline.destroy, {
    id: id as Id<"timeline">,
  });
}
