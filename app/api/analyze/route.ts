import { createHash } from "node:crypto";
import { analyzeLiveness, DEFAULT_MODEL } from "@/lib/liveness";

export const maxDuration = 60;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el campo de archivo 'image'" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: `Tipo de imagen no soportado: ${file.type || "desconocido"}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "La imagen pesa más de 10 MB" }, { status: 413 });
  }

  const modelField = form.get("model");
  const model = typeof modelField === "string" && modelField ? modelField : DEFAULT_MODEL;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());

    const sha = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    const res = await analyzeLiveness(bytes, file.type, model);
    console.log(`[liveness] ${file.type} ${file.size}B sha:${sha} -> ${res.result.verdict} ${res.result.spoofScore}`);

    return Response.json(res);
  } catch (error) {
    console.error("Falló el análisis de liveness", error);
    return Response.json({ error: "Falló el análisis de liveness" }, { status: 502 });
  }
}
