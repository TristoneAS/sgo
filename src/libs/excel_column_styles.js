function normalizeTitle(titulo) {
  return String(titulo ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const CHARS_PER_VERTICAL_LINE = 16;
const LINE_WIDTH_PX = 14;

function getVerticalWidth(titulo) {
  const raw = String(titulo ?? "").trim();
  const t = normalizeTitle(raw);
  const lines = Math.max(1, Math.ceil(raw.length / CHARS_PER_VERTICAL_LINE));
  const wrapWidth = lines * LINE_WIDTH_PX + 12;

  if (/^NO\.?$|^NUM/.test(t)) return Math.max(36, wrapWidth);
  if (/DESCRIPCION/.test(t) && /RIESGO|OPORTUNIDAD/.test(t))
    return Math.max(96, wrapWidth);
  if (/^O\s*[-/]\s*R$|^OR$|^"R/.test(t)) return Math.max(40, wrapWidth);
  if (/EFECTO/.test(t)) return Math.max(88, wrapWidth);
  if (/LIDER/.test(t)) return Math.max(56, wrapWidth);
  if (/PROCESO/.test(t) && !/LIDER/.test(t)) return Math.max(56, wrapWidth);
  if (/SEVERIDAD|EVALUACION DE IMPA|\(S\)/.test(t) && !/NIVEL/.test(t))
    return Math.max(52, wrapWidth);
  if (/PROBABILIDAD|EVALUACION DE PROB|\(O\)/.test(t))
    return Math.max(52, wrapWidth);
  if (/NIVEL/.test(t)) return Math.max(44, wrapWidth);
  if (/CONTINGENCIA/.test(t)) return Math.max(52, wrapWidth);
  if (/PLAN DE ACCION/.test(t) && !/APLICA/.test(t))
    return Math.max(80, wrapWidth);
  if (/APLICA.*ACCION|APLICA.*CONTINGENCIA/.test(t))
    return Math.max(52, wrapWidth);
  if (/^PIC$|^P\/C$/.test(t)) return Math.max(36, wrapWidth);
  if (/RESPONSABLE/.test(t)) return Math.max(64, wrapWidth);
  if (/FECHA/.test(t)) return Math.max(56, wrapWidth);
  if (/STATUS|ESTATUS/.test(t)) return Math.max(52, wrapWidth);

  return Math.max(48, wrapWidth);
}

function getHorizontalWidth(titulo) {
  const t = normalizeTitle(titulo);

  if (/^NO\.?$|^NUM/.test(t)) return 48;
  if (/DESCRIPCION/.test(t) && /RIESGO|OPORTUNIDAD/.test(t)) return 200;
  if (/^O\s*[-/]\s*R$|^OR$|^"R/.test(t)) return 56;
  if (/EFECTO/.test(t)) return 160;
  if (/LIDER/.test(t)) return 120;
  if (/PROCESO/.test(t) && !/LIDER/.test(t)) return 120;
  if (/SEVERIDAD|EVALUACION DE IMPA|\(S\)/.test(t) && !/NIVEL/.test(t))
    return 90;
  if (/PROBABILIDAD|EVALUACION DE PROB|\(O\)/.test(t)) return 90;
  if (/NIVEL/.test(t)) return 72;
  if (/CONTINGENCIA/.test(t)) return 80;
  if (/PLAN DE ACCION/.test(t) && !/APLICA/.test(t)) return 180;
  if (/APLICA.*ACCION|APLICA.*CONTINGENCIA/.test(t)) return 80;
  if (/^PIC$|^P\/C$/.test(t)) return 48;
  if (/RESPONSABLE/.test(t)) return 110;
  if (/FECHA/.test(t)) return 100;
  if (/STATUS|ESTATUS/.test(t)) return 90;

  const len = String(titulo ?? "").length;
  if (len <= 5) return 64;
  if (len <= 15) return 110;
  if (len <= 30) return 150;
  return 180;
}

export function getColumnWidth(titulo, options = {}) {
  return options.horizontal
    ? getHorizontalWidth(titulo)
    : getVerticalWidth(titulo);
}

export function getTableMinWidth(columnas, options = {}) {
  const columnsWidth = columnas.reduce(
    (sum, col) => sum + getColumnWidth(col.titulo, options),
    36,
  );
  return Math.max(columnsWidth, options.horizontal ? 900 : 640);
}
