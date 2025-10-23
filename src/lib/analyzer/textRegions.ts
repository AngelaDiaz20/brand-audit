"use client";
import type { OCRWord, OCRLine } from "@/hooks/useOCR";

/**
 * textAreaPct:
 * 1) Preferimos bboxes de words → luego lines → luego blocks.
 * 2) Si no hay bboxes, fallback por densidad:
 *    - contraste local + bordes
 *    - SUPRESIÓN de azules saturados (evita contar fondo azul)
 */
export async function computeTextAreaPct(
  imgW: number,
  imgH: number,
  words: OCRWord[] | undefined,
  targetW = 360,
  fileForFallback?: File,
  lines?: OCRLine[],
  blocks?: { bbox: [number, number, number, number] }[]
): Promise<{ textAreaPct: number; maskPixels: number; totalPixels: number; mode: "bboxes" | "lines" | "blocks" | "density" | "none" }> {
  const useBoxes =
    (words && words.length > 0 && { kind: "bboxes" as const, boxes: words.map(w => w.bbox) }) ||
    (lines && lines.length > 0 && { kind: "lines" as const, boxes: lines.map(l => l.bbox) }) ||
    (blocks && blocks.length > 0 && { kind: "blocks" as const, boxes: blocks.map(b => b.bbox) });

  if (useBoxes) {
    const scale = Math.min(1, targetW / Math.max(1, imgW));
    const w = Math.max(1, Math.round(imgW * scale));
    const h = Math.max(1, Math.round(imgH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    for (const [x, y, bw, bh] of useBoxes.boxes) {
      ctx.fillRect(Math.round(x * scale), Math.round(y * scale), Math.max(1, Math.round(bw * scale)), Math.max(1, Math.round(bh * scale)));
    }
    const { data } = ctx.getImageData(0, 0, w, h);
    let filled = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] && data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) filled++;
    }
    const total = w * h;
    return { textAreaPct: +((filled / total) * 100).toFixed(2), maskPixels: filled, totalPixels: total, mode: useBoxes.kind };
  }

  if (!fileForFallback) return { textAreaPct: 0, maskPixels: 0, totalPixels: 1, mode: "none" };

  // ---------- Fallback por densidad con supresión de azules ----------
  const url = URL.createObjectURL(fileForFallback);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, targetW / Math.max(1, img.naturalWidth || img.width));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cx = c.getContext("2d", { willReadFrequently: true })!;
    cx.drawImage(img, 0, 0, w, h);
    const { data } = cx.getImageData(0, 0, w, h);

    const gray = new Uint8ClampedArray(w * h);
    const sat = new Float32Array(w * h);
    const hue = new Float32Array(w * h);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i]/255, g = data[i+1]/255, b = data[i+2]/255;
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      const l = (max + min) / 2;
      let s = 0, hdeg = 0;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
          case r: hdeg = (g - b) / d + (g < b ? 6 : 0); break;
          case g: hdeg = (b - r) / d + 2; break;
          case b: hdeg = (r - g) / d + 4; break;
        }
        hdeg *= 60;
      }
      sat[p] = s;
      hue[p] = hdeg;
      gray[p] = Math.round(255 * (0.299*r + 0.587*g + 0.114*b));
    }

    // Promedio local para contraste
    const mean = boxBlurMean(gray, w, h, 2);

    // Borde
    const edges = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const gx = gray[p + 1] - gray[p - 1];
        const gy = gray[p + w] - gray[p - w];
        const mag = Math.abs(gx) + Math.abs(gy);
        edges[p] = mag > 28 ? 1 : 0;
      }
    }

    // Suprimir “azules saturados” (fondo): hue ~ 190–250°, s > 0.35
    const mask = new Uint8Array(w * h);
    const blueMin = 190, blueMax = 250;
    let filled = 0;
    for (let p = 0; p < gray.length; p++) {
      if (!edges[p]) continue;
      const hdeg = hue[p], s = sat[p];
      const isBlueSat = s > 0.35 && hdeg >= blueMin && hdeg <= blueMax;
      if (isBlueSat) continue; // quitar fondo azul

      const g = gray[p], m = mean[p];
      if (Math.abs(g - m) >= 18) { // contraste local
        mask[p] = 1; filled++;
      }
    }

    // Morfología
    const dil = dilate(mask, w, h);
    const clo = erode(dil, w, h);
    const minArea = Math.max(8, Math.round((w * h) * 0.0008));
    const cleaned = filterSmallComponents(clo, w, h, minArea);

    let cnt = 0; for (let i = 0; i < cleaned.length; i++) if (cleaned[i]) cnt++;
    const total = w * h;
    const pct = +((cnt / total) * 100).toFixed(2);

    return { textAreaPct: pct, maskPixels: cnt, totalPixels: total, mode: "density" };
  } finally {
    try { URL.revokeObjectURL(url); } catch {}
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  return new Promise((res, rej) => {
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("No se pudo cargar la imagen (fallback)."));
    img.src = src;
  });
}

function boxBlurMean(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  const tmp = new Float32Array(w * h);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0; const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)];
    tmp[row] = acc;
    for (let x = 1; x < w; x++) {
      acc += src[row + clamp(x + r, 0, w - 1)];
      acc -= src[row + clamp(x - r - 1, 0, w - 1)];
      tmp[row + x] = acc;
    }
  }
  const k = (2 * r + 1) * (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
    out[x] = Math.round(acc / k);
    for (let y = 1; y < h; y++) {
      acc += tmp[clamp(y + r, 0, h - 1) * w + x];
      acc -= tmp[clamp(y - r - 1, 0, h - 1) * w + x];
      out[y * w + x] = Math.round(acc / k);
    }
  }
  return out;
}
function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }

function dilate(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const nx = x + i, ny = y + j;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx]) { on = 1; break; }
    }
    out[y * w + x] = on;
  }
  return out;
}
function erode(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = 1;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const nx = x + i, ny = y + j;
      if (!(nx >= 0 && nx < w && ny >= 0 && ny < h) || !mask[ny * w + nx]) { on = 0; break; }
    }
    out[y * w + x] = on;
  }
  return out;
}
function filterSmallComponents(mask: Uint8Array, w: number, h: number, minArea: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  const seen = new Uint8Array(mask.length);
  const q: number[] = [];
  const dirs = [-1, 0, 1, 0, -1];
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p] || seen[p]) continue;
    let area = 0; q.length = 0; q.push(p); seen[p] = 1;
    const comp: number[] = [p];
    while (q.length) {
      const cur = q.pop()!; area++;
      const x = cur % w, y = (cur / w) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + dirs[k], ny = y + dirs[k + 1];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const np = ny * w + nx;
          if (mask[np] && !seen[np]) { seen[np] = 1; q.push(np); comp.push(np); }
        }
      }
    }
    if (area >= minArea) { for (const pp of comp) out[pp] = 1; }
  }
  return out;
}
