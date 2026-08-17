import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { serializeReglasDobles } from "@/libs/conditional_rules";
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
    const etiqueta1 = String(body.etiqueta_1 ?? "Bud").trim() || "Bud";
    const etiqueta2 = String(body.etiqueta_2 ?? "Act").trim() || "Act";
    const columnasDobles = Array.isArray(body.columnas_dobles)
      ? body.columnas_dobles.map(Number).filter((n) => !Number.isNaN(n))
      : [];
    const reglasDoblesJson = serializeReglasDobles(body.reglas_dobles || {});
    const respuestas =
      body.respuestas && typeof body.respuestas === "object"
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

    await conn.query(
      `UPDATE formato_filas
       SET doble_respuesta = ?, etiqueta_1 = ?, etiqueta_2 = ?,
           columnas_dobles = ?, reglas_dobles = ?
       WHERE id_fila = ? AND id_formato = ?`,
      [
        columnasDobles.length ? 1 : 0,
        etiqueta1,
        etiqueta2,
        JSON.stringify(columnasDobles),
        reglasDoblesJson,
        idFila,
        idFormato,
      ],
    );

    for (const columna of columnas) {
      const valor = normalizeRespuestaValor(respuestas[columna.id_columna]);
      await conn.query(
        `INSERT INTO formato_celdas (id_fila, id_columna, valor)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [idFila, columna.id_columna, valor || null],
      );
    }

    await conn.commit();

    const filas = await fetchFormatoFilas(idFormato, conn);
    const fila = filas.find((f) => f.id_fila === idFila) || {
      id_fila: idFila,
      celdas: {},
    };

    return jsonOk(fila, "Fila actualizada");
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
