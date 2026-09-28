import type { CompareResponse } from "./types";

// Corre el LLM y Silent Face en paralelo y devuelve ambos más la fusión
const ENDPOINT = "/api/compare";

async function dataUrlToFile(dataUrl: string) {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  return new File([blob], "selfie.jpg", { type: blob.type || "image/jpeg" });
}

export async function analyzeShot(shot: string): Promise<CompareResponse> {
  const form = new FormData();
  form.append("image", await dataUrlToFile(shot));

  const res = await fetch(ENDPOINT, { method: "POST", body: form });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? `El análisis falló (HTTP ${res.status})`);
  }
  return data as CompareResponse;
}
