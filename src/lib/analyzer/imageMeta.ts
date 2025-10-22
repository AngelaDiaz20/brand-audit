import sharp from "sharp";

export async function analyzeImageMeta(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();

  // colorProfile: sharp expone 'space' o 'icc' (según el archivo)
  const colorProfile =
    (meta as any).space || (meta as any).icc || (meta as any).iccProfile || undefined;

  return {
    width: meta.width || 0,
    height: meta.height || 0,
    format: meta.format || undefined,
    colorProfile: colorProfile || undefined,
    hasAlpha: !!meta.hasAlpha,
  };
}
