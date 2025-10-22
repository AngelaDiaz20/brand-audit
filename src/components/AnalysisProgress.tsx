"use client";

import React, { useEffect, useState } from "react";

interface AnalysisProgressProps {
  file: File;
  onComplete: (result: { analysis: any; recommendations: string }) => void;
}

export default function AnalysisProgress({ file, onComplete }: AnalysisProgressProps) {
  const [statusText, setStatusText] = useState("Iniciando análisis...");
  const [currentStep, setCurrentStep] = useState("");

  const steps = [
    { id: "color", label: "🎨 Analizando paleta de colores..." },
    { id: "layout", label: "🧱 Analizando composición visual..." },
    // OCR y GPT desactivados mientras tanto
  ];

  useEffect(() => {
    const analyze = async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/analyze?noai=1", { method: "POST", body: formData });

        if (!res.ok) {
          let msg = "Error en el análisis IA";
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {}
          throw new Error(msg);
        }

        const data = await res.json();

        // 🔐 Normalizador universal
        let analysis = data?.analysis ?? null;
        let recommendations = data?.recommendations ?? "Modo técnico activo: sin recomendaciones IA.";

        if (!analysis && data?.debug) {
          analysis = {
            meta: {
              name: file.name,
              sizeKB: +(file.size / 1024).toFixed(2),
              format: data.debug?.metaExtra?.format,
              colorProfile: data.debug?.metaExtra?.colorProfile,
              hasAlpha: data.debug?.metaExtra?.hasAlpha,
            },
            colors: data.debug?.colors ?? [],
            ocr: data.debug?.ocr ?? { text: "", confidence: 0 },
            layout: data.debug?.layout ?? { width: 0, height: 0, brightnessAvg: 0, negativeSpacePct: 0 },
            createdAt: new Date().toISOString(),
          };
          recommendations = "Modo técnico (respuesta debug).";
        }

        if (!analysis) throw new Error("Respuesta inesperada del servidor (sin 'analysis').");

        // Animación visual por pasos
        for (const s of steps) {
          setCurrentStep(s.id);
          setStatusText(s.label);
          await new Promise((r) => setTimeout(r, 400));
        }

        onComplete({ analysis, recommendations });
      } catch (error: any) {
        console.error(error);
        setStatusText(error.message || "Error inesperado.");
      }
    };

    analyze();
  }, [file]);

  return (
    <div className="flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow-md w-full max-w-lg text-center">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">🔍 Analizando imagen...</h2>
      <p className="text-gray-700">{statusText}</p>

      {currentStep === "" && (
        <div className="mt-4 w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"></div>
      )}

      {steps.map((s) => (
        <div
          key={s.id}
          className={`mt-2 text-sm ${
            currentStep === s.id ? "text-blue-600 font-medium" : "text-gray-500"
          }`}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}
