import fs from "fs";
import { NextResponse } from "next/server";
import { mimeDesdeNombre } from "@/libs/documentos_files";
import { resolverRutaFisicaDesdePublica } from "@/libs/documentos_storage";

export async function GET(_request, { params }) {
  try {
    const resolved = await params;
    const segmentos = resolved.path || [];

    if (!segmentos.length) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const fisica = resolverRutaFisicaDesdePublica(segmentos);
    if (!fisica || !fs.existsSync(fisica)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    const nombreArchivo = pathBasename(fisica);
    const buffer = fs.readFileSync(fisica);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeDesdeNombre(nombreArchivo),
        "Content-Disposition": `inline; filename="${nombreArchivo}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error al servir documento:", error);
    return NextResponse.json({ error: "Error al leer archivo" }, { status: 500 });
  }
}

function pathBasename(filePath) {
  const parts = String(filePath).split(/[/\\]/);
  return parts[parts.length - 1] || "archivo";
}
