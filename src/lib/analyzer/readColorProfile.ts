"use client";

/**
 * Intenta detectar el perfil de color de la imagen:
 * - JPEG: busca APP2 con etiqueta "ICC_PROFILE"
 * - PNG: revisa chunks iCCP / sRGB
 * Devuelve un nombre amigable o null si no se encuentra.
 */
export async function readColorProfile(file: File): Promise<string | null> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // JPEG: 0xFF 0xD8 ... APP2(0xFFE2) con "ICC_PROFILE"
  if (isJPEG(bytes)) {
    const app2 = findJpegAPP2_ICC(bytes);
    if (app2) {
      const name = guessIccName(app2);
      return name || "ICC embebido (no identificado)";
    }
    return null; // sin ICC
  }

  // PNG: firma y chunks
  if (isPNG(bytes)) {
    // sRGB chunk ⇒ sRGB IEC61966-2.1
    if (hasPNGChunk(bytes, "sRGB")) return "sRGB IEC61966-2.1";
    // iCCP ⇒ perfil embebido (quizás Adobe RGB, depende del contenido)
    if (hasPNGChunk(bytes, "iCCP")) {
      const iccp = readPNGChunk(bytes, "iCCP");
      const name = parseICCPName(iccp);
      return name || "ICC embebido (PNG)";
    }
    return null;
  }

  return null;
}

// ---------------- helpers JPEG ----------------

function isJPEG(bytes: Uint8Array) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function findJpegAPP2_ICC(bytes: Uint8Array): Uint8Array | null {
  let i = 2; // después de SOI
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    i += 2;
    if (marker === 0xda /* SOS */ || marker === 0xd9 /* EOI */) break;
    const len = (bytes[i] << 8) + bytes[i + 1];
    i += 2;
    if (marker === 0xe2 /* APP2 */ && len > 16) {
      const seg = bytes.slice(i, i + len - 2);
      // "ICC_PROFILE\0"
      if (
        seg[0] === 0x49 && seg[1] === 0x43 && seg[2] === 0x43 && seg[3] === 0x5f &&
        seg[4] === 0x50 && seg[5] === 0x52 && seg[6] === 0x4f && seg[7] === 0x46 &&
        seg[8] === 0x49 && seg[9] === 0x4c && seg[10] === 0x45 && seg[11] === 0x00
      ) {
        return seg; // contiene ICC_PROFILE; no parseamos completo
      }
    }
    i += len - 2;
  }
  return null;
}

function guessIccName(app2: Uint8Array): string | null {
  // Heurística: buscar texto conocido en el payload
  const ascii = new TextDecoder("ascii").decode(app2);
  if (/Adobe\s*RGB/i.test(ascii)) return "Adobe RGB (1998)";
  if (/sRGB/i.test(ascii)) return "sRGB IEC61966-2.1";
  if (/Display\s*P3/i.test(ascii) || /DCI\-P3/i.test(ascii)) return "Display P3";
  return null;
}

// ---------------- helpers PNG ----------------

function isPNG(bytes: Uint8Array) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  return sig.every((v, i) => bytes[i] === v);
}

function hasPNGChunk(bytes: Uint8Array, type: string) {
  return readPNGChunk(bytes, type) !== null;
}

function readPNGChunk(bytes: Uint8Array, targetType: string): Uint8Array | null {
  let pos = 8; // después de la firma
  while (pos + 8 <= bytes.length) {
    const len =
      (bytes[pos] << 24) |
      (bytes[pos + 1] << 16) |
      (bytes[pos + 2] << 8) |
      bytes[pos + 3];
    const type = String.fromCharCode(
      bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]
    );
    pos += 8;
    if (type === targetType) {
      return bytes.slice(pos, pos + len);
    }
    pos += len + 4; // saltar datos + CRC
  }
  return null;
}

function parseICCPName(data: Uint8Array | null): string | null {
  if (!data) return null;
  // Nombre nulo-terminado hasta primer 0x00
  let i = 0;
  while (i < data.length && data[i] !== 0) i++;
  const name = new TextDecoder("ascii").decode(data.slice(0, i)).trim();
  if (/Adobe/i.test(name)) return "Adobe RGB (1998)";
  if (/sRGB/i.test(name)) return "sRGB IEC61966-2.1";
  if (name) return name;
  return null;
}
