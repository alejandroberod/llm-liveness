import { ArrowRightIcon, CaretDownIcon, WarningIcon } from "@phosphor-icons/react";
import type { Verdict } from "@/lib/fusion";

const HEADER = {
  spoof: {
    title: "Suplantación",
    titleCls: "text-[oklch(0.84_0.09_25)]",
    accent: "oklch(0.7 0.13 25)",
  },
  live: {
    title: "Persona real",
    titleCls: "text-[oklch(0.86_0.09_150)]",
    accent: "oklch(0.74 0.11 150)",
  },
  inconclusive: {
    title: "No concluyente",
    titleCls: "text-[oklch(0.88_0.08_80)]",
    accent: "oklch(0.8 0.1 80)",
  },
};

export type EvidenceItem = { label: string | null; text: string };

export type CardOutcome =
  // livenessScore: 0 = ataque, 1 = persona real
  | { ok: true; verdict: Verdict; livenessScore: number; reason: string; evidence?: EvidenceItem[]; meta: string[] }
  | { ok: false; error: string };

type Props = {
  engine: string;
  badge?: string;
  highlight?: boolean; // el resultado final (la fusión)
  outcome: CardOutcome;
  className?: string;
};

export default function VerdictCard({ engine, badge, highlight, outcome, className = "" }: Props) {
  const border = highlight ? "border-[rgba(181,171,252,.45)] bg-[#1d1f33]" : "border-[rgba(233,233,237,.14)] bg-[#181b28]";

  return (
    <section className={`grid content-start gap-3.5 rounded-xl border px-5 py-[18px] text-left ${border} ${className}`}>
      <div className="flex items-center gap-2">
        <h2 className="m-0 flex-1 text-[11px] font-normal tracking-[.14em] text-[#9397ab] uppercase">{engine}</h2>
        {badge && (
          <span className="rounded-full border border-[rgba(233,233,237,.16)] px-2 text-[11px] text-[#b2b6ca]">{badge}</span>
        )}
      </div>

      {outcome.ok ? <Result {...outcome} /> : <Unavailable error={outcome.error} />}
    </section>
  );
}

function Unavailable({ error }: { error: string }) {
  return (
    <div className="grid gap-2 opacity-80">
      <div className="flex items-center gap-2 text-[22px] leading-tight font-medium tracking-[-.02em] text-[#b2b6ca]">
        <WarningIcon size={20} className="text-[oklch(0.7_0.125_25)]" />
        No disponible
      </div>
      <p className="m-0 text-[13.5px] text-pretty text-[#9397ab]">{error}</p>
    </div>
  );
}

function Result({ verdict, livenessScore, reason, evidence = [], meta }: Extract<CardOutcome, { ok: true }>) {
  const h = HEADER[verdict];
  const scorePct = Math.round(livenessScore * 100);

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div className={`text-[22px] leading-tight font-medium tracking-[-.02em] ${h.titleCls}`}>{h.title}</div>
        <div className="text-[34px] leading-none font-semibold tracking-[-.03em] tabular-nums" style={{ color: h.accent }}>
          {livenessScore.toFixed(2)}
        </div>
      </div>

      <div>
        <div
          className="relative h-2 rounded-full bg-[rgba(233,233,237,.1)]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={scorePct}
          aria-label="Probabilidad de persona real"
        >
          <div className="h-full rounded-full" style={{ width: `${scorePct}%`, background: h.accent }} />
          {/* Umbral de decisión: por debajo de 0.5 se considera suplantación */}
          <span className="absolute top-[-3px] left-1/2 h-[14px] w-px bg-[rgba(233,233,237,.45)]" />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-[#75798c] tabular-nums">
          <span>0 · ataque</span>
          <span>liveness score</span>
          <span>1 · en vivo</span>
        </div>
      </div>

      <details className="group border-t border-[rgba(233,233,237,.1)] pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-3 text-[13.5px] text-[#cfd3e5] select-none hover:text-[#e9e9ed] [&::-webkit-details-marker]:hidden">
          <span className="flex-1">Ver motivo</span>
          {evidence.length > 0 && (
            <span className="rounded-full border border-[rgba(233,233,237,.16)] px-2 text-[11.5px] text-[#9397ab] tabular-nums">
              {evidence.length}
            </span>
          )}
          <CaretDownIcon size={15} className="text-[#9397ab] transition-transform group-open:rotate-180" />
        </summary>

        <div className="grid gap-3 pt-3">
          <p className="m-0 text-[14px] text-pretty text-[#e4e7f5]">{reason}</p>

          {evidence.length > 0 && (
            <ul className="m-0 grid list-none gap-2 p-0">
              {evidence.map((item, i) => (
                <li key={i} className="flex gap-2.5 rounded-lg border border-[rgba(233,233,237,.14)] bg-[#1b1e2c] px-3.5 py-3">
                  <ArrowRightIcon size={13} className="mt-1 flex-none text-[#796cbf]" />
                  <div>
                    {item.label && <div className="mb-1 text-[12.5px] tracking-[.01em] text-[#d2cefd]">{item.label}</div>}
                    <p className="m-0 text-[13px] leading-normal text-pretty text-[#b2b6ca]">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      {meta.length > 0 && (
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-[#9397ab] tabular-nums">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
    </>
  );
}
