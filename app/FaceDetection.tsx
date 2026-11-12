"use client";

import CameraCircle from "@/components/liveness/CameraCircle";
import ScanPrompt from "@/components/liveness/ScanPrompt";
import VerdictSummary from "@/components/liveness/VerdictSummary";
import { analyzeShot } from "@/components/liveness/analyze";
import { useLivenessCapture } from "@/components/liveness/useLivenessCapture";

export default function FaceDetection() {
  const capture = useLivenessCapture({ analyze: analyzeShot });
  const { phase, response } = capture;

  const failed = phase === "denied" || phase === "error";
  const aligned = phase === "scan" && capture.faces === 1 && capture.issue === "none";

  return (
    <div className="flex min-h-dvh flex-col items-center px-5 pt-[clamp(18px,2.5vh,44px)] pb-[clamp(24px,3vh,52px)]">
      <div className="mb-[clamp(14px,2vh,34px)] flex items-center gap-2.5">
        <span className="size-[7px] rounded-full bg-[#968ae0]" />
        <span className="text-[11px] tracking-[.14em] text-[#9397ab] uppercase">Liveness · verificación de vida</span>
      </div>

      <CameraCircle
        videoRef={capture.videoRef}
        hasStream={capture.hasStream}
        shot={capture.shot}
        failed={failed}
        analyzing={phase === "analyzing"}
        aligned={aligned}
        progress={capture.progress}
        verdict={phase === "result" && response ? response.combined.verdict : null}
      />

      <div
        className={`mt-[clamp(14px,2vh,28px)] grid w-full justify-items-center gap-[9px] text-center ${phase === "result" ? "max-w-[1040px]" : "max-w-[520px]"}`}
      >
        {phase === "result" && response ? (
          <VerdictSummary response={response} onRetry={capture.start} onContinue={capture.stop} />
        ) : (
          phase !== "result" && (
            <ScanPrompt
              phase={phase}
              faces={capture.faces}
              issue={capture.issue}
              aligned={aligned}
              progress={capture.progress}
              onStart={capture.start}
              onStop={capture.stop}
            />
          )
        )}
      </div>
    </div>
  );
}
