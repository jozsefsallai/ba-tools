import type { UIMessage } from "ai";

export type PlanaStatusKey = "recalling";

export type PlanaToolStatus = "done" | "error" | "denied" | "pending";

export type PlanaSavedTool = {
  toolName: string;
  status: PlanaToolStatus;
  summary?: string;
  students?: string[];
  link?: string;
};

export type PlanaDataTypes = {
  status: {
    key: PlanaStatusKey;
  };
  savedTool: PlanaSavedTool;
};

export type PlanaChatMessage = UIMessage<unknown, PlanaDataTypes>;

export const PLANA_ERROR_CODES = [
  "not_configured",
  "invalid_key",
  "no_credits",
  "rate_limited",
  "model_not_found",
  "model_no_tools",
  "filtered",
  "generic",
] as const;

export type PlanaErrorCode = (typeof PLANA_ERROR_CODES)[number];

export function toPlanaErrorCode(message: string | undefined): PlanaErrorCode {
  return PLANA_ERROR_CODES.find((code) => code === message) ?? "generic";
}
