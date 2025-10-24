/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as formation from "../formation.js";
import type * as gifts from "../gifts.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as roster from "../roster.js";
import type * as timeline from "../timeline.js";
import type * as timelineGroup from "../timelineGroup.js";
import type * as userPreferences from "../userPreferences.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  formation: typeof formation;
  gifts: typeof gifts;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  roster: typeof roster;
  timeline: typeof timeline;
  timelineGroup: typeof timelineGroup;
  userPreferences: typeof userPreferences;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
