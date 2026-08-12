import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { normalizeColumnasPayload } from "@/libs/conditional_rules";
import {
  fetchFormatoCompleto,
  insertColumnasConReglas,
} from "@/libs/formatos_helpers";
import { sgoDb } from "@/libs/sgo_db";

export async function GET(_request, { params }) {
  try {
    const resolved = await params;
    const idFormato = parseId(resolved, "id");

    if (!idFormato) {
      return jsonError("ID de formato inválido", 400);
    }

    const formato = await fetchFormatoCompleto(idFormato);
    if (!formato) {
      return jsonError("Formato no encontrado", 404);
    }

    return jsonOk(formato);
  } catch (error) {
    console.error("Error al obtener formato:", error);
    return jsonError("Error al obtener formato", 500, error.message);
  }
}

export async function PUT(request, { params }) {
  const conn = await sgoDb.getConnection();

  try {
    const resolved = await params;
    const idFormato = parseId(resolved, "id");

    if (!idFormato) {
      return jsonError("ID de formato inválido", 400);
    }

    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const columnas = normalizeColumnasPayload(body.columnas);

    if (!nombre) {
      return jsonError("El nombre del formato es requerido", 400);
    }

    if (!columnas.length) {
      return jsonError("Agregue al menos una columna", 400);
    }

    const [existing] = await conn.query(
      "SELECT id_formato FROM formatos WHERE id_formato = ? AND estado = 'activo'",
      [idFormato],
    );

    if (!existing.length) {
      return jsonError("Formato no encontrado", 404);
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE formatos SET nombre = ?, descripcion = ? WHERE id_formato = ?`,
      [nombre, descripcion || null, idFormato],
    );

    await conn.query("DELETE FROM formato_columnas WHERE id_formato = ?", [
      idFormato,
    ]);

    await insertColumnasConReglas(conn, idFormato, columnas);
    await conn.commit();

    const formato = await fetchFormatoCompleto(idFormato);
    return jsonOk(formato, "Formato actualizado correctamente");
  } catch (error) {
    await conn.rollback();
    console.error("Error al actualizar formato:", error);
    return jsonError("Error al actualizar formato", 500, error.message);
  } finally {
    conn.release();
  }
}

export async function DELETE(_request, { params }) {
  try {
    const resolved = await params;
    const idFormato = parseId(resolved, "id");

    if (!idFormato) {
      return jsonError("ID de formato inválido", 400);
    }

    const [result] = await sgoDb.query(
      `UPDATE formatos SET estado = 'inactivo' WHERE id_formato = ? AND estado = 'activo'`,
      [idFormato],
    );

    if (!result.affectedRows) {
      return jsonError("Formato no encontrado", 404);
    }

    return jsonOk(null, "Formato eliminado correctamente");
  } catch (error) {
    console.error("Error al eliminar formato:", error);
    return jsonError("Error al eliminar formato", 500, error.message);
  }
}
