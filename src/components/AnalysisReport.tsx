import React from "react";

interface AnalysisReportProps {
  analysis?: any;
  recommendations?: string;
  onRestart?: () => void;
}

export default function AnalysisReport({
  analysis,
  recommendations,
  onRestart,
}: AnalysisReportProps) {
  if (!analysis) {
    return (
      <div className="text-center p-6 bg-red-50 text-red-700 rounded-xl">
        <p>No se pudo generar el análisis. 😕</p>
        <button
          onClick={onRestart}
          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // 👇 destructura con respaldo vacío
  const { meta = {}, colors = [], ocr = {}, layout = {} } = analysis;

  return (
    <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        🧾 Resultados del análisis
      </h2>

      {/* META */}
      <div className="w-full mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">📁 Archivo</h3>
        <p className="font-regular text-gray-700"><strong>Nombre:</strong> {meta.name || "N/A"}</p>
        <p className="font-regular text-gray-700"><strong>Tamaño:</strong> {meta.sizeKB ? `${meta.sizeKB} KB` : "N/A"}</p>
        <p className="font-regular text-gray-700"><strong>Formato:</strong> {meta.format || "N/A"}</p>
        <p className="font-regular text-gray-700"><strong>Perfil de color:</strong> {meta.colorProfile || "N/A"}</p>
      </div>

      {/* COLORES */}
      {colors?.length > 0 && (
        <div className="w-full mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">🎨 Paleta</h3>
          <div className="flex gap-3 flex-wrap">
            {colors.map((color: string, i: number) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-lg border shadow"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs mt-1 text-gray-600">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OCR */}
      <div className="w-full mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">🔤 Texto detectado</h3>
        <p className="whitespace-pre-wrap text-gray-700 text-sm">
          {ocr.text || "No se detectó texto."}
        </p>
      </div>

      {/* LAYOUT */}
      <div className="w-full mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">🧱 Composición</h3>
        <p className="font-regular text-gray-700"><strong>Ancho:</strong> {layout.width || "N/A"} px</p>
        <p className="font-regular text-gray-700"><strong>Alto:</strong> {layout.height || "N/A"} px</p>
        <p className="font-regular text-gray-700"><strong>Brillo promedio:</strong> {layout.brightnessAvg ?? "N/A"}</p>
        <p className="font-regular text-gray-700"><strong>Espacio negativo:</strong> {layout.negativeSpacePct ?? "N/A"}%</p>
      </div>

      {/* RECOMENDACIONES */}
      {recommendations && (
        <div className="w-full bg-gray-50 border rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-gray-700 mb-2">💡 Recomendaciones</h3>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {recommendations}
          </p>
        </div>
      )}

      <button
        onClick={onRestart}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Analizar otra imagen
      </button>
    </div>
  );
}
