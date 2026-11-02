import "server-only";

import { mcpUserId } from "@/lib/mcp/auth.server";
import { toApiError } from "@/lib/public-api/convex.server";
import {
  type RateLimitTier,
  rateLimit,
} from "@/lib/public-api/rate-limit.server";
import { ApiError } from "@/lib/public-api/response";
import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import type { PaginationOptions } from "convex/server";
import { z } from "zod";

type ToolKind = "read" | "create" | "update" | "delete";

const ANNOTATIONS: Record<ToolKind, ToolAnnotations> = {
  read: { readOnlyHint: true, openWorldHint: false },
  create: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  update: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  delete: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
};

type ToolConfig<S extends z.ZodRawShape> = {
  title: string;
  description: string;
  kind: ToolKind;
  input?: S;
  /** Overrides the per-user bucket picked from `kind`. */
  rateLimit?: RateLimitTier;
};

function textResult(text: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text }], ...(isError && { isError }) };
}

function errorResult(error: ApiError) {
  const details =
    error.details !== undefined
      ? `\n${JSON.stringify(error.details, null, 2)}`
      : "";

  return textResult(`${error.code}: ${error.message}${details}`, true);
}

export function defineTool<S extends z.ZodRawShape = z.ZodRawShape>(
  server: McpServer,
  name: string,
  { title, description, kind, input, rateLimit: tier }: ToolConfig<S>,
  run: (
    args: z.output<z.ZodObject<S>>,
    userId: string,
  ) => Promise<unknown> | unknown,
) {
  const callback = async (
    args: z.output<z.ZodObject<S>>,
    extra: Parameters<ToolCallback>[0],
  ): Promise<CallToolResult> => {
    const userId = mcpUserId(extra.authInfo);
    if (!userId) {
      return errorResult(new ApiError("UNAUTHORIZED", "Sign-in required."));
    }

    try {
      const state = await rateLimit(
        tier ?? (kind === "read" ? "userRead" : "userWrite"),
        `user:${userId}`,
      );

      if (state && !state.success) {
        const retryAfter = Math.max(
          1,
          Math.ceil((state.reset - Date.now()) / 1000),
        );

        return errorResult(
          new ApiError(
            "RATE_LIMITED",
            `Too many requests. Try again in ${retryAfter} seconds.`,
          ),
        );
      }

      const result = await run(args, userId);

      return textResult(
        result === undefined ? "Done." : JSON.stringify(result, null, 2),
      );
    } catch (error) {
      const apiError = toApiError(error);

      if (
        apiError.fromArgumentValidation &&
        (kind === "read" || kind === "delete")
      ) {
        return errorResult(new ApiError("NOT_FOUND", "Not found."));
      }

      return errorResult(apiError);
    }
  };

  server.registerTool(
    name,
    {
      title,
      description,
      inputSchema: input ?? ({} as S),
      annotations: { title, ...ANNOTATIONS[kind] },
    },
    callback as unknown as ToolCallback<S>,
  );
}

export const paginationInput = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Page size (1-100)."),
  cursor: z
    .string()
    .optional()
    .describe("`pagination.nextCursor` from the previous page."),
};

export function paginationOpts({
  limit,
  cursor,
}: {
  limit: number;
  cursor?: string;
}): PaginationOptions {
  return { numItems: limit, cursor: cursor ?? null };
}

export function idInput(description: string) {
  return z.string().min(1).describe(description);
}
