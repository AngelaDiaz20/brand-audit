"use client";

import { useState } from "react";

export function useColorAnalysis() {
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const getDominantColors = async (imageUrl: string, colorCount = 5) => {
    try {
      setLoading(true);

      // Import dinámico para evitar problemas en SSR
      // @ts-ignore
      const ColorThief = (await import("colorthief")).default;
      const colorThief = new ColorThief();

      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.src = imageUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
      });

      const palette: [number, number, number][] = colorThief.getPalette(img, colorCount);

      const hexColors = palette.map(
        ([r, g, b]) => `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`
      );

      setColors(hexColors);
      return hexColors;
    } catch (error) {
      console.error("Error al obtener colores dominantes:", error);
      setColors([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { colors, loading, getDominantColors };
}
