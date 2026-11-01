import { toPage } from "@/lib/public-api/serialize";
import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_REQUEST: 400,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  readonly status: number;

  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
    readonly fromArgumentValidation = false,
  ) {
    super(message);
    this.status = STATUS_BY_CODE[code];
  }
}

export type CachePolicy = "public" | "shared" | "private";

const CACHE_CONTROL: Record<CachePolicy, string> = {
  public: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  shared: "public, max-age=0, s-maxage=60",
  private: "private, no-store",
};

export function ok(
  data: unknown,
  {
    cache,
    status = 200,
    extra,
  }: {
    cache: CachePolicy;
    status?: number;
    extra?: Record<string, unknown>;
  },
) {
  return NextResponse.json(
    { data, ...extra },
    { status, headers: { "Cache-Control": CACHE_CONTROL[cache] } },
  );
}

export function okPage(
  result: Parameters<typeof toPage>[0],
  { cache }: { cache: CachePolicy },
) {
  const { data, pagination } = toPage(result);
  return ok(data, { cache, extra: { pagination } });
}

export function errorResponse(error: ApiError) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    },
    {
      status: error.status,
      headers: { "Cache-Control": CACHE_CONTROL.private },
    },
  );
}
