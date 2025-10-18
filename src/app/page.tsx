"use client";

import Dropzone from "@/components/Dropzone";
import { useState } from "react";

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">🧠 Sistema de Análisis IA</h1>
      <Dropzone onFileSelect={handleFileSelect} />

      {selectedFile && (
        <div className="mt-4 text-sm text-gray-700 bg-white p-4 rounded-xl shadow">
          <p><strong>Archivo seleccionado:</strong> {selectedFile.name}</p>
          <p><strong>Tamaño:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
        </div>
      )}
    </main>
  );
}
