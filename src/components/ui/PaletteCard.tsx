"use client";
import React from "react";

export default function PaletteCard({
  colors,
}: {
  colors: { hex: `#${string}`; pct: number }[];
}) {
  if (!colors?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold mb-3">🎨 Paleta y proporciones</h3>
      {/* Barra apilada */}
      <div className="w-full h-4 rounded overflow-hidden flex mb-3 border">
        {colors.map((c) => (
          <div
            key={c.hex}
            title={`${c.hex} • ${c.pct}%`}
            style={{ width: `${Math.max(0, c.pct)}%`, background: c.hex }}
          />
        ))}
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-3">
        {colors.map((c) => (
          <div
            key={c.hex}
            className="flex items-center gap-2 text-sm border rounded-lg px-2 py-1"
          >
            <span className="inline-block w-4 h-4 rounded" style={{ background: c.hex }} />
            <span className="font-mono">{c.hex}</span>
            <span className="text-gray-500">• {c.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
