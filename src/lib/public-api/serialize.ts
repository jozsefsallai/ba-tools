/**
 * Converts Convex documents into API resources, recursively: `_id` becomes
 * `id`, `_creationTime` becomes an ISO `createdAt`, and the internal `userId`
 * is dropped.
 */
export function toResource(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toResource);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const isDocument = "_id" in record && "_creationTime" in record;
  const out: Record<string, unknown> = {};

  if (isDocument) {
    out.id = record._id;
    out.createdAt = new Date(record._creationTime as number).toISOString();
  }

  for (const [key, entry] of Object.entries(record)) {
    if (isDocument && (key === "_id" || key === "_creationTime")) {
      continue;
    }

    if (isDocument && key === "userId") {
      continue;
    }

    out[key] = toResource(entry);
  }

  return out;
}

type PaginationResult = {
  page: unknown[];
  isDone: boolean;
  continueCursor: string;
};

export function toPage(result: PaginationResult) {
  return {
    data: toResource(result.page),
    pagination: {
      hasMore: !result.isDone,
      nextCursor: result.isDone ? null : result.continueCursor,
    },
  };
}
