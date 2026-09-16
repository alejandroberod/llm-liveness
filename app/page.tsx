import FaceDetection from "./FaceDetection";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Detector de rostros</h1>
      <FaceDetection />
    </main>
  );
}
