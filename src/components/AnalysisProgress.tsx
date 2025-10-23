"use client";

import React, { useEffect, useState, useRef } from "react";
import { computeClientLayout } from "@/hooks/useClientLayout";
import { getDominantColors } from "@/lib/analyzer/getDominantColors";
import { useOCR } from "@/hooks/useOCR";

export default function AnalysisProgress({ file }: { file: File | null }) {
  const [status, setStatus] = useState("Esperando archivo...");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const { recognize } = useOCR();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!file) return;
    if (runningRef.current) return;
    runningRef.current = true;

    (async () => {
      try {
        setStatus("🎨 Analizando colores...");
        const colors = await getDominantColors(file, 5);
        console.log("🎨 Colores dominantes:", colors);

        setStatus("📐 Analizando layout...");
        const layout = await computeClientLayout(file);
        console.log("📐 Layout:", layout);

        setStatus("🧠 Leyendo texto (OCR)...");
        const ocr = await recognize(file, "spa+eng");
        console.log("🧠 OCR:", ocr);

        // ✅ Enviar todo el JSON al servidor
        setStatus("📤 Enviando datos a la API...");
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meta: {
              fileName: file.name,
              fileSizeKB: +(file.size / 1024).toFixed(1),
            },
            colors,
            layout,
            ocr,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Error en la API");

        console.log("✅ Análisis completo:", data);
        setResult(data.analysis);
        setStatus("✅ Análisis completado con éxito");
      } catch (e: any) {
        console.error("🚨 Error durante el análisis:", e);
        setError(e.message || "No se pudo completar el análisis.");
        setStatus("❌ Error en el análisis");
      } finally {
        runningRef.current = false;
      }
    })();
  }, [file]);

  if (!file) return <p className="text-gray-500">Sube una imagen para comenzar.</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="p-4 bg-white rounded-xl shadow-md">
      <h2 className="font-semibold text-lg mb-2">🔍 Progreso del análisis</h2>
      <p className="text-gray-700 mb-3">{status}</p>

      {result && (
        <div className="mt-4 p-3 border-t border-gray-200">
          <h3 className="font-semibold text-green-600">Resultado:</h3>
          <p className="mt-1 text-gray-800">{result.summary}</p>
          <ul className="mt-2 list-disc list-inside text-gray-700">
            {result.insights.map((i: string, idx: number) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-gray-500">
            Puntuación global: <b>{result.globalScore}</b>/100
          </p>
        </div>
      )}
    </div>
  );
}
