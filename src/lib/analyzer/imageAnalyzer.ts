// src/lib/analyzer.ts
"use client";

import { useColorAnalysis } from "@/hooks/useColorAnalysis";

export const useImageAnalyzer = () => {
  const { getDominantColors } = useColorAnalysis();

  /**
   * Analiza los colores dominantes de una imagen local o remota.
   * @param file Archivo o URL de imagen
   */
  const analyzeImageColors = async (
    file: File | string
  ): Promise<string[]> => {
    try {
      let imageUrl: string;

      // Si es un archivo local (subido por el usuario)
      if (file instanceof File) {
        imageUrl = URL.createObjectURL(file);
      } else {
        imageUrl = file;
      }

      // Llama al hook que obtiene la paleta
      const colors = await getDominantColors(imageUrl);

      // Limpieza: liberar el objeto temporal de memoria
      if (file instanceof File) URL.revokeObjectURL(imageUrl);

      return colors;
    } catch (error) {
      console.error("Error al analizar la imagen:", error);
      return [];
    }
  };

  return { analyzeImageColors };
};
