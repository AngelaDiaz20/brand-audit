"use client";

import React, { useState } from "react";
import { useOCR } from "@/hooks/useOCR";

export default function OcrPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { recognize, loading } = useOCR();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    setText("");
    setError(null);
    setConfidence(null);

    try {
      const { text, confidence } = await recognize(file, "spa+eng", 12000);
      setText(text || "⚠️ No se detectó texto en la imagen");
      setConfidence(confidence);
    } catch (err: any) {
      console.error(err);
      setError("Ocurrió un error al procesar la imagen");
    }
  };

  return (
    <div className="flex flex-col items-center bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        🔤 Análisis OCR en navegador
      </h2>

      {/* Selector de archivo */}
      <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
        Seleccionar imagen
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {/* Vista previa de la imagen */}
      {file && (
        <img
          src={URL.createObjectURL(file)}
          alt="preview"
          className="w-60 h-60 object-contain rounded-lg border mt-4"
          onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
        />
      )}

      {/* Estado de carga */}
      {loading && (
        <div className="w-full mt-6">
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="h-2 bg-blue-500 animate-pulse" style={{ width: "75%" }} />
          </div>
          <p className="text-sm text-gray-600 mt-2">Analizando texto en la imagen...</p>
        </div>
      )}

      {/* Resultado OCR */}
      {!loading && text && (
        <div className="mt-6 w-full text-left">
          <h3 className="font-semibold text-gray-700 mb-2">📜 Texto detectado:</h3>
          <div className="bg-gray-50 border rounded-md p-3 text-sm text-gray-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
            {text}
          </div>
          {confidence !== null && (
            <p className="text-xs text-gray-500 mt-1">
              Confianza del OCR: {confidence}%
            </p>
          )}
        </div>
      )}

      {/* Errores */}
      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-md mt-4 p-2 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
