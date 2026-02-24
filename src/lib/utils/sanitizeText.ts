// src/utils/sanitizeText.ts

/** Devuelve true si la línea “parece” texto español razonable */
function isReasonableSpanishLine(l: string): boolean {
  if (!l) return false;
  const line = l.trim();

  // mínimo largo
  if (line.length < 4) return false;

  // debe tener vocal
  if (!/[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]/.test(line)) return false;

  // demasiados símbolos no alfanuméricos → ruido
  const nonWord = (line.match(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,:;!?¡¿()'"%°$€#/@&\-–—]/g) || []).length;
  if (nonWord / line.length > 0.25) return false;

  // no aceptar bloques tipo “A A A”, “TTT”, etc.
  if (/^[A-Z\s]+$/.test(line) && !/\b[A-Z][a-z]/.test(line)) return false;

  return true;
}

/** Normaliza, limpia y deja solo líneas razonables en español */
export function cleanSpanishText(raw: string): string {
  if (!raw) return "";

  let text = raw
    .normalize("NFC")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[•·●○◉◦]/g, " ")
    .replace(/[¯_—–−‒―=]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(isReasonableSpanishLine);

  // unir continuaciones
  const merged: string[] = [];
  for (const line of lines) {
    if (!merged.length) { merged.push(line); continue; }
    const prev = merged[merged.length - 1];
    if (!/[.!?…:]$/.test(prev) && /^[a-záéíóúüñ]/.test(line)) {
      merged[merged.length - 1] = `${prev} ${line}`.trim();
    } else {
      merged.push(line);
    }
  }

  // reparar guiones por salto (“cam- ping” → “camping”)
  return merged
    .join("\n")
    .replace(/(\w)-\s+(\w)/g, "$1$2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Construye texto desde palabras con umbral de confianza */
export function composeFromWords(
  words: Array<{ text: string; confidence?: number }>|undefined,
  minConf = 70,
  minLen = 2
): string {
  if (!Array.isArray(words) || !words.length) return "";
  const kept = words
    .filter(w => (w.text || "").length >= minLen && (w.confidence ?? 0) >= minConf)
    .map(w => w.text)
    .join(" ");
  return cleanSpanishText(kept);
}

/** Construye texto desde líneas (si tesseract expone lines[]) */
export function composeFromLines(
  lines: Array<{ text?: string; confidence?: number }>|undefined,
  minConf = 60,
): string {
  if (!Array.isArray(lines) || !lines.length) return "";
  const kept = lines
    .filter(l => (l.text ?? "").trim().length >= 3 && (l.confidence ?? 0) >= minConf)
    .map(l => (l.text ?? "").trim())
    .join("\n");
  return cleanSpanishText(kept);
}
