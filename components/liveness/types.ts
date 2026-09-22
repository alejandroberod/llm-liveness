import type { LivenessResult } from "@/lib/liveness";

export type Phase = "idle" | "requesting" | "denied" | "error" | "scan" | "analyzing" | "result";

// Qué le falta al encuadre del rostro para poder capturar
export type FramingIssue = "none" | "far" | "near" | "off" | "turned";

export type LivenessResponse = {
  model: string;
  latencyMs: number;
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  result: LivenessResult;
};
