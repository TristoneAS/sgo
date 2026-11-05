import * as XLSX from "xlsx";
import {
  etiquetasDoble,
  isValorDoble,
  parseColumnasDobles,
  parseDobleValor,
  valorEscalar,
} from "@/libs/doble_valor";
import { valorCeldaConYtd } from "@/libs/ytd_promedio";

function safeFileName(name) {
  const base = String(name || "formato")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return base || "formato";
}

function textoCeldaExport(col, fila) {
  const raw = valorCeldaConYtd(col, fila.celdas || {});
  const dobles = new Set(parseColumnasDobles(fila.columnas_dobles));
  const esDoble =
    (typeof raw === "object" && raw != null) ||
    dobles.has(Number(col.id_columna)) ||
    isValorDoble(raw);

  if (esDoble) {
    const doble = parseDobleValor(raw);
    const labels = etiquetasDoble(fila);
    const v1 = String(doble.v1 ?? "").trim();
    const v2 = String(doble.v2 ?? "").trim();
    if (!v1 && !v2) return "";
    return `${labels.etiqueta1}: ${v1 || "—"} | ${labels.etiqueta2}: ${v2 || "—"}`;
  }

  return String(valorEscalar(raw) ?? "").trim();
}

/**
 * Exporta filas de un formato a un archivo .xlsx (respeta filtros si se pasan filas filtradas).
 */
export function exportFormatoToExcel({
  nombre = "formato",
  columnas = [],
  filas = [],
} = {}) {
  const headers = ["#", ...columnas.map((col) => String(col.titulo || ""))];
  const rows = filas.map((fila, index) => [
    index + 1,
    ...columnas.map((col) => textoCeldaExport(col, fila)),
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((title, i) => {
    if (i === 0) return { wch: 4 };
    const len = String(title || "").length;
    return { wch: Math.min(40, Math.max(12, len + 2)) };
  });

  const workbook = XLSX.utils.book_new();
  const sheetName = safeFileName(nombre).slice(0, 31) || "Formato";
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${safeFileName(nombre)}_${stamp}.xlsx`);
}
