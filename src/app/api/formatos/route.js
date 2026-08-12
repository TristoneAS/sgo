import { jsonError, jsonOk } from "@/libs/api_helpers";
import { normalizeColumnasPayload } from "@/libs/conditional_rules";
import {
  fetchFormatoCompleto,
  insertColumnasConReglas,
} from "@/libs/formatos_helpers";
import { sgoDb } from "@/libs/sgo_db";

export async function GET() {
  try {
    const [rows] = await sgoDb.query(
      `SELECT id_formato, nombre, descripcion, creado_por, created_at, updated_at
       FROM formatos
       WHERE estado = 'activo'
       ORDER BY updated_at DESC`,
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
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim();
    const creadoPor = String(body.creado_por ?? "").trim();
    const columnas = normalizeColumnasPayload(body.columnas);

    if (!nombre) {
      return jsonError("El nombre del formato es requerido", 400);
    }

    if (!columnas.length) {
      return jsonError("Agregue al menos una columna", 400);
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO formatos (nombre, descripcion, creado_por)
       VALUES (?, ?, ?)`,
      [nombre, descripcion || null, creadoPor || null],
    );

    const idFormato = result.insertId;
    await insertColumnasConReglas(conn, idFormato, columnas);
    await conn.commit();

    const formato = await fetchFormatoCompleto(idFormato);
    return jsonOk(formato, "Formato creado correctamente", 201);
  } catch (error) {
    await conn.rollback();
    console.error("Error al crear formato:", error);
    return jsonError("Error al crear formato", 500, error.message);
  } finally {
    conn.release();
  }
}
