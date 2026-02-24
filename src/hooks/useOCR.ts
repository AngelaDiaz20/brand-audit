"use client";

import { useState } from "react";
import { preprocessForOCR } from "@/lib/analyzer/preprocessOCR";
import { cleanSpanishText, composeFromWords, composeFromLines } from "@/lib/utils/sanitizeText";

export type OCRWord = { text: string; bbox: [number, number, number, number]; confidence: number };
export type OCRLine = { bbox: [number, number, number, number]; text?: string; confidence?: number };
export type OCRBlock = { bbox: [number, number, number, number] };

export type OCRResult = {
  text: string;
  cleanedText: string;
  confidence: number;
  words?: OCRWord[];
  lines?: OCRLine[];
  blocks?: OCRBlock[];
  timedOut?: boolean;
  debug?: {
    usedSrc?: "blob" | "dataurl" | "preprocessed";
    lang?: string;
    psm?: number;
    strategy?: "raw" | "words" | "lines";
    confidence?: number;
    charsKept?: number;
  };
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
      const Tesseract = tesseractImport.default || tesseractImport;
      const base = window.location.origin;

      if (fileOrUrl instanceof File) {
        src = URL.createObjectURL(fileOrUrl);
        createdBlob = true;
      } else {
        src = fileOrUrl;
      }

      const preDataUrl =
        fileOrUrl instanceof File ? await preprocessForOCR(fileOrUrl) : null;

      async function runPSM(source: string, usedSrc: "blob" | "dataurl" | "preprocessed", psm = 6) {
        const task = Tesseract.recognize(source, langs, {
          workerPath: `${base}/tesseract/worker.min.js`,
          corePath: `${base}/tesseract/tesseract-core.wasm.js`,
          langPath: `${base}/tesseract/lang-data`,
          tessedit_pageseg_mode: psm,
          logger: () => {},
        });

        const res: any = await Promise.race([
          task,
          new Promise((_, rej) => setTimeout(() => rej(new Error("OCR_TIMEOUT")), timeoutMs)),
        ]);

        const textRaw = (res?.data?.text ?? "").trim();
        const conf = Math.round(res?.data?.confidence ?? 0);
        const words = res?.data?.words ?? [];
        const lines = res?.data?.lines ?? [];
        const blocks = res?.data?.blocks ?? [];

        // --- Composición limpia ---
        const fromWords = composeFromWords(words ?? [], 70, 2);
        const fromLines = composeFromLines(lines ?? [], 60);
        const cleanedRaw = cleanSpanishText(textRaw);

        const cand = [
          { txt: fromWords, strategy: "words" as const },
          { txt: fromLines, strategy: "lines" as const },
          { txt: cleanedRaw, strategy: "raw" as const },
        ];
        cand.sort((a, b) => scoreCandidate(b.txt, conf) - scoreCandidate(a.txt, conf));
        const best = cand[0];

        return {
          text: textRaw,
          cleanedText: best.txt,
          confidence: conf,
          words,
          lines,
          blocks,
          debug: {
            usedSrc,
            lang: langs,
            psm,
            strategy: best.strategy,
            confidence: conf,
            charsKept: (best.txt || "").replace(/\s/g, "").length,
          },
        } as OCRResult;
      }

      // 1️⃣ Intenta con preprocesado
      if (preDataUrl) {
        const res = await runPSM(preDataUrl, "preprocessed", 6);
        if (res.cleanedText) return res;
      }

      // 2️⃣ Normal (blob o dataurl)
      const res = await runPSM(src, createdBlob ? "blob" : "dataurl", 6);
      return res;
    } catch (e: any) {
      if (e?.message === "OCR_TIMEOUT") return { text: "", cleanedText: "", confidence: 0, timedOut: true };
      console.error("❌ OCR error:", e);
      return { text: "", cleanedText: "", confidence: 0 };
    } finally {
      if (createdBlob) try { URL.revokeObjectURL(src); } catch {}
      setLoading(false);
    }
  }

  return { recognize, loading };
}

function scoreCandidate(txt: string, conf: number): number {
  const dense = (txt || "").replace(/\s/g, "");
  const len = dense.length;
  const sym = (dense.match(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/g) || []).length;
  const symRatio = len ? sym / len : 1;
  return (conf || 0) * 2 + Math.max(0, len - 5) * 2 - symRatio * 50;
}
