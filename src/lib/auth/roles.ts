type ClerkMetadataContainer = {
  publicMetadata?: unknown;
  privateMetadata?: unknown;
  unsafeMetadata?: unknown;
};

type RoleFlag = "isSuperUser" | "isMaintainer";

function hasFlag(metadata: unknown, flag: RoleFlag) {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    flag in metadata &&
    (metadata as Record<string, unknown>)[flag] === true
  );
}

function hasRole(
  user: ClerkMetadataContainer | null | undefined,
  flag: RoleFlag,
) {
  return (
    hasFlag(user?.publicMetadata, flag) ||
    hasFlag(user?.privateMetadata, flag) ||
    hasFlag(user?.unsafeMetadata, flag)
  );
}

export function isSuperUser(user: ClerkMetadataContainer | null | undefined) {
  return hasRole(user, "isSuperUser");
}

export function isMaintainer(user: ClerkMetadataContainer | null | undefined) {
  return hasRole(user, "isMaintainer");
}

/**
 * Whether the user can manage site content (upcoming global banners, global
 * roadmap). Super users don't necessarily have the maintainer role, so both
 * are checked.
 */
export function canManageContent(
  user: ClerkMetadataContainer | null | undefined,
) {
  return isSuperUser(user) || isMaintainer(user);
}
