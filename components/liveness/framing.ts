import type { Detection } from "@mediapipe/tasks-vision";
import type { FramingIssue } from "./types";

export const ALIGN_OK = 0.7; // encuadre mínimo para acumular estabilidad

// Tamaño del rostro (ancho del bbox / lado corto del video). Silent Face recorta 2.7× y 4× el rostro:
// por encima de 1/2.7 ≈ 37 % el recorte del modelo 2.7 no cabe y pierde el contexto con el que se entrenó.
// FACE_MAX deja margen bajo ese límite; FACE_MIN evita que el rostro quede con muy pocos píxeles para el LLM.
// Se miden con la caja de MediaPipe y el recorte usa la de RetinaFace: calibrar con `crops` de la respuesta de Silent Face.
const FACE_MIN = 0.22;
const FACE_MAX = 0.4;

// Con el rostro al 30 %, el recorte 2.7× ocupa el 81 % del lado corto: el centro del rostro
// sólo puede desviarse ~9 % antes de que el recorte choque con el borde y el rostro quede descentrado en él.
const CENTER_MAX = 0.09;

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// 1 dentro de [lo, hi]; fuera del rango cae por debajo de ALIGN_OK de inmediato, así los límites son estrictos
const band = (n: number, lo: number, hi: number) => {
  const outside = n < lo ? lo - n : n > hi ? n - hi : 0;
  return outside === 0 ? 1 : clamp01(ALIGN_OK - 0.01 - outside / 0.1);
};

// Evalúa qué tan bien encuadrado está un rostro dentro del círculo (0 a 1).
export function evaluateFraming(d: Detection, vw: number, vh: number): { align: number; issue: FramingIssue } {
  const box = d.boundingBox;
  if (!box) return { align: 0, issue: "off" };
  const side = Math.min(vw, vh);

  // Centrado: distancia del centro del rostro al centro del video
  const dx = (box.originX + box.width / 2 - vw / 2) / side;
  const dy = (box.originY + box.height / 2 - vh / 2) / side;
  const center = band(Math.hypot(dx, dy), 0, CENTER_MAX);

  // Tamaño: ancho del rostro respecto a la zona visible
  const ratio = box.width / side;
  const size = band(ratio, FACE_MIN, FACE_MAX);

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
    if (size === align) issue = ratio < FACE_MIN ? "far" : "near";
    else if (center === align) issue = "off";
    else issue = "turned";
  }
  return { align, issue };
}
