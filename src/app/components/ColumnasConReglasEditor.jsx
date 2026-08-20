"use client";

import {
  COLORES_PRESET,
  emptyColumna,
  emptyRegla,
  OPERADORES,
} from "@/libs/conditional_rules";
import {
  isColumnaYtd,
  MAX_COLUMNAS_PROMEDIO,
} from "@/libs/ytd_promedio";
import styles from "@/app/dashboard/dashboard.module.css";

export default function ColumnasConReglasEditor({ columnas, onChange }) {
  function updateColumna(index, patch) {
    onChange(columnas.map((col, i) => (i === index ? { ...col, ...patch } : col)));
  }

  function addColumna() {
    onChange([...columnas, emptyColumna()]);
  }

  function removeColumna(index) {
    if (columnas.length <= 1) return;
    onChange(
      columnas
        .filter((_, i) => i !== index)
        .map((col) => ({
          ...col,
          promedio_columnas_indices: (col.promedio_columnas_indices || [])
            .map((raw) => Number(raw))
            .filter((ref) => !Number.isNaN(ref) && ref !== index)
            .map((ref) => (ref > index ? ref - 1 : ref)),
          reglas: (col.reglas || []).map((regla) => {
            if (regla.tipo_fuente !== "columna") return regla;
            const ref = Number(regla.columna_ref_index);
            if (Number.isNaN(ref)) return regla;
            if (ref === index) {
              return { ...regla, columna_ref_index: "", id_columna_ref: null };
            }
            if (ref > index) {
              return { ...regla, columna_ref_index: String(ref - 1) };
            }
            return regla;
          }),
        })),
    );
  }

  function addRegla(colIndex) {
    const col = columnas[colIndex];
    updateColumna(colIndex, {
      reglas: [...(col.reglas || []), emptyRegla()],
    });
  }

  function updateRegla(colIndex, reglaIndex, patch) {
    const col = columnas[colIndex];
    const reglas = (col.reglas || []).map((regla, i) =>
      i === reglaIndex ? { ...regla, ...patch } : regla,
    );
    updateColumna(colIndex, { reglas });
  }

  function removeRegla(colIndex, reglaIndex) {
    const col = columnas[colIndex];
    updateColumna(colIndex, {
      reglas: (col.reglas || []).filter((_, i) => i !== reglaIndex),
    });
  }

  function applyColorPreset(colIndex, reglaIndex, preset) {
    updateRegla(colIndex, reglaIndex, {
      color_fondo: preset.fondo,
      color_texto: preset.texto,
    });
  }

  function togglePromedioFuente(colIndex, fuenteIndex, checked) {
    const col = columnas[colIndex];
    const actual = new Set(
      (col.promedio_columnas_indices || []).map(Number).filter((n) => !Number.isNaN(n)),
    );

    if (checked) {
      if (actual.size >= MAX_COLUMNAS_PROMEDIO) return;
      actual.add(fuenteIndex);
    } else {
      actual.delete(fuenteIndex);
    }

    updateColumna(colIndex, {
      promedio_columnas_indices: [...actual].sort((a, b) => a - b),
    });
  }

  return (
    <div>
      <div className={styles.columnasHeader}>
        <label className={styles.sectionLabel}>Columnas y reglas</label>
      </div>

      <div className={styles.formGrid}>
        {columnas.map((columna, colIndex) => {
          const esYtd = isColumnaYtd(columna.titulo);
          const promedioSet = new Set(
            (columna.promedio_columnas_indices || [])
              .map(Number)
              .filter((n) => !Number.isNaN(n)),
          );

          return (
            <div key={colIndex} className={styles.columnaCard}>
              <div className={styles.columnaRow}>
                <input
                  value={columna.titulo}
                  onChange={(e) =>
                    updateColumna(colIndex, {
                      titulo: e.target.value,
                      ...(isColumnaYtd(e.target.value)
                        ? {}
                        : { promedio_columnas_indices: [] }),
                    })
                  }
                  placeholder={`Columna ${colIndex + 1}`}
                  required
                />
                <select
                  className={styles.tipoSelect}
                  value={columna.tipo_dato || "texto"}
                  onChange={(e) =>
                    updateColumna(colIndex, { tipo_dato: e.target.value })
                  }
                >
                  <option value="texto">Texto</option>
                  <option value="numero">Número</option>
                </select>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => removeColumna(colIndex)}
                  disabled={columnas.length <= 1}
                >
                  ✕
                </button>
              </div>

              {esYtd ? (
                <div className={styles.reglasBlock}>
                  <div className={styles.reglasHeader}>
                    <span>Promedio YTD</span>
                    <span className={styles.reglasHint}>
                      {promedioSet.size}/{MAX_COLUMNAS_PROMEDIO} columnas
                    </span>
                  </div>
                  <p className={styles.reglasHint}>
                    Elige hasta {MAX_COLUMNAS_PROMEDIO} columnas para promediar
                    automáticamente en YTD.
                  </p>
                  <div className={styles.promedioChecks}>
                    {columnas.map((otra, otherIndex) =>
                      otherIndex === colIndex ? null : (
                        <label
                          key={otherIndex}
                          className={styles.promedioCheck}
                        >
                          <input
                            type="checkbox"
                            checked={promedioSet.has(otherIndex)}
                            disabled={
                              !promedioSet.has(otherIndex) &&
                              promedioSet.size >= MAX_COLUMNAS_PROMEDIO
                            }
                            onChange={(e) =>
                              togglePromedioFuente(
                                colIndex,
                                otherIndex,
                                e.target.checked,
                              )
                            }
                          />
                          {otra.titulo?.trim() || `Columna ${otherIndex + 1}`}
                        </label>
                      ),
                    )}
                  </div>
                </div>
              ) : null}

              <div className={styles.reglasBlock}>
                <div className={styles.reglasHeader}>
                  <span>Reglas de color</span>
                  <button
                    type="button"
                    className={styles.addReglaButton}
                    onClick={() => addRegla(colIndex)}
                  >
                    + Agregar regla
                  </button>
                </div>

                {(columna.reglas || []).length === 0 ? (
                  <p className={styles.reglasHint}>
                    Sin reglas. Ej: si valor &gt; edad (otra columna) pintar rojo.
                  </p>
                ) : (
                  <div className={styles.reglasList}>
                    {columna.reglas.map((regla, reglaIndex) => {
                      const tipoFuente = regla.tipo_fuente || "valor";
                      return (
                        <div key={reglaIndex} className={styles.reglaRow}>
                          <span className={styles.reglaSi}>Si</span>
                          <select
                            value={regla.operador}
                            onChange={(e) =>
                              updateRegla(colIndex, reglaIndex, {
                                operador: e.target.value,
                              })
                            }
                          >
                            {OPERADORES.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={tipoFuente}
                            onChange={(e) =>
                              updateRegla(colIndex, reglaIndex, {
                                tipo_fuente: e.target.value,
                                valor_comparacion:
                                  e.target.value === "valor"
                                    ? regla.valor_comparacion || ""
                                    : "",
                                columna_ref_index:
                                  e.target.value === "columna"
                                    ? regla.columna_ref_index || ""
                                    : "",
                              })
                            }
                            title="Comparar contra"
                          >
                            <option value="valor">Valor fijo</option>
                            <option value="columna">Otra columna</option>
                          </select>

                          {tipoFuente === "columna" ? (
                            <select
                              value={
                                regla.columna_ref_index === "" ||
                                regla.columna_ref_index == null
                                  ? ""
                                  : String(regla.columna_ref_index)
                              }
                              onChange={(e) =>
                                updateRegla(colIndex, reglaIndex, {
                                  columna_ref_index: e.target.value,
                                  id_columna_ref: null,
                                })
                              }
                              required
                            >
                              <option value="">Selecciona columna...</option>
                              {columnas.map((otras, otherIndex) =>
                                otherIndex === colIndex ? null : (
                                  <option
                                    key={otherIndex}
                                    value={String(otherIndex)}
                                  >
                                    {otras.titulo?.trim() ||
                                      `Columna ${otherIndex + 1}`}
                                  </option>
                                ),
                              )}
                            </select>
                          ) : (
                            <input
                              value={regla.valor_comparacion}
                              onChange={(e) =>
                                updateRegla(colIndex, reglaIndex, {
                                  valor_comparacion: e.target.value,
                                })
                              }
                              placeholder="Valor"
                              required
                            />
                          )}

                          <div className={styles.colorPresets}>
                            {COLORES_PRESET.map((preset) => (
                              <button
                                key={preset.fondo}
                                type="button"
                                title={preset.label}
                                className={styles.colorSwatch}
                                style={{ background: preset.fondo }}
                                onClick={() =>
                                  applyColorPreset(colIndex, reglaIndex, preset)
                                }
                              />
                            ))}
                          </div>
                          <span
                            className={styles.colorPreview}
                            style={{
                              background: regla.color_fondo,
                              color: regla.color_texto,
                            }}
                          >
                            Aa
                          </span>
                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => removeRegla(colIndex, reglaIndex)}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.secondaryButton}
        onClick={addColumna}
      >
        + Agregar columna
      </button>
    </div>
  );
}
