import { valorEscalar } from "@/libs/doble_valor";

export const OPERADORES = [
  { value: ">", label: "Mayor que (>)" },
  { value: ">=", label: "Mayor o igual (>=)" },
  { value: "<", label: "Menor que (<)" },
  { value: "<=", label: "Menor o igual (<=)" },
  { value: "=", label: "Igual a (=)" },
  { value: "!=", label: "Distinto de (!=)" },
  { value: "contiene", label: "Contiene" },
];

export const COLORES_PRESET = [
  { fondo: "#ef4444", texto: "#ffffff", label: "Rojo" },
  { fondo: "#3b82f6", texto: "#ffffff", label: "Azul" },
  { fondo: "#22c55e", texto: "#ffffff", label: "Verde" },
  { fondo: "#eab308", texto: "#1e293b", label: "Amarillo" },
  { fondo: "#f97316", texto: "#ffffff", label: "Naranja" },
  { fondo: "#a855f7", texto: "#ffffff", label: "Morado" },
];

export function emptyRegla() {
  return {
    operador: ">",
    tipo_fuente: "valor",
    valor_comparacion: "",
    columna_ref_index: "",
    id_columna_ref: null,
    color_fondo: "#ef4444",
    color_texto: "#ffffff",
  };
}

/** Regla de color solo para esta fila/métrica (ej. vs Target). */
export function emptyReglaFila() {
  return {
    operador: ">",
    tipo_fuente: "columna",
    valor_comparacion: "",
    id_columna_ref: "",
    color_fondo: "#ef4444",
    color_texto: "#ffffff",
  };
}

/** Regla Bud/Act: ej. si Act < Bud → pintar Bud */
export function emptyReglaDoble() {
  return {
    operador: "<",
    parte_eval: "v2",
    tipo_fuente: "par",
    valor_comparacion: "",
    parte_estilo: "v1",
    color_fondo: "#ef4444",
    color_texto: "#ffffff",
  };
}

