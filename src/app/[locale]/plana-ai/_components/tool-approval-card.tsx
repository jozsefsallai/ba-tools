"use client";

import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useStudents } from "@/hooks/use-students";
import { getWriteVerb, type PlanaToolView } from "@/lib/ai/tool-parts";
import { buildStudentIconUrlFromId } from "@/lib/url";

export function ToolApprovalCard({
  onRespond,
  tool,
}: {
  onRespond: (approvalId: string, approved: boolean) => void;
  tool: PlanaToolView;
}) {
  const t = useTranslations();

  const { studentMap } = useStudents();

  const { approvalId } = tool;
  const titleKey =
    `tools.plana.approval.${tool.toolName}` as "tools.plana.approval.create_formation";
  const verb = getWriteVerb(tool.toolName) ?? "update";

  const isDelete = verb === "delete";

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <p className="font-medium text-sm">
          {t.has(titleKey) ? t(titleKey) : t(`tools.plana.approval.${verb}`)}
        </p>

        {tool.summary ? <p className="mt-0.5 text-sm">{tool.summary}</p> : null}

        <p className="mt-1 text-muted-foreground text-xs">
          {t("tools.plana.approval.description")}
        </p>
      </div>

      {tool.students ? (
        <div className="flex flex-wrap gap-1.5">
          {tool.students.map((id) => (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pr-2 pl-0.5 text-xs"
              key={id}
            >
              <img
                alt=""
                className="size-5 rounded-full object-cover"
                loading="lazy"
                src={buildStudentIconUrlFromId(id)}
              />

              {studentMap[id]?.name ?? id}
            </span>
          ))}
        </div>
      ) : null}

      {tool.details ? (
        <Collapsible>
          <CollapsibleTrigger className="group/details flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground">
            <ChevronRightIcon className="size-3.5 transition-transform group-data-[state=open]/details:rotate-90" />
            {t("tools.plana.approval.details")}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <pre className="mt-2 max-h-60 overflow-auto rounded-lg border bg-muted p-3 text-xs">
              {tool.details}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {approvalId ? (
        <div className="flex gap-2">
          <Button
            onClick={() => onRespond(approvalId, true)}
            size="sm"
            type="button"
            variant={isDelete ? "destructive" : "default"}
          >
            {isDelete
              ? t("tools.plana.approval.delete_action")
              : t("tools.plana.approval.save")}
          </Button>

          <Button
            onClick={() => onRespond(approvalId, false)}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("tools.plana.approval.cancel")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
