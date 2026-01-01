"use client";

import { useTranslations } from "next-intl";

export function MarkdownTips() {
  const t = useTranslations();

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
      <ul>
        <li>
          {t.rich("common.mdTips.tip1", {
            code: (children) => <code>{children}</code>,
          })}
        </li>
        <li>
          {t.rich("common.mdTips.tip2", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </li>
        <li>
          {t.rich("common.mdTips.tip3", {
            a: (children) => (
              <a
                href="https://www.markdownguide.org/basic-syntax/"
                target="_blank"
                rel="noreferrer"
              >
                {children}
              </a>
            ),
          })}
        </li>
      </ul>
    </div>
  );
}
