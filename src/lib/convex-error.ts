import { ConvexError } from "convex/values";

/**
 * The readable message of an error from a Convex function. A `ConvexError`
 * keeps it in `data`; its own `message` also has the request ID and wrapper
 * text added by the server.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data as
      | {
          message?: string;
        }
      | string
      | undefined;
    const message = typeof data === "string" ? data : data?.message;
    if (message) {
      return message;
    }
  }

  return error instanceof Error ? error.message : "";
}
