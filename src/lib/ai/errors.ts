import type { PlanaErrorCode } from "@/lib/ai/message-types";

function getCause(error: unknown): unknown {
  if (typeof error !== "object" || error === null) {
    return error;
  }

  if ("lastError" in error && error.lastError) {
    return getCause(error.lastError);
  }

  if ("statusCode" in error) {
    return error;
  }

  return "cause" in error && error.cause ? getCause(error.cause) : error;
}

export function classifyPlanaError(error: unknown): PlanaErrorCode {
  const cause = getCause(error);

  const record = (typeof cause === "object" && cause !== null ? cause : {}) as {
    statusCode?: unknown;
    message?: unknown;
    responseBody?: unknown;
  };

  const status =
    typeof record.statusCode === "number" ? record.statusCode : undefined;

  const text =
    `${String(record.message ?? cause)} ${String(record.responseBody ?? "")}`.toLowerCase();

  if (/tool|function call/.test(text) && /support|endpoint/.test(text)) {
    return "model_no_tools";
  }

  if (
    status === 401 ||
    status === 403 ||
    /invalid api key|no auth/.test(text)
  ) {
    return "invalid_key";
  }

  if (status === 402 || /insufficient|credit|payment required/.test(text)) {
    return "no_credits";
  }

  if (status === 429 || /rate limit/.test(text)) {
    return "rate_limited";
  }

  if (
    status === 404 ||
    /not a valid model|model.*not found|no endpoints found/.test(text)
  ) {
    return "model_not_found";
  }

  return "generic";
}
