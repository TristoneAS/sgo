import { jsonError, jsonOk } from "@/libs/api_helpers";
import { sgoDb } from "@/libs/sgo_db";

export async function GET() {
  try {
    const [rows] = await sgoDb.query(
      `SELECT id_categoria, nombre, descripcion, creado_por, created_at, updated_at
       FROM categorias
       WHERE estado = 'activo'
       ORDER BY nombre ASC`,
    );
    return jsonOk(rows);
  } catch (error) {
    console.error("Error al listar categorías:", error);
    return jsonError("Error al listar categorías", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const creadoPor = String(body.creado_por ?? "").trim();

    if (!nombre) {
      return jsonError("El nombre de la categoría es requerido", 400);
    }

    const [result] = await sgoDb.query(
      `INSERT INTO categorias (nombre, descripcion, creado_por)
       VALUES (?, ?, ?)`,
      [nombre, descripcion || null, creadoPor || null],
    );

    const [rows] = await sgoDb.query(
      `SELECT id_categoria, nombre, descripcion, creado_por, created_at, updated_at
       FROM categorias WHERE id_categoria = ?`,
      [result.insertId],
    );

    return jsonOk(rows[0], "Categoría creada", 201);
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return jsonError("Ya existe una categoría con ese nombre", 409);
    }
    console.error("Error al crear categoría:", error);
    return jsonError("Error al crear categoría", 500, error.message);
  }
}
