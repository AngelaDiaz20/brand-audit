import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // ✅ Leemos JSON, no FormData
    const body = await req.json();

    const { meta, colors, layout, ocr } = body;

    // ✅ Validamos que todo exista
    if (!meta || !colors || !layout || !ocr) {
      throw new Error("Datos incompletos recibidos para análisis GPT.");
    }

    console.log("🧠 Datos recibidos para análisis:", { meta, colors, layout, ocr });

    // 🧩 Aquí eventualmente irá GPT-5. Por ahora, simulamos el análisis:
    const analysis = {
      globalScore: 87,
      summary: "La pieza tiene buen contraste, texto legible y logo bien ubicado.",
      insights: [
        "El color rojo domina y genera atención inmediata.",
        "Buena proporción de espacio negativo.",
        "El texto está centrado correctamente.",
      ],
    };

    // ✅ Devolvemos respuesta simulada
    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error("Aggregator error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error en el análisis" },
      { status: 500 }
    );
  }
}
