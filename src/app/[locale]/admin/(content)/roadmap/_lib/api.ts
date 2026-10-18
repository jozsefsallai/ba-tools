import type { AnyRoadmapInput } from "@/lib/roadmap/schemas";
import type {
  EditableRoadmapItem,
  EditableRoadmapKind,
} from "@/lib/roadmap/types";

async function parseError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export function createRoadmapItem(
  kind: EditableRoadmapKind,
  input: AnyRoadmapInput,
): Promise<EditableRoadmapItem> {
  return request(`/api/admin/roadmap/${kind}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRoadmapItem(
  kind: EditableRoadmapKind,
  id: string,
  input: Partial<AnyRoadmapInput>,
): Promise<EditableRoadmapItem> {
  return request(`/api/admin/roadmap/${kind}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteRoadmapItem(
  kind: EditableRoadmapKind,
  id: string,
): Promise<void> {
  await request(`/api/admin/roadmap/${kind}/${id}`, { method: "DELETE" });
}

export function offsetRoadmapItems(
  kind: EditableRoadmapKind,
  ids: string[],
  offsetMs: number,
): Promise<{ updatedCount: number; items: EditableRoadmapItem[] }> {
  return request("/api/admin/roadmap/offset", {
    method: "POST",
    body: JSON.stringify({ kind, ids, offsetMs }),
  });
}

export async function revalidatePublicRoadmap(): Promise<void> {
  await request("/api/admin/roadmap/revalidate", {
    method: "POST",
    body: "{}",
  });
}
