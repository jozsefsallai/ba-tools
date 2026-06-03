type ClerkMetadataContainer = {
  publicMetadata?: unknown;
  privateMetadata?: unknown;
  unsafeMetadata?: unknown;
};

function hasPlanaMetadataAccess(metadata: unknown) {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "canAccessPlanaAI" in metadata &&
    metadata.canAccessPlanaAI === true
  );
}

export function isPlanaAiGloballyEnabled() {
  return process.env.NEXT_PUBLIC_PLANA_AI_ENABLED === "true";
}

export function canAccessPlanaAi(
  user: ClerkMetadataContainer | null | undefined,
) {
  return (
    isPlanaAiGloballyEnabled() ||
    hasPlanaMetadataAccess(user?.publicMetadata) ||
    hasPlanaMetadataAccess(user?.privateMetadata) ||
    hasPlanaMetadataAccess(user?.unsafeMetadata)
  );
}
