import {
  type OgFeaturedStudent,
  OgStudentCard,
} from "@/app/rosters/[gameServer]/[friendCode]/_components/og-student-card";
import type { OgAssetUrls } from "@/lib/og-assets.server";

export type FeaturedBorrowCategory = {
  label: string;
  students: OgFeaturedStudent[];
};

export type RosterOgImageProps = {
  name: string;
  introduction?: string;
  friendCode: string;
  serverName: string;
  accountLevel: number;
  repPortraitUrl?: string;
  featuredBorrowCategories: FeaturedBorrowCategory[];
  assets: OgAssetUrls;
};

// Dark theme tokens from globals.css (oklch approximated for satori)
const colors = {
  background: "#2f3038",
  card: "#383942",
  foreground: "#f2f2f2",
  primary: "#8f4fae",
  primaryForeground: "#ffffff",
  secondary: "#43444f",
  secondaryForeground: "#f2f2f2",
  mutedForeground: "#b3b3b3",
  border: "#52525c",
};

function normalizeIntroduction(introduction?: string): string | undefined {
  if (!introduction) {
    return undefined;
  }

  const firstLine = introduction.split("\n")[0].trim();

  if (firstLine.length > 100) {
    return `${firstLine.slice(0, 97)}...`;
  }

  return firstLine;
}

export function RosterOgImage({
  name,
  introduction,
  friendCode,
  serverName,
  accountLevel,
  repPortraitUrl,
  featuredBorrowCategories,
  assets,
}: RosterOgImageProps) {
  const normalizedIntroduction = normalizeIntroduction(introduction);

  return (
    <div
      tw="flex w-full h-full items-center justify-center px-8 py-5"
      style={{
        backgroundColor: colors.background,
        fontFamily: "Noto Sans",
      }}
    >
      <div tw="flex items-start w-full">
        {repPortraitUrl ? (
          <img
            src={repPortraitUrl}
            alt=""
            tw="flex shrink-0"
            style={{
              width: 200,
              height: 260,
              objectFit: "cover",
              objectPosition: "top",
            }}
          />
        ) : (
          <div
            tw="flex shrink-0 items-center justify-center rounded-lg"
            style={{
              width: 200,
              height: 260,
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div tw="flex text-6xl" style={{ color: colors.mutedForeground }}>
              ?
            </div>
          </div>
        )}

        <div tw="flex flex-col flex-1 ml-10">
          <div
            tw="flex"
            style={{
              fontFamily: "Nexon Football Gothic",
              fontSize: 56,
              fontWeight: 700,
              transform: "skewX(-12deg)",
              color: colors.foreground,
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            {name}
          </div>

          {normalizedIntroduction && (
            <div
              tw="flex"
              style={{
                fontSize: 24,
                color: colors.mutedForeground,
                lineHeight: 1.25,
                marginBottom: 16,
              }}
            >
              {normalizedIntroduction}
            </div>
          )}

          <div tw="flex flex-wrap items-center" style={{ gap: 10 }}>
            <div
              tw="flex font-semibold rounded-full px-4 py-2"
              style={{
                fontSize: 28,
                color: colors.primaryForeground,
                backgroundColor: colors.primary,
              }}
            >
              {friendCode}
            </div>

            <div
              tw="flex font-semibold rounded-full px-4 py-2"
              style={{
                fontSize: 28,
                color: colors.secondaryForeground,
                backgroundColor: colors.secondary,
              }}
            >
              {serverName}
            </div>

            <div
              tw="flex font-semibold rounded-full px-4 py-2"
              style={{
                fontSize: 28,
                color: colors.foreground,
                backgroundColor: "transparent",
                border: `1px solid ${colors.border}`,
              }}
            >
              Lv.{accountLevel}
            </div>
          </div>

          {featuredBorrowCategories.length > 0 && (
            <div tw="flex flex-wrap" style={{ marginTop: 24, gap: 8 }}>
              {featuredBorrowCategories.map((category) => (
                <div
                  key={category.label}
                  tw="flex flex-col"
                  style={{
                    width: 440,
                    gap: 6,
                    padding: 14,
                    paddingLeft: 20,
                    borderRadius: 10,
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    tw="flex"
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: colors.foreground,
                      lineHeight: 1.25,
                      marginBottom: 6,
                    }}
                  >
                    {category.label}
                  </div>

                  <div tw="flex" style={{ gap: 2 }}>
                    {category.students.map((student) => (
                      <OgStudentCard
                        key={student.iconUrl}
                        student={student}
                        assets={assets}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
