CREATE DATABASE IF NOT EXISTS sgo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sgo;

CREATE TABLE IF NOT EXISTS formatos (
  id_formato INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  creado_por VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_formatos_nombre_activo (nombre, estado)
);

CREATE TABLE IF NOT EXISTS formato_columnas (
  id_columna INT AUTO_INCREMENT PRIMARY KEY,
  id_formato INT NOT NULL,
  titulo VARCHAR(500) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  tipo_dato VARCHAR(50) NOT NULL DEFAULT 'texto',
  promedio_columnas JSON NULL,
  CONSTRAINT fk_columnas_formato FOREIGN KEY (id_formato) REFERENCES formatos (id_formato) ON DELETE CASCADE,
  KEY idx_columnas_formato (id_formato, orden)
);

CREATE TABLE IF NOT EXISTS formato_filas (
  id_fila INT AUTO_INCREMENT PRIMARY KEY,
  id_formato INT NOT NULL,
  creado_por VARCHAR(100),
  doble_respuesta TINYINT(1) NOT NULL DEFAULT 0,
  etiqueta_1 VARCHAR(50) NOT NULL DEFAULT 'Bud',
  etiqueta_2 VARCHAR(50) NOT NULL DEFAULT 'Act',
  columnas_dobles JSON NULL,
  reglas_dobles JSON NULL,
  reglas_fila JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_filas_formato FOREIGN KEY (id_formato) REFERENCES formatos (id_formato) ON DELETE CASCADE,
  KEY idx_filas_formato (id_formato, created_at)
);

CREATE TABLE IF NOT EXISTS formato_celdas (
  id_celda INT AUTO_INCREMENT PRIMARY KEY,
  id_fila INT NOT NULL,
  id_columna INT NOT NULL,
  valor TEXT,
  CONSTRAINT fk_celdas_fila FOREIGN KEY (id_fila) REFERENCES formato_filas (id_fila) ON DELETE CASCADE,
  CONSTRAINT fk_celdas_columna FOREIGN KEY (id_columna) REFERENCES formato_columnas (id_columna) ON DELETE CASCADE,
  UNIQUE KEY uk_celdas_fila_columna (id_fila, id_columna)
);

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
);

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  creado_por VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_categorias_nombre_activo (nombre, estado)
);

CREATE TABLE IF NOT EXISTS documentos (
  id_documento INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(500) NOT NULL,
  descripcion TEXT,
  id_categoria INT NULL,
  nombre_archivo VARCHAR(500) NOT NULL DEFAULT '',
  ruta_archivo VARCHAR(600) NOT NULL DEFAULT '',
  tipo_archivo VARCHAR(120),
  tamano_archivo BIGINT DEFAULT 0,
  creado_por VARCHAR(100),
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_documentos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria) ON DELETE SET NULL
);
