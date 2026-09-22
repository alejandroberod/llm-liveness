import type { LivenessResponse } from "./types";

const ENDPOINT = "/api/analyze";

async function dataUrlToFile(dataUrl: string) {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  return new File([blob], "selfie.jpg", { type: blob.type || "image/jpeg" });
}

export async function analyzeShot(shot: string): Promise<LivenessResponse> {
  const form = new FormData();
  form.append("image", await dataUrlToFile(shot));

  const res = await fetch(ENDPOINT, { method: "POST", body: form });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? `El análisis falló (HTTP ${res.status})`);
  }
  return data as LivenessResponse;
}
