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

export function getValorComparacion(regla, valoresPorColumna = {}) {
  if (regla?.tipo_fuente === "columna") {
    const refId = regla.id_columna_ref;
    if (refId == null || refId === "") return "";
    return valorEscalar(valoresPorColumna[refId], "v2");
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

function valorParteDoble(doble, parte) {
  const d = doble && typeof doble === "object" ? doble : { v1: "", v2: "" };
  return String(d[parte] ?? "").trim();
}

export function cumpleReglaDoble(doble, regla) {
  if (!regla) return false;

  const parteEval = regla.parte_eval === "v1" ? "v1" : "v2";
  const actual = valorParteDoble(doble, parteEval);
  const esperado =
    regla.tipo_fuente === "valor"
      ? String(regla.valor_comparacion ?? "").trim()
      : valorParteDoble(doble, parteEval === "v1" ? "v2" : "v1");

  return cumpleRegla(actual, {
    ...regla,
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
 * Combina reglas de columna + reglas Bud/Act de la fila.
 * Las de Bud/Act tienen prioridad sobre las de columna.
 */
export function getEstiloCeldaDoble(
  parte,
  doble,
  reglasColumna = [],
  valoresPorColumna = {},
  reglasDoble = [],
) {
  const estiloDoble = getEstiloParteDoble(parte, doble, reglasDoble);
  if (estiloDoble) return estiloDoble;

  const valor = valorParteDoble(doble, parte);
  return getEstiloPorReglas(valor, reglasColumna, valoresPorColumna);
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
