"use client";

/**
 * Datos técnicos básicos calculados directamente en el navegador.
 * Estos se usan para las métricas de composición y espacios en blanco.
 */
export interface ClientLayoutStats {
  width: number;
  height: number;
  brightnessAvg: number;     // 0..255 promedio
  negativeSpacePct: number;  // % de área blanca aproximada (brillo alto)
}

/** Carga segura de imagen desde URL o blob. */
async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const img = new Image();

  // ⚠️ Importante:
  // - Para blob: NO setear crossOrigin (evita tainted canvas).
  // - Para URLs http(s): sí se puede usar anonymous si el servidor habilita CORS.
  if (!url.startsWith("blob:") && !url.startsWith("data:")) {
    img.crossOrigin = "anonymous";
  }

  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para análisis."));
  });

  img.src = url;

  try {
    // decode acelera y asegura decodificación previa al draw
    // @ts-ignore
    if (typeof img.decode === "function") await img.decode();
  } catch {
    /* onload resolverá igual */
  }

  return p;
}

/** Convierte un archivo local en dataURL como fallback. */
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
    try { URL.revokeObjectURL(blobUrl); } catch {}
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

  // Downscale para performance (manteniendo detalle suficiente)
  const targetW = Math.max(1, Math.min(240, width));
  const scale = targetW / width;
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo crear el contexto Canvas.");

  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Verificación: asegurarnos de que hay datos no nulos
  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, targetW, targetH);
  } catch (err) {
    // Si el canvas está "tainted", aquí fallaría.
    console.error("getImageData falló (canvas tainted o sin datos):", err);
    throw new Error("No se pudo leer los píxeles de la imagen (CORS/canvas).");
  }

  const { data } = imgData;
  if (!data || data.length < 4) {
    throw new Error("Datos de imagen inválidos.");
  }

  let sumBrightness = 0;
  let brightPixels = 0;
  let counted = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a === 0) continue; // píxel transparente: ignóralo
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    sumBrightness += brightness;
    counted++;
    // Umbral alto → espacio "muy claro" (ajustado un poco abajo de 240 para evitar 0%)
    if (brightness >= 235) brightPixels++;
  }

  const brightnessAvg = counted ? +(sumBrightness / counted).toFixed(2) : 0;
  const negativeSpacePct = counted
    ? +(((brightPixels / counted) * 100).toFixed(2))
    : 0;

  // Debug mínimo: primeros 12 bytes para validar que no sea todo 0
  console.debug("🔎 [computeClientLayout] sample RGBA:", Array.from(data.slice(0, 12)));

  return { width, height, brightnessAvg, negativeSpacePct };
}
