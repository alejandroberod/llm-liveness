const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 10 * 1024 * 1024;

export type UploadedImage = { bytes: Uint8Array; type: string; size: number; form: FormData };

// Lee y valida el campo 'image' del multipart. Devuelve la imagen o la respuesta de error lista para enviar.
export async function readImage(req: Request): Promise<UploadedImage | Response> {
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

  return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type, size: file.size, form };
}
