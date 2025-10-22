// /lib/getDominantColors.ts
import getColors from "get-image-colors";
import fs from "fs";
import path from "path";

/**
 * Obtiene los colores dominantes de una imagen (en el servidor)
 */
export async function getDominantColors(file: File): Promise<string[]> {
  // Guarda temporalmente la imagen en el servidor
  const buffer = Buffer.from(await file.arrayBuffer());
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const tempPath = path.join(tempDir, file.name);
  fs.writeFileSync(tempPath, buffer);

  // Obtiene los colores dominantes
  const colors = await getColors(tempPath);
  const hexColors = colors.map((c) => c.hex().toUpperCase());

  // Limpieza temporal
  fs.unlinkSync(tempPath);

  return hexColors;
}
