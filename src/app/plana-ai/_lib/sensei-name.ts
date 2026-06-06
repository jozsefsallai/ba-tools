type SenseiNameUser = {
  firstName?: string | null;
  username?: string | null;
};

export function getSenseiDisplayName(user: SenseiNameUser | null | undefined) {
  return user?.firstName?.trim() || user?.username?.trim() || undefined;
}
