"use client";

/**
 * Preprocesa la imagen para OCR:
 * - escala ×2 (o hasta 1600 px lado mayor)
 * - gris
 * - realce (unsharp)
 * - binarización adaptativa simple (promedio local)
 * Devuelve un DataURL PNG listo para Tesseract.
 */
export async function preprocessForOCR(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    const maxSide = 1600;
    const scale0 = Math.min(2, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale0));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale0));

    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cx = c.getContext("2d", { willReadFrequently: true })!;
    cx.drawImage(img, 0, 0, w, h);

    const imgData = cx.getImageData(0, 0, w, h);
    const { data } = imgData;

    // 1) Gris
    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      gray[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    // 2) Unsharp mask suave (realce)
    const blurred = boxBlur(gray, w, h, 1);
    const sharp = new Uint8ClampedArray(w * h);
    for (let i = 0; i < sharp.length; i++) {
      const v = gray[i] + (gray[i] - blurred[i]) * 0.6;
      sharp[i] = clamp(Math.round(v), 0, 255);
    }

    // 3) Umbral adaptativo simple (tile 32x32)
    const bin = adaptiveThreshold(sharp, w, h, 16, -10);

    // 4) Escribe al canvas en blanco/negro
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const v = bin[p] ? 0 : 255; // texto → negro
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
    cx.putImageData(imgData, 0, 0);

    return c.toDataURL("image/png", 1);
  } finally {
    try { URL.revokeObjectURL(url); } catch {}
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para preprocesar."));
    img.src = src;
  });
}

function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }

function boxBlur(src: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  const tmp = new Float32Array(w * h);
  const out = new Uint8ClampedArray(w * h);
  // horizontal
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)];
    tmp[row + 0] = acc;
    for (let x = 1; x < w; x++) {
      acc += src[row + clamp(x + r, 0, w - 1)];
      acc -= src[row + clamp(x - r - 1, 0, w - 1)];
      tmp[row + x] = acc;
    }
  }
  // vertical
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

function adaptiveThreshold(src: Uint8ClampedArray, w: number, h: number, r: number, c: number): Uint8Array {
  // mean local (box-blur) con radio r, umbral = mean + c
  const mean = boxBlur(src, w, h, r);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) {
    out[i] = src[i] < Math.max(0, Math.min(255, mean[i] + c)) ? 1 : 0;
  }
  return out;
}
