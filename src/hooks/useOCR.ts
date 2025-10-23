"use client";
import { useState } from "react";

export function useOCR() {
  const [loading, setLoading] = useState(false);

  async function recognize(fileOrUrl: File | string, langs = "spa+eng", timeoutMs = 20000) {
    setLoading(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const base = window.location.origin;
      const src = typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl);

      const task = Tesseract.recognize(src, langs, {
        workerPath: `${base}/tesseract/worker.min.js`,
        corePath: `${base}/tesseract/tesseract-core.wasm.js`,
        langPath: `${base}/tesseract/lang-data`,
        logger: () => {},
      });

      const timed = (await Promise.race([
        task,
        new Promise((_, rej) => setTimeout(() => rej(new Error("OCR timeout")), timeoutMs)),
      ])) as any;

      if (typeof fileOrUrl !== "string") URL.revokeObjectURL(src);

      const text = (timed?.data?.text || "").trim();
      const confidence = Math.round(timed?.data?.confidence ?? 0);
      return { text, confidence };
    } catch (e) {
      console.error("OCR (client) error:", e);
      return { text: "", confidence: 0 };
    } finally {
      setLoading(false);
    }
  }

  return { recognize, loading };
}
