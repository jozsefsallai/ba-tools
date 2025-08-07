"use server";

import { revalidatePath } from "next/cache";

export async function clearCache(path?: string) {
  try {
    if (path) {
      revalidatePath(path);
    } else {
      revalidatePath("/", "layout");
    }
  } catch (err) {
    console.error("Failed to revalidate path", path, err);
  }
}
