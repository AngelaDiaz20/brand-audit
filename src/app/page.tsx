"use client"

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import AnalysisProgress from "@/components/AnalysisProgress";
import AnalysisReport from "@/components/AnalysisReport";

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<any | null>(null);

  const handleComplete = (result: any) => {
    setAnalysisData(result);
  };

  const handleRestart = () => {
    setSelectedFile(null);
    setAnalysisData(null);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      {!selectedFile ? (
        <>
          <h1 className="text-2xl font-bold mb-6">🧠 Sistema de Análisis IA</h1>
          <Dropzone onFileSelect={setSelectedFile} />
        </>
      ) : !analysisData ? (
        <AnalysisProgress file={selectedFile} onComplete={handleComplete} />
      ) : (
        <AnalysisReport
          analysis={analysisData.analysis}
          recommendations={analysisData.recommendations}
          onRestart={handleRestart}
        />
      )}
    </main>
  );
}
