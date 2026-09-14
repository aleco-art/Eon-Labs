export const allowedTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
export async function validateFile(file: File, avatar = false) {
  if (file.size < 1 || file.size > (avatar ? 2 : 10) * 1024 * 1024)
    throw new Error(
      avatar
        ? "El avatar debe pesar menos de 2 MB."
        : "Cada archivo debe pesar menos de 10 MB.",
    );
  if (
    !allowedTypes.includes(file.type) ||
    (avatar && file.type === "application/pdf")
  )
    throw new Error("Usa PNG, JPEG, WebP o PDF.");
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...b.slice(start, end));
  const valid =
    file.type === "application/pdf"
      ? ascii(0, 5) === "%PDF-"
      : file.type === "image/png"
        ? b[0] === 137 && ascii(1, 4) === "PNG"
        : file.type === "image/jpeg"
          ? b[0] === 255 && b[1] === 216 && b[2] === 255
          : ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (!valid)
    throw new Error("El contenido del archivo no coincide con su formato.");
}
