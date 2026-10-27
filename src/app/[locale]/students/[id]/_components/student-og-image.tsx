import { planaMark } from "@/lib/og/assets.server";
import { isJapaneseText } from "@/lib/og/text";

export type StudentOgField = {
  label: string;
  value: string;
  icon?: string;
  dot?: string;
};

export type StudentOgImageProps = {
  name: string;
  subtitle?: string;
  studentNumber: string;
  barcodeSeed: string;
  rarity: number;
  portraitUrl?: string;
  schoolLogoUrl: string;
  starUrl: string;
  fields: StudentOgField[];
};

const card = {
  background: "#F6F8FB",
  foreground: "#14233A",
  muted: "#6B7A90",
  border: "#DCE3EC",
  accent: "#1C9BF0",
  accentLight: "#5CC4FF",
};

const HEADER_HEIGHT = 84;
const PORTRAIT_WIDTH = 352;
const PORTRAIT_HEIGHT = 397;
const FIELD_WIDTH = 330;
const FIELD_GAP = 36;
const MARKER_WIDTH = 32;

function displayFont(text: string) {
  return isJapaneseText(text)
    ? "Japanese, Noto Sans"
    : "Nexon Football Gothic, Japanese, Noto Sans";
}

function nameFontSize(name: string, maxWidth = 690) {
  const ems = [...name].reduce(
    (width, char) =>
      width + (/[\u3000-\uffef\u4e00-\u9fff]/.test(char) ? 1 : 0.56),
    0,
  );

  return Math.max(40, Math.min(66, Math.floor(maxWidth / ems)));
}

// FNV-1a + MurmurHash3, this is not a real barcode so don't expect to be able
// to decode it
function barcodeBars(seed: string, count = 54) {
  let hash = 2166136261;

  for (const char of seed) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }

  return Array.from({ length: count }, () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
    return { width: 2 + (hash % 3), gap: 2 + ((hash >>> 4) % 3) };
  });
}

export function StudentOgImage({
  name,
  subtitle,
  studentNumber,
  barcodeSeed,
  rarity,
  portraitUrl,
  schoolLogoUrl,
  starUrl,
  fields,
}: StudentOgImageProps) {
  const nameSize = nameFontSize(name);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        width: 1200,
        height: 630,
        overflow: "hidden",
        background: card.background,
        color: card.foreground,
        fontFamily: "Noto Sans, Japanese",
      }}
    >
      <img
        src={schoolLogoUrl}
        alt=""
        width={560}
        height={510}
        style={{
          position: "absolute",
          right: -80,
          bottom: -90,
          objectFit: "contain",
          opacity: 0.07,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: HEADER_HEIGHT,
          paddingLeft: 48,
          paddingRight: 48,
          gap: 16,
          background: `linear-gradient(90deg, ${card.accent}, ${card.accentLight})`,
          color: "#FFFFFF",
        }}
      >
        <img
          src={planaMark}
          alt=""
          width={46}
          height={46}
          style={{ objectFit: "contain" }}
        />

        <div
          style={{
            display: "flex",
            fontFamily: "Nexon Football Gothic",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: 0.5,
          }}
        >
          Joe's Blue Archive Tools
        </div>

        <div
          style={{
            display: "flex",
            marginLeft: "auto",
            fontFamily: "Nexon Football Gothic",
            fontWeight: 700,
            fontSize: 28,
            opacity: 0.9,
          }}
        >
          {`#${studentNumber}`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          paddingTop: 36,
          paddingBottom: 36,
          paddingLeft: 48,
          paddingRight: 48,
          gap: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              width: PORTRAIT_WIDTH,
              height: PORTRAIT_HEIGHT,
              borderRadius: 20,
              overflow: "hidden",
              border: "5px solid #FFFFFF",
              background: card.border,
              boxShadow: "0 8px 22px rgba(20, 35, 58, 0.25)",
            }}
          >
            {portraitUrl ? (
              <img
                src={portraitUrl}
                alt=""
                width={PORTRAIT_WIDTH - 10}
                height={PORTRAIT_HEIGHT - 10}
                style={{ objectFit: "cover", objectPosition: "top" }}
              />
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: rarity }, (_, index) => (
              <img key={index} src={starUrl} alt="" width={36} height={36} />
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: displayFont(name),
              fontWeight: 700,
              fontSize: nameSize,
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>

          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontFamily: displayFont(subtitle),
                fontSize: 28,
                color: card.muted,
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              height: 4,
              width: 88,
              background: card.accent,
              marginTop: 18,
              marginBottom: 22,
            }}
          />

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              rowGap: 18,
              columnGap: FIELD_GAP,
            }}
          >
            {fields.map((field) => (
              <div
                key={field.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: FIELD_WIDTH,
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 19,
                    fontWeight: 600,
                    color: card.muted,
                    letterSpacing: 0.5,
                  }}
                >
                  {field.label}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    fontSize: 26,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {field.icon || field.dot ? (
                    // Logos and dots share a slot so the values line up.
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        width: MARKER_WIDTH,
                        height: 31,
                        alignItems: "center",
                      }}
                    >
                      {field.icon ? (
                        <img
                          src={field.icon}
                          alt=""
                          width={MARKER_WIDTH}
                          height={29}
                          style={{ objectFit: "contain" }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            background: field.dot,
                          }}
                        />
                      )}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display: "flex",
                      overflow: "hidden",
                      lineClamp: 2,
                      textOverflow: "ellipsis",
                      maxWidth:
                        FIELD_WIDTH -
                        (field.icon || field.dot ? MARKER_WIDTH + 10 : 0),
                    }}
                  >
                    {field.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              marginTop: "auto",
              paddingTop: 16,
            }}
          >
            {barcodeBars(barcodeSeed).map((bar, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  width: bar.width,
                  height: 40,
                  marginRight: bar.gap,
                  background: card.foreground,
                }}
              />
            ))}

            <div
              style={{
                display: "flex",
                marginLeft: 18,
                fontSize: 17,
                color: card.muted,
                letterSpacing: 2,
              }}
            >
              {barcodeSeed.toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
