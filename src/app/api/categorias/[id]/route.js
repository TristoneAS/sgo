import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { sgoDb } from "@/libs/sgo_db";

export async function PUT(request, { params }) {
  try {
    const resolved = await params;
    const id = parseId(resolved, "id");

    if (!id) {
      return jsonError("ID inválido", 400);
    }

    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();

    if (!nombre) {
      return jsonError("El nombre de la categoría es requerido", 400);
    }

    const [result] = await sgoDb.query(
      `UPDATE categorias
       SET nombre = ?, descripcion = ?
       WHERE id_categoria = ? AND estado = 'activo'`,
      [nombre, descripcion || null, id],
    );

    if (!result.affectedRows) {
      return jsonError("Categoría no encontrada", 404);
    }

    const [rows] = await sgoDb.query(
      `SELECT id_categoria, nombre, descripcion, creado_por, created_at, updated_at
       FROM categorias WHERE id_categoria = ?`,
      [id],
    );

    return jsonOk(rows[0], "Categoría actualizada");
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return jsonError("Ya existe una categoría con ese nombre", 409);
    }
    console.error("Error al actualizar categoría:", error);
    return jsonError("Error al actualizar categoría", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const resolved = await params;
    const id = parseId(resolved, "id");

    if (!id) {
      return jsonError("ID inválido", 400);
    }

    const [result] = await sgoDb.query(
      `UPDATE categorias SET estado = 'inactivo'
       WHERE id_categoria = ? AND estado = 'activo'`,
      [id],
    );

    if (!result.affectedRows) {
      return jsonError("Categoría no encontrada", 404);
    }

    await sgoDb.query(
      `UPDATE documentos SET id_categoria = NULL
       WHERE id_categoria = ? AND estado = 'activo'`,
      [id],
    );

    return jsonOk(null, "Categoría eliminada");
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    return jsonError("Error al eliminar categoría", 500, error.message);
  }
}
