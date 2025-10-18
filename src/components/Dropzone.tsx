"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Image as ImageIcon } from "lucide-react";
import { useImagePreview } from "@/hooks/useImagePreview";
import ImagePreview from "./ImagePreview";

interface DropzoneProps {
  onFileSelect?: (file: File | null) => void;
}

export default function Dropzone({ onFileSelect }: DropzoneProps) {
  const { preview, setPreview } = useImagePreview();
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
        setFileInfo({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + " KB",
        });
      };
      reader.readAsDataURL(file);
      if (onFileSelect) onFileSelect(file);
    },
    [onFileSelect, setPreview]
  );

  const handleRemove = () => {
    setPreview(null);
    setFileInfo(null);
    if (onFileSelect) onFileSelect(null);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    noClick: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-8 cursor-pointer text-center transition-all flex flex-col items-center justify-center space-y-4
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"}
      `}
    >
      <input {...getInputProps()} />

      {!preview ? (
        <div className="flex flex-col items-center space-y-3">
          <ImageIcon className="w-16 h-16 text-blue-500 opacity-80" />
          <p className="text-gray-600 text-base">
            Arrastra una imagen aquí o{" "}
            <button
              type="button"
              onClick={open}
              className="inline-block bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition"
            >
              haz clic para seleccionarla
            </button>
          </p>
          <p className="text-sm text-gray-400">(Formatos admitidos: JPG, PNG, SVG...)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 🔹 Contenedor con tamaño fijo y proporción cuadrada */}
          <div className="w-72 h-72 mx-auto flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden border">
            <img
              src={preview}
              alt="Vista previa"
              className="object-contain w-full h-full transition-transform duration-300 hover:scale-105"
            />
          </div>

          {/* Info del archivo */}
          {fileInfo && (
            <p className="text-sm text-gray-600">
              <strong>Archivo:</strong> {fileInfo.name} ({fileInfo.size})
            </p>
          )}

          <button
            type="button"
            onClick={handleRemove}
            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
          >
            Eliminar imagen
          </button>
        </div>
      )}
    </div>
  );
}
