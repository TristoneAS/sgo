import {
  isValorDoble,
  parseDobleValor,
  serializeDobleValor,
  valorEscalar,
} from "@/libs/doble_valor";

export const MAX_COLUMNAS_PROMEDIO = 12;

export function isColumnaYtd(titulo) {
  return String(titulo ?? "")
    .trim()
    .toUpperCase() === "YTD";
}

export function parsePromedioColumnas(raw) {
  if (Array.isArray(raw)) {
    return raw.map(Number).filter((n) => !Number.isNaN(n));
  }
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter((n) => !Number.isNaN(n));
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function normalizePromedioIndices(indices, columnasLength, selfIndex) {
  if (!Array.isArray(indices)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of indices) {
    const idx = Number(raw);
    if (Number.isNaN(idx)) continue;
    if (idx < 0 || idx >= columnasLength) continue;
    if (idx === selfIndex) continue;
    if (seen.has(idx)) continue;
    seen.add(idx);
    out.push(idx);
    if (out.length >= MAX_COLUMNAS_PROMEDIO) break;
  }
  return out;
}

function toNumber(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

function formatPromedio(nums) {
  if (!nums.length) return "";
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (Number.isInteger(avg)) return String(avg);
  return String(Math.round(avg * 100) / 100);
}

function numerosParte(valoresPorColumna, ids, parte) {
  const nums = [];
  for (const id of ids) {
    const raw = valoresPorColumna?.[id];
    if (raw == null || raw === "") continue;

    let text;
    if (isValorDoble(raw) || (raw && typeof raw === "object" && "v1" in raw)) {
      text = parseDobleValor(raw)[parte];
    } else if (parte === "v2") {
      // valor simple: solo aporta a Bud/v1; Act queda vacío
      continue;
    } else {
      text = valorEscalar(raw, "v1");
    }

    const n = toNumber(text);
    if (!Number.isNaN(n)) nums.push(n);
  }
  return nums;
}

/**
 * Calcula el promedio YTD a partir de las columnas fuente.
 * Si alguna fuente es doble (Bud/Act), el resultado también es doble.
 */
export function calcularPromedioYtd(valoresPorColumna, idsFuente = []) {
  const ids = parsePromedioColumnas(idsFuente);
  if (!ids.length) return "";

  const algunaDoble = ids.some((id) => isValorDoble(valoresPorColumna?.[id]));
  if (algunaDoble) {
    const v1 = formatPromedio(numerosParte(valoresPorColumna, ids, "v1"));
    const v2 = formatPromedio(numerosParte(valoresPorColumna, ids, "v2"));
    if (!v1 && !v2) return "";
    return { doble: true, v1, v2 };
  }

  return formatPromedio(numerosParte(valoresPorColumna, ids, "v1"));
}

export function promedioYtdParaGuardar(valoresPorColumna, idsFuente = []) {
  const calc = calcularPromedioYtd(valoresPorColumna, idsFuente);
  if (!calc) return "";
  if (typeof calc === "object") return serializeDobleValor(calc);
  return String(calc);
}

export function formatPromedioDisplay(calc) {
  if (!calc) return "";
  if (typeof calc === "object") {
    const d = parseDobleValor(calc);
    return { v1: d.v1, v2: d.v2 };
  }
  return String(calc);
}

/** Valor efectivo de celda: recalcula YTD si aplica. */
export function valorCeldaConYtd(col, celdas = {}) {
  if (isColumnaYtd(col?.titulo) && (col.promedio_columnas || []).length) {
    return calcularPromedioYtd(celdas, col.promedio_columnas);
  }
  return celdas?.[col.id_columna] ?? "";
}
