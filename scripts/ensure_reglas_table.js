const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  }

  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE_SGO || "sgo",
    multipleStatements: true,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS formato_reglas (
      id_regla INT AUTO_INCREMENT PRIMARY KEY,
      id_columna INT NOT NULL,
      operador ENUM('>', '>=', '<', '<=', '=', '!=', 'contiene') NOT NULL,
      valor_comparacion VARCHAR(200) NOT NULL DEFAULT '',
      tipo_fuente ENUM('valor', 'columna') NOT NULL DEFAULT 'valor',
      id_columna_ref INT NULL,
      color_fondo VARCHAR(20) NOT NULL DEFAULT '#ef4444',
      color_texto VARCHAR(20) DEFAULT '#ffffff',
      orden INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_reglas_columna FOREIGN KEY (id_columna) REFERENCES formato_columnas (id_columna) ON DELETE CASCADE,
      KEY idx_reglas_columna (id_columna, orden)
    )
  `);

  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'formato_reglas'`,
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));

  if (!names.has("tipo_fuente")) {
    await conn.query(`
      ALTER TABLE formato_reglas
      ADD COLUMN tipo_fuente ENUM('valor', 'columna') NOT NULL DEFAULT 'valor'
      AFTER valor_comparacion
    `);
    console.log("Columna tipo_fuente agregada");
  }

  if (!names.has("id_columna_ref")) {
    await conn.query(`
      ALTER TABLE formato_reglas
      ADD COLUMN id_columna_ref INT NULL
      AFTER tipo_fuente
    `);
    console.log("Columna id_columna_ref agregada");
  }

  try {
    await conn.query(`
      ALTER TABLE formato_reglas
      MODIFY valor_comparacion VARCHAR(200) NOT NULL DEFAULT ''
    `);
  } catch {
    /* ignore */
  }

  console.log("formato_reglas lista para comparar valor o columna");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
