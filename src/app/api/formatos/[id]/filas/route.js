import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { fetchFormatoFilas } from "@/libs/formatos_helpers";
import { sgoDb } from "@/libs/sgo_db";

export async function GET(_request, { params }) {
  try {
    const resolved = await params;
    const idFormato = parseId(resolved, "id");

    if (!idFormato) {
      return jsonError("ID de formato inválido", 400);
    }

    const filas = await fetchFormatoFilas(idFormato);
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

    const body = await request.json();
    const creadoPor = String(body.creado_por ?? "").trim();
    const respuestas = body.respuestas && typeof body.respuestas === "object"
      ? body.respuestas
      : {};

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
      `INSERT INTO formato_filas (id_formato, creado_por) VALUES (?, ?)`,
      [idFormato, creadoPor || null],
    );

    const idFila = filaResult.insertId;

    for (const columna of columnas) {
      const valor = String(respuestas[columna.id_columna] ?? "").trim();
      await conn.query(
        `INSERT INTO formato_celdas (id_fila, id_columna, valor) VALUES (?, ?, ?)`,
        [idFila, columna.id_columna, valor || null],
      );
    }

    await conn.commit();

    const [filas] = await conn.query(
      `SELECT id_fila, id_formato, creado_por, created_at FROM formato_filas WHERE id_fila = ?`,
      [idFila],
    );

    const [celdas] = await conn.query(
      `SELECT id_columna, valor FROM formato_celdas WHERE id_fila = ?`,
      [idFila],
    );

    const celdasMap = {};
    for (const celda of celdas) {
      celdasMap[celda.id_columna] = celda.valor ?? "";
    }

    return jsonOk(
      { ...filas[0], celdas: celdasMap },
      "Fila registrada correctamente",
      201,
    );
  } catch (error) {
    await conn.rollback();
    console.error("Error al crear fila:", error);
    return jsonError("Error al crear fila", 500, error.message);
  } finally {
    conn.release();
  }
}
