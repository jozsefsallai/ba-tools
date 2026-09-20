"use client";

import Content from "./content.mdx";

export function MainContent() {
  return (
    <div className="prose dark:prose-invert max-w-full prose-a:font-normal">
      <Content />
    </div>
  );
}
