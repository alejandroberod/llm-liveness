import type { LivenessResult } from "./liveness";
import type { SilentFaceResult } from "./silentface";

export type Verdict = LivenessResult["verdict"];

export const SF_STRONG_REAL = 0.8;
export const SF_DECISION = 0.5;
export const SF_STRONG_FAKE = 0.2;

export const silentFaceVerdict = (sf: SilentFaceResult): Verdict => (sf.realScore >= SF_DECISION ? "live" : "spoof");

export type CombinedResult = {
  verdict: Verdict;
  spoofScore: number;
  rule: string; // qué celda de la tabla decidió, en español
  degraded: boolean; // true si faltó uno de los dos motores
};

// Silent Face es el motor primario y decide por su score; el LLM es la capa de seguridad y se usa
// por su veredicto, no por su spoofScore (auto-reportado y poco calibrado). El LLM puede bloquear,
// pero nunca rescata un fake seguro de Silent Face.
//
//                        LLM live       LLM inconclusive   LLM spoof
//   SF real  >= 0.8      live           live               spoof
//   SF real  0.5 - 0.8   live           inconclusive       spoof
//   SF fake  0.2 - 0.5   inconclusive   inconclusive       spoof
//   SF fake  < 0.2       spoof          spoof              spoof
export function fuseVerdicts(llm: LivenessResult | null, sf: SilentFaceResult | null): CombinedResult | null {
  if (!llm && !sf) return null;

  if (!sf) {
    return { verdict: llm!.verdict, spoofScore: llm!.spoofScore, rule: "Silent Face no disponible: decide sólo el LLM", degraded: true };
  }

  const pReal = sf.realScore;
  const sfSpoof = Number((1 - pReal).toFixed(4));

  if (!llm) {
    return { verdict: silentFaceVerdict(sf), spoofScore: sfSpoof, rule: "LLM no disponible: decide sólo Silent Face", degraded: true };
  }

  if (llm.verdict === "spoof") {
    return { verdict: "spoof", spoofScore: Math.max(sfSpoof, llm.spoofScore), rule: "Veto del LLM: detectó un medio de ataque", degraded: false };
  }

  if (pReal < SF_STRONG_FAKE) {
    return { verdict: "spoof", spoofScore: sfSpoof, rule: "Silent Face detectó un ataque con alta confianza", degraded: false };
  }
  if (pReal >= SF_STRONG_REAL) {
    return { verdict: "live", spoofScore: sfSpoof, rule: "Silent Face confirma persona real con alta confianza", degraded: false };
  }
  if (pReal >= SF_DECISION && llm.verdict === "live") {
    return { verdict: "live", spoofScore: sfSpoof, rule: "Silent Face real con confianza media, confirmado por el LLM", degraded: false };
  }
  return {
    verdict: "inconclusive",
    spoofScore: sfSpoof,
    rule:
      pReal >= SF_DECISION
        ? "Silent Face real con confianza media, pero el LLM no lo confirma"
        : "Silent Face se inclina a ataque sin alta confianza",
    degraded: false,
  };
}
