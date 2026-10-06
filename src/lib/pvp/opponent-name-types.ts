export type PvpOpponentNameRecognition = {
  name: string | null;
  rawText?: string;
  source: "cache" | "vision" | "unresolved";
  uncertain: boolean;
  receipt?: string;
  diagnostics: {
    fingerprint?: string;
    match?: "exact" | "similar" | "miss" | "ambiguous" | "unavailable";
    candidates?: number;
    model?: string;
    error?: string;
    elapsedMs: number;
  };
};
