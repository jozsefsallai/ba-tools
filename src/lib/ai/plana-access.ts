// `unsafeMetadata` is user-writable from the browser, so it can't grant access.
type ClerkMetadataContainer = {
  publicMetadata?: unknown;
  privateMetadata?: unknown;
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
    hasPlanaMetadataAccess(user?.privateMetadata)
  );
}
