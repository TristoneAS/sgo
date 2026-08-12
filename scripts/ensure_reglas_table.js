const mysql = require("mysql2/promise");
require("fs");

async function main() {
  // load .env.local manually
  const fs = require("fs");
  const path = require("path");
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
      valor_comparacion VARCHAR(200) NOT NULL,
      color_fondo VARCHAR(20) NOT NULL DEFAULT '#ef4444',
      color_texto VARCHAR(20) DEFAULT '#ffffff',
      orden INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_reglas_columna FOREIGN KEY (id_columna) REFERENCES formato_columnas (id_columna) ON DELETE CASCADE,
      KEY idx_reglas_columna (id_columna, orden)
    )
  `);

  console.log("Tabla formato_reglas lista");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
