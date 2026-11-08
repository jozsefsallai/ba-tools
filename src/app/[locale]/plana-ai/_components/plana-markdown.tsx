"use client";

import { type ComponentProps, memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/app/[locale]/plana-ai/_components/copy-button";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import { buildStudentIconUrlFromId } from "@/lib/url";

const STUDENT_LINK_REGEX = /^\/students\/([^/?#]+)$/;
const IMAGE_CDN_ORIGIN = getOrigin(process.env.NEXT_PUBLIC_IMAGE_CDN_URL);
const REMARK_PLUGINS = [
  remarkGfm,
];

function getOrigin(url: string | undefined) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function MarkdownImage({ alt, src }: ComponentProps<"img">) {
  if (
    typeof src === "string" &&
    IMAGE_CDN_ORIGIN &&
    getOrigin(src) === IMAGE_CDN_ORIGIN
  ) {
    return <img alt={alt ?? ""} loading="lazy" src={src} />;
  }

  return alt || null;
}

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    return getNodeText(
      (
        node.props as {
          children?: ReactNode;
        }
      ).children,
    );
  }

  return "";
}

function StudentChip({
  children,
  href,
  studentId,
}: {
  children: ReactNode;
  href: string;
  studentId: string;
}) {
  return (
    <Link
      className="not-prose mx-0.5 inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pr-2 pl-0.5 align-bottom font-medium text-foreground no-underline transition-colors hover:bg-accent"
      href={href}
    >
      <img
        alt=""
        className="my-0 size-5 rounded-full object-cover"
        loading="lazy"
        src={buildStudentIconUrlFromId(studentId)}
      />
      {children}
    </Link>
  );
}

function MarkdownLink({ children, href }: ComponentProps<"a">) {
  const { studentMap } = useStudents();

  if (!href) {
    return <>{children}</>;
  }

  const studentPath = href.match(STUDENT_LINK_REGEX);

  if (studentPath) {
    // The model can invent ids, so an unknown one is shown as plain text.
    return studentMap[studentPath[1]] ? (
      <StudentChip href={href} studentId={studentPath[1]}>
        {children}
      </StudentChip>
    ) : (
      children
    );
  }

  if (href.startsWith("/") && !href.startsWith("//")) {
    return <Link href={href}>{children}</Link>;
  }

  return (
    <a href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

function CodeBlock({ children }: ComponentProps<"pre">) {
  return (
    <div className="group/code relative">
      <pre className="overflow-x-auto rounded-lg border bg-muted p-3 text-foreground text-xs">
        {children}
      </pre>
      <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover/code:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <CopyButton text={getNodeText(children)} />
      </div>
    </div>
  );
}

const COMPONENTS: Components = {
  a: MarkdownLink,
  img: MarkdownImage,
  em: ({ children }) => <em className="text-muted-foreground">{children}</em>,
  p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
  pre: CodeBlock,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <table className="my-0! w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="bg-muted/60 px-3 py-2 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2">{children}</td>,
};

export const PlanaMarkdown = memo(function PlanaMarkdown({
  text,
}: {
  text: string;
}) {
  return (
    <div className="prose prose-sm max-w-none text-foreground leading-relaxed dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-p:my-2 prose-pre:my-3 prose-pre:bg-transparent prose-pre:p-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none first:prose-p:mt-0 last:prose-p:mb-0">
      <ReactMarkdown components={COMPONENTS} remarkPlugins={REMARK_PLUGINS}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
