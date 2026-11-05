import { sgoDb } from "@/libs/sgo_db";

/** Subir al agregar migraciones nuevas para forzar re-chequeo en el mismo proceso. */
const SCHEMA_VERSION = 2;
let ensurePromise = null;
let ensuredVersion = 0;

async function tableColumns(conn, tableName) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME AS name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );
  return new Set(cols.map((c) => c.name));
}

async function tableExists(conn, tableName) {
  const [rows] = await conn.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
}

/**
 * Asegura columnas/tablas usadas al crear/editar formatos.
 * Usa TEXT en lugar de JSON para compatibilidad con MySQL antiguos.
 */
export async function ensureFormatoSchema(conn = sgoDb) {
  if (ensuredVersion !== SCHEMA_VERSION) {
    ensurePromise = null;
  }

  if (!ensurePromise) {
    ensurePromise = (async () => {
      const ownConn = conn === sgoDb ? await sgoDb.getConnection() : conn;
      try {
        const formatoCols = await tableColumns(ownConn, "formatos");
        if (!formatoCols.has("id_categoria")) {
          await ownConn.query(`
            ALTER TABLE formatos
            ADD COLUMN id_categoria INT NULL
            AFTER descripcion
          `);
          try {
            await ownConn.query(`
              ALTER TABLE formatos
              ADD CONSTRAINT fk_formatos_categoria
              FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)
              ON DELETE SET NULL
            `);
          } catch {
            /* FK puede fallar si categorias aún no existe */
          }
        }

        const colCols = await tableColumns(ownConn, "formato_columnas");
        if (!colCols.has("promedio_columnas")) {
          await ownConn.query(`
            ALTER TABLE formato_columnas
            ADD COLUMN promedio_columnas TEXT NULL
            AFTER tipo_dato
          `);
        }

        const filaCols = await tableColumns(ownConn, "formato_filas");
        if (!filaCols.has("anio")) {
          const anioDefault = new Date().getFullYear();
          await ownConn.query(`
            ALTER TABLE formato_filas
            ADD COLUMN anio SMALLINT NOT NULL DEFAULT ${anioDefault}
            AFTER id_formato
          `);
          try {
            await ownConn.query(`
              UPDATE formato_filas
              SET anio = YEAR(created_at)
              WHERE created_at IS NOT NULL
            `);
          } catch {
            /* ignore */
          }
          try {
            await ownConn.query(`
              ALTER TABLE formato_filas
              ADD KEY idx_filas_formato_anio (id_formato, anio)
            `);
          } catch {
            /* índice puede existir */
          }
        }
        if (!filaCols.has("doble_respuesta")) {
          await ownConn.query(`
            ALTER TABLE formato_filas
            ADD COLUMN doble_respuesta TINYINT(1) NOT NULL DEFAULT 0
            AFTER creado_por
          `);
        }
        if (!filaCols.has("etiqueta_1")) {
          await ownConn.query(`
            ALTER TABLE formato_filas
            ADD COLUMN etiqueta_1 VARCHAR(50) NOT NULL DEFAULT 'Bud'
            AFTER doble_respuesta
          `);
        }
        if (!filaCols.has("etiqueta_2")) {
          await ownConn.query(`
            ALTER TABLE formato_filas
            ADD COLUMN etiqueta_2 VARCHAR(50) NOT NULL DEFAULT 'Act'
            AFTER etiqueta_1
          `);
        }
        if (!filaCols.has("columnas_dobles")) {
          await ownConn.query(`
            ALTER TABLE formato_filas
            ADD COLUMN columnas_dobles TEXT NULL
            AFTER etiqueta_2
          `);
        }
        if (!filaCols.has("reglas_dobles")) {
          await ownConn.query(`
            ALTER TABLE formato_filas
            ADD COLUMN reglas_dobles TEXT NULL
            AFTER columnas_dobles
          `);
        }
        if (!filaCols.has("reglas_fila")) {
          await ownConn.query(`
            ALTER TABLE formato_filas
            ADD COLUMN reglas_fila TEXT NULL
            AFTER reglas_dobles
          `);
        }

        if (!(await tableExists(ownConn, "formato_reglas"))) {
          await ownConn.query(`
            CREATE TABLE formato_reglas (
              id_regla INT AUTO_INCREMENT PRIMARY KEY,
              id_columna INT NOT NULL,
              operador ENUM('>', '>=', '<', '<=', '=', '!=', 'contiene') NOT NULL,
              valor_comparacion VARCHAR(200) NOT NULL DEFAULT '',
              tipo_fuente ENUM('valor', 'columna') NOT NULL DEFAULT 'valor',
              id_columna_ref INT NULL,
              color_fondo VARCHAR(20) NOT NULL DEFAULT '#ef4444',
              color_texto VARCHAR(20) DEFAULT '#ffffff',
              orden INT NOT NULL DEFAULT 0,
              CONSTRAINT fk_reglas_columna FOREIGN KEY (id_columna)
                REFERENCES formato_columnas (id_columna) ON DELETE CASCADE,
              KEY idx_reglas_columna (id_columna, orden)
            )
          `);
        } else {
          const reglaCols = await tableColumns(ownConn, "formato_reglas");
          if (!reglaCols.has("tipo_fuente")) {
            await ownConn.query(`
              ALTER TABLE formato_reglas
              ADD COLUMN tipo_fuente ENUM('valor', 'columna') NOT NULL DEFAULT 'valor'
              AFTER valor_comparacion
            `);
          }
          if (!reglaCols.has("id_columna_ref")) {
            await ownConn.query(`
              ALTER TABLE formato_reglas
              ADD COLUMN id_columna_ref INT NULL
              AFTER tipo_fuente
            `);
          }
        }
        ensuredVersion = SCHEMA_VERSION;
      } finally {
        if (conn === sgoDb) ownConn.release();
      }
    })().catch((err) => {
      ensurePromise = null;
      ensuredVersion = 0;
      throw err;
    });
  }

  return ensurePromise;
}
