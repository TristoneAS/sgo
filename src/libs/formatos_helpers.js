import { sgoDb } from "@/libs/sgo_db";
import { parseReglasDobles } from "@/libs/conditional_rules";
import {
  isColumnaYtd,
  MAX_COLUMNAS_PROMEDIO,
  normalizePromedioIndices,
  parsePromedioColumnas,
} from "@/libs/ytd_promedio";

export async function fetchFormatoColumnas(idFormato, conn = sgoDb) {
  const [rows] = await conn.query(
    `SELECT id_columna, id_formato, titulo, orden, tipo_dato, promedio_columnas
     FROM formato_columnas
     WHERE id_formato = ?
     ORDER BY orden ASC, id_columna ASC`,
    [idFormato],
  );

  if (!rows.length) return [];

  const columnaIds = rows.map((r) => r.id_columna);
  const [reglas] = await conn.query(
    `SELECT id_regla, id_columna, operador, valor_comparacion, tipo_fuente,
            id_columna_ref, color_fondo, color_texto, orden
     FROM formato_reglas
     WHERE id_columna IN (?)
     ORDER BY orden ASC, id_regla ASC`,
    [columnaIds],
  );

  const reglasPorColumna = new Map();
  for (const regla of reglas) {
    if (!reglasPorColumna.has(regla.id_columna)) {
      reglasPorColumna.set(regla.id_columna, []);
    }
    reglasPorColumna.get(regla.id_columna).push({
      ...regla,
      tipo_fuente: regla.tipo_fuente || "valor",
      id_columna_ref: regla.id_columna_ref ?? null,
    });
  }

  return rows.map((col) => ({
    ...col,
    promedio_columnas: isColumnaYtd(col.titulo)
      ? parsePromedioColumnas(col.promedio_columnas)
      : [],
    reglas: reglasPorColumna.get(col.id_columna) || [],
  }));
}

export async function fetchFormatoFilas(idFormato, conn = sgoDb) {
  const [filas] = await conn.query(
    `SELECT id_fila, id_formato, creado_por, doble_respuesta, etiqueta_1, etiqueta_2,
            columnas_dobles, reglas_dobles, created_at
     FROM formato_filas
     WHERE id_formato = ?
     ORDER BY id_fila ASC`,
    [idFormato],
  );

  if (!filas.length) {
    return [];
  }

  const filaIds = filas.map((f) => f.id_fila);
  const [celdas] = await conn.query(
    `SELECT id_celda, id_fila, id_columna, valor
     FROM formato_celdas
     WHERE id_fila IN (?)`,
    [filaIds],
  );

  const celdasPorFila = new Map();
  for (const celda of celdas) {
    if (!celdasPorFila.has(celda.id_fila)) {
      celdasPorFila.set(celda.id_fila, {});
    }
    celdasPorFila.get(celda.id_fila)[celda.id_columna] = celda.valor ?? "";
  }

  return filas.map((fila) => {
    let columnasDobles = [];
    try {
      if (Array.isArray(fila.columnas_dobles)) {
        columnasDobles = fila.columnas_dobles.map(Number);
      } else if (typeof fila.columnas_dobles === "string" && fila.columnas_dobles) {
        columnasDobles = JSON.parse(fila.columnas_dobles).map(Number);
      }
    } catch {
      columnasDobles = [];
    }

    return {
      ...fila,
      doble_respuesta: Boolean(fila.doble_respuesta),
      etiqueta_1: fila.etiqueta_1 || "Bud",
      etiqueta_2: fila.etiqueta_2 || "Act",
      columnas_dobles: columnasDobles.filter((n) => !Number.isNaN(n)),
      reglas_dobles: parseReglasDobles(fila.reglas_dobles),
      celdas: celdasPorFila.get(fila.id_fila) || {},
    };
  });
}

function resolveColumnaRefId(regla, insertedIds) {
  if (regla.tipo_fuente !== "columna") return null;

  if (
    regla.columna_ref_index != null &&
    !Number.isNaN(Number(regla.columna_ref_index))
  ) {
    const id = insertedIds[Number(regla.columna_ref_index)];
    return id ?? null;
  }

  if (regla.id_columna_ref != null && !Number.isNaN(Number(regla.id_columna_ref))) {
    return Number(regla.id_columna_ref);
  }

  return null;
}

export async function insertColumnasConReglas(conn, idFormato, columnas) {
  const insertedIds = [];

  for (const columna of columnas) {
    const [result] = await conn.query(
      `INSERT INTO formato_columnas (id_formato, titulo, orden, tipo_dato, promedio_columnas)
       VALUES (?, ?, ?, ?, ?)`,
      [
        idFormato,
        columna.titulo,
        columna.orden,
        columna.tipo_dato || "texto",
        null,
      ],
    );
    insertedIds.push(result.insertId);
  }

  await applyPromedioColumnas(conn, columnas, insertedIds);
  await replaceReglasColumnas(conn, columnas, insertedIds);
  return insertedIds;
}

async function applyPromedioColumnas(conn, columnas, columnaIds) {
  for (let i = 0; i < columnas.length; i += 1) {
    const columna = columnas[i];
    const idColumna = columnaIds[i];

    if (!isColumnaYtd(columna.titulo)) {
      await conn.query(
        `UPDATE formato_columnas SET promedio_columnas = NULL WHERE id_columna = ?`,
        [idColumna],
      );
      continue;
    }

    const indices = normalizePromedioIndices(
      columna.promedio_columnas_indices,
      columnas.length,
      i,
    ).slice(0, MAX_COLUMNAS_PROMEDIO);

    const ids = indices
      .map((idx) => columnaIds[idx])
      .filter((id) => id != null);

    await conn.query(
      `UPDATE formato_columnas SET promedio_columnas = ? WHERE id_columna = ?`,
      [ids.length ? JSON.stringify(ids) : null, idColumna],
    );
  }
}

