import { planaArt, planaMark } from "@/lib/og/assets.server";
import { VARIANT_ICONS, lucideOgIcon } from "@/lib/og/lucide.server";
import type { OgIconName, OgVariant } from "@/lib/og/registry";
import { boundedText, isJapaneseText } from "@/lib/og/text";
import type { ReactNode } from "react";

export const ogColors = {
  background: "#24252B",
  surface: "#30313A",
  foreground: "#F2F2F2",
  muted: "#B3B3BD",
  purple: "#8F4FAE",
};

export { boundedText } from "@/lib/og/text";

export function OgFrame({
  children,
  plana = false,
}: { children: ReactNode; plana?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1200,
        height: 630,
        padding: 48,
        background: ogColors.background,
        color: ogColors.foreground,
        fontFamily: "Noto Sans, Japanese",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {plana ? <PlanaCrop /> : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: 458,
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderTop: "1px solid #454650",
          paddingTop: 22,
          marginTop: 24,
          gap: 12,
          color: ogColors.muted,
          fontSize: 21,
          width: plana ? 560 : 1104,
        }}
      >
        <img
          src={planaMark}
          alt=""
          width={34}
          height={34}
          style={{ objectFit: "contain" }}
        />

        <span>Joe's Blue Archive Tools</span>

        <span style={{ marginLeft: "auto", fontSize: 18 }}>
          ba.joexyz.online
        </span>
      </div>
    </div>
  );
}

export function OgHeading({
  children,
  small = false,
  fontSize = small ? 48 : 60,
}: { children: string; small?: boolean; fontSize?: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: isJapaneseText(children)
          ? "Japanese, Noto Sans"
          : "Nexon Football Gothic, Noto Sans",
        fontWeight: 700,
        fontSize,
        lineHeight: 1.12,
        overflow: "hidden",
        maxHeight: small ? fontSize * 2.24 : 210,
        lineClamp: small ? 2 : 3,
        textOverflow: "ellipsis",
      }}
    >
      {boundedText(
        children,
        isJapaneseText(children) ? (small ? 38 : 30) : small ? 62 : 70,
      )}
    </div>
  );
}

export function PlanaCrop() {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        right: 48,
        top: 0,
        width: 400,
        height: 630,
      }}
    >
      <img
        src={planaArt}
        alt=""
        width={600}
        height={1152}
        style={{ position: "absolute", left: -100, top: -32 }}
      />
    </div>
  );
}

export function ToolVisual({
  variant,
  icon,
}: { variant: OgVariant; icon?: OgIconName }) {
  const iconName = icon ?? VARIANT_ICONS[variant];

  if (!iconName) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        width: 400,
        height: 458,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img src={lucideOgIcon(iconName)} alt="" width={280} height={280} />
    </div>
  );
}

export function NotFoundOgCard({
  title,
  description,
}: { title: string; description: string }) {
  return (
    <OgFrame plana>
      <div
        style={{ display: "flex", alignItems: "center", gap: 40, height: 458 }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 664,
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Nexon Football Gothic",
              fontSize: 170,
              fontWeight: 700,
              lineHeight: 1,
              color: ogColors.muted,
            }}
          >
            404
          </div>

          <OgHeading>{title}</OgHeading>

          <div
            style={{
              display: "flex",
              fontSize: 27,
              color: ogColors.muted,
              lineHeight: 1.4,
              lineClamp: 2,
            }}
          >
            {boundedText(description, isJapaneseText(description) ? 45 : 115)}
          </div>
        </div>
      </div>
    </OgFrame>
  );
}

export function ToolOgCard({
  title,
  description,
  variant,
  icon,
}: {
  title: string;
  description: string;
  variant: OgVariant;
  icon?: OgIconName;
}) {
  if (variant === "not-found") {
    return <NotFoundOgCard title={title} description={description} />;
  }

  return (
    <OgFrame plana={!(icon ?? VARIANT_ICONS[variant])}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 40, height: 458 }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 664,
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 64,
              height: 6,
              background: ogColors.purple,
              marginBottom: 10,
            }}
          />

          <OgHeading>{title}</OgHeading>

          <div
            style={{
              display: "flex",
              fontSize: 27,
              lineHeight: 1.4,
              color: ogColors.muted,
              maxHeight: 152,
              lineClamp: 3,
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {boundedText(description, isJapaneseText(description) ? 65 : 155)}
          </div>
        </div>

        <ToolVisual variant={variant} icon={icon} />
      </div>
    </OgFrame>
  );
}
