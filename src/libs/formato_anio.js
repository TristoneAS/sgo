export function anioActual() {
  return new Date().getFullYear();
}

export function parseAnio(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return null;
  return n;
}

/** Rango alrededor del año actual (+ años que ya tengan datos). */
const ANIOS_ATRAS = 2;
const ANIOS_ADELANTE = 2;

export function buildAnioOptions(aniosDisponibles = [], selected = null) {
  const current = anioActual();
  const set = new Set();

  for (let y = current - ANIOS_ATRAS; y <= current + ANIOS_ADELANTE; y += 1) {
    if (y >= 2000 && y <= 2100) set.add(y);
  }

  for (const raw of aniosDisponibles) {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 2000 && n <= 2100) set.add(n);
  }

  const sel = parseAnio(selected);
  if (sel != null) set.add(sel);

  return Array.from(set).sort((a, b) => b - a);
}
