import type { Detection } from "@mediapipe/tasks-vision";
import type { FramingIssue } from "./types";

export const ALIGN_OK = 0.7; // encuadre mínimo para acumular estabilidad

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Evalúa qué tan bien encuadrado está un rostro dentro del círculo (0 a 1).
export function evaluateFraming(d: Detection, vw: number, vh: number): { align: number; issue: FramingIssue } {
  const box = d.boundingBox;
  if (!box) return { align: 0, issue: "off" };
  const side = Math.min(vw, vh);

  // Centrado: distancia del centro del rostro al centro del video
  const dx = (box.originX + box.width / 2 - vw / 2) / side;
  const dy = (box.originY + box.height / 2 - vh / 2) / side;
  const center = clamp01(1 - Math.max(0, Math.hypot(dx, dy) - 0.06) / 0.25);

  // Tamaño: ancho del rostro respecto a la zona visible
  const ratio = box.width / side;
  const size = ratio < 0.3 ? ratio / 0.3 : ratio > 0.8 ? clamp01(1 - (ratio - 0.8) / 0.3) : 1;

  // Frontalidad: la nariz debe quedar a medio camino entre los ojos (keypoints 0 y 1 = ojos, 2 = nariz)
  let front = 1;
  const [eyeA, eyeB, nose] = d.keypoints;
  if (eyeA && eyeB && nose) {
    const eyeDist = Math.abs(eyeA.x - eyeB.x);
    if (eyeDist > 0) {
      const yaw = Math.abs(nose.x - (eyeA.x + eyeB.x) / 2) / eyeDist;
      front = clamp01(1 - Math.max(0, yaw - 0.12) / 0.3);
    }
  }

  const align = Math.min(center, size, front);
  let issue: FramingIssue = "none";
  if (align < ALIGN_OK) {
    if (size === align) issue = ratio < 0.3 ? "far" : "near";
    else if (center === align) issue = "off";
    else issue = "turned";
  }
  return { align, issue };
}
