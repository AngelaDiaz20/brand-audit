// src/types/tesseract.d.ts
declare module "tesseract.js" {
  // Extendemos las opciones aceptadas por recognize/worker
  interface WorkerOptions {
    // Flags de configuración que tesseract acepta aunque no estén tipados oficialmente
    tessedit_pageseg_mode?: number;            // PSM (p. ej. 11 = sparse text)
    tessedit_char_whitelist?: string;          // lista blanca opcional
    tessedit_char_blacklist?: string;          // lista negra opcional
    // También permitimos un objeto genérico "config" por si quieres usar otras claves
    config?: Record<string, string | number>;
  }
}
