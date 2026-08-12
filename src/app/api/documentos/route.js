import { jsonError, jsonOk } from "@/libs/api_helpers";
import {
  esTipoDocumentoPermitido,
  MAX_DOCUMENTO_BYTES,
  sanitizarNombreArchivo,
} from "@/libs/documentos_files";
import {
  eliminarCarpetaDocumento,
  guardarArchivoDocumento,
  rutaPublicaDocumento,
} from "@/libs/documentos_storage";
import { sgoDb } from "@/libs/sgo_db";

export async function GET() {
  try {
    const [rows] = await sgoDb.query(
      `SELECT id_documento, nombre, descripcion, nombre_archivo, ruta_archivo,
              tipo_archivo, tamano_archivo, creado_por, created_at
       FROM documentos
       WHERE estado = 'activo'
       ORDER BY created_at DESC`,
    );
    return jsonOk(rows);
  } catch (error) {
    console.error("Error al listar documentos:", error);
    return jsonError("Error al listar documentos", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const nombre = String(formData.get("nombre") ?? "").trim();
    const descripcion = String(formData.get("descripcion") ?? "").trim();
    const creadoPor = String(formData.get("creado_por") ?? "").trim();
    const archivo = formData.get("archivo");

    if (!nombre) {
      return jsonError("El nombre es requerido", 400);
    }

    if (!archivo || typeof archivo === "string" || !archivo.size) {
      return jsonError("Debes adjuntar un archivo", 400);
    }

    if (!esTipoDocumentoPermitido(archivo)) {
      return jsonError(
        "Tipo no permitido. Usa PDF, Excel, Word o PowerPoint",
        400,
      );
    }

    if (archivo.size > MAX_DOCUMENTO_BYTES) {
      return jsonError("El archivo supera el límite de 25 MB", 400);
    }

    const [result] = await sgoDb.query(
      `INSERT INTO documentos (nombre, descripcion, nombre_archivo, ruta_archivo, tipo_archivo, tamano_archivo, creado_por)
       VALUES (?, ?, '', '', ?, ?, ?)`,
      [
        nombre,
        descripcion || null,
        archivo.type || null,
        archivo.size,
        creadoPor || null,
      ],
    );

    const idDocumento = result.insertId;
    const nombreLimpio = sanitizarNombreArchivo(archivo.name) || `archivo_${idDocumento}`;

    await guardarArchivoDocumento(idDocumento, archivo, nombreLimpio);
    const rutaPublica = rutaPublicaDocumento(idDocumento, nombreLimpio);

    await sgoDb.query(
      `UPDATE documentos
       SET nombre_archivo = ?, ruta_archivo = ?
       WHERE id_documento = ?`,
      [nombreLimpio, rutaPublica, idDocumento],
    );

    const [rows] = await sgoDb.query(
      `SELECT id_documento, nombre, descripcion, nombre_archivo, ruta_archivo,
              tipo_archivo, tamano_archivo, creado_por, created_at
       FROM documentos WHERE id_documento = ?`,
      [idDocumento],
    );

    return jsonOk(rows[0], "Documento cargado correctamente", 201);
  } catch (error) {
    console.error("Error al subir documento:", error);
    return jsonError("Error al subir documento", 500, error.message);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return jsonError("ID inválido", 400);
    }

    const [result] = await sgoDb.query(
      `UPDATE documentos SET estado = 'inactivo' WHERE id_documento = ? AND estado = 'activo'`,
      [id],
    );

    if (!result.affectedRows) {
      return jsonError("Documento no encontrado", 404);
    }

    eliminarCarpetaDocumento(id);
    return jsonOk(null, "Documento eliminado");
  } catch (error) {
    console.error("Error al eliminar documento:", error);
    return jsonError("Error al eliminar documento", 500, error.message);
  }
}
