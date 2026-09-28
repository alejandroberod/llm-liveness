import { SILENTFACE_URL } from "@/lib/silentface";

const TIMEOUT_MS = 25_000;

export async function GET() {
  const url = new URL("/health", SILENTFACE_URL);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    return Response.json({ ok: res.ok });
  } catch (e) {
    console.error("Falló el warmup de Silent Face", e);
    return Response.json({ ok: false });
  }
}
