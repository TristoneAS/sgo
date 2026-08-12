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
    valor_comparacion: "",
    color_fondo: "#ef4444",
    color_texto: "#ffffff",
  };
}

export function emptyColumna() {
  return {
    titulo: "",
    tipo_dato: "texto",
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

export function cumpleRegla(valorCelda, regla) {
  const operador = regla.operador;
  const esperado = String(regla.valor_comparacion ?? "").trim();
  const actual = String(valorCelda ?? "").trim();

  if (!esperado && operador !== "=" && operador !== "!=") {
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

export function getEstiloPorReglas(valorCelda, reglas = []) {
  if (!Array.isArray(reglas) || !reglas.length) return null;

  const ordenadas = [...reglas].sort(
    (a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0),
  );

  for (const regla of ordenadas) {
    if (cumpleRegla(valorCelda, regla)) {
      return {
        backgroundColor: regla.color_fondo || "#ef4444",
        color: regla.color_texto || "#ffffff",
      };
    }
  }

  return null;
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
          reglas: [],
        };
      }

      const titulo = String(col?.titulo ?? "").trim();
      if (!titulo) return null;

      const tipo =
        String(col?.tipo_dato ?? "texto").trim() === "numero"
          ? "numero"
          : "texto";

      const reglas = Array.isArray(col?.reglas)
        ? col.reglas
            .map((regla, rIndex) => {
              const operador = String(regla?.operador ?? "").trim();
              const valor = String(regla?.valor_comparacion ?? "").trim();
              const validOps = OPERADORES.map((o) => o.value);
              if (!validOps.includes(operador) || !valor) return null;
              return {
                operador,
                valor_comparacion: valor,
                color_fondo: String(regla?.color_fondo ?? "#ef4444").trim(),
                color_texto: String(regla?.color_texto ?? "#ffffff").trim(),
                orden: rIndex + 1,
              };
            })
            .filter(Boolean)
        : [];

      return {
        titulo,
        tipo_dato: tipo,
        orden: index + 1,
        reglas,
      };
    })
    .filter(Boolean);
}
