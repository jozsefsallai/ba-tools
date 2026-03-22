import commonEn from "@/i18n/translations/en/common.json";

type StudentEnumSection =
  | "school"
  | "club"
  | "combatClass"
  | "attackType"
  | "defenseType"
  | "combatRole"
  | "combatPosition";

function sectionLabels(section: StudentEnumSection): Record<string, string> {
  return commonEn[section] as Record<string, string>;
}

export function terrainLabelEn(value: string): string {
  const t = commonEn.terrain as Record<string, string>;
  return t[value] ?? value;
}

function translateInSection(
  section: StudentEnumSection,
  value: string | undefined | null,
): string | undefined | null {
  if (value === undefined || value === null) {
    return value;
  }

  const table = sectionLabels(section);
  return table[value] ?? value;
}

export function mapStudentScalarEnumsToEn<T extends Record<string, unknown>>(
  row: T,
): T {
  const out = { ...row } as Record<string, unknown>;

  const mapField = (key: string, section: StudentEnumSection) => {
    const v = out[key];
    if (typeof v === "string") {
      out[key] = translateInSection(section, v);
    }
  };

  mapField("school", "school");
  mapField("club", "club");
  mapField("combatClass", "combatClass");
  mapField("combatRole", "combatRole");
  mapField("combatPosition", "combatPosition");
  mapField("attackType", "attackType");
  mapField("defenseType", "defenseType");

  return out as T;
}

export function mapStudentDeepEnumsToEn(
  student: Record<string, unknown>,
): Record<string, unknown> {
  const out = mapStudentScalarEnumsToEn(student);

  if (Array.isArray(out.variants)) {
    out.variants = out.variants.map((v) =>
      typeof v === "object" && v !== null
        ? mapStudentScalarEnumsToEn(v as Record<string, unknown>)
        : v,
    );
  }

  if (
    out.baseVariant !== undefined &&
    out.baseVariant !== null &&
    typeof out.baseVariant === "object"
  ) {
    out.baseVariant = mapStudentScalarEnumsToEn(
      out.baseVariant as Record<string, unknown>,
    );
  }

  return out;
}
