import type { Messages } from "@/i18n/types";
import type { PageBreadcrumb } from "@/lib/breadcrumbs";
import type { useTranslations } from "next-intl";

type RankingLabel = keyof Messages["tools"]["pvp"]["rankings"];
type Translate = ReturnType<typeof useTranslations<never>>;

const publicPages: Record<string, RankingLabel> = {
  search: "counterBreadcrumb",
  "most-effective-teams": "title",
  "icon-debug": "iconDebugBreadcrumb",
  "screenshot-debug": "screenshotDebugBreadcrumb",
};

function pvpBreadcrumbRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "pvp") {
    return null;
  }

  const seasonId = parts[1] && !publicPages[parts[1]] ? parts[1] : undefined;
  return { parts, seasonId };
}

export function buildPvpBreadcrumbs(
  pathname: string,
  t: Translate,
  names?: { seasonName: string | null; opponentName: string | null },
): PageBreadcrumb[] | null {
  const route = pvpBreadcrumbRoute(pathname);

  if (!route) {
    return null;
  }

  const { parts, seasonId } = route;

  const crumbs: PageBreadcrumb[] = [
    { label: t("common.header.nav.gameplay.title"), href: "/" },
    { label: t("tools.pvp.rankings.breadCrumb"), href: "/pvp" },
  ];

  const rankLabel = (key: RankingLabel) => t(`tools.pvp.rankings.${key}`);

  if (parts[1] && publicPages[parts[1]]) {
    crumbs.push({ label: rankLabel(publicPages[parts[1]]) });
  } else if (seasonId) {
    const seasonPath = `/pvp/${seasonId}`;

    crumbs.push({
      label: names?.seasonName || rankLabel("seasonFallback"),
      href: seasonPath,
    });

    if (parts[2] === "presets") {
      const kind = parts[3];

      if (kind === "opponents" || kind === "formations") {
        crumbs.push({
          label: t(
            `tools.pvp.presets.${kind === "opponents" ? "enemyTitle" : "formationTitle"}`,
          ),
          href: `${seasonPath}/presets/${kind}`,
        });

        const action = parts[4];

        if (action) {
          if (parts[5] === "teams" || parts[5] === "history") {
            crumbs.push({
              label: t(
                `tools.pvp.rankings.${parts[5] === "teams" ? "teamsBreadcrumb" : "historyBreadcrumb"}`,
                {
                  name: names?.opponentName || rankLabel("opponentFallback"),
                },
              ),
            });
          } else {
            crumbs.push({
              label: t(
                `tools.pvp.presets.${action === "new" ? "create" : "edit"}${kind === "opponents" ? "Enemy" : "Formation"}`,
              ),
            });
          }
        }
      } else {
        crumbs.push({ label: rankLabel("presetsBreadcrumb") });
      }
    } else if (parts[2] === "match") {
      crumbs.push({
        label: rankLabel(
          parts[3] === "new"
            ? "newMatchBreadcrumb"
            : parts[3] === "import"
              ? "importBreadcrumb"
              : "editMatchBreadcrumb",
        ),
      });
    }
  }

  return crumbs.map((crumb, index) =>
    index === crumbs.length - 1 ? { label: crumb.label } : crumb,
  );
}
