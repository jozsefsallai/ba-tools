import "server-only";
import { getMessagesForLocale } from "@/i18n/messages";
import {
  OG_CARDS,
  OG_DESIGN_VERSION,
  type OgCardDefinition,
  type OgCardKey,
} from "@/lib/og/registry";
import type { Metadata } from "next";
import { createTranslator } from "next-intl";

export const SITE_ORIGIN = "https://ba.joexyz.online";

export function ogLocale(locale: string): "en" | "ja" {
  return locale === "ja" ? "ja" : "en";
}

export function localizedPath(path: string, locale: string) {
  return `${ogLocale(locale) === "ja" ? "/ja" : ""}${path}`;
}

export function sharingMetadata({
  title,
  description,
  image,
  locale,
  alt = title,
}: {
  title: string;
  description: string;
  image: string;
  locale: string;
  alt?: string;
}): Metadata {
  const url = new URL(image, SITE_ORIGIN).toString();

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "Joe's Blue Archive Tools",
      locale: ogLocale(locale) === "ja" ? "ja_JP" : "en_US",
      title,
      description,
      images: [{ url, width: 1200, height: 630, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url, alt }],
    },
  };
}

export async function getCardContent(key: OgCardKey, locale: string) {
  const language = ogLocale(locale);

  const t = createTranslator({
    locale: language,
    messages: await getMessagesForLocale(language),
  });

  const card: OgCardDefinition = OG_CARDS[key];

  const resolve = (text: OgCardDefinition["title"]) => t(text.message);

  return {
    title: resolve(card.title),
    description: resolve(card.description),
    variant: card.variant,
    icon: card.icon,
  };
}

export async function getCardMetadata(
  key: OgCardKey,
  locale: string,
): Promise<Metadata> {
  if (key === "137") {
    return getCardMetadata("home", locale);
  }

  const card = await getCardContent(key, locale);
  const t = createTranslator({
    locale: ogLocale(locale),
    messages: await getMessagesForLocale(ogLocale(locale)),
  });

  return sharingMetadata({
    ...card,
    title:
      key === "home"
        ? card.title
        : t("common.sharing.title", {
            title: card.title,
            appName: t("common.appName"),
          }),
    locale,
    image: `/api/og/${ogLocale(locale)}/${key}?v=${OG_DESIGN_VERSION}`,
    alt: card.title,
  });
}
