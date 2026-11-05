import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import {
  serializeReglasDobles,
  serializeReglasFila,
} from "@/libs/conditional_rules";
import { ensureFormatoSchema } from "@/libs/ensure_formato_schema";
import { anioActual, parseAnio } from "@/libs/formato_anio";
import { fetchFormatoFilas } from "@/libs/formatos_helpers";
import { sgoDb } from "@/libs/sgo_db";

function normalizeRespuestaValor(valor) {
  if (valor && typeof valor === "object") {
    return JSON.stringify({
      v1: String(valor.v1 ?? ""),
      v2: String(valor.v2 ?? ""),
    });
  }
  return String(valor ?? "").trim();
}

export async function GET(request, { params }) {
  try {
    const resolved = await params;
    const idFormato = parseId(resolved, "id");

    if (!idFormato) {
      return jsonError("ID de formato inválido", 400);
    }

    const anioParam = new URL(request.url).searchParams.get("anio");
    let anio;
    if (anioParam != null && anioParam !== "") {
      anio = parseAnio(anioParam);
      if (anio == null) {
        return jsonError("Año inválido", 400);
      }
    }

    await ensureFormatoSchema();
    const filas = await fetchFormatoFilas(idFormato, sgoDb, { anio });
    return jsonOk(filas);
  } catch (error) {
    console.error("Error al listar filas:", error);
    return jsonError("Error al listar filas", 500, error.message);
  }
}

export async function POST(request, { params }) {
  const conn = await sgoDb.getConnection();

  try {
    const resolved = await params;
    const idFormato = parseId(resolved, "id");

    if (!idFormato) {
      return jsonError("ID de formato inválido", 400);
    }

    await ensureFormatoSchema(conn);

    const body = await request.json();
    const creadoPor = String(body.creado_por ?? "").trim();
    const anio = parseAnio(body.anio) ?? anioActual();
    const etiqueta1 = String(body.etiqueta_1 ?? "Bud").trim() || "Bud";
    const etiqueta2 = String(body.etiqueta_2 ?? "Act").trim() || "Act";
    const columnasDobles = Array.isArray(body.columnas_dobles)
      ? body.columnas_dobles.map(Number).filter((n) => !Number.isNaN(n))
      : [];
    const reglasDoblesJson = serializeReglasDobles(body.reglas_dobles || {});
    const reglasFilaJson = serializeReglasFila(body.reglas_fila || {});
    const respuestas =
      body.respuestas && typeof body.respuestas === "object"
        ? body.respuestas
        : {};

    if (body.anio != null && body.anio !== "" && parseAnio(body.anio) == null) {
      return jsonError("Año inválido", 400);
    }

    const [formatoRows] = await conn.query(
      `SELECT id_formato FROM formatos WHERE id_formato = ? AND estado = 'activo'`,
      [idFormato],
    );

    if (!formatoRows.length) {
      return jsonError("Formato no encontrado", 404);
    }

    const [columnas] = await conn.query(
      `SELECT id_columna FROM formato_columnas WHERE id_formato = ? ORDER BY orden ASC`,
      [idFormato],
    );

    if (!columnas.length) {
      return jsonError("El formato no tiene columnas definidas", 400);
    }

    await conn.beginTransaction();

    const [filaResult] = await conn.query(
      `INSERT INTO formato_filas
       (id_formato, anio, creado_por, doble_respuesta, etiqueta_1, etiqueta_2,
        columnas_dobles, reglas_dobles, reglas_fila)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idFormato,
        anio,
        creadoPor || null,
        columnasDobles.length ? 1 : 0,
        etiqueta1,
        etiqueta2,
        JSON.stringify(columnasDobles),
        reglasDoblesJson,
        reglasFilaJson,
      ],
    );

    const idFila = filaResult.insertId;

    for (const columna of columnas) {
      const valor = normalizeRespuestaValor(respuestas[columna.id_columna]);
      await conn.query(
        `INSERT INTO formato_celdas (id_fila, id_columna, valor) VALUES (?, ?, ?)`,
        [idFila, columna.id_columna, valor || null],
      );
    }

    await conn.commit();

    const filas = await fetchFormatoFilas(idFormato, conn, { anio });
    const fila = filas.find((f) => f.id_fila === idFila) || null;

    return jsonOk(fila, "Fila registrada correctamente", 201);
  } catch (error) {
    await conn.rollback();
    console.error("Error al crear fila:", error);
    return jsonError("Error al crear fila", 500, error.message);
  } finally {
    conn.release();
  }
}
