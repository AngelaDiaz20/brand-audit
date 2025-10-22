// src/lib/analyzer/layoutAnalyzer.ts
import sharp from "sharp";

interface LayoutStats {
  width: number;
  height: number;
  negativeSpacePct: number;
  brightnessAvg: number;
}

/**
 * Calcula métricas de composición básicas:
 * - Proporción de espacio negativo
 * - Promedio de brillo
 * Todo el análisis se hace en memoria.
 */
export async function analyzeLayout(buffer: Buffer): Promise<LayoutStats> {
  try {
    const image = sharp(buffer);
    const { width, height } = await image.metadata();

    if (!width || !height) throw new Error("No se pudieron obtener dimensiones.");

    // Reducimos tamaño para optimizar análisis (más rápido)
    const resized = await image
      .resize(100, 100, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = resized.data;
    let brightnessSum = 0;
    let brightPixels = 0;

    // Calcular brillo promedio (luminosidad relativa)
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b, a] = [
        pixels[i],
        pixels[i + 1],
        pixels[i + 2],
        pixels[i + 3],
      ];
      if (a === 0) continue; // ignorar transparencias
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnessSum += brightness;
      if (brightness > 240) brightPixels++; // muy claro = posible espacio vacío
    }

    const totalPixels = pixels.length / 4;
    const brightnessAvg = brightnessSum / totalPixels;
    const negativeSpacePct = brightPixels / totalPixels;

    return {
      width,
      height,
      brightnessAvg: +brightnessAvg.toFixed(2),
      negativeSpacePct: +negativeSpacePct.toFixed(3),
    };
  } catch (error) {
    console.error("❌ Error en análisis de layout:", error);
    return { width: 0, height: 0, brightnessAvg: 0, negativeSpacePct: 0 };
  }
}
