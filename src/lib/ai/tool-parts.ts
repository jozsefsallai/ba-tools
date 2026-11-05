import { getToolName, isToolUIPart } from "ai";
import type {
  PlanaChatMessage,
  PlanaSavedTool,
  PlanaToolStatus,
} from "@/lib/ai/message-types";

export type PlanaToolView = {
  toolName: string;
  status: PlanaToolStatus | "running" | "approval";
  summary?: string;
  students?: string[];
  link?: string;
  approvalId?: string;
  details?: string;
};

const MAX_STUDENTS = 12;

export const PREPARE_CHANGES_TOOL = "prepare_changes";

export type PlanaWriteVerb = "create" | "update" | "delete";

export function getWriteVerb(toolName: string): PlanaWriteVerb | null {
  const verb = toolName.split("_")[0];

  return verb === "create" || verb === "update" || verb === "delete"
    ? verb
    : null;
}

export function isWriteTool(toolName: string) {
  return getWriteVerb(toolName) !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectStudentIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectStudentIds);
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    key === "studentId" && typeof child === "string"
      ? [
          child,
        ]
      : collectStudentIds(child),
  );
}

function getWriteStudents(toolName: string, input: unknown) {
  if (!isWriteTool(toolName)) {
    return undefined;
  }

  const unique = [
    ...new Set(collectStudentIds(input)),
  ].slice(0, MAX_STUDENTS);

  return unique.length > 0 ? unique : undefined;
}

function getSummary(toolName: string, input: unknown) {
  if (!isRecord(input)) {
    return undefined;
  }

  const value = isWriteTool(toolName)
    ? (input.change_summary ?? input.name)
    : (input.q ?? input.student);

  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 160)
    : undefined;
}

function getOutputError(output: unknown) {
  return isRecord(output) && typeof output.error === "string";
}

function getOutputLink(output: unknown) {
  return isRecord(output) && typeof output.link === "string"
    ? output.link
    : undefined;
}

type ToolPart = Extract<
  PlanaChatMessage["parts"][number],
  {
    toolCallId: string;
  }
>;

export function toolPartToView(part: ToolPart): PlanaToolView {
  const toolName = getToolName(part);
  const base = {
    toolName,
    summary: getSummary(toolName, part.input),
    students: getWriteStudents(toolName, part.input),
  };

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return {
        ...base,
        status: "running",
      };
    case "approval-requested":
      return {
        ...base,
        status: "approval",
        approvalId: part.approval.id,
        details: JSON.stringify(part.input, null, 2),
      };
    case "approval-responded":
      return {
        ...base,
        status: part.approval.approved ? "running" : "denied",
      };
    case "output-available":
      return {
        ...base,
        status: getOutputError(part.output) ? "error" : "done",
        link: getOutputLink(part.output),
      };
    case "output-denied":
      return {
        ...base,
        status: "denied",
      };
    default:
      return {
        ...base,
        status: "error",
      };
  }
}

function toSavedStatus(status: PlanaToolView["status"]): PlanaToolStatus {
  switch (status) {
    case "done":
    case "error":
    case "denied":
      return status;
    case "approval":
      return "pending";
    default:
      return "error";
  }
}

export function toolPartToSaved(part: ToolPart): PlanaSavedTool {
  const {
    approvalId: _approvalId,
    details: _details,
    ...view
  } = toolPartToView(part);

  return {
    ...view,
    status: toSavedStatus(view.status),
  };
}

export function isPlanaToolPart(
  part: PlanaChatMessage["parts"][number],
): part is ToolPart {
  return isToolUIPart(part) && getToolName(part) !== PREPARE_CHANGES_TOOL;
}
