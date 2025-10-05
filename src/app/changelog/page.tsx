import { CHANGELOG } from "@/changelog";
import { ChangelogItem } from "@/components/common/changelog-item";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import { Fragment } from "react";

export const metadata: Metadata = {
  title: "Changelog - Joe's Blue Archive Tools",
  description: "See the latest changes, features, and fixes for this website.",
  twitter: {
    card: "summary",
  },
};

export default function ChangelogPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-8">
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
