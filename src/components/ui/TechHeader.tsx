"use client";
import React from "react";

type Props = {
  name: string;
  sizeKB: number;
  width: number;
  height: number;
  colorProfile?: string | null;
};

export default function TechHeader({ name, sizeKB, width, height, colorProfile }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center gap-4">
      <div>
        <div className="text-xs text-gray-500">Archivo</div>
        <div className="font-medium">{name}</div>
      </div>
      <div className="h-6 w-px bg-gray-200" />
      <div>
        <div className="text-xs text-gray-500">Dimensiones</div>
        <div className="font-medium">
          {width} × {height} px
        </div>
      </div>
      <div className="h-6 w-px bg-gray-200" />
      <div>
        <div className="text-xs text-gray-500">Peso</div>
        <div className="font-medium">{sizeKB.toFixed(1)} KB</div>
      </div>
      <div className="h-6 w-px bg-gray-200" />
      <div>
        <div className="text-xs text-gray-500">Perfil de color</div>
        <div className="font-medium">
          {colorProfile || "No embebido (asumido sRGB)"}
        </div>
      </div>
    </div>
  );
}
