"use client";

import React, { useEffect, useRef, useState } from "react";
import { computeClientLayout } from "@/hooks/useClientLayout";
import { getDominantColors } from "@/lib/analyzer/getDominantColors";
import { computeColorRatios } from "@/lib/analyzer/computeColorRatios";
import { readColorProfile } from "@/lib/analyzer/readColorProfile";
import { useOCR } from "@/hooks/useOCR";
import TechHeader from "@/components/ui/TechHeader";
import PaletteCard from "@/components/ui/PaletteCard";

export default function AnalysisProgress({ file }: { file: File | null }) {
  const [status, setStatus] = useState("Esperando archivo...");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const runningRef = useRef(false);
  const { recognize } = useOCR();

  useEffect(() => {
    if (!file) return;
    if (runningRef.current) return;
    runningRef.current = true;

    (async () => {
      try {
        // 1) Paleta base
        setStatus("🎨 Analizando colores dominantes…");
        const basePalette = await getDominantColors(file, 5);

        // 2) Ratios por color
        setStatus("📊 Calculando proporciones por color…");
        const colorRatios = await computeColorRatios(file, basePalette);

        // 3) Layout
        setStatus("📐 Analizando layout…");
        const layout = await computeClientLayout(file);

        // 4) Perfil de color
        setStatus("🧪 Leyendo perfil ICC…");
        const profile = await readColorProfile(file);

        // 5) OCR
        setStatus("🔤 Extrayendo texto (OCR)…");
        const ocr = await recognize(file, "spa+eng", 25000);

        // 6) API (simulada)
        setStatus("📤 Preparando resumen…");
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meta: {
              name: file.name,
              sizeKB: +(file.size / 1024).toFixed(1),
              width: layout.width,
              height: layout.height,
              colorProfile: profile,
            },
            colors: colorRatios, // ← con % listo
            layout,
            ocr,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Error en la API");
        setSummary({
          meta: {
            name: file.name,
            sizeKB: +(file.size / 1024).toFixed(1),
            width: layout.width,
            height: layout.height,
            colorProfile: profile,
          },
          colors: colorRatios,
          ocr,
          layout,
          ai: data.analysis, // simulado
        });

        setStatus("✅ Análisis completado");
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
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-xl shadow-md">
        <h2 className="font-semibold text-lg">🔍 Progreso del análisis</h2>
        <p className="text-gray-700 mt-1">{status}</p>
      </div>

      {summary && (
        <>
          <TechHeader
            name={summary.meta.name}
            sizeKB={summary.meta.sizeKB}
            width={summary.meta.width}
            height={summary.meta.height}
            colorProfile={summary.meta.colorProfile}
          />

          <PaletteCard colors={summary.colors} />

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">🔤 Texto extraído (OCR)</h3>
            <p className="text-sm text-gray-500 mb-2">
              Confianza: {summary.ocr.confidence}%
            </p>
            <div className="whitespace-pre-wrap text-gray-800">
              {summary.ocr.text || "—"}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">📐 Métricas de composición (básicas)</h3>
            <ul className="text-gray-800 text-sm space-y-1">
              <li>
                <b>Brillo promedio:</b> {summary.layout.brightnessAvg}
              </li>
              <li>
                <b>Espacio negativo aprox.:</b> {summary.layout.negativeSpacePct}%
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">🧠 Resumen (simulado)</h3>
            <p className="text-gray-800">{summary.ai.summary}</p>
            <ul className="mt-2 list-disc list-inside text-gray-700">
              {summary.ai.insights.map((i: string, k: number) => (
                <li key={k}>{i}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-gray-500">
              Puntuación global: <b>{summary.ai.globalScore}</b>/100
            </p>
          </div>
        </>
      )}
    </div>
  );
}
