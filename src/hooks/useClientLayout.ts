"use client";

/**
 * Datos técnicos básicos calculados directamente en el navegador.
 * Estos se usan para las métricas de composición y espacios en blanco.
 */
export interface ClientLayoutStats {
  width: number;
  height: number;
  brightnessAvg: number;     // 0..255 promedio
  negativeSpacePct: number;  // % de área blanca aproximada
}

/** Carga segura de imagen desde URL o blob */
async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  if (!url.startsWith("blob:")) img.crossOrigin = "anonymous";

  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para análisis."));
  });

  img.src = url;

  try {
    // Si está disponible, decode acelera el render
    // @ts-ignore
    if (typeof img.decode === "function") await img.decode();
  } catch {
    /* onload resolverá igual */
  }

  return p;
}

/** Convierte un archivo local en dataURL como fallback */
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("No se pudo leer el archivo como DataURL."));
    fr.readAsDataURL(file);
  });
}

/** Entrada principal: analiza un File local */
export async function computeClientLayout(file: File): Promise<ClientLayoutStats> {
  const blobUrl = URL.createObjectURL(file);
  try {
    return await computeFromUrl(blobUrl);
  } catch (e) {
    console.warn("⚠️ Fallback a DataURL por error con blob:", e);
    const dataUrl = await fileToDataURL(file);
    return await computeFromUrl(dataUrl);
  } finally {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }
}

/** Entrada secundaria: analiza una URL directa */
export async function computeClientLayoutFromUrl(url: string): Promise<ClientLayoutStats> {
  return computeFromUrl(url);
}

/** Núcleo del análisis de layout */
async function computeFromUrl(url: string): Promise<ClientLayoutStats> {
  const img = await loadImageFromUrl(url);

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) throw new Error("Imagen sin dimensiones válidas.");

  // Downscale para performance
  const targetW = Math.min(160, width);
  const scale = targetW / width;
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el contexto Canvas.");

  ctx.drawImage(img, 0, 0, targetW, targetH);
  const { data } = ctx.getImageData(0, 0, targetW, targetH);

  let sumBrightness = 0;
  let brightPixels = 0;
  const total = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a === 0) continue;
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    sumBrightness += brightness;
    if (brightness > 240) brightPixels++;
  }

  return {
    width,
    height,
    brightnessAvg: +(sumBrightness / total).toFixed(2),
    negativeSpacePct: +((brightPixels / total) * 100).toFixed(2),
  };
}
