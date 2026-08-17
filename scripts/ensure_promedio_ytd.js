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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'formato_columnas'`,
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));

  if (!names.has("promedio_columnas")) {
    await conn.query(`
      ALTER TABLE formato_columnas
      ADD COLUMN promedio_columnas JSON NULL
      AFTER tipo_dato
    `);
    console.log("formato_columnas.promedio_columnas agregada");
  }

  console.log("formato_columnas lista para promedio YTD");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
