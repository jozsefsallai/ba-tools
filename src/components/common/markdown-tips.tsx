export function MarkdownTips() {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
      <ul>
        <li>
          Wrapping links between &lt; and &gt; will create a link (e.g.:{" "}
          <code>&lt;https://bluearchive.nexon.com&gt;</code>).
        </li>
        <li>
          <strong>YouTube</strong> and <strong>BiliBili</strong> links written
          using the format above will automatically be embedded
        </li>
        <li>
          See this{" "}
          <a
            href="https://www.markdownguide.org/cheat-sheet/"
            target="_blank"
            rel="noreferrer"
          >
            Markdown Cheat Sheet
          </a>{" "}
          for more formatting tips. Please note that not all formatting may be
          supported.
        </li>
      </ul>
    </div>
  );
}
