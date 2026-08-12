import { sgoDb } from "@/libs/sgo_db";

export async function fetchFormatoColumnas(idFormato, conn = sgoDb) {
  const [rows] = await conn.query(
    `SELECT id_columna, id_formato, titulo, orden, tipo_dato
     FROM formato_columnas
     WHERE id_formato = ?
     ORDER BY orden ASC, id_columna ASC`,
    [idFormato],
  );

  if (!rows.length) return [];

  const columnaIds = rows.map((r) => r.id_columna);
  const [reglas] = await conn.query(
    `SELECT id_regla, id_columna, operador, valor_comparacion, color_fondo, color_texto, orden
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
    reglasPorColumna.get(regla.id_columna).push(regla);
  }

  return rows.map((col) => ({
    ...col,
    reglas: reglasPorColumna.get(col.id_columna) || [],
  }));
}

export async function fetchFormatoFilas(idFormato, conn = sgoDb) {
  const [filas] = await conn.query(
    `SELECT id_fila, id_formato, creado_por, created_at
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

  return filas.map((fila) => ({
    ...fila,
    celdas: celdasPorFila.get(fila.id_fila) || {},
  }));
}

export async function insertColumnasConReglas(conn, idFormato, columnas) {
  for (const columna of columnas) {
    const [result] = await conn.query(
      `INSERT INTO formato_columnas (id_formato, titulo, orden, tipo_dato)
       VALUES (?, ?, ?, ?)`,
      [idFormato, columna.titulo, columna.orden, columna.tipo_dato || "texto"],
    );

    const idColumna = result.insertId;
    const reglas = columna.reglas || [];

    for (const regla of reglas) {
      await conn.query(
        `INSERT INTO formato_reglas
         (id_columna, operador, valor_comparacion, color_fondo, color_texto, orden)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          idColumna,
          regla.operador,
          regla.valor_comparacion,
          regla.color_fondo || "#ef4444",
          regla.color_texto || "#ffffff",
          regla.orden || 1,
        ],
      );
    }
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