async function replaceReglasColumnas(conn, columnas, columnaIds) {
  for (let i = 0; i < columnas.length; i += 1) {
    const columna = columnas[i];
    const idColumna = columnaIds[i];
    const reglas = columna.reglas || [];

    await conn.query(`DELETE FROM formato_reglas WHERE id_columna = ?`, [
      idColumna,
    ]);

    for (const regla of reglas) {
      const tipoFuente = regla.tipo_fuente === "columna" ? "columna" : "valor";
      const idRef = resolveColumnaRefId(regla, columnaIds);

      await conn.query(
        `INSERT INTO formato_reglas
         (id_columna, operador, valor_comparacion, tipo_fuente, id_columna_ref,
          color_fondo, color_texto, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idColumna,
          regla.operador,
          tipoFuente === "valor" ? regla.valor_comparacion || "" : "",
          tipoFuente,
          tipoFuente === "columna" ? idRef : null,
          regla.color_fondo || "#ef4444",
          regla.color_texto || "#ffffff",
          regla.orden || 1,
        ],
      );
    }
  }
}

/**
 * Actualiza columnas conservando ids (y por tanto las celdas/respuestas).
 * Solo elimina columnas que el usuario quitó del formato.
 */
export async function syncColumnasConReglas(conn, idFormato, columnas) {
  const [existing] = await conn.query(
    `SELECT id_columna FROM formato_columnas WHERE id_formato = ?`,
    [idFormato],
  );
  const existingIds = new Set(existing.map((row) => Number(row.id_columna)));
  const finalIds = [];
  const keptIds = new Set();

  for (const columna of columnas) {
    const id =
      columna.id_columna != null && !Number.isNaN(Number(columna.id_columna))
        ? Number(columna.id_columna)
        : null;

    if (id != null && existingIds.has(id)) {
      await conn.query(
        `UPDATE formato_columnas
         SET titulo = ?, orden = ?, tipo_dato = ?
         WHERE id_columna = ? AND id_formato = ?`,
        [
          columna.titulo,
          columna.orden,
          columna.tipo_dato || "texto",
          id,
          idFormato,
        ],
      );
      finalIds.push(id);
      keptIds.add(id);
    } else {
      const [result] = await conn.query(
        `INSERT INTO formato_columnas (id_formato, titulo, orden, tipo_dato, promedio_columnas)
         VALUES (?, ?, ?, ?, ?)`,
        [
          idFormato,
          columna.titulo,
          columna.orden,
          columna.tipo_dato || "texto",
          null,
        ],
      );
      finalIds.push(result.insertId);
      keptIds.add(result.insertId);
    }
  }

  for (const oldId of existingIds) {
    if (!keptIds.has(oldId)) {
      await conn.query(
        `DELETE FROM formato_columnas WHERE id_columna = ? AND id_formato = ?`,
        [oldId, idFormato],
      );
    }
  }

  await applyPromedioColumnas(conn, columnas, finalIds);
  await replaceReglasColumnas(conn, columnas, finalIds);
  await cleanupFilaRefsTrasSyncColumnas(conn, idFormato, keptIds);

  return finalIds;
}

async function cleanupFilaRefsTrasSyncColumnas(conn, idFormato, keptIds) {
  const [filas] = await conn.query(
    `SELECT id_fila, columnas_dobles, reglas_dobles
     FROM formato_filas
     WHERE id_formato = ?`,
    [idFormato],
  );

  for (const fila of filas) {
    let columnasDobles = [];
    try {
      if (Array.isArray(fila.columnas_dobles)) {
        columnasDobles = fila.columnas_dobles.map(Number);
      } else if (
        typeof fila.columnas_dobles === "string" &&
        fila.columnas_dobles
      ) {
        columnasDobles = JSON.parse(fila.columnas_dobles).map(Number);
      }
    } catch {
      columnasDobles = [];
    }

    const nextDobles = columnasDobles.filter(
      (id) => !Number.isNaN(id) && keptIds.has(id),
    );
    const reglas = parseReglasDobles(fila.reglas_dobles);
    const nextReglas = {};
    for (const [key, list] of Object.entries(reglas)) {
      const id = Number(key);
      if (!Number.isNaN(id) && keptIds.has(id)) {
        nextReglas[id] = list;
      }
    }

    await conn.query(
      `UPDATE formato_filas
       SET columnas_dobles = ?, reglas_dobles = ?, doble_respuesta = ?
       WHERE id_fila = ?`,
      [
        JSON.stringify(nextDobles),
        JSON.stringify(nextReglas),
        nextDobles.length ? 1 : 0,
        fila.id_fila,
      ],
    );
  }
}

export async function fetchFormatoCompleto(idFormato, conn = sgoDb) {
  const [formatos] = await conn.query(
    `SELECT id_formato, nombre, descripcion, estado, creado_por, created_at, updated_at
     FROM formatos
     WHERE id_formato = ? AND estado = 'activo'`,
    [idFormato],
  );

  if (!formatos.length) return null;

  const formato = formatos[0];
  const columnas = await fetchFormatoColumnas(idFormato, conn);
  const filas = await fetchFormatoFilas(idFormato, conn);

  return { ...formato, columnas, filas };
}
