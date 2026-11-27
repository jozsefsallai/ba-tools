type SenseiNameUser = {
  name?: string | null;
  username?: string | null;
};

export function getSenseiDisplayName(user: SenseiNameUser | null | undefined) {
  return user?.name?.trim() || user?.username?.trim() || undefined;
}
