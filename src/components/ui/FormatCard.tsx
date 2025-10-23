"use client";
import React from "react";
import type { FormatPreset } from "@/lib/analyzer/formatPresets";

export default function FormatCard({
  width,
  height,
  preset,
  valid,
  safeAreaOk,
  safeMarginPx,
}: {
  width: number;
  height: number;
  preset?: FormatPreset;
  valid: boolean;
  safeAreaOk: boolean;
  safeMarginPx: { top: number; right: number; bottom: number; left: number };
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="font-semibold mb-2">📏 Formato & Zonas Seguras</h3>
      <div className="text-sm text-gray-800 space-y-1">
        <div><b>Dimensiones:</b> {width} × {height} px</div>
        <div>
          <b>Preset:</b>{" "}
          {valid && preset ? `${preset.label} (${preset.width}×${preset.height})` : "— (no coincide)"}
        </div>
        <div>
          <b>Zona segura:</b>{" "}
          {preset ? `${preset.safeMarginPct ?? 5}% por lado` : "—"}
        </div>
        <div>
          <b>Resultado:</b>{" "}
          {safeAreaOk ? (
            <span className="text-green-700">✔ Todo el texto dentro del área segura</span>
          ) : (
            <span className="text-red-700">✖ Hay texto fuera del área segura</span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          Margen en px — top: {safeMarginPx.top}, right: {safeMarginPx.right}, bottom: {safeMarginPx.bottom}, left: {safeMarginPx.left}
        </div>
      </div>
    </div>
  );
}
