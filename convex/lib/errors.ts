import { ConvexError } from "convex/values";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "CONFLICT";

export type ApiErrorData = { code: ApiErrorCode; message: string };

function apiError(code: ApiErrorCode, message: string) {
  return new ConvexError<ApiErrorData>({ code, message });
}

export const unauthorized = (message: string) =>
  apiError("UNAUTHORIZED", message);

export const forbidden = (message: string) => apiError("FORBIDDEN", message);

export const notFound = (message: string) => apiError("NOT_FOUND", message);

export const invalid = (message: string) =>
  apiError("INVALID_REQUEST", message);

export const conflict = (message: string) => apiError("CONFLICT", message);
