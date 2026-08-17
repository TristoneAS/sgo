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
    CREATE TABLE IF NOT EXISTS categorias (
      id_categoria INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(200) NOT NULL,
      descripcion TEXT,
      estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
      creado_por VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_categorias_nombre_activo (nombre, estado)
    )
  `);

  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos'`,
  );
  const names = new Set(cols.map((c) => c.COLUMN_NAME));

  if (!names.has("id_categoria")) {
    await conn.query(`
      ALTER TABLE documentos
      ADD COLUMN id_categoria INT NULL
      AFTER descripcion
    `);
    console.log("documentos.id_categoria agregada");
  }

  try {
    await conn.query(`
      ALTER TABLE documentos
      ADD CONSTRAINT fk_documentos_categoria
      FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)
      ON DELETE SET NULL
    `);
    console.log("FK documentos → categorias agregada");
  } catch (err) {
    if (!String(err.message || "").includes("Duplicate")) {
      console.log("FK (omitida o ya existe):", err.message);
    }
  }

  console.log("categorias lista");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
