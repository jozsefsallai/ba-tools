"use client";

import Licenses from "@/app/[locale]/credits/_components/licenses.mdx";

export function LicensesContent() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <Licenses />
    </div>
  );
}
