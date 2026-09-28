import { createHash } from "node:crypto";
import { analyzeLiveness, DEFAULT_MODEL } from "@/lib/liveness";
import { readImage } from "@/lib/upload";

export const maxDuration = 60;

export async function POST(req: Request) {
  const image = await readImage(req);
  if (image instanceof Response) return image;

  const modelField = image.form.get("model");
  const model = typeof modelField === "string" && modelField ? modelField : DEFAULT_MODEL;

  try {
    const sha = createHash("sha256").update(image.bytes).digest("hex").slice(0, 12);
    const res = await analyzeLiveness(image.bytes, image.type, model);
    console.log(`[liveness] ${image.type} ${image.size}B sha:${sha} -> ${res.result.verdict} ${res.result.spoofScore}`);

    return Response.json(res);
  } catch (error) {
    console.error("Falló el análisis de liveness", error);
    return Response.json({ error: "Falló el análisis de liveness" }, { status: 502 });
  }
}
