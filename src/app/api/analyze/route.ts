import { NextResponse } from "next/server";
import getColors from "get-image-colors";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Crear carpeta temporal
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    // Guardar temporalmente el archivo
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempPath = path.join(tempDir, file.name);
    fs.writeFileSync(tempPath, buffer);

    // Extraer colores dominantes con get-image-colors
    const colors = await getColors(tempPath);
    const hexColors = colors.map((c) => c.hex());

    // Eliminar archivo temporal
    fs.unlinkSync(tempPath);

    return NextResponse.json({ colors: hexColors });
  } catch (error) {
    console.error("❌ Error al analizar la imagen:", error);
    return NextResponse.json({ error: "Error analyzing image" }, { status: 500 });
  }
}
