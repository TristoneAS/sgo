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

function parseCategoriaId(raw) {
  if (raw == null || raw === "") return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriaId = parseCategoriaId(searchParams.get("categoria"));

    let sql = `
      SELECT d.id_documento, d.nombre, d.descripcion, d.id_categoria,
             c.nombre AS categoria_nombre,
             d.nombre_archivo, d.ruta_archivo, d.tipo_archivo,
             d.tamano_archivo, d.creado_por, d.created_at
      FROM documentos d
      LEFT JOIN categorias c
        ON c.id_categoria = d.id_categoria AND c.estado = 'activo'
      WHERE d.estado = 'activo'
    `;
    const params = [];

    if (categoriaId) {
      sql += ` AND d.id_categoria = ?`;
      params.push(categoriaId);
    }

    sql += ` ORDER BY d.created_at DESC`;

    const [rows] = await sgoDb.query(sql, params);
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
    const idCategoria = parseCategoriaId(formData.get("id_categoria"));
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

    if (idCategoria) {
      const [cats] = await sgoDb.query(
        `SELECT id_categoria FROM categorias
         WHERE id_categoria = ? AND estado = 'activo'`,
        [idCategoria],
      );
      if (!cats.length) {
        return jsonError("Categoría no válida", 400);
      }
    }

    const [result] = await sgoDb.query(
      `INSERT INTO documentos
       (nombre, descripcion, id_categoria, nombre_archivo, ruta_archivo,
        tipo_archivo, tamano_archivo, creado_por)
       VALUES (?, ?, ?, '', '', ?, ?, ?)`,
      [
        nombre,
        descripcion || null,
        idCategoria,
        archivo.type || null,
        archivo.size,
        creadoPor || null,
      ],
    );

    const idDocumento = result.insertId;
    const nombreLimpio =
      sanitizarNombreArchivo(archivo.name) || `archivo_${idDocumento}`;

    await guardarArchivoDocumento(idDocumento, archivo, nombreLimpio);
    const rutaPublica = rutaPublicaDocumento(idDocumento, nombreLimpio);

    await sgoDb.query(
      `UPDATE documentos
       SET nombre_archivo = ?, ruta_archivo = ?
       WHERE id_documento = ?`,
      [nombreLimpio, rutaPublica, idDocumento],
    );

    const [rows] = await sgoDb.query(
      `SELECT d.id_documento, d.nombre, d.descripcion, d.id_categoria,
              c.nombre AS categoria_nombre,
              d.nombre_archivo, d.ruta_archivo, d.tipo_archivo,
              d.tamano_archivo, d.creado_por, d.created_at
       FROM documentos d
       LEFT JOIN categorias c
         ON c.id_categoria = d.id_categoria AND c.estado = 'activo'
       WHERE d.id_documento = ?`,
      [idDocumento],
    );

    return jsonOk(rows[0], "Documento cargado correctamente", 201);
  } catch (error) {
    console.error("Error al subir documento:", error);
    return jsonError("Error al subir documento", 500, error.message);
  }
}

export async function PUT(request) {
  try {
    const formData = await request.formData();
    const idDocumento = Number(formData.get("id_documento"));
    const nombre = String(formData.get("nombre") ?? "").trim();
    const descripcion = String(formData.get("descripcion") ?? "").trim();
    const idCategoria = parseCategoriaId(formData.get("id_categoria"));
    const archivo = formData.get("archivo");
    const tieneArchivo =
      archivo && typeof archivo !== "string" && archivo.size > 0;

    if (!Number.isInteger(idDocumento) || idDocumento <= 0) {
      return jsonError("ID inválido", 400);
    }

    if (!nombre) {
      return jsonError("El nombre es requerido", 400);
    }

    const [existing] = await sgoDb.query(
      `SELECT id_documento FROM documentos
       WHERE id_documento = ? AND estado = 'activo'`,
      [idDocumento],
    );

    if (!existing.length) {
      return jsonError("Documento no encontrado", 404);
    }

    if (idCategoria) {
      const [cats] = await sgoDb.query(
        `SELECT id_categoria FROM categorias
         WHERE id_categoria = ? AND estado = 'activo'`,
        [idCategoria],
      );
      if (!cats.length) {
        return jsonError("Categoría no válida", 400);
      }
    }

    if (tieneArchivo) {
      if (!esTipoDocumentoPermitido(archivo)) {
        return jsonError(
          "Tipo no permitido. Usa PDF, Excel, Word o PowerPoint",
          400,
        );
      }
      if (archivo.size > MAX_DOCUMENTO_BYTES) {
        return jsonError("El archivo supera el límite de 25 MB", 400);
      }

      const nombreLimpio =
        sanitizarNombreArchivo(archivo.name) || `archivo_${idDocumento}`;
      eliminarCarpetaDocumento(idDocumento);
      await guardarArchivoDocumento(idDocumento, archivo, nombreLimpio);
      const rutaPublica = rutaPublicaDocumento(idDocumento, nombreLimpio);

      await sgoDb.query(
        `UPDATE documentos
         SET nombre = ?, descripcion = ?, id_categoria = ?,
             nombre_archivo = ?, ruta_archivo = ?,
             tipo_archivo = ?, tamano_archivo = ?
         WHERE id_documento = ? AND estado = 'activo'`,
        [
          nombre,
          descripcion || null,
          idCategoria,
          nombreLimpio,
          rutaPublica,
          archivo.type || null,
          archivo.size,
          idDocumento,
        ],
      );
    } else {
      await sgoDb.query(
        `UPDATE documentos
         SET nombre = ?, descripcion = ?, id_categoria = ?
         WHERE id_documento = ? AND estado = 'activo'`,
        [nombre, descripcion || null, idCategoria, idDocumento],
      );
    }

    const [rows] = await sgoDb.query(
      `SELECT d.id_documento, d.nombre, d.descripcion, d.id_categoria,
              c.nombre AS categoria_nombre,
              d.nombre_archivo, d.ruta_archivo, d.tipo_archivo,
              d.tamano_archivo, d.creado_por, d.created_at
       FROM documentos d
       LEFT JOIN categorias c
         ON c.id_categoria = d.id_categoria AND c.estado = 'activo'
       WHERE d.id_documento = ?`,
      [idDocumento],
    );

    return jsonOk(rows[0], "Documento actualizado");
  } catch (error) {
    console.error("Error al actualizar documento:", error);
    return jsonError("Error al actualizar documento", 500, error.message);
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
      `UPDATE documentos SET estado = 'inactivo'
       WHERE id_documento = ? AND estado = 'activo'`,
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
