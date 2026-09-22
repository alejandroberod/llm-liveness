"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { ALIGN_OK, clamp01, evaluateFraming } from "./framing";
import type { FramingIssue, LivenessResponse, Phase } from "./types";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

const HOLD_SECONDS = 1.2; // tiempo que el rostro debe mantenerse encuadrado antes de capturar
const UI_REFRESH_MS = 100;

type Options = {
  // Recibe el frame capturado (JPEG en data URL) y devuelve el veredicto
  analyze: (shot: string) => Promise<LivenessResponse>;
};

export function useLivenessCapture({ analyze }: Options) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0); // id del reqFrame activo
  const holdRef = useRef(0); // segundos de encuadre
  const lastTickRef = useRef(0); 
  const lastUiRef = useRef(0);
  const runRef = useRef(0); // contador de ejecuciones
  const analyzeRef = useRef(analyze);

  useEffect(() => {
    analyzeRef.current = analyze;
  }, [analyze]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [hasStream, setHasStream] = useState(false);
  const [faces, setFaces] = useState(0);
  const [issue, setIssue] = useState<FramingIssue>("none");
  const [hold, setHold] = useState(0);
  const [shot, setShot] = useState<string | null>(null); // imagen capturada
  const [response, setResponse] = useState<LivenessResponse | null>(null);

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const releaseCamera = useCallback(() => {
    stopLoop();
    runRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setHasStream(false);
  }, [stopLoop]);

  const capture = useCallback(async () => {
    stopLoop();
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;

    const w = v.videoWidth;
    const h = v.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(w, 0); // inversión del eje
    ctx.scale(-1, 1); // inversión del eje
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95); // convierte el canvas en base64

    setShot(dataUrl);
    setHold(HOLD_SECONDS);
    setPhase("analyzing");

    const run = ++runRef.current;
    try {
      const res = await analyzeRef.current(dataUrl);
      if (run !== runRef.current) return;
      setResponse(res);
      setPhase("result");
    } catch (e) {
      if (run !== runRef.current) return;
      console.error("Falló el análisis de liveness", e);
      setPhase("error");
    }
  }, [stopLoop]);

  // Bucle: detectar en cada frame, evaluar el encuadre y acumular estabilidad
  const startLoop = useCallback(() => {
    const tick = () => {
      const video = videoRef.current;
      const detector = detectorRef.current;
      const now = performance.now();
      const dt = lastTickRef.current ? Math.min(0.1, (now - lastTickRef.current) / 1000) : 0;
      lastTickRef.current = now;

      let count = 0;
      let framing: { align: number; issue: FramingIssue } = { align: 0, issue: "none" };
      if (video && detector && video.readyState >= 2 && video.videoWidth) {
        const { detections } = detector.detectForVideo(video, now);
        count = detections.length;
        if (count === 1) framing = evaluateFraming(detections[0], video.videoWidth, video.videoHeight);
      }

      const ok = count === 1 && framing.align >= ALIGN_OK;
      holdRef.current = ok ? holdRef.current + dt : Math.max(0, holdRef.current - dt * 1.6);

      if (holdRef.current >= HOLD_SECONDS) {
        capture();
        return;
      }

      if (now - lastUiRef.current > UI_REFRESH_MS) {
        lastUiRef.current = now;
        setFaces(count);
        setIssue(framing.issue);
        setHold(holdRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [capture]);

  // Empieza (o reinicia) el escaneo con la cámara ya encendida
  const scan = useCallback(() => {
    stopLoop();
    runRef.current++;
    holdRef.current = 0;
    lastTickRef.current = 0;
    setFaces(0);
    setIssue("none");
    setHold(0);
    setShot(null);
    setResponse(null);
    setPhase("scan");
    startLoop();
  }, [startLoop, stopLoop]);

  const start = useCallback(async () => {
    setPhase("requesting");

    // El detector se carga solo la primera vez
    const loadDetector = async () => {
      if (detectorRef.current) return;
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      detectorRef.current = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
      });
    };
    const detectorReady = loadDetector();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      video.play().catch(() => {});
      setHasStream(true);
    } catch {
      setPhase("denied");
      return;
    }

    try {
      await detectorReady;
    } catch (e) {
      console.error("No se pudo cargar el detector de rostros", e);
      releaseCamera();
      setPhase("error");
      return;
    }

    scan();
  }, [scan, releaseCamera]);

  const stop = useCallback(() => {
    releaseCamera();
    setFaces(0);
    setHold(0);
    setShot(null);
    setResponse(null);
    setPhase("idle");
  }, [releaseCamera]);

  useEffect(() => {
    return () => {
      releaseCamera();
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, [releaseCamera]);

  return {
    videoRef,
    phase,
    hasStream,
    faces,
    issue,
    progress: clamp01(hold / HOLD_SECONDS),
    shot,
    response,
    start,
    stop,
    scan,
  };
}
