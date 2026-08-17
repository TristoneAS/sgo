export function etiquetasDoble(fuente) {
  return {
    etiqueta1: String(fuente?.etiqueta_1 || "Bud").trim() || "Bud",
    etiqueta2: String(fuente?.etiqueta_2 || "Act").trim() || "Act",
  };
}

export function emptyDobleValor() {
  return { v1: "", v2: "" };
}

export function isValorDoble(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw.doble === true || ("v1" in raw && "v2" in raw);
  }

  const text = String(raw ?? "").trim();
  if (!text || !text.startsWith("{")) return false;

  try {
    const parsed = JSON.parse(text);
    return Boolean(
      parsed &&
        typeof parsed === "object" &&
        (parsed.doble === true || ("v1" in parsed && "v2" in parsed)),
    );
  } catch {
    return false;
  }
}

export function parseDobleValor(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return {
      v1: String(raw.v1 ?? ""),
      v2: String(raw.v2 ?? ""),
    };
  }

  const text = String(raw ?? "").trim();
  if (!text) return emptyDobleValor();

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return {
        v1: String(parsed.v1 ?? parsed.bud ?? parsed.a ?? ""),
        v2: String(parsed.v2 ?? parsed.act ?? parsed.b ?? ""),
      };
    }
  } catch {
    /* plain */
  }

  if (text.includes("|")) {
    const [a = "", b = ""] = text.split("|");
    return { v1: a, v2: b };
  }

  return { v1: text, v2: "" };
}

export function serializeDobleValor(valor) {
  const parsed = parseDobleValor(valor);
  return JSON.stringify({
    doble: true,
    v1: parsed.v1,
    v2: parsed.v2,
  });
}

export function valorCeldaParaEditar(esDoble, raw) {
  if (esDoble || isValorDoble(raw)) return parseDobleValor(raw);
  return typeof raw === "string" ? raw : String(raw ?? "");
}

export function valorCeldaParaGuardar(esDoble, valor) {
  if (esDoble) return serializeDobleValor(valor);
  if (valor && typeof valor === "object") {
    return String(valor.v1 ?? "");
  }
  return String(valor ?? "");
}

export function valorEscalar(raw, parte = "v2") {
  if (isValorDoble(raw) || (raw && typeof raw === "object" && "v1" in (raw || {}))) {
    const d = parseDobleValor(raw);
    return String(d[parte] ?? d.v1 ?? "");
  }

  return String(raw ?? "");
}

export function parseColumnasDobles(raw) {
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

export function filaTieneDobles(fila) {
  if (!fila) return false;
  const ids = parseColumnasDobles(fila.columnas_dobles);
  if (ids.length) return true;
  const celdas = fila.celdas || {};
  return Object.values(celdas).some((v) => isValorDoble(v));
}
