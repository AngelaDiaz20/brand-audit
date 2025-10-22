import sharp from "sharp";

type Hex = `#${string}`;

function rgbToHex(r: number, g: number, b: number): Hex {
  const toHex = (x: number) => x.toString(16).padStart(2, "0");
  return (`#${toHex(r)}${toHex(g)}${toHex(b)}` as Hex);
}

/**
 * Fallback ultrarrápido: usa sharp.stats() para obtener el color dominante.
 * Siempre funciona y nunca cuelga.
 */
async function fallbackPalette(buffer: Buffer, count = 5): Promise<Hex[]> {
  // 1 color dominante:
  const stats = await sharp(buffer).stats();
  const dom = (stats as any).dominant as { r: number; g: number; b: number } | undefined;

  const base = dom ? [rgbToHex(dom.r, dom.g, dom.b)] : ["#999999" as Hex];

  // Genera variantes claro/oscuro para completar 'count'
  const variants: Hex[] = [];
  for (let i = 1; i < count; i++) {
    const f = 1 - i / (count + 1);
    const r = Math.max(0, Math.min(255, Math.round((dom?.r ?? 153) * f)));
    const g = Math.max(0, Math.min(255, Math.round((dom?.g ?? 153) * f)));
    const b = Math.max(0, Math.min(255, Math.round((dom?.b ?? 153) * f)));
    variants.push(rgbToHex(r, g, b));
  }
  // dedup
  return Array.from(new Set([...base, ...variants])) as Hex[];
}

/**
 * Paleta estable basada en K-means sobre una imagen reducida (en memoria).
 * Puede tardar un poco más en equipos sin optimizaciones.
 */
function kmeans(pixels: Uint8ClampedArray, k: number, iterations = 8): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a === 0) continue;
    pts.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }
  if (!pts.length) return [];

  const step = Math.max(1, Math.floor(pts.length / k));
  let centroids = Array.from({ length: k }, (_, idx) => pts[Math.min(idx * step, pts.length - 1)]);

  for (let it = 0; it < iterations; it++) {
    const clusters: number[][][] = Array.from({ length: k }, () => []);
    for (const p of pts) {
      let best = 0, bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const [cr, cg, cb] = centroids[c];
        const d = (p[0] - cr) ** 2 + (p[1] - cg) ** 2 + (p[2] - cb) ** 2;
        if (d < bestDist) { bestDist = d; best = c; }
      }
      clusters[best].push(p);
    }
    for (let c = 0; c < k; c++) {
      const cluster = clusters[c];
      if (!cluster.length) continue;
      let sr = 0, sg = 0, sb = 0;
      for (const p of cluster) { sr += p[0]; sg += p[1]; sb += p[2]; }
      centroids[c] = [Math.round(sr / cluster.length), Math.round(sg / cluster.length), Math.round(sb / cluster.length)];
    }
  }
  return centroids;
}

/**
 * getDominantColors robusto:
 * 1) Intenta K-means rápido (128x128, en memoria).
 * 2) Si se demora o falla, usa fallback con sharp.stats() (siempre responde).
 */
export async function getDominantColors(file: File, colorCount = 5): Promise<Hex[]> {
  const buffer = Buffer.from(await file.arrayBuffer());

  // Intento principal: K-means
  try {
    const { data } = await sharp(buffer)
      .resize(128, 128, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const clusters = kmeans(new Uint8ClampedArray(data), colorCount);
    const hexes = Array.from(new Set(clusters.map(([r, g, b]) => rgbToHex(r, g, b).toUpperCase()))) as Hex[];

    // si por alguna razón vino vacío, usa fallback
    if (!hexes.length) {
      return await fallbackPalette(buffer, colorCount);
    }
    return hexes;
  } catch (e) {
    // Cualquier error: usa fallback
    return await fallbackPalette(buffer, colorCount);
  }
}
