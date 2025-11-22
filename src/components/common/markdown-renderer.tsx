import Markdown from "react-markdown";

import remarkYoutube from "remark-youtube";
import remarkBilibili from "@/lib/remark-bilibili-plugin";
import remarkEchelonPlugin from "@/lib/remark-echelon-plugin";

export type MarkdownRendererProps = {
  children: string;
};

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <Markdown
      remarkPlugins={[remarkYoutube, remarkBilibili, remarkEchelonPlugin]}
    >
      {children}
    </Markdown>
  );
}
