import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { sgoDb } from "@/libs/sgo_db";

export async function PUT(request, { params }) {
  const conn = await sgoDb.getConnection();

  try {
    const resolved = await params;
    const idFormato = parseId(resolved, "id");
    const idFila = parseId(resolved, "filaId");

    if (!idFormato || !idFila) {
      return jsonError("ID inválido", 400);
    }

    const body = await request.json();
    const respuestas = body.respuestas && typeof body.respuestas === "object"
      ? body.respuestas
      : {};

    const [filaRows] = await conn.query(
      `SELECT id_fila FROM formato_filas WHERE id_fila = ? AND id_formato = ?`,
      [idFila, idFormato],
    );

    if (!filaRows.length) {
      return jsonError("Fila no encontrada", 404);
    }

    const [columnas] = await conn.query(
      `SELECT id_columna FROM formato_columnas WHERE id_formato = ?`,
      [idFormato],
    );

    await conn.beginTransaction();

    for (const columna of columnas) {
      const valor = String(respuestas[columna.id_columna] ?? "").trim();
      await conn.query(
        `INSERT INTO formato_celdas (id_fila, id_columna, valor)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [idFila, columna.id_columna, valor || null],
      );
    }

    await conn.commit();

    const [celdas] = await conn.query(
      `SELECT id_columna, valor FROM formato_celdas WHERE id_fila = ?`,
      [idFila],
    );

    const celdasMap = {};
    for (const celda of celdas) {
      celdasMap[celda.id_columna] = celda.valor ?? "";
    }

    return jsonOk({ id_fila: idFila, celdas: celdasMap }, "Fila actualizada");
  } catch (error) {
    await conn.rollback();
    console.error("Error al actualizar fila:", error);
    return jsonError("Error al actualizar fila", 500, error.message);
  } finally {
    conn.release();
  }
}

export async function DELETE(_request, { params }) {
  try {
    const resolved = await params;
    const idFormato = parseId(resolved, "id");
    const idFila = parseId(resolved, "filaId");

    if (!idFormato || !idFila) {
      return jsonError("ID inválido", 400);
    }

    const [result] = await sgoDb.query(
      `DELETE FROM formato_filas WHERE id_fila = ? AND id_formato = ?`,
      [idFila, idFormato],
    );

    if (!result.affectedRows) {
      return jsonError("Fila no encontrada", 404);
    }

    return jsonOk(null, "Fila eliminada correctamente");
  } catch (error) {
    console.error("Error al eliminar fila:", error);
    return jsonError("Error al eliminar fila", 500, error.message);
  }
}
