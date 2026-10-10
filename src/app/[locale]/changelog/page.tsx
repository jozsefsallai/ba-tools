import { CHANGELOG } from "@/changelog";
import { ChangelogItem } from "@/components/common/changelog-item";
import { Separator } from "@/components/ui/separator";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";
import { Fragment } from "react";

export async function generateMetadata() {
  return getCardMetadata("changelog", await getLocale());
}

export default function ChangelogPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h1 className="text-3xl font-bold">Changelog</h1>

        <div className="flex flex-col gap-12">
          {CHANGELOG.map((item, idx) => (
            <Fragment key={idx}>
              <ChangelogItem data={item} />
              {idx < CHANGELOG.length - 1 && <Separator />}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
