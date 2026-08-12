"use client";

import {
  COLORES_PRESET,
  emptyColumna,
  emptyRegla,
  OPERADORES,
} from "@/libs/conditional_rules";
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
    onChange(columnas.filter((_, i) => i !== index));
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

  return (
    <div>
      <div className={styles.columnasHeader}>
        <label className={styles.sectionLabel}>Columnas y reglas</label>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={addColumna}
        >
          + Agregar columna
        </button>
      </div>

      <div className={styles.formGrid}>
        {columnas.map((columna, colIndex) => (
          <div key={colIndex} className={styles.columnaCard}>
            <div className={styles.columnaRow}>
              <input
                value={columna.titulo}
                onChange={(e) =>
                  updateColumna(colIndex, { titulo: e.target.value })
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
                  Sin reglas. Ej: si valor &gt; 5 pintar rojo.
                </p>
              ) : (
                <div className={styles.reglasList}>
                  {columna.reglas.map((regla, reglaIndex) => (
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
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
