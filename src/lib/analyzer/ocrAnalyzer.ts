// src/lib/analyzer/ocrAnalyzer.ts
/**
 * OCR robusto:
 * - Import dinámico de tesseract.js (solo en servidor)
 * - Sin workerPath (auto)
 * - Fallback silencioso si no está instalado o falla
 */
export async function analyzeOCR(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  try {
    // Import dinámico para evitar resolver rutas de worker en build
    const Tesseract = (await import("tesseract.js")).default;

    const { data } = await Tesseract.recognize(buffer, "spa+eng", {
      logger: () => {}, // opcional
    });

    return {
      text: (data.text || "").trim(),
      confidence: Math.round(data.confidence ?? 0),
    };
  } catch (error) {
    console.error("OCR deshabilitado / falló Tesseract:", error);
    // Fallback seguro: no bloquea el flujo
    return { text: "", confidence: 0 };
  }
}
