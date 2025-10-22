// src/types/analysis.ts

/** 🎨 Representa un color en formato hexadecimal (#RRGGBB) */
export type ColorHex = `#${string}`;

/** 📊 Metadatos básicos del archivo analizado */
export interface FileMeta {
  name: string;
  sizeKB: number;
  format?: string;          // jpg | png | webp | etc.
  colorProfile?: string;    // sRGB | DisplayP3 | AdobeRGB...
  hasAlpha?: boolean;       // canal alfa
}

/** 🔤 Resultado del análisis OCR */
export interface OcrResult {
  text: string;
  confidence: number; // 0–100
}

/** 🧱 Resultado del análisis de composición visual */
export interface LayoutStats {
  width: number;
  height: number;
  brightnessAvg: number;       // Promedio de brillo (0–255)
  negativeSpacePct: number;    // % de espacio vacío (0–1)
}

/** 🧩 Resultado consolidado del análisis completo */
export interface AnalysisResult {
  meta: FileMeta;
  colors: ColorHex[];
  ocr: OcrResult;
  layout: LayoutStats;
  createdAt: string; // ISO
}

/** 💡 Respuesta del endpoint /api/analyze */
export interface AnalysisResponse {
  analysis: AnalysisResult;
  recommendations: string; // texto generado por GPT-5
}

/** 🧠 Estructura general del estado en el frontend */
export interface AnalysisState {
  file: File | null;
  status: "idle" | "processing" | "done" | "error";
  progress: {
    color: number;
    ocr: number;
    layout: number;
    gpt: number;
  };
  result: AnalysisResult | null;
  recommendations?: string;
  error?: string;
}
