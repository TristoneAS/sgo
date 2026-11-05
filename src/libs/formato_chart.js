import {
  etiquetasDoble,
  isValorDoble,
  parseColumnasDobles,
  parseDobleValor,
  valorEscalar,
} from "@/libs/doble_valor";
import { isColumnaYtd, valorCeldaConYtd } from "@/libs/ytd_promedio";

const MES_ALIASES = {
  ENERO: 0,
  ENE: 0,
  JANUARY: 0,
  JAN: 0,
  FEBRERO: 1,
  FEB: 1,
  FEBRUARY: 1,
  MARZO: 2,
  MAR: 2,
  MARCH: 2,
  ABRIL: 3,
  ABR: 3,
  APRIL: 3,
  APR: 3,
  MAYO: 4,
  MAY: 4,
  JUNIO: 5,
  JUN: 5,
  JUNE: 5,
  JULIO: 6,
  JUL: 6,
  JULY: 6,
  AGOSTO: 7,
  AGO: 7,
  AUGUST: 7,
  AUG: 7,
  SEPTIEMBRE: 8,
  SETIEMBRE: 8,
  SEP: 8,
  SEPT: 8,
  SEPTEMBER: 8,
  OCTUBRE: 9,
  OCT: 9,
  OCTOBER: 9,
  NOVIEMBRE: 10,
  NOV: 10,
  NOVEMBER: 10,
  DICIEMBRE: 11,
  DIC: 11,
  DECEMBER: 11,
  DEC: 11,
};

const MES_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function normalizeTitulo(titulo) {
  return String(titulo ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parseMesTitulo(titulo) {
  const raw = normalizeTitulo(titulo);
  if (!raw || raw === "YTD") return null;

  if (Object.prototype.hasOwnProperty.call(MES_ALIASES, raw)) {
    return MES_ALIASES[raw];
  }

  const token = raw.split(/[\s\-_./]+/)[0];
  if (Object.prototype.hasOwnProperty.call(MES_ALIASES, token)) {
    return MES_ALIASES[token];
  }

  return null;
}

export function formatoSoportaGraficas(columnas = []) {
  return getColumnasEjeX(columnas).length >= 2;
}

/**
 * Columnas del eje X: meses en orden calendario + YTD al final si existe.
 */
export function getColumnasEjeX(columnas = []) {
  const meses = [];
  let ytd = null;

  for (const col of columnas) {
    if (isColumnaYtd(col.titulo)) {
      ytd = col;
      continue;
    }
    const mes = parseMesTitulo(col.titulo);
    if (mes == null) continue;
    meses.push({ col, mes });
  }

  meses.sort((a, b) => a.mes - b.mes || Number(a.col.orden) - Number(b.col.orden));

  const out = meses.map(({ col, mes }) => ({
    col,
    key: String(col.id_columna),
    label: MES_LABELS[mes] || String(col.titulo || "").trim() || `M${mes + 1}`,
    esYtd: false,
  }));

  if (ytd) {
    out.push({
      col: ytd,
      key: String(ytd.id_columna),
      label: "YTD",
      esYtd: true,
    });
  }

  return out;
}

function toNumberOrNull(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (cleaned === "" || cleaned === "—") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function celdaEsDoble(col, fila, raw) {
  const dobles = new Set(parseColumnasDobles(fila.columnas_dobles));
  return (
    (typeof raw === "object" && raw != null) ||
    dobles.has(Number(col.id_columna)) ||
    isValorDoble(raw)
  );
}

function textoCelda(col, fila) {
  const raw = valorCeldaConYtd(col, fila.celdas || {});
  if (celdaEsDoble(col, fila, raw)) {
    const d = parseDobleValor(raw);
    return String(d.v1 || d.v2 || "").trim();
  }
  return String(valorEscalar(raw) ?? "").trim();
}

const META_CAMPOS = [
  { key: "metrico", aliases: ["METRICO", "METRICA", "METRIC", "KPI"] },
  { key: "objetivo", aliases: ["OBJETIVO", "TARGET", "META"] },
  {
    key: "responsable",
    aliases: ["RESPONSABLE", "OWNER", "ENCARGADO"],
  },
];

/**
 * Extrae Métrico / Objetivo / Responsable (por título de columna) para la leyenda.
 * `objetivoValor` es el número parseado (si se puede) para la línea de referencia.
 */
export function metaRenglonGrafica(fila, columnas = []) {
  const meta = {
    metrico: "",
    objetivo: "",
    objetivoValor: null,
    responsable: "",
  };

  for (const col of columnas) {
    const titulo = normalizeTitulo(col.titulo);
    if (!titulo) continue;
    const campo = META_CAMPOS.find((m) => m.aliases.includes(titulo));
    if (!campo || meta[campo.key]) continue;
    const text = textoCelda(col, fila);
    if (text) meta[campo.key] = text;
  }

  meta.objetivoValor = toNumberOrNull(meta.objetivo);
  return meta;
}

/**
 * Título legible del renglón: Métrico, o primera columna no-mes/no-YTD.
 */
export function tituloRenglonGrafica(fila, columnas = [], index = 0) {
  const meta = metaRenglonGrafica(fila, columnas);
  if (meta.metrico) return meta.metrico;

  const ejeIds = new Set(
    getColumnasEjeX(columnas).map((c) => Number(c.col.id_columna)),
  );
  for (const col of columnas) {
    if (ejeIds.has(Number(col.id_columna))) continue;
    const text = textoCelda(col, fila);
    if (text) return text;
  }
  return `Renglón ${index + 1}`;
}

/**
 * Serie(s) para graficar un renglón de Enero→YTD.
 */
export function buildSerieRenglon(fila, columnas = [], index = 0) {
  const eje = getColumnasEjeX(columnas);
  const labels = etiquetasDoble(fila);
  const meta = metaRenglonGrafica(fila, columnas);
  let dual = false;

  const points = eje.map(({ col, label }) => {
    const raw = valorCeldaConYtd(col, fila.celdas || {});
    const esDoble = celdaEsDoble(col, fila, raw);

    if (esDoble) {
      dual = true;
      const d = parseDobleValor(raw);
      return {
        label,
        v1: toNumberOrNull(d.v1),
        v2: toNumberOrNull(d.v2),
        valor: null,
      };
    }

    const valor = toNumberOrNull(valorEscalar(raw));
    return {
      label,
      v1: null,
      v2: null,
      valor,
    };
  });

  if (!dual) {
    dual = points.some((p) => p.v1 != null || p.v2 != null);
  }

  return {
    id: fila.id_fila,
    title: tituloRenglonGrafica(fila, columnas, index),
    meta,
    dual,
    etiqueta1: labels.etiqueta1,
    etiqueta2: labels.etiqueta2,
    points,
  };
}
