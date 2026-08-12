export const ACCEPT_DOCUMENTOS =
  ".pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx";

export const DOCUMENTOS_HINT =
  "PDF, Excel, Word o PowerPoint (máx. 25 MB)";

const ALLOWED_EXT = new Set([
  ".pdf",
  ".xls",
  ".xlsx",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
]);

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export const MAX_DOCUMENTO_BYTES = 25 * 1024 * 1024;

export function obtenerExtension(nombre) {
  const match = String(nombre ?? "").match(/(\.[a-z0-9]{2,5})$/i);
  return match ? match[1].toLowerCase() : "";
}

export function esTipoDocumentoPermitido(archivo) {
  const type = String(archivo?.type ?? "").toLowerCase();
  if (ALLOWED_MIME.has(type)) return true;
  return ALLOWED_EXT.has(obtenerExtension(archivo?.name));
}

export function sanitizarNombreArchivo(nombre) {
  return String(nombre ?? "")
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

export function mimeDesdeNombre(nombre) {
  const ext = obtenerExtension(nombre);
  const map = {
    ".pdf": "application/pdf",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext] || "application/octet-stream";
}
