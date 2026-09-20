import type { AdminBanner } from "@/app/[locale]/admin/banners/types";
import type {
  CreateGameBannerInput,
  OffsetGameBannersInput,
  UpdateGameBannerGroupInput,
  UpdateGameBannerInput,
} from "@/lib/admin/game-banner-schemas";

async function parseError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function createAdminBanner(
  input: CreateGameBannerInput,
): Promise<AdminBanner> {
  const res = await fetch("/api/admin/banners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function updateAdminBanner(
  id: string,
  input: UpdateGameBannerInput,
): Promise<AdminBanner> {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function deleteAdminBanner(id: string): Promise<void> {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function updateAdminBannerGroup(
  input: UpdateGameBannerGroupInput,
): Promise<{ startDate: string; endDate: string; updatedCount: number }> {
  const res = await fetch("/api/admin/banners/group", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function offsetAdminBanners(
  input: OffsetGameBannersInput,
): Promise<{ updatedCount: number; banners: AdminBanner[] }> {
  const res = await fetch("/api/admin/banners/offset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}
