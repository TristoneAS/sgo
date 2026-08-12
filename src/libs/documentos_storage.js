import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "documentos");

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  return UPLOADS_DIR;
}

export function rutaFisicaDocumento(idDocumento, nombreArchivo) {
  return path.join(UPLOADS_DIR, String(idDocumento), nombreArchivo);
}

export function rutaPublicaDocumento(idDocumento, nombreArchivo) {
  return `/uploads/documentos/${idDocumento}/${encodeURIComponent(nombreArchivo)}`;
}

export async function guardarArchivoDocumento(idDocumento, archivo, nombreFinal) {
  ensureUploadsDir();
  const carpeta = path.join(UPLOADS_DIR, String(idDocumento));
  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }

  const destino = path.join(carpeta, nombreFinal);
  const buffer = Buffer.from(await archivo.arrayBuffer());
  fs.writeFileSync(destino, buffer);
  return destino;
}

export function eliminarCarpetaDocumento(idDocumento) {
  const carpeta = path.join(UPLOADS_DIR, String(idDocumento));
  if (fs.existsSync(carpeta)) {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

export function resolverRutaFisicaDesdePublica(segmentos) {
  const safe = segmentos.map((s) => path.basename(String(s)));
  const fisica = path.join(UPLOADS_DIR, ...safe);
  const resolved = path.resolve(fisica);
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
    return null;
  }
  return resolved;
}