export function parseReglasDobles(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return normalizeReglasDoblesMap(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return normalizeReglasDoblesMap(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeReglasDoblesMap(map) {
  const out = {};
  for (const [key, list] of Object.entries(map || {})) {
    const id = Number(key);
    if (Number.isNaN(id) || !Array.isArray(list)) continue;
    const reglas = list
      .map((regla, index) => normalizeReglaDoble(regla, index))
      .filter(Boolean);
    if (reglas.length) out[id] = reglas;
  }
  return out;
}

function normalizeReglaDoble(regla, index = 0) {
  if (!regla || typeof regla !== "object") return null;
  const operador = String(regla.operador ?? "").trim();
  if (!OPERADORES.some((o) => o.value === operador)) return null;

  const parteEval = regla.parte_eval === "v1" ? "v1" : "v2";
  const parteEstilo =
    regla.parte_estilo === "v2"
      ? "v2"
      : regla.parte_estilo === "ambos"
        ? "ambos"
        : "v1";
  const tipoFuente =
    String(regla.tipo_fuente ?? "par").trim() === "valor" ? "valor" : "par";
  const valor = String(regla.valor_comparacion ?? "").trim();

  if (tipoFuente === "valor" && !valor && operador !== "=" && operador !== "!=") {
    return null;
  }

  return {
    operador,
    parte_eval: parteEval,
    tipo_fuente: tipoFuente,
    valor_comparacion: tipoFuente === "valor" ? valor : "",
    parte_estilo: parteEstilo,
    color_fondo: String(regla.color_fondo ?? "#ef4444").trim() || "#ef4444",
    color_texto: String(regla.color_texto ?? "#ffffff").trim() || "#ffffff",
    orden: Number(regla.orden ?? index + 1) || index + 1,
  };
}

export function serializeReglasDobles(map) {
  return JSON.stringify(normalizeReglasDoblesMap(map || {}));
}

function normalizeReglaFila(regla, index = 0) {
  if (!regla || typeof regla !== "object") return null;
  const operador = String(regla.operador ?? "").trim();
  if (!OPERADORES.some((o) => o.value === operador)) return null;

  const tipoFuente =
    String(regla.tipo_fuente ?? "valor").trim() === "columna"
      ? "columna"
      : "valor";

  const valor = String(regla.valor_comparacion ?? "").trim();
  const refIdRaw = regla.id_columna_ref;
  const refId =
    refIdRaw === "" || refIdRaw == null ? null : Number(refIdRaw);

  if (tipoFuente === "valor" && !valor) return null;
  if (tipoFuente === "columna" && (refId == null || Number.isNaN(refId))) {
    return null;
  }

  return {
    operador,
    tipo_fuente: tipoFuente,
    valor_comparacion: tipoFuente === "valor" ? valor : "",
    id_columna_ref: tipoFuente === "columna" ? refId : null,
    color_fondo: String(regla.color_fondo ?? "#ef4444").trim() || "#ef4444",
    color_texto: String(regla.color_texto ?? "#ffffff").trim() || "#ffffff",
    orden: Number(regla.orden ?? index + 1) || index + 1,
  };
}

function normalizeReglasFilaMap(map) {
  const out = {};
  for (const [key, list] of Object.entries(map || {})) {
    const id = Number(key);
    if (Number.isNaN(id) || !Array.isArray(list)) continue;
    const reglas = list
      .map((regla, index) => normalizeReglaFila(regla, index))
      .filter(Boolean);
    if (reglas.length) out[id] = reglas;
  }
  return out;
}

export function parseReglasFila(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return normalizeReglasFilaMap(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return normalizeReglasFilaMap(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return {};
}

export function serializeReglasFila(map) {
  return JSON.stringify(normalizeReglasFilaMap(map || {}));
}

export function emptyColumna() {
  return {
    titulo: "",
    tipo_dato: "texto",
    promedio_columnas_indices: [],
    reglas: [],
  };
}

function toNumber(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

/** True si el valor de comparación de una regla es numérico. */
export function esValorNumerico(value) {
  return !Number.isNaN(toNumber(value));
}

/**
 * Al llenar: solo números si la columna es tipo "numero"
 * o si alguna regla compara contra un valor numérico fijo.
 */
export function columnaRequiereNumero(columna) {
  if (String(columna?.tipo_dato ?? "").trim() === "numero") return true;

  const reglas = Array.isArray(columna?.reglas) ? columna.reglas : [];
  for (const regla of reglas) {
    const tipoFuente = regla?.tipo_fuente || "valor";
    if (tipoFuente === "valor" && esValorNumerico(regla?.valor_comparacion)) {
      return true;
    }
  }

  return false;
}

/** Deja solo dígitos, un signo inicial y un separador decimal. */
export function sanitizeNumeroInput(raw) {
  let s = String(raw ?? "").replace(/[^\d.,\-]/g, "");
  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");
  s = s.replace(",", ".");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s =
      s.slice(0, firstDot + 1) +
      s.slice(firstDot + 1).replace(/\./g, "");
  }
  return (negative ? "-" : "") + s;
}

export function getValorComparacion(regla, valoresPorColumna = {}) {
  if (regla?.tipo_fuente === "columna") {
    const refId = regla.id_columna_ref;
    if (refId == null || refId === "") return "";
    const raw =
      valoresPorColumna[refId] ??
      valoresPorColumna[String(refId)] ??
      valoresPorColumna[Number(refId)];
    return valorEscalar(raw, "v2");
  }
  return String(regla?.valor_comparacion ?? "").trim();
}

export function cumpleRegla(valorCelda, regla, valoresPorColumna = {}) {
  const operador = regla.operador;
  const esperado = getValorComparacion(regla, valoresPorColumna);
  const actual = String(valorCelda ?? "").trim();

  if (regla?.tipo_fuente === "columna") {
    if (regla.id_columna_ref == null || regla.id_columna_ref === "") {
      return false;
    }
  } else if (!esperado && operador !== "=" && operador !== "!=") {
    return false;
  }

  if (operador === "contiene") {
    return actual.toLowerCase().includes(esperado.toLowerCase());
  }

  const numActual = toNumber(actual);
  const numEsperado = toNumber(esperado);
  const bothNumeric =
    !Number.isNaN(numActual) && !Number.isNaN(numEsperado);

  if (bothNumeric) {
    switch (operador) {
      case ">":
        return numActual > numEsperado;
      case ">=":
        return numActual >= numEsperado;
      case "<":
        return numActual < numEsperado;
      case "<=":
        return numActual <= numEsperado;
      case "=":
        return numActual === numEsperado;
      case "!=":
        return numActual !== numEsperado;
      default:
        return false;
    }
  }

  const a = actual.toLowerCase();
  const b = esperado.toLowerCase();

  switch (operador) {
    case "=":
      return a === b;
    case "!=":
      return a !== b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    default:
      return false;
  }
}

export function getEstiloPorReglas(
  valorCelda,
  reglas = [],
  valoresPorColumna = {},
) {
  if (!Array.isArray(reglas) || !reglas.length) return null;

  const ordenadas = [...reglas].sort(
    (a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0),
  );

  for (const regla of ordenadas) {
    if (cumpleRegla(valorCelda, regla, valoresPorColumna)) {
      return {
        backgroundColor: regla.color_fondo || "#ef4444",
        color: regla.color_texto || "#ffffff",
      };
    }
  }

  return null;
}

/**
 * Estilo de celda simple: reglas de esta fila tienen prioridad
 * sobre las reglas globales de la columna.
 */
export function getEstiloCelda(
  valorCelda,
  reglasColumna = [],
  valoresPorColumna = {},
  reglasFila = [],
) {
  const estiloFila = getEstiloPorReglas(
    valorCelda,
    reglasFila,
    valoresPorColumna,
  );
  if (estiloFila) return estiloFila;
  return getEstiloPorReglas(valorCelda, reglasColumna, valoresPorColumna);
}

function valorParteDoble(doble, parte) {
  const d = doble && typeof doble === "object" ? doble : { v1: "", v2: "" };
  return String(d[parte] ?? "").trim();
}

export function cumpleReglaDoble(doble, regla) {
  if (!regla) return false;

  const parteEval = regla.parte_eval === "v1" ? "v1" : "v2";
  const actual = valorParteDoble(doble, parteEval);
  // Por defecto (y "par"): compara Bud vs Act entre sí
  const esperado =
    regla.tipo_fuente === "valor"
      ? String(regla.valor_comparacion ?? "").trim()
      : valorParteDoble(doble, parteEval === "v1" ? "v2" : "v1");

  if (regla.tipo_fuente !== "valor" && !esperado && !actual) {
    return false;
  }

  return cumpleRegla(actual, {
    operador: regla.operador,
    tipo_fuente: "valor",
    valor_comparacion: esperado,
  });
}

/** Estilo de una mitad Bud/Act según reglas de la fila. */
export function getEstiloParteDoble(parte, doble, reglasDoble = []) {
  if (!Array.isArray(reglasDoble) || !reglasDoble.length) return null;

  const ordenadas = [...reglasDoble].sort(
    (a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0),
  );

  for (const regla of ordenadas) {
    const aplica =
      regla.parte_estilo === "ambos" || regla.parte_estilo === parte;
    if (!aplica) continue;
    if (cumpleReglaDoble(doble, regla)) {
      return {
        backgroundColor: regla.color_fondo || "#ef4444",
        color: regla.color_texto || "#ffffff",
      };
    }
  }

  return null;
}

/**
 * Estilo Bud/Act: Bud y Act se comparan entre sí con reglas_dobles.
 * No hereda reglas de columna ni de fila (Target); ambas partes
 * empiezan sin color y solo se pinta la parte elegida (parte_estilo).
 */
export function getEstiloCeldaDoble(
  parte,
  doble,
  _reglasColumna = [],
  _valoresPorColumna = {},
  reglasDoble = [],
) {
  return getEstiloParteDoble(parte, doble, reglasDoble);
}

export function normalizeColumnasPayload(columnas) {
  if (!Array.isArray(columnas)) return [];

  return columnas
    .map((col, index) => {
      if (typeof col === "string") {
        const titulo = col.trim();
        if (!titulo) return null;
        return {
          titulo,
          tipo_dato: "texto",
          orden: index + 1,
          promedio_columnas_indices: [],
          reglas: [],
        };
      }

      const titulo = String(col?.titulo ?? "").trim();
      if (!titulo) return null;

      const tipo =
        String(col?.tipo_dato ?? "texto").trim() === "numero"
          ? "numero"
          : "texto";

      const promedioIndices = Array.isArray(col?.promedio_columnas_indices)
        ? col.promedio_columnas_indices
            .map(Number)
            .filter((n) => !Number.isNaN(n))
        : Array.isArray(col?.promedio_columnas)
          ? []
          : [];

      const reglas = Array.isArray(col?.reglas)
        ? col.reglas
            .map((regla, rIndex) => {
              const operador = String(regla?.operador ?? "").trim();
              const validOps = OPERADORES.map((o) => o.value);
              if (!validOps.includes(operador)) return null;

              const tipoFuente =
                String(regla?.tipo_fuente ?? "valor").trim() === "columna"
                  ? "columna"
                  : "valor";

              const valor = String(regla?.valor_comparacion ?? "").trim();
              const refIndexRaw = regla?.columna_ref_index;
              const refIndex =
                refIndexRaw === "" || refIndexRaw == null
                  ? null
                  : Number(refIndexRaw);
              const refIdRaw = regla?.id_columna_ref;
              const refId =
                refIdRaw === "" || refIdRaw == null ? null : Number(refIdRaw);

              if (tipoFuente === "valor" && !valor) return null;
              if (
                tipoFuente === "columna" &&
                (refIndex == null || Number.isNaN(refIndex)) &&
                (refId == null || Number.isNaN(refId))
              ) {
                return null;
              }

              return {
                operador,
                tipo_fuente: tipoFuente,
                valor_comparacion: tipoFuente === "valor" ? valor : "",
                columna_ref_index:
                  tipoFuente === "columna" &&
                  refIndex != null &&
                  !Number.isNaN(refIndex)
                    ? refIndex
                    : null,
                id_columna_ref:
                  tipoFuente === "columna" &&
                  refId != null &&
                  !Number.isNaN(refId)
                    ? refId
                    : null,
                color_fondo: String(regla?.color_fondo ?? "#ef4444").trim(),
                color_texto: String(regla?.color_texto ?? "#ffffff").trim(),
                orden: rIndex + 1,
              };
            })
            .filter(Boolean)
        : [];

      const idColumnaRaw =
        col?.id_columna != null && col?.id_columna !== ""
          ? Number(col.id_columna)
          : null;

      return {
        id_columna:
          idColumnaRaw != null && !Number.isNaN(idColumnaRaw)
            ? idColumnaRaw
            : null,
        titulo,
        tipo_dato: tipo,
        orden: index + 1,
        promedio_columnas_indices: promedioIndices,
        reglas,
      };
    })
    .filter(Boolean);
}
