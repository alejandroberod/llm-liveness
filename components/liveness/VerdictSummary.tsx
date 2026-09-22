import { ArrowCounterClockwiseIcon, ArrowRightIcon, CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import OutlineButton from "./OutlineButton";
import type { LivenessResponse } from "./types";

const HEADER = {
  spoof: {
    eyebrow: "no supera la prueba",
    title: "Suplantación detectada",
    eyebrowCls: "text-[oklch(0.8_0.08_25)]",
    titleCls: "text-[oklch(0.84_0.09_25)]",
    accent: "oklch(0.7 0.13 25)",
    evidence: "evidencia del ataque",
  },
  live: {
    eyebrow: "verificación superada",
    title: "Persona real",
    eyebrowCls: "text-[oklch(0.82_0.08_150)]",
    titleCls: "text-[oklch(0.86_0.09_150)]",
    accent: "oklch(0.74 0.11 150)",
    evidence: "evidencia de vida",
  },
  inconclusive: {
    eyebrow: "sin veredicto claro",
    title: "Resultado no concluyente",
    eyebrowCls: "text-[oklch(0.84_0.07_80)]",
    titleCls: "text-[oklch(0.88_0.08_80)]",
    accent: "oklch(0.8 0.1 80)",
    evidence: "observaciones",
  },
};

type Props = {
  response: LivenessResponse;
  onRetry: () => void;
  onContinue: () => void;
};

export default function VerdictSummary({ response, onRetry, onContinue }: Props) {
  const r = response.result;
  const h = HEADER[r.verdict];
  const scorePct = Math.round(r.spoofScore * 100);

  // Los indicadores de ataque traen etiqueta + evidencia; los de vida son solo texto
  const evidence = [
    ...r.attackIndicators.map((a) => ({ label: a.indicator, text: a.evidence })),
    ...(r.verdict === "inconclusive" ? r.liveIndicators.map((text) => ({ label: null, text })) : []),
  ];

  return (
    <>
      <div className="grid justify-items-center gap-2.5">
        <div className={`text-[11px] tracking-[.14em] uppercase ${h.eyebrowCls}`}>{h.eyebrow}</div>
        <h1 className={`m-0 text-[clamp(28px,5vw,38px)] leading-[1.1] font-medium tracking-[-.025em] ${h.titleCls}`}>
          {h.title}
        </h1>
      </div>

      <div className="mt-[clamp(18px,3vh,26px)] grid w-full gap-3 rounded-xl border border-[rgba(233,233,237,.14)] bg-[#1b1e2c] px-5 py-[18px]">
        <div className="flex items-end justify-between gap-4">
          <div className="text-left">
            <div className="text-[11px] tracking-[.1em] text-[#9397ab] uppercase">spoof score</div>
            <div className="mt-1 text-[13.5px] text-[#b2b6ca]">probabilidad de suplantación</div>
          </div>
          <div
            className="text-[clamp(40px,7vw,56px)] leading-none font-semibold tracking-[-.03em] tabular-nums"
            style={{ color: h.accent }}
          >
            {r.spoofScore.toFixed(2)}
          </div>
        </div>

        <div
          className="relative h-2 rounded-full bg-[rgba(233,233,237,.1)]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={scorePct}
          aria-label="Probabilidad de suplantación"
        >
          <div className="h-full rounded-full" style={{ width: `${scorePct}%`, background: h.accent }} />
          {/* Umbral de decisión: 0.5 o más se considera suplantación */}
          <span className="absolute top-[-3px] left-1/2 h-[14px] w-px bg-[rgba(233,233,237,.45)]" />
        </div>
        <div className="flex justify-between text-[11px] text-[#75798c] tabular-nums">
          <span>0 · en vivo</span>
          <span>0.5</span>
          <span>1 · ataque</span>
        </div>
      </div>

      {/* Motivo, evidencia y telemetría: solo cuando no pasa la verificación, ocultos por defecto */}
      {r.verdict !== "live" && (
        <details className="group mt-3 w-full rounded-xl border border-[rgba(233,233,237,.14)] text-left">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 text-[13.5px] text-[#cfd3e5] select-none hover:text-[#e9e9ed] [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Ver motivo y {h.evidence}</span>
            {evidence.length > 0 && (
              <span className="rounded-full border border-[rgba(233,233,237,.16)] px-2 text-[11.5px] text-[#9397ab] tabular-nums">
                {evidence.length}
              </span>
            )}
            <CaretDownIcon size={15} className="text-[#9397ab] transition-transform group-open:rotate-180" />
          </summary>

          <div className="grid gap-3.5 border-t border-[rgba(233,233,237,.1)] px-5 pt-4 pb-5">
            <p className="m-0 text-[14.5px] text-pretty text-[#e4e7f5]">{r.reason}</p>

            {evidence.length > 0 && (
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {evidence.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-[rgba(233,233,237,.14)] bg-[#1b1e2c] px-[15px] py-[13px]"
                  >
                    <ArrowRightIcon size={14} className="mt-1 flex-none text-[#796cbf]" />
                    <div>
                      {item.label && <div className="mb-[5px] text-[13px] tracking-[.01em] text-[#d2cefd]">{item.label}</div>}
                      <p className="m-0 text-[13.5px] leading-normal text-pretty text-[#b2b6ca]">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[rgba(233,233,237,.12)] pt-3 text-[11.5px] text-[#9397ab] tabular-nums">
              {/* <span>{response.model}</span> */}
              <span>{(response.latencyMs / 1000).toFixed(1)} s</span>
              {response.usage.totalTokens != null && <span>{response.usage.totalTokens} tokens</span>}
              <span>
                calidad {r.imageQuality} · {r.faceCount} {r.faceCount === 1 ? "rostro" : "rostros"}
              </span>
            </div>
          </div>
        </details>
      )}

      {r.verdict === "live" ? (
        <OutlineButton onClick={onContinue} className="mt-4 justify-self-center px-[22px] py-3 text-[14.5px]">
          <CheckIcon size={17} />
          <span>Continuar</span>
        </OutlineButton>
      ) : (
        <OutlineButton onClick={onRetry} className="mt-4 justify-self-center px-[22px] py-3 text-[14.5px]">
          <ArrowCounterClockwiseIcon size={17} />
          <span>Intentar de nuevo</span>
        </OutlineButton>
      )}
    </>
  );
}
