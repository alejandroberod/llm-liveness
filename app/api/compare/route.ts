import { createHash } from "node:crypto";
import { fuseVerdicts } from "@/lib/fusion";
import { analyzeLiveness, DEFAULT_MODEL } from "@/lib/liveness";
import { predictSilentFace } from "@/lib/silentface";
import { readImage } from "@/lib/upload";

export const maxDuration = 60;

const settle = <T,>(r: PromiseSettledResult<T>) =>
  r.status === "fulfilled"
    ? ({ ok: true, data: r.value } as const)
    : ({ ok: false, error: r.reason instanceof Error ? r.reason.message : String(r.reason) } as const);

export async function POST(req: Request) {
  const image = await readImage(req);
  if (image instanceof Response) return image;

  const modelField = image.form.get("model");
  const model = typeof modelField === "string" && modelField ? modelField : DEFAULT_MODEL;

  const [llmRes, sfRes] = await Promise.allSettled([
    analyzeLiveness(image.bytes, image.type, model),
    predictSilentFace(image.bytes, image.type),
  ]);
  const llm = settle(llmRes);
  const silentFace = settle(sfRes);

  if (!llm.ok) console.error("Falló el análisis del LLM", llmRes.status === "rejected" && llmRes.reason);
  if (!silentFace.ok) console.error("Falló Silent Face:", silentFace.error);

  const combined = fuseVerdicts(llm.ok ? llm.data.result : null, silentFace.ok ? silentFace.data : null);
  if (!combined) {
    return Response.json({ error: "Fallaron los dos análisis de liveness" }, { status: 502 });
  }

  const sha = createHash("sha256").update(image.bytes).digest("hex").slice(0, 12);
  console.log(
    `[compare] ${image.type} ${image.size}B sha:${sha} -> llm:${llm.ok ? llm.data.result.verdict : "err"}` +
      ` sf:${silentFace.ok ? `${silentFace.data.label}/${silentFace.data.realScore}` : "err"} => ${combined.verdict}`,
  );

  return Response.json({ llm, silentFace, combined });
}
