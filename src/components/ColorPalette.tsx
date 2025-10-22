"use client";

import React from "react";

interface ColorPaletteProps {
  colors: string[];
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ colors }) => {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-semibold text-gray-800 mb-2">
        🎨 Colores dominantes detectados
      </h3>
      <div className="flex gap-3 flex-wrap">
        {colors.map((color, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-sm"
          >
            <div
              className="w-16 h-16 rounded-lg shadow-md border"
              style={{ backgroundColor: color }}
            />
            <span className="mt-1 font-mono text-gray-700">{color}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorPalette;
