import { cn } from "@/lib/utils";
import { CheckIcon, LoaderCircleIcon, PencilLineIcon } from "lucide-react";
import { useMemo } from "react";

export type SaveStatusProps = {
  isDirty: boolean;
  isSaving?: boolean;
};

export function SaveStatus({ isDirty, isSaving }: SaveStatusProps) {
  const Icon = useMemo(() => {
    if (isSaving) {
      return <LoaderCircleIcon className="size-4 animate-spin" />;
    }

    if (isDirty) {
      return <PencilLineIcon className="size-4" />;
    }

    return <CheckIcon className="size-4" />;
  }, [isDirty, isSaving]);

  const label = useMemo(() => {
    if (isSaving) {
      return "Saving changes...";
    }

    if (isDirty) {
      return "You have unsaved changes.";
    }

    return "No unsaved changes.";
  }, [isDirty, isSaving]);

  return (
    <div
      className={cn("flex items-center gap-1 text-xs font-medium", {
        "text-green-400": !isDirty && !isSaving,
        "text-yellow-400": isDirty && !isSaving,
        "text-blue-400": isSaving,
      })}
    >
      {Icon}
      <span>{label}</span>
    </div>
  );
}
