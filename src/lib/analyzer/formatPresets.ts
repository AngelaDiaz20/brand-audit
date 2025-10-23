"use client";

export type FormatPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  safeMarginPct?: number; // margen recomendado por lado, p.ej. 5%
  tolerancePx?: number;   // tolerancia de match
};

export const PRESETS: FormatPreset[] = [
  { id: "ig-square",   label: "Instagram Cuadrado",      width: 1080, height: 1080, safeMarginPct: 5, tolerancePx: 2 },
  { id: "ig-portrait", label: "Instagram Vertical",      width: 1080, height: 1350, safeMarginPct: 5, tolerancePx: 2 },
  { id: "ig-story",    label: "Story/9:16",              width: 1080, height: 1920, safeMarginPct: 5, tolerancePx: 2 },
  { id: "mpu",         label: "Display 300×250 (MPU)",   width: 300,  height: 250,  safeMarginPct: 4, tolerancePx: 1 },
];

export function validateFormat(
  width: number,
  height: number
): { preset?: FormatPreset; valid: boolean } {
  const found = PRESETS.find(p =>
    Math.abs(p.width - width) <= (p.tolerancePx ?? 0) &&
    Math.abs(p.height - height) <= (p.tolerancePx ?? 0)
  );
  return { preset: found, valid: !!found };
}

/** Verifica que TODAS las cajas estén dentro del área segura (margen por lado). */
export function checkSafeArea(
  imgW: number,
  imgH: number,
  boxes: Array<[number, number, number, number]> = [],
  safeMarginPct = 5
): { safeAreaOk: boolean; marginPx: { top: number; right: number; bottom: number; left: number } } {
  const m = {
    top: Math.round((safeMarginPct / 100) * imgH),
    right: Math.round((safeMarginPct / 100) * imgW),
    bottom: Math.round((safeMarginPct / 100) * imgH),
    left: Math.round((safeMarginPct / 100) * imgW),
  };

  const inside = boxes.every(([x, y, w, h]) => {
    const x1 = x, y1 = y, x2 = x + w, y2 = y + h;
    return x1 >= m.left && y1 >= m.top && x2 <= (imgW - m.right) && y2 <= (imgH - m.bottom);
  });

  return { safeAreaOk: inside, marginPx: m };
}
