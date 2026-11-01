import "server-only";

import { ApiError, type ApiErrorCode } from "@/lib/public-api/response";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { ConvexError } from "convex/values";

type ApiCredentials = { apiSecret?: string; apiUserExternalId?: string };

export type UserArgs<F extends FunctionReference<"query" | "mutation">> = Omit<
  FunctionArgs<F>,
  keyof ApiCredentials
>;

const KNOWN_CODES = new Set<ApiErrorCode>([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_REQUEST",
  "CONFLICT",
]);

function credentials(userId: string): Required<ApiCredentials> {
  const apiSecret = process.env.API_BRIDGE_SECRET;
  if (!apiSecret) {
    throw new ApiError("INTERNAL_ERROR", "The API is not configured.");
  }

  return { apiSecret, apiUserExternalId: userId };
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ConvexError) {
    const data = error.data as { code?: string; message?: string } | string;

    if (
      typeof data === "object" &&
      data?.code &&
      KNOWN_CODES.has(data.code as ApiErrorCode)
    ) {
      return new ApiError(
        data.code as ApiErrorCode,
        data.message ?? "Request failed.",
      );
    }

    return new ApiError(
      "INVALID_REQUEST",
      typeof data === "string" ? data : "Request failed.",
    );
  }

  if (
    error instanceof Error &&
    /ArgumentValidationError|does not match validator|is not a valid ID/i.test(
      error.message,
    )
  ) {
    const detail = error.message
      .match(/ArgumentValidationError: (.*)/)?.[1]
      ?.replace(/ Consider wrapping .*$/, "")
      .trim();

    const path = error.message.match(/^Path: (\S+)$/m)?.[1];

    return new ApiError(
      "INVALID_REQUEST",
      detail
        ? `${detail}${path ? ` Path: \`${path}\`.` : ""}`
        : "The request body or parameters are invalid.",
      undefined,
      true,
    );
  }

  console.error("[public-api] unexpected Convex error", error);
  return new ApiError("INTERNAL_ERROR", "An unexpected error occurred.");
}

export async function userQuery<F extends FunctionReference<"query">>(
  userId: string,
  fn: F,
  args: UserArgs<F>,
): Promise<FunctionReturnType<F>> {
  try {
    return await fetchQuery(fn, {
      ...args,
      ...credentials(userId),
    } as FunctionArgs<F>);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function userMutation<F extends FunctionReference<"mutation">>(
  userId: string,
  fn: F,
  args: UserArgs<F>,
): Promise<FunctionReturnType<F>> {
  try {
    return await fetchMutation(fn, {
      ...args,
      ...credentials(userId),
    } as FunctionArgs<F>);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function publicQuery<F extends FunctionReference<"query">>(
  fn: F,
  args: FunctionArgs<F>,
): Promise<FunctionReturnType<F>> {
  try {
    return await fetchQuery(fn, args);
  } catch (error) {
    throw toApiError(error);
  }
}
