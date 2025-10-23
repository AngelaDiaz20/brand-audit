"use client";

/**
 * Calcula el porcentaje de presencia de cada color dominante.
 * - Downscale de la imagen para rendimiento (ancho máx. 200 px)
 * - Asigna cada píxel al color dominante "más cercano" (distancia RGB)
 * Devuelve una lista ordenada: [{ hex: "#RRGGBB", pct: number }]
 */
export async function computeColorRatios(
  file: File,
  paletteHex: string[],
  targetWidth = 200
): Promise<{ hex: `#${string}`; pct: number }[]> {
  if (!paletteHex?.length) return [];

  const url = URL.createObjectURL(file);
  try {
    // Cargar imagen
    const img = await loadImage(url);

    // Escalado
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const scale = Math.min(1, targetWidth / Math.max(1, width));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Parsear paleta a RGB
    const palette = paletteHex.map((hex) => ({ hex: hex as `#${string}`, ...hexToRgb(hex) }));
    const counts = new Map<string, number>();
    palette.forEach((p) => counts.set(p.hex, 0));

    // Asignación por distancia RGB
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a === 0) continue;

      let best: string | null = null;
      let bestD = Infinity;
      for (const p of palette) {
        const d = distSq(r, g, b, p.r, p.g, p.b);
        if (d < bestD) {
          bestD = d;
          best = p.hex;
        }
      }
      counts.set(best!, (counts.get(best!) || 0) + 1);
    }

    // Normalizar a porcentajes
    const total = (w * h) || 1;
    const res = [...counts.entries()]
      .map(([hex, c]) => ({ hex: hex as `#${string}`, pct: +(100 * (c / total)).toFixed(2) }))
      .sort((a, b) => b.pct - a.pct);

    // Ajuste para que la suma sea 100.00 (compensa redondeos)
    const sum = res.reduce((acc, x) => acc + x.pct, 0);
    const diff = +(100 - sum).toFixed(2);
    if (Math.abs(diff) >= 0.01 && res.length) {
      res[0].pct = +(res[0].pct + diff).toFixed(2);
    }

    return res;
  } finally {
    try { URL.revokeObjectURL(url); } catch {}
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  if (!src.startsWith("blob:")) img.crossOrigin = "anonymous";
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = src;
  });
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function distSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}
