"use client";
import { useState } from "react";
import { preprocessForOCR } from "@/lib/analyzer/preprocessOCR";

export type OCRWord = {
  text: string;
  bbox: [number, number, number, number];
  confidence: number;
};
export type OCRLine = { bbox: [number, number, number, number]; text?: string; confidence?: number };
export type OCRBlock = { bbox: [number, number, number, number] };

export interface OCRDebug {
  usedSrc: "blob" | "dataurl" | "preprocessed";
  lang: string;
}

export type OCRResult = {
  text: string;
  confidence: number;
  words?: OCRWord[];
  lines?: OCRLine[];
  blocks?: OCRBlock[];
  timedOut?: boolean;
  debug?: OCRDebug;
};

export function useOCR() {
  const [loading, setLoading] = useState(false);

  async function recognize(
    fileOrUrl: File | string,
    langs = "spa+eng",
    timeoutMs = 30000
  ): Promise<OCRResult> {
    setLoading(true);
    let createdBlob = false;
    let src = "";

    try {
      const tesseractImport: any = await import("tesseract.js");
      const Tesseract = tesseractImport.default && tesseractImport.default.recognize
        ? tesseractImport.default
        : tesseractImport;

      const base = window.location.origin;

      // 0) Preprocesado si es File (mejora muchísimo en fondos con color)
      let preDataUrl: string | null = null;
      if (fileOrUrl instanceof File) {
        preDataUrl = await preprocessForOCR(fileOrUrl);
      }

      if (typeof fileOrUrl === "string") {
        src = fileOrUrl;
      } else {
        src = URL.createObjectURL(fileOrUrl);
        createdBlob = true;
      }

      const runRecognize = async (
        source: string,
        usedSrc: OCRDebug["usedSrc"]
      ): Promise<OCRResult> => {
        const task = Tesseract.recognize(source, langs, {
          workerPath: `${base}/tesseract/worker.min.js`,
          corePath: `${base}/tesseract/tesseract-core.wasm.js`,
          langPath: `${base}/tesseract/lang-data`,
          tessedit_pageseg_mode: 11,
          logger: () => {},
        });

        const res: any = await Promise.race([
          task,
          new Promise((_, rej) => setTimeout(() => rej(new Error("OCR_TIMEOUT")), timeoutMs)),
        ]);

        if (!res?.data) return { text: "", confidence: 0, debug: { usedSrc, lang: langs } };

        const text = (res.data.text || "").trim();
        const confidence = Math.round(res.data.confidence ?? 0);

        const words = Array.isArray(res.data.words)
          ? res.data.words.map((w: any) => ({
              text: (w.text ?? "").trim(),
              bbox: [
                w.bbox?.x0 ?? w.x0 ?? w.x ?? 0,
                w.bbox?.y0 ?? w.y0 ?? w.y ?? 0,
                (w.bbox ? (w.bbox.x1 - w.bbox.x0) : (w.x1 ? (w.x1 - w.x0) : (w.width ?? 0))) || 0,
                (w.bbox ? (w.bbox.y1 - w.bbox.y0) : (w.y1 ? (w.y1 - w.y0) : (w.height ?? 0))) || 0,
              ] as [number, number, number, number],
              confidence: Math.round(w.confidence ?? 0),
            }))
          : undefined;

        const lines = Array.isArray(res.data.lines)
          ? res.data.lines.map((ln: any) => ({
              text: (ln.text ?? "").trim(),
              bbox: [
                ln.bbox?.x0 ?? ln.x0 ?? 0,
                ln.bbox?.y0 ?? ln.y0 ?? 0,
                (ln.bbox ? (ln.bbox.x1 - ln.bbox.x0) : (ln.x1 ? (ln.x1 - ln.x0) : (ln.width ?? 0))) || 0,
                (ln.bbox ? (ln.bbox.y1 - ln.bbox.y0) : (ln.y1 ? (ln.y1 - ln.y0) : (ln.height ?? 0))) || 0,
              ] as [number, number, number, number],
              confidence: Math.round(ln.confidence ?? 0),
            }))
          : undefined;

        const blocks = Array.isArray(res.data.blocks)
          ? res.data.blocks.map((b: any) => ({
              bbox: [
                b.bbox?.x0 ?? b.x0 ?? 0,
                b.bbox?.y0 ?? b.y0 ?? 0,
                (b.bbox ? (b.bbox.x1 - b.bbox.x0) : (b.x1 ? (b.x1 - b.x0) : (b.width ?? 0))) || 0,
                (b.bbox ? (b.bbox.y1 - b.bbox.y0) : (b.y1 ? (b.y1 - b.y0) : (b.height ?? 0))) || 0,
              ] as [number, number, number, number],
            }))
          : undefined;

        return { text, confidence, words, lines, blocks, debug: { usedSrc, lang: langs } };
      };

      // 1) Intento con preprocesado (si existe)
      if (preDataUrl) {
        const out = await runRecognize(preDataUrl, "preprocessed");
        if (out.text) return out;
      }

      // 2) Intento con blob / dataurl original
      let out = await runRecognize(src, createdBlob ? "blob" : "dataurl");

      // 3) Fallback: si blob falló, pasa a dataURL sin preprocesar
      if (!out.text && createdBlob && fileOrUrl instanceof File) {
        const dataUrl = await fileToDataURL(fileOrUrl);
        out = await runRecognize(dataUrl, "dataurl");
      }

      return out;
    } catch (e: any) {
      if (e?.message === "OCR_TIMEOUT") {
        return { text: "", confidence: 0, timedOut: true };
      }
      console.error("❌ OCR (client) error:", e);
      return { text: "", confidence: 0 };
    } finally {
      if (createdBlob) {
        try {
          URL.revokeObjectURL(src);
        } catch {}
      }
      setLoading(false);
    }
  }

  return { recognize, loading };
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("No se pudo leer el archivo como DataURL."));
    fr.readAsDataURL(file);
  });
}
