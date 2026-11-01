import "server-only";

import { toApiError } from "@/lib/public-api/convex.server";
import { ApiError, errorResponse } from "@/lib/public-api/response";
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

type Params = Record<string, string | string[]>;

type HandlerContext<P extends Params> = { params: Promise<P> };

function handleError(req: NextRequest, error: unknown) {
  const apiError = toApiError(error);

  if (
    apiError.fromArgumentValidation &&
    (req.method === "GET" || req.method === "DELETE")
  ) {
    return errorResponse(new ApiError("NOT_FOUND", "Not found."));
  }

  return errorResponse(apiError);
}

type PublicHandler<P extends Params> = (
  req: NextRequest,
  params: P,
) => Promise<Response>;

type UserHandler<P extends Params> = (
  req: NextRequest,
  params: P,
  userId: string,
) => Promise<Response>;

export function publicRoute<P extends Params = Params>(
  handler: PublicHandler<P>,
) {
  return async (req: NextRequest, ctx: HandlerContext<P>) => {
    try {
      return await handler(req, await ctx.params);
    } catch (error) {
      return handleError(req, error);
    }
  };
}

export function userRoute<P extends Params = Params>(handler: UserHandler<P>) {
  return async (req: NextRequest, ctx: HandlerContext<P>) => {
    try {
      const { isAuthenticated, userId } = await auth({
        acceptsToken: "api_key",
      });

      if (!isAuthenticated || !userId?.startsWith("user_")) {
        throw new ApiError(
          "UNAUTHORIZED",
          "A valid API key is required. Send it as `Authorization: Bearer <key>`.",
        );
      }

      return await handler(req, await ctx.params, userId);
    } catch (error) {
      return handleError(req, error);
    }
  };
}

function zodDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function parseQuery<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): z.infer<S> {
  const result = schema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );

  if (!result.success) {
    throw new ApiError(
      "INVALID_REQUEST",
      "Invalid query parameters.",
      zodDetails(result.error),
    );
  }

  return result.data;
}

export async function readJsonObject(
  req: NextRequest,
): Promise<Record<string, unknown>> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    throw new ApiError("INVALID_REQUEST", "The request body must be JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(
      "INVALID_REQUEST",
      "The request body must be a JSON object.",
    );
  }

  const {
    apiSecret: _secret,
    apiUserExternalId: _externalId,
    ...rest
  } = body as Record<string, unknown>;

  return rest;
}

export async function parseBody<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): Promise<z.infer<S>> {
  const result = schema.safeParse(await readJsonObject(req));

  if (!result.success) {
    throw new ApiError(
      "INVALID_REQUEST",
      "Invalid request body.",
      zodDetails(result.error),
    );
  }

  return result.data;
}

export function notFound(message = "Not found.") {
  return new ApiError("NOT_FOUND", message);
}

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export function parsePagination(req: NextRequest) {
  const { limit, cursor } = parseQuery(req, paginationSchema);
  return { numItems: limit, cursor: cursor ?? null };
}

export function mergeForUpdate(
  current: Record<string, unknown>,
  keys: readonly string[],
  body: Record<string, unknown>,
) {
  const merged: Record<string, unknown> = {};

  for (const key of keys) {
    if (current[key] !== undefined) {
      merged[key] = current[key];
    }
  }

  return { ...merged, ...body };
}
