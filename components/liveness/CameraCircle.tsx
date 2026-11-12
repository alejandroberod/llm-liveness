import type { Ref } from "react";
import { VideoCameraSlashIcon, WarningIcon } from "@phosphor-icons/react";
import type { LivenessResult } from "@/lib/liveness";

const RING = 267; // circunferencia del anillo (r = 42.5 en viewBox 100)

const VERDICT_STROKE: Record<LivenessResult["verdict"], string> = {
  spoof: "oklch(0.66 0.125 25)",
  live: "oklch(0.7 0.11 150)",
  inconclusive: "oklch(0.78 0.1 80)",
};

type Props = {
  videoRef: Ref<HTMLVideoElement>;
  hasStream: boolean;
  shot: string | null;
  failed: boolean; // permiso denegado o error de carga
  analyzing: boolean;
  aligned: boolean;
  progress: number;
  verdict: LivenessResult["verdict"] | null;
};

export default function CameraCircle({ videoRef, hasStream, shot, failed, analyzing, aligned, progress, verdict }: Props) {
  return (
    <div className="relative aspect-square w-[min(400px,88vw,48vh)] max-w-full md:w-[min(560px,62vh)] flex-none">
      <div
        className="absolute inset-[4.2%] overflow-hidden rounded-full bg-[#101220] transition-shadow duration-300"
        style={{
          boxShadow: aligned
            ? "0 0 0 1px #6f64b0, 0 0 34px rgba(145,132,217,.24), 0 18px 44px rgba(0,0,0,.6)"
            : "0 0 0 1px #3f424d, 0 18px 44px rgba(0,0,0,.6)",
        }}
      >
        {/* Siempre montado para que el stream tenga dónde engancharse */}
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />

        {shot && (
          <div
            role="img"
            aria-label="Último frame capturado"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${shot})` }}
          />
        )}

        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#101220]">
            <WarningIcon size={34} className="text-[oklch(0.7_0.125_25)]" />
          </div>
        ) : (
          !hasStream &&
          !shot && (
            <div className="absolute inset-0 flex items-center justify-center bg-[repeating-linear-gradient(135deg,#1b1e2e_0_7px,#171a28_7px_14px)]">
              <VideoCameraSlashIcon size={34} className="text-[#75798c]" />
            </div>
          )
        )}

        {analyzing && <div className="absolute inset-0 bg-[rgba(16,18,32,.55)]" />}
      </div>

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90 overflow-visible">
        {verdict ? (
          <circle cx="50" cy="50" r="42.5" fill="none" stroke={VERDICT_STROKE[verdict]} strokeWidth="1.6" />
        ) : failed ? (
          <circle cx="50" cy="50" r="42.5" fill="none" stroke="oklch(0.66 0.125 25 / .5)" strokeWidth="1.2" />
        ) : (
          <>
            <circle cx="50" cy="50" r="42.5" fill="none" stroke="rgba(233,233,237,.14)" strokeWidth="1.2" />
            <circle
              cx="50"
              cy="50"
              r="42.5"
              fill="none"
              stroke={aligned ? "#b5abfc" : "#968ae0"}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING - RING * progress}
              style={{ transition: "stroke-dashoffset .12s linear" }}
            />
          </>
        )}
      </svg>

      {analyzing && (
        <div className="absolute top-1/2 left-1/2 size-[34px] -translate-x-1/2 -translate-y-1/2">
          <div className="size-full animate-spin rounded-full border-[1.5px] border-[rgba(233,233,237,.2)] border-t-[#b5abfc] [animation-duration:.9s]" />
        </div>
      )}
    </div>
  );
}
