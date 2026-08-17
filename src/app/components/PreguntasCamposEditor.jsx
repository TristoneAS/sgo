"use client";

import {
  COLORES_PRESET,
  getEstiloCeldaDoble,
  getEstiloPorReglas,
  OPERADORES,
} from "@/libs/conditional_rules";
import {
  emptyDobleValor,
  parseDobleValor,
  valorEscalar,
} from "@/libs/doble_valor";
import {
  calcularPromedioYtd,
  isColumnaYtd,
} from "@/libs/ytd_promedio";
import styles from "@/app/dashboard/dashboard.module.css";

export default function PreguntasCamposEditor({
  columnas,
  respuestas,
  columnasDobles,
  reglasDobles,
  etiqueta1,
  etiqueta2,
  onChange,
  onDobleChange,
  onToggleDoble,
  onAddReglaDoble,
  onUpdateReglaDoble,
  onRemoveReglaDoble,
  onEtiqueta1Change,
  onEtiqueta2Change,
  idPrefix = "q",
}) {
  const labelsForm = {
    etiqueta1: etiqueta1 || "Bud",
    etiqueta2: etiqueta2 || "Act",
  };

  return (
    <>
      {columnasDobles.size > 0 ? (
        <div className={styles.filaDobleBar}>
          <span className={styles.reglasHint}>
            Etiquetas para columnas dobles:
          </span>
          <div className={styles.dobleLabels}>
            <input
              value={etiqueta1}
              onChange={(e) => onEtiqueta1Change(e.target.value)}
              placeholder="Etiqueta 1"
            />
            <input
              value={etiqueta2}
              onChange={(e) => onEtiqueta2Change(e.target.value)}
              placeholder="Etiqueta 2"
            />
          </div>
        </div>
      ) : null}

      <div className={styles.preguntasList}>
        {columnas.map((col, index) => {
          const esYtd = isColumnaYtd(col.titulo);
          const esDoble = columnasDobles.has(Number(col.id_columna));
          const valor = respuestas[col.id_columna];
          const ytdCalc = esYtd
            ? calcularPromedioYtd(respuestas, col.promedio_columnas || [])
            : null;
          const ytdEsDoble = esYtd && ytdCalc && typeof ytdCalc === "object";

          return (
            <div key={col.id_columna} className={styles.preguntaItem}>
              <div className={styles.preguntaItemHeader}>
                <label htmlFor={`${idPrefix}-${col.id_columna}`}>
                  <span className={styles.preguntaNumero}>{index + 1}.</span>{" "}
                  {col.titulo}
                  {esYtd ? (
                    <span className={styles.ytdBadge}>Promedio auto</span>
                  ) : null}
                </label>
                {!esYtd ? (
                  <label className={styles.dobleCheck}>
                    <input
                      type="checkbox"
                      checked={esDoble}
                      onChange={(e) =>
                        onToggleDoble(col.id_columna, e.target.checked)
                      }
                    />
                    Doble
                  </label>
                ) : (
                  <span className={styles.reglasHint}>
                    {(col.promedio_columnas || []).length} columnas
                  </span>
                )}
              </div>

              {esYtd ? (
                ytdEsDoble ? (
                  <div className={styles.dobleInputs}>
                    <div className={styles.dobleInputRow}>
                      <span className={styles.dobleLabel}>
                        {labelsForm.etiqueta1}
                      </span>
                      <input
                        className={styles.preguntaInput}
                        value={ytdCalc.v1 || ""}
                        readOnly
                        style={
                          getEstiloPorReglas(
                            ytdCalc.v1,
                            col.reglas,
                            respuestas,
                          ) || undefined
                        }
                      />
                    </div>
                    <div className={styles.dobleInputRow}>
                      <span className={styles.dobleLabel}>
                        {labelsForm.etiqueta2}
                      </span>
                      <input
                        className={styles.preguntaInput}
                        value={ytdCalc.v2 || ""}
                        readOnly
                        style={
                          getEstiloPorReglas(
                            ytdCalc.v2,
                            col.reglas,
                            respuestas,
                          ) || undefined
                        }
                      />
                    </div>
                    <p className={styles.reglasHint}>
                      Se calcula solo; no se edita manualmente.
                    </p>
                  </div>
                ) : (
                  <>
                    <input
                      id={`${idPrefix}-${col.id_columna}`}
                      className={styles.preguntaInput}
                      value={ytdCalc || ""}
                      readOnly
                      placeholder={
                        (col.promedio_columnas || []).length
                          ? "Promedio automático"
                          : "Configura columnas YTD en el formato"
                      }
                      style={
                        getEstiloPorReglas(
                          ytdCalc || "",
                          col.reglas,
                          respuestas,
                        ) || undefined
                      }
                    />
                    <p className={styles.reglasHint}>
                      Se calcula solo; no se edita manualmente.
                    </p>
                  </>
                )
              ) : esDoble ? (
                <div className={styles.dobleInputs}>
                  <div className={styles.dobleInputRow}>
                    <span className={styles.dobleLabel}>
                      {labelsForm.etiqueta1}
                    </span>
                    <input
                      className={styles.preguntaInput}
                      value={parseDobleValor(valor || emptyDobleValor()).v1}
                      onChange={(e) =>
                        onDobleChange(col.id_columna, "v1", e.target.value)
                      }
                      placeholder={labelsForm.etiqueta1}
                      style={
                        getEstiloCeldaDoble(
                          "v1",
                          parseDobleValor(valor),
                          col.reglas,
                          respuestas,
                          reglasDobles[Number(col.id_columna)] || [],
                        ) || undefined
                      }
                    />
                  </div>
                  <div className={styles.dobleInputRow}>
                    <span className={styles.dobleLabel}>
                      {labelsForm.etiqueta2}
                    </span>
                    <input
                      className={styles.preguntaInput}
                      value={parseDobleValor(valor || emptyDobleValor()).v2}
                      onChange={(e) =>
                        onDobleChange(col.id_columna, "v2", e.target.value)
                      }
                      placeholder={labelsForm.etiqueta2}
                      style={
                        getEstiloCeldaDoble(
                          "v2",
                          parseDobleValor(valor),
                          col.reglas,
                          respuestas,
                          reglasDobles[Number(col.id_columna)] || [],
                        ) || undefined
                      }
                    />
                  </div>

                  <div className={styles.reglasDobleBlock}>
                    <div className={styles.reglasHeader}>
                      <span>Reglas de color Bud/Act</span>
                      <button
                        type="button"
                        className={styles.addReglaButton}
                        onClick={() => onAddReglaDoble(col.id_columna)}
                      >
                        + Regla
                      </button>
                    </div>
                    {(reglasDobles[Number(col.id_columna)] || []).length ===
                    0 ? (
                      <p className={styles.reglasHint}>
                        Ej: si {labelsForm.etiqueta2} &lt;{" "}
                        {labelsForm.etiqueta1} → pintar {labelsForm.etiqueta1}{" "}
                        de rojo.
                      </p>
                    ) : (
                      <div className={styles.reglasList}>
                        {(reglasDobles[Number(col.id_columna)] || []).map(
                          (regla, reglaIndex) => {
                            const tipoFuente = regla.tipo_fuente || "par";
                            return (
                              <div
                                key={reglaIndex}
                                className={styles.reglaDobleRow}
                              >
                                <span className={styles.reglaSi}>Si</span>
                                <select
                                  value={regla.parte_eval || "v2"}
                                  onChange={(e) =>
                                    onUpdateReglaDoble(
                                      col.id_columna,
                                      reglaIndex,
                                      { parte_eval: e.target.value },
                                    )
                                  }
                                >
                                  <option value="v1">
                                    {labelsForm.etiqueta1}
                                  </option>
                                  <option value="v2">
                                    {labelsForm.etiqueta2}
                                  </option>
                                </select>
                                <select
                                  value={regla.operador}
                                  onChange={(e) =>
                                    onUpdateReglaDoble(
                                      col.id_columna,
                                      reglaIndex,
                                      { operador: e.target.value },
                                    )
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
                                    onUpdateReglaDoble(
                                      col.id_columna,
                                      reglaIndex,
                                      {
                                        tipo_fuente: e.target.value,
                                        valor_comparacion:
                                          e.target.value === "valor"
                                            ? regla.valor_comparacion || ""
                                            : "",
                                      },
                                    )
                                  }
                                >
                                  <option value="par">La otra respuesta</option>
                                  <option value="valor">Valor fijo</option>
                                </select>
                                {tipoFuente === "valor" ? (
                                  <input
                                    value={regla.valor_comparacion || ""}
                                    onChange={(e) =>
                                      onUpdateReglaDoble(
                                        col.id_columna,
                                        reglaIndex,
                                        {
                                          valor_comparacion: e.target.value,
                                        },
                                      )
                                    }
                                    placeholder="Valor"
                                  />
                                ) : (
                                  <span className={styles.reglaParHint}>
                                    {(regla.parte_eval || "v2") === "v1"
                                      ? labelsForm.etiqueta2
                                      : labelsForm.etiqueta1}
                                  </span>
                                )}
                                <span className={styles.reglaSi}>→</span>
                                <select
                                  value={regla.parte_estilo || "v1"}
                                  onChange={(e) =>
                                    onUpdateReglaDoble(
                                      col.id_columna,
                                      reglaIndex,
                                      { parte_estilo: e.target.value },
                                    )
                                  }
                                  title="Pintar"
                                >
                                  <option value="v1">
                                    Pintar {labelsForm.etiqueta1}
                                  </option>
                                  <option value="v2">
                                    Pintar {labelsForm.etiqueta2}
                                  </option>
                                  <option value="ambos">Pintar ambas</option>
                                </select>
                                <div className={styles.colorPresets}>
                                  {COLORES_PRESET.map((preset) => (
                                    <button
                                      key={preset.fondo}
                                      type="button"
                                      title={preset.label}
                                      className={styles.colorSwatch}
                                      style={{ background: preset.fondo }}
                                      onClick={() =>
                                        onUpdateReglaDoble(
                                          col.id_columna,
                                          reglaIndex,
                                          {
                                            color_fondo: preset.fondo,
                                            color_texto: preset.texto,
                                          },
                                        )
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
                                  onClick={() =>
                                    onRemoveReglaDoble(
                                      col.id_columna,
                                      reglaIndex,
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <textarea
                  id={`${idPrefix}-${col.id_columna}`}
                  className={styles.preguntaInput}
                  value={valor ?? ""}
                  onChange={(e) => onChange(col.id_columna, e.target.value)}
                  rows={3}
                  placeholder="Escribe tu respuesta..."
                  style={
                    getEstiloPorReglas(
                      valor ?? "",
                      col.reglas,
                      respuestas,
                    ) || undefined
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function makeToggleColumnaDoble(setColumnasDobles, setReglasDobles, setRespuestas) {
  return function toggleColumnaDoble(columnaId, checked) {
    const id = Number(columnaId);
    setColumnasDobles((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

    if (!checked) {
      setReglasDobles((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    setRespuestas((prev) => {
      const actual = prev[columnaId];
      if (checked) {
        if (actual && typeof actual === "object") {
          return { ...prev, [columnaId]: parseDobleValor(actual) };
        }
        return {
          ...prev,
          [columnaId]: { v1: String(actual ?? ""), v2: "" },
        };
      }
      return {
        ...prev,
        [columnaId]: valorEscalar(actual, "v1"),
      };
    });
  };
}
