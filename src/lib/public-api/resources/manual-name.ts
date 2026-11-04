/**
 * A name set through the API counts as a manual edit, so the editor's automatic
 * naming doesn't overwrite it later.
 */
export function withManualName(patch: Record<string, unknown>) {
  return "name" in patch && !("autoName" in patch)
    ? {
        ...patch,
        autoName: false,
      }
    : patch;
}
