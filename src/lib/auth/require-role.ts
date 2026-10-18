import { canManageContent, isSuperUser } from "@/lib/auth/roles";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type CurrentUser = Awaited<ReturnType<typeof currentUser>>;

async function requireRole(check: (user: CurrentUser) => boolean) {
  const user = await currentUser();

  if (!check(user)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, error: null };
}

export function requireSuperUser() {
  return requireRole(isSuperUser);
}

export function requireContentManager() {
  return requireRole(canManageContent);
}
