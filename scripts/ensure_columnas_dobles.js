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

  if (!names.has("columnas_dobles")) {
    await conn.query(`
      ALTER TABLE formato_filas
      ADD COLUMN columnas_dobles JSON NULL
      AFTER etiqueta_2
    `);
    console.log("formato_filas.columnas_dobles agregada");
  }

  console.log("formato_filas lista para dobles por columna");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
