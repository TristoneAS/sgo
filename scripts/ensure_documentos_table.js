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

  await conn.query(`
    CREATE TABLE IF NOT EXISTS documentos (
      id_documento INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(500) NOT NULL,
      descripcion TEXT,
      nombre_archivo VARCHAR(500) NOT NULL DEFAULT '',
      ruta_archivo VARCHAR(600) NOT NULL DEFAULT '',
      tipo_archivo VARCHAR(120),
      tamano_archivo BIGINT DEFAULT 0,
      creado_por VARCHAR(100),
      estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log("Tabla documentos lista");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
