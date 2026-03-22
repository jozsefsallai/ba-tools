import {
  buildCDNAbsoluteUrl,
  buildStudentIconUrlFromId,
  buildStudentPortraitUrlFromId,
} from "@/lib/url";

export function addStudentMediaUrlFieldsForMcp(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const id = row.id;
  if (typeof id !== "string") {
    return { ...row };
  }

  const iconUrl = buildCDNAbsoluteUrl(
    buildStudentIconUrlFromId(id).replace("/cdn/", ""),
  );

  const portraitUrl = buildCDNAbsoluteUrl(
    buildStudentPortraitUrlFromId(id).replace("/cdn/", ""),
  );

  return { ...row, iconUrl, portraitUrl };
}

export function addStudentMediaUrlsDeepForMcp(
  student: Record<string, unknown>,
): Record<string, unknown> {
  let out = addStudentMediaUrlFieldsForMcp(student);

  if (Array.isArray(out.variants)) {
    out = {
      ...out,
      variants: out.variants.map((v) =>
        v && typeof v === "object"
          ? addStudentMediaUrlsDeepForMcp(v as Record<string, unknown>)
          : v,
      ),
    };
  }

  if (out.baseVariant && typeof out.baseVariant === "object") {
    out = {
      ...out,
      baseVariant: addStudentMediaUrlsDeepForMcp(
        out.baseVariant as Record<string, unknown>,
      ),
    };
  }

  return out;
}
