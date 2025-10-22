"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useImagePreview } from "@/hooks/useImagePreview";
import { useColorAnalysis } from "@/hooks/useColorAnalysis";
import ColorPalette from "./ColorPalette"
import { ImageIcon } from "lucide-react";

interface DropzoneProps {
  onFileSelect?: (file: File | null) => void;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
  const { preview, setPreview, fileInfo, setFileInfo } = useImagePreview();
  const { getDominantColors } = useColorAnalysis();
  const [colors, setColors] = useState<string[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const imageUrl = reader.result as string;
        setPreview(imageUrl);
        setFileInfo({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + " KB",
        });

        const colorList = await getDominantColors(imageUrl);
        setColors(colorList);

        if (onFileSelect) onFileSelect(file);
      };
      reader.readAsDataURL(file);
    },
    [getDominantColors, onFileSelect, setFileInfo, setPreview]
  );

  const handleRemove = () => {
    setPreview(null);
    setFileInfo(null);
    setColors([]);
    if (onFileSelect) onFileSelect(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    >
      <input {...getInputProps()} />

      {!preview ? (
        <div className="flex flex-col items-center space-y-3">
          <ImageIcon size={64} className="text-blue-500" />
          <p className="text-gray-600">
            Arrastra una imagen aquí o{" "}
            <button
              type="button"
              className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition"
            >
              haz clic para seleccionarla
            </button>
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <img
            src={preview}
            alt="preview"
            className="w-80 h-80 object-contain rounded-lg border shadow"
          />

          <p className="text-gray-700 text-sm">
            <strong>Archivo:</strong> {fileInfo?.name} <br />
            <strong>Tamaño:</strong> {fileInfo?.size}
          </p>

          <button
            onClick={handleRemove}
            className="mt-2 text-red-500 hover:underline"
          >
            Quitar imagen
          </button>

          <ColorPalette colors={colors} />
        </div>
      )}
    </div>
  );
};

export default Dropzone;
