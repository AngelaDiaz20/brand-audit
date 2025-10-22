import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getDominantColors } from "@/lib/analyzer/getDominantColors";
import { analyzeLayout } from "@/lib/analyzer/layoutAnalyzer";
import { analyzeImageMeta } from "@/lib/analyzer/imageMeta";
import type { AnalysisResult, ColorHex } from "@/types/analysis";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const noai = url.searchParams.get("noai") === "1"; // 👈 Modo técnico
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1️⃣ Metadatos base
    const fileMeta = {
      name: file.name,
      sizeKB: +(file.size / 1024).toFixed(2),
    };

    // 2️⃣ Paleta de colores (segura)
    let rawColors: string[] = [];
    try {
      rawColors = await getDominantColors(file);
    } catch (e) {
      console.error("Error en getDominantColors:", e);
    }

    const colors = rawColors.filter((hex: string): hex is ColorHex => /^#[0-9A-F]{6}$/i.test(hex));

    // 3️⃣ OCR (desactivado temporalmente)
    const ocr = { text: "", confidence: 0 };

    // 4️⃣ Layout
    let layout = { width: 0, height: 0, brightnessAvg: 0, negativeSpacePct: 0 };
    try {
      layout = await analyzeLayout(buffer);
    } catch (e) {
      console.error("Error en layout:", e);
    }

    // 5️⃣ Metadatos técnicos
    let metaExtra: any = {};
    try {
      metaExtra = await analyzeImageMeta(buffer);
    } catch (e) {
      console.error("Error en imageMeta:", e);
    }

    // 6️⃣ Construcción del objeto final
    const analysis: AnalysisResult = {
      meta: {
        ...fileMeta,
        format: metaExtra.format,
        colorProfile: metaExtra.colorProfile,
        hasAlpha: metaExtra.hasAlpha,
      },
      colors,
      ocr,
      layout,
      createdAt: new Date().toISOString(),
    };

    // 7️⃣ Recomendaciones (sin IA por ahora)
    const recommendations = "Modo técnico activo: sin recomendaciones IA.";

    return NextResponse.json({ analysis, recommendations });
  } catch (error: any) {
    console.error("❌ Error general en análisis:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar el análisis." },
      { status: 500 }
    );
  }
}
