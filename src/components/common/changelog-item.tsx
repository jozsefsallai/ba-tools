import type { Change, ChangelogItemData } from "@/changelog";
import { ChevronRightIcon } from "lucide-react";

export type ChangelogItem = {
  data: ChangelogItemData;
};

function ChangelogGroup({
  title,
  items,
}: {
  title: string;
  items: Change[];
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <ChevronRightIcon className="shrink-0 text-muted-foreground" />

            {item.scope && (
              <div className="self-start shrink-0 mt-0.5 text-xs text-muted-foreground px-2 py-0.5 font-bold border rounded-full">
                {item.scope}
              </div>
            )}

            <div>{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChangelogItem({ data }: ChangelogItem) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{data.date}</h2>

      {data.features.length > 0 && (
        <ChangelogGroup title="Features" items={data.features} />
      )}

      {data.fixes.length > 0 && (
        <ChangelogGroup title="Fixes" items={data.fixes} />
      )}

      {data.changes.length > 0 && (
        <ChangelogGroup title="Changes" items={data.changes} />
      )}
    </div>
  );
}
