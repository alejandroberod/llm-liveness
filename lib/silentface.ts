export const SILENTFACE_URL = process.env.SILENTFACE_URL ?? "https://liveness-api.vercel.app/predict";

const TIMEOUT_MS = 25_000;

const ERRORS: Record<string, string> = {
  no_face_detected: "Silent Face no detectó ningún rostro",
  image_too_large: "La imagen supera los 4 MB que acepta Silent Face",
  invalid_image: "Silent Face no pudo decodificar la imagen",
  missing_image: "Silent Face no recibió la imagen",
};

export type SilentFaceResult = {
  label: "real" | "fake";
  score: number;
  realScore: number;
  realScoreApprox: boolean;
  bbox: [number, number, number, number];
  latencyMs: number;
};

export async function predictSilentFace(image: Uint8Array, mediaType: string): Promise<SilentFaceResult> {
  const started = performance.now();

  const form = new FormData();
  form.append("image", new Blob([image as Uint8Array<ArrayBuffer>], { type: mediaType }), "selfie.jpg");

  const res = await fetch(SILENTFACE_URL, { method: "POST", body: form, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const code = data?.error as string | undefined;
    throw new Error((code && ERRORS[code]) ?? `Silent Face respondió HTTP ${res.status}${code ? ` (${code})` : ""}`);
  }

  const approx = typeof data.real_score !== "number";
  return {
    label: data.label,
    score: data.score,
    realScore: approx ? (data.label === "real" ? data.score : 1 - data.score) : data.real_score,
    realScoreApprox: approx,
    bbox: data.bbox,
    latencyMs: Math.round(performance.now() - started),
  };
}
