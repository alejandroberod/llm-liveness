import type { CombinedResult } from "@/lib/fusion";
import type { LivenessResult } from "@/lib/liveness";
import type { SilentFaceResult } from "@/lib/silentface";

export type Phase = "idle" | "requesting" | "denied" | "error" | "scan" | "analyzing" | "result";

// Qué le falta al encuadre del rostro para poder capturar
export type FramingIssue = "none" | "far" | "near" | "off" | "turned";

export type LivenessResponse = {
  model: string;
  latencyMs: number;
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  result: LivenessResult;
};

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

export type CompareResponse = {
  llm: Outcome<LivenessResponse>;
  silentFace: Outcome<SilentFaceResult>;
  combined: CombinedResult;
};
