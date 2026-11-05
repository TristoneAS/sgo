import { jsonError, jsonOk } from "@/libs/api_helpers";
import { normalizeColumnasPayload } from "@/libs/conditional_rules";
import { ensureFormatoSchema } from "@/libs/ensure_formato_schema";
import {
  fetchFormatoCompleto,
  insertColumnasConReglas,
  parseIdCategoria,
  resolveIdCategoriaActiva,
} from "@/libs/formatos_helpers";
import { sgoDb } from "@/libs/sgo_db";

export async function GET() {
  try {
    await ensureFormatoSchema();
    const [rows] = await sgoDb.query(
      `SELECT f.id_formato, f.nombre, f.descripcion, f.id_categoria,
              f.creado_por, f.created_at, f.updated_at,
              c.nombre AS categoria_nombre
       FROM formatos f
       LEFT JOIN categorias c
         ON c.id_categoria = f.id_categoria AND c.estado = 'activo'
       WHERE f.estado = 'activo'
       ORDER BY f.updated_at DESC`,
    );
    return jsonOk(rows);
  } catch (error) {
    console.error("Error al listar formatos:", error);
    return jsonError("Error al listar formatos", 500, error.message);
  }
}

export async function POST(request) {
  const conn = await sgoDb.getConnection();

  try {
    await ensureFormatoSchema(conn);

    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const creadoPor = String(body.creado_por ?? "").trim();
    const columnas = normalizeColumnasPayload(body.columnas);
    const idCategoriaRaw = parseIdCategoria(body.id_categoria);

    if (!nombre) {
      return jsonError("El nombre del formato es requerido", 400);
    }

    if (!columnas.length) {
      return jsonError("Agregue al menos una columna con título", 400);
    }

    const idCategoria = await resolveIdCategoriaActiva(conn, idCategoriaRaw);
    if (idCategoriaRaw != null && idCategoria == null) {
      return jsonError("La categoría seleccionada no es válida", 400);
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO formatos (nombre, descripcion, id_categoria, creado_por)
       VALUES (?, ?, ?, ?)`,
      [nombre, descripcion || null, idCategoria, creadoPor || null],
    );

    const idFormato = result.insertId;
    await insertColumnasConReglas(conn, idFormato, columnas);
    await conn.commit();

    const formato = await fetchFormatoCompleto(idFormato);
    return jsonOk(formato, "Formato creado correctamente", 201);
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    console.error("Error al crear formato:", error);
    if (error?.code === "ER_DUP_ENTRY") {
      return jsonError(
        "Ya existe un formato activo con ese nombre",
        409,
        error.message,
      );
    }
    return jsonError("Error al crear formato", 500, error.message);
  } finally {
    conn.release();
  }
}
