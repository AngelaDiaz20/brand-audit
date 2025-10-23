"use client";
import React, { useEffect, useMemo, useState } from "react";

export default function RegionsOverlay({
  file,
  boxes,
  naturalWidth,
  naturalHeight,
  maxWidth = 420,
}: {
  file: File;
  boxes: Array<[number, number, number, number]>;
  naturalWidth: number;
  naturalHeight: number;
  maxWidth?: number;
}) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [renderW, setRenderW] = useState(0);
  const [renderH, setRenderH] = useState(0);

  useEffect(() => {
    const scale = Math.min(1, maxWidth / naturalWidth);
    setRenderW(Math.round(naturalWidth * scale));
    setRenderH(Math.round(naturalHeight * scale));
    return () => { try { URL.revokeObjectURL(url); } catch {} };
  }, [url, naturalWidth, naturalHeight, maxWidth]);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold mb-3">🗺️ Zonas de texto detectadas</h3>
      <div
        className="relative border rounded-lg overflow-hidden"
        style={{ width: renderW, height: renderH }}
      >
        <img
          src={url}
          alt="preview"
          style={{ width: renderW, height: renderH, objectFit: "contain", display: "block" }}
        />
        {boxes.map((b, i) => {
          const [x, y, w, h] = b;
          const scale = renderW / naturalWidth;
          return (
            <div
              key={i}
              className="absolute border-2 border-blue-500/70 bg-blue-500/10"
              style={{
                left: Math.round(x * scale),
                top: Math.round(y * scale),
                width: Math.max(1, Math.round(w * scale)),
                height: Math.max(1, Math.round(h * scale)),
              }}
              title={`#${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
