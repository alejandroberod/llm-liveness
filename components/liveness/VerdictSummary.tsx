import { ArrowCounterClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import { silentFaceVerdict } from "@/lib/fusion";
import OutlineButton from "./OutlineButton";
import VerdictCard, { type CardOutcome } from "./VerdictCard";
import type { CompareResponse } from "./types";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

function llmOutcome(llm: CompareResponse["llm"]): CardOutcome {
  if (!llm.ok) return llm;
  const r = llm.data.result;
  return {
    ok: true,
    verdict: r.verdict,
    livenessScore: 1 - r.spoofScore,
    reason: r.reason,
    // Los indicadores de ataque traen etiqueta + evidencia; los de vida son solo texto
    evidence: [
      ...r.attackIndicators.map((a) => ({ label: a.indicator, text: a.evidence })),
      ...(r.verdict !== "spoof" ? r.liveIndicators.map((text) => ({ label: null, text })) : []),
    ],
    meta: [
      seconds(llm.data.latencyMs),
      ...(llm.data.usage.totalTokens != null ? [`${llm.data.usage.totalTokens} tokens`] : []),
      `calidad ${r.imageQuality} · ${r.faceCount} ${r.faceCount === 1 ? "rostro" : "rostros"}`,
    ],
  };
}

function silentFaceOutcome(sf: CompareResponse["silentFace"]): CardOutcome {
  if (!sf.ok) return sf;
  const d = sf.data;
  const pReal = `${d.realScore.toFixed(2)}${d.realScoreApprox ? " (estimada)" : ""}`;
  return {
    ok: true,
    verdict: silentFaceVerdict(d),
    livenessScore: d.realScore,
    reason: `MiniFASNet clasifica el rostro como ${d.label === "real" ? "real" : "ataque"}`,
    meta: [seconds(d.latencyMs), `p(real) ${pReal}`, `rostro ${d.bbox[2]}×${d.bbox[3]} px`],
  };
}

type Props = {
  response: CompareResponse;
  onRetry: () => void;
  onContinue: () => void;
};

export default function VerdictSummary({ response, onRetry, onContinue }: Props) {
  const { combined } = response;

  return (
    <>
      <div className="grid w-full gap-3 md:grid-cols-3">
        <VerdictCard engine="LLM · Gemini" outcome={llmOutcome(response.llm)} />
        {/* La fusión es el resultado final: primero en móvil, al centro en escritorio */}
        <VerdictCard
          engine="Combinado"
          badge={combined.degraded ? "degradado" : "final"}
          highlight
          className="order-first md:order-0"
          outcome={{
            ok: true,
            verdict: combined.verdict,
            livenessScore: 1 - combined.spoofScore,
            reason: combined.rule,
            meta: ["Silent Face primario · LLM como veto"],
          }}
        />
        <VerdictCard engine="Liveness Model" outcome={silentFaceOutcome(response.silentFace)} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <OutlineButton onClick={onRetry} className="px-[22px] py-3 text-[14.5px]">
          <ArrowCounterClockwiseIcon size={17} />
          <span>Intentar de nuevo</span>
        </OutlineButton>
        <OutlineButton onClick={onContinue} className="px-[22px] py-3 text-[14.5px]">
          <CheckIcon size={17} />
          <span>Continuar</span>
        </OutlineButton>
      </div>
    </>
  );
}
