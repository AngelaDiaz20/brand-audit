"use client";

export async function getDominantColors(file: File, colorCount = 5): Promise<string[]> {
  try {
    const ColorThief = (await import("colorthief")).default;
    const colorThief = new ColorThief();

    const imageUrl = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (err) => reject(err);
    });

    const palette: [number, number, number][] = colorThief.getPalette(img, colorCount);
    const hexColors = palette.map(
      ([r, g, b]) =>
        `#${[r, g, b]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()}`
    );

    URL.revokeObjectURL(imageUrl);
    return hexColors;
  } catch (err) {
    console.error("Error al obtener colores dominantes:", err);
    return [];
  }
}
