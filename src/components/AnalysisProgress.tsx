"use client";

import React, { useEffect, useRef, useState } from "react";
import { computeClientLayout } from "@/hooks/useClientLayout";
import { getDominantColors } from "@/lib/analyzer/getDominantColors";
import { computeColorRatios } from "@/lib/analyzer/computeColorRatios";
import { readColorProfile } from "@/lib/analyzer/readColorProfile";
import { useOCR } from "@/hooks/useOCR";
import { computeTextAreaPct } from "@/lib/analyzer/textRegions";
import { validateFormat, checkSafeArea } from "@/lib/analyzer/formatPresets";

import TechHeader from "@/components/ui/TechHeader";
import PaletteCard from "@/components/ui/PaletteCard";
import RegionsOverlay from "@/components/ui/RegionsOverlay";
import FormatCard from "@/components/ui/FormatCard";

export default function AnalysisProgress({ file }: { file: File | null }) {
  const [status, setStatus] = useState("Esperando archivo...");
  const [error, setError] = useState<string | null>(null);

  const [meta, setMeta] = useState<any>(null);
  const [palette, setPalette] = useState<{ hex: `#${string}`; pct: number }[] | null>(null);
  const [ocr, setOcr] = useState<any>(null);
  const [layout, setLayout] = useState<any>(null);
  const [formatInfo, setFormatInfo] = useState<any>(null);

  const runningRef = useRef(false);
  const { recognize } = useOCR();

  useEffect(() => {
    if (!file) return;
    if (runningRef.current) return;
    runningRef.current = true;

    (async () => {
      try {
        // 1) Colores (paleta + %)
        setStatus("🎨 Analizando colores…");
        const basePalette = await getDominantColors(file, 5);
        const colorRatios = await computeColorRatios(file, basePalette);
        setPalette(colorRatios);

        // 2) Layout
        setStatus("📐 Analizando layout…");
        const ly = await computeClientLayout(file);
        setLayout(ly);

        // 3) Perfil ICC
        setStatus("🧪 Leyendo perfil ICC…");
        const profile = await readColorProfile(file);

        // 4) OCR
        setStatus("🔤 Extrayendo texto…");
        const oc = await recognize(file, "spa+eng", 30000);
        setOcr(oc);

        // 5) % texto (si hay words; si no, 0)
       const textPct = await computeTextAreaPct(ly.width, ly.height, oc.words, 300, file);


        // 6) Formato + safe area (usa cajas si existen)
        const fmt = validateFormat(ly.width, ly.height);
        const boxes = (oc.words ?? []).map((w: any) => w.bbox);
        const safe = checkSafeArea(ly.width, ly.height, boxes, fmt.preset?.safeMarginPct ?? 5);

        setFormatInfo({
          preset: fmt.preset,
          valid: fmt.valid,
          safeAreaOk: safe.safeAreaOk,
          safeMarginPx: safe.marginPx,
          textAreaPct: textPct.textAreaPct,
        });

        // Meta final (para header)
        setMeta({
          name: file.name,
          sizeKB: +(file.size / 1024).toFixed(1),
          width: ly.width,
          height: ly.height,
          colorProfile: profile,
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

      {meta && layout && (
        <TechHeader
          name={meta.name}
          sizeKB={meta.sizeKB}
          width={meta.width}
          height={meta.height}
          colorProfile={meta.colorProfile}
        />
      )}

      {palette && <PaletteCard colors={palette} />}

      {/* Siempre mostramos el panel de OCR (aunque no haya words) */}
      {ocr && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-2">🔤 Texto extraído (OCR)</h3>
          <p className="text-sm text-gray-500 mb-2">
            Confianza: {ocr.confidence}%{ocr.timedOut ? " • (timeout – resultado parcial)" : ""}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
  {ocr.cleanedText || ocr.text || "— (No se detectó texto)"}
</p>

<small className="text-gray-500 block mt-1">
  Fuente OCR: {ocr.debug?.usedSrc ?? "N/D"} • 
  PSM: {ocr.debug?.psm ?? "N/D"} • 
  Modo: {ocr.debug?.strategy ?? "N/D"} • 
  Idiomas: {ocr.debug?.lang ?? "spa+eng"}
</small>
        </div>
      )}

      {/* Overlay de cajas solo si existen words */}
      {ocr?.words?.length && layout && (
        <RegionsOverlay
          file={file!}
          boxes={ocr.words.map((w: any) => w.bbox)}
          naturalWidth={layout.width}
          naturalHeight={layout.height}
        />
      )}

      {formatInfo && layout && (
        <>
          <FormatCard
            width={layout.width}
            height={layout.height}
            preset={formatInfo.preset}
            valid={formatInfo.valid}
            safeAreaOk={formatInfo.safeAreaOk}
            safeMarginPx={formatInfo.safeMarginPx}
          />
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-2">📊 Métricas adicionales</h3>
            <ul className="text-sm text-gray-800 space-y-1">
              <li><b>Espacio negativo aprox.:</b> {layout?.negativeSpacePct}%</li>
              <li><b>Área ocupada por texto:</b> {formatInfo.textAreaPct}%</li>
              <li><b>Brillo promedio:</b> {layout?.brightnessAvg}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
