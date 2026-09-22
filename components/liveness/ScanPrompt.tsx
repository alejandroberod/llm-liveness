import { ArrowCounterClockwiseIcon, VideoCameraIcon } from "@phosphor-icons/react";
import OutlineButton from "./OutlineButton";
import type { FramingIssue, Phase } from "./types";

type Props = {
  phase: Exclude<Phase, "result">;
  faces: number;
  issue: FramingIssue;
  aligned: boolean;
  progress: number;
  onStart: () => void;
  onStop: () => void;
};

const SCAN_TIP = "Mira de frente";

function scanHeadline(faces: number, issue: FramingIssue) {
  if (faces === 0) return "Acércate a la cámara";
  if (faces > 1) return "Hay más de una persona en cuadro";
  switch (issue) {
    case "far":
      return "Acércate a la cámara";
    case "near":
      return "Aléjate un poco";
    case "turned":
      return "Mira de frente a la cámara";
    case "off":
      return "Centra tu rostro en el círculo";
    default:
      return "Perfecto, quédate quieto";
  }
}

export default function ScanPrompt({ phase, faces, issue, aligned, progress, onStart, onStop }: Props) {
  const failed = phase === "denied" || phase === "error";

  const copy = {
    idle: {
      title: "Vamos a comprobar que eres tú",
      text: "La cámara está apagada.",
      button: "Iniciar cámara",
    },
    requesting: {
      title: "Esperando el permiso de la cámara",
      text: "Acepta el aviso del navegador para continuar.",
      button: "Solicitando permiso…",
    },
    denied: {
      title: "Sin acceso a la cámara",
      text: "Habilita la cámara desde el candado de la barra de direcciones y vuelve a intentar.",
      button: "Volver a intentar",
    },
    error: {
      title: "Algo falló",
      text: "No pudimos cargar el detector o analizar la captura. Revisa tu conexión y vuelve a intentar.",
      button: "Volver a intentar",
    },
    scan: {
      title: scanHeadline(faces, issue),
      text: faces > 1 ? "La verificación necesita un solo rostro en el encuadre." : SCAN_TIP,
      button: "Detener cámara",
    },
    analyzing: {
      title: "Analizando la captura",
      text: "Enviamos el último frame al modelo de detección de vida.",
      button: "",
    },
  }[phase];

  return (
    <div className="grid justify-items-center gap-2.5">
      <h1 className="m-0 text-[clamp(22px,3.4vw,28px)] leading-[1.16] font-medium tracking-[-.02em]">{copy.title}</h1>
      <p className="m-0 max-w-[42ch] text-[14.5px] text-pretty text-[#b2b6ca]">{copy.text}</p>

      {phase === "scan" && (
        <div
          className={`mt-0.5 flex items-center gap-2 rounded-full border px-3 py-1.5 ${
            aligned ? "border-[rgba(145,132,217,.5)]" : "border-[rgba(233,233,237,.16)]"
          }`}
        >
          <span className="size-1.5 animate-[edot_1.3s_ease-in-out_infinite] rounded-full bg-[#b5abfc]" />
          <span className="text-[12.5px] text-[#cfd3e5] tabular-nums">estabilidad {Math.round(progress * 100)}%</span>
        </div>
      )}

      {phase !== "analyzing" && (
        <OutlineButton
          onClick={phase === "scan" ? onStop : onStart}
          disabled={phase === "requesting"}
          className="mt-2 px-6 py-[13px] text-[15px]"
        >
          {failed ? <ArrowCounterClockwiseIcon size={18} /> : <VideoCameraIcon size={18} />}
          <span>{copy.button}</span>
        </OutlineButton>
      )}

      {!failed && (
        <div className="text-xs text-[#9397ab]">
          {phase === "analyzing" && "esto puede tardar unos segundos"}
        </div>
      )}
    </div>
  );
}
