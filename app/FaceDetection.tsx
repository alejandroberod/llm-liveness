"use client"; // Necesario: usa la cámara y el canvas, que solo existen en el navegador

import { useEffect, useRef } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

export default function FaceDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let detector: FaceDetector | null = null;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    async function start() {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);

      detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
      });

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cancelled) return cleanup();

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      detect();
    }

    function detect() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !detector) return;

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { detections } = detector.detectForVideo(video, performance.now());
      
      for (const d of detections) {
        const box = d.boundingBox;
        if (!box) continue;
        const score = Math.round(d.categories[0].score * 100);

        ctx.strokeStyle = "#ED3815";
        ctx.lineWidth = 4;
        ctx.strokeRect(box.originX, box.originY, box.width, box.height);

        ctx.fillStyle = "#ED3815";
        ctx.font = "20px sans-serif";
        ctx.fillText(`Rostro ${score}%`, box.originX, box.originY - 6);
      }

      rafId = requestAnimationFrame(detect);
    }

    function cleanup() {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      detector?.close();
    }

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div className="relative">
      <video ref={videoRef} playsInline muted className="rounded-lg" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
