// src/lib/analyzer/preprocessOCR.ts
// Mejora visual para OCR: normaliza contraste y reduce ruido fino

export async function preprocessForOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("No se pudo crear contexto canvas.");

          // 1️⃣ Dibujar original
          ctx.drawImage(img, 0, 0);

          // 2️⃣ Obtener píxeles
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // 3️⃣ Calcular brillo promedio global
          let sum = 0, total = 0;
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 50) continue; // ignorar píxeles muy transparentes
            const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            sum += y;
            total++;
          }
          const avg = sum / (total || 1);

          // 4️⃣ Filtro “modo fino”: realce de contraste y aclarado adaptativo
          const contrast = 1.5; // más contraste
          const offset = avg > 150 ? -20 : 20; // si es claro, baja gamma; si es oscuro, sube

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            let y = 0.299 * r + 0.587 * g + 0.114 * b;
            y = (y - 128) * contrast + 128 + offset;
            y = Math.max(0, Math.min(255, y));
            data[i] = data[i + 1] = data[i + 2] = y;
          }

          ctx.putImageData(imageData, 0, 0);

          // 5️⃣ Suavizado local
          try {
            ctx.filter = "blur(0.4px)";
            ctx.drawImage(canvas, 0, 0);
          } catch {}

          const out = canvas.toDataURL("image/jpeg", 0.8);
          resolve(out);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("No se pudo cargar imagen."));
      img.src = fr.result as string;
    };
    fr.onerror = () => reject(new Error("No se pudo leer archivo."));
    fr.readAsDataURL(file);
  });
}
