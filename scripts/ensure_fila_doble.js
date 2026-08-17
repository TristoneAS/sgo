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
  });

  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'formato_filas'`,
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));

  if (!names.has("doble_respuesta")) {
    await conn.query(`
      ALTER TABLE formato_filas
      ADD COLUMN doble_respuesta TINYINT(1) NOT NULL DEFAULT 0
      AFTER creado_por
    `);
    console.log("formato_filas.doble_respuesta agregada");
  }

  if (!names.has("etiqueta_1")) {
    await conn.query(`
      ALTER TABLE formato_filas
      ADD COLUMN etiqueta_1 VARCHAR(50) NOT NULL DEFAULT 'Bud'
      AFTER doble_respuesta
    `);
    console.log("formato_filas.etiqueta_1 agregada");
  }

  if (!names.has("etiqueta_2")) {
    await conn.query(`
      ALTER TABLE formato_filas
      ADD COLUMN etiqueta_2 VARCHAR(50) NOT NULL DEFAULT 'Act'
      AFTER etiqueta_1
    `);
    console.log("formato_filas.etiqueta_2 agregada");
  }

  console.log("formato_filas lista para filas dobles");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
