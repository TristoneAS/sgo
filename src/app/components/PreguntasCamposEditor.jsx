"use client";

import {
  COLORES_PRESET,
  columnaRequiereNumero,
  emptyReglaDoble,
  getEstiloCelda,
  getEstiloCeldaDoble,
  OPERADORES,
  sanitizeNumeroInput,
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

function ReglasFilaEditor({
  columnaId,
  columnas,
  reglas,
  tituloColumna,
  onAdd,
  onUpdate,
  onRemove,
  onCopyATodas,
}) {
  const list = reglas || [];
  const titulo = tituloColumna?.trim() || "esta columna";

  return (
    <div className={`${styles.reglasBlock} ${styles.reglasBlockUnderHeader}`}>
      <div className={styles.reglasHeader}>
        <span>Reglas de color · {titulo}</span>
        <div className={styles.reglasHeaderActions}>
          {list.length > 0 && onCopyATodas ? (
            <button
              type="button"
              className={styles.addReglaButton}
              onClick={() => onCopyATodas(columnaId, columnas)}
              title="Copia estas reglas al resto de columnas de esta fila"
            >
              Copiar a todas
            </button>
          ) : null}
          <button
            type="button"
            className={styles.addReglaButton}
            onClick={() => onAdd(columnaId)}
          >
            + Agregar regla
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className={styles.reglasHint}>
          Ej: si valor &gt; Target → rojo (o verde). Solo para “{titulo}” en
          esta fila.
        </p>
      ) : (
        <div className={styles.reglasList}>
          {list.map((regla, reglaIndex) => {
            const tipoFuente = regla.tipo_fuente || "valor";
            return (
              <div key={reglaIndex} className={styles.reglaRow}>
                <span className={styles.reglaSi}>Si</span>
                <select
                  value={regla.operador}
                  onChange={(e) =>
                    onUpdate(columnaId, reglaIndex, {
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
                    onUpdate(columnaId, reglaIndex, {
                      tipo_fuente: e.target.value,
                      valor_comparacion:
                        e.target.value === "valor"
                          ? regla.valor_comparacion || ""
                          : "",
                      id_columna_ref:
                        e.target.value === "columna"
                          ? regla.id_columna_ref || ""
                          : "",
                    })
                  }
                >
                  <option value="valor">Valor fijo</option>
                  <option value="columna">Otra columna</option>
                </select>

                {tipoFuente === "columna" ? (
                  <select
                    value={
                      regla.id_columna_ref === "" ||
                      regla.id_columna_ref == null
                        ? ""
                        : String(regla.id_columna_ref)
                    }
                    onChange={(e) =>
                      onUpdate(columnaId, reglaIndex, {
                        id_columna_ref: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Selecciona columna...</option>
                    {columnas.map((otra) =>
                      Number(otra.id_columna) === Number(columnaId) ? null : (
                        <option
                          key={otra.id_columna}
                          value={String(otra.id_columna)}
                        >
                          {otra.titulo?.trim() || `Columna ${otra.id_columna}`}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <input
                    value={regla.valor_comparacion || ""}
                    onChange={(e) =>
                      onUpdate(columnaId, reglaIndex, {
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
                        onUpdate(columnaId, reglaIndex, {
                          color_fondo: preset.fondo,
                          color_texto: preset.texto,
                        })
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
                  onClick={() => onRemove(columnaId, reglaIndex)}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PreguntasCamposEditor({
  columnas,
  respuestas,
  columnasDobles,
  reglasDobles,
  reglasFila = {},
  etiqueta1,
  etiqueta2,
  onChange,
  onDobleChange,
  onToggleDoble,
  onAddReglaDoble,
  onUpdateReglaDoble,
  onRemoveReglaDoble,
  onAddReglaFila,
  onUpdateReglaFila,
  onRemoveReglaFila,
  onCopyReglasFilaATodas,
  onEtiqueta1Change,
  onEtiqueta2Change,
  idPrefix = "q",
}) {
  const labelsForm = {
    etiqueta1: etiqueta1 || "Bud",
    etiqueta2: etiqueta2 || "Act",
  };

  function handleValorChange(columnaId, raw, esNumero) {
    onChange(columnaId, esNumero ? sanitizeNumeroInput(raw) : raw);
  }

  function handleDobleValorChange(columnaId, parte, raw, esNumero) {
    onDobleChange(
      columnaId,
      parte,
      esNumero ? sanitizeNumeroInput(raw) : raw,
    );
  }

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
          const esNumero = columnaRequiereNumero(col);
          const valor = respuestas[col.id_columna];
          const ytdCalc = esYtd
            ? calcularPromedioYtd(respuestas, col.promedio_columnas || [])
            : null;
          const ytdEsDoble = esYtd && ytdCalc && typeof ytdCalc === "object";
          const reglasDeFila =
            reglasFila[Number(col.id_columna)] ||
            reglasFila[col.id_columna] ||
            [];

          return (
            <div key={col.id_columna} className={styles.preguntaItem}>
              <div className={styles.preguntaItemHeader}>
                <label htmlFor={`${idPrefix}-${col.id_columna}`}>
                  <span className={styles.preguntaNumero}>{index + 1}.</span>{" "}
                  {col.titulo}
                  {esYtd ? (
                    <span className={styles.ytdBadge}>Promedio auto</span>
                  ) : null}
                  {!esYtd && esNumero ? (
                    <span className={styles.ytdBadge}>Solo números</span>
                  ) : null}
                </label>
                <div className={styles.preguntaItemHeaderRight}>
                  {esYtd ? (
                    <span className={styles.reglasHint}>
                      {(col.promedio_columnas || []).length} columnas
                    </span>
                  ) : null}
                  <label className={styles.dobleCheck}>
                    <input
                      type="checkbox"
                      checked={esDoble || ytdEsDoble}
                      disabled={Boolean(ytdEsDoble)}
                      title={
                        ytdEsDoble
                          ? "YTD es doble porque las columnas fuente son Bud/Act"
                          : undefined
                      }
                      onChange={(e) =>
                        onToggleDoble(col.id_columna, e.target.checked)
                      }
                    />
                    Doble
                  </label>
                </div>
              </div>

              {esDoble || ytdEsDoble ? (
                <div
                  className={`${styles.reglasDobleBlock} ${styles.reglasBlockUnderHeader}`}
                >
                  <div className={styles.reglasHeader}>
                    <span>
                      Reglas Bud/Act · {col.titulo?.trim() || "columna"}
                    </span>
                    <button
                      type="button"
                      className={styles.addReglaButton}
                      onClick={() => onAddReglaDoble(col.id_columna)}
                    >
                      + Agregar regla
                    </button>
                  </div>
                  {(reglasDobles[Number(col.id_columna)] ||
                    reglasDobles[col.id_columna] ||
                    []).length === 0 ? (
                    <p className={styles.reglasHint}>
                      Bud y Act se comparan entre sí. Ej: si{" "}
                      {labelsForm.etiqueta2} &lt; {labelsForm.etiqueta1} →
                      pintar {labelsForm.etiqueta1} de rojo.
                    </p>
                  ) : (
                    <div className={styles.reglasList}>
                      {(
                        reglasDobles[Number(col.id_columna)] ||
                        reglasDobles[col.id_columna] ||
                        []
                      ).map(
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
                                <option value="par">
                                  Comparar entre sí
                                </option>
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
                                  onRemoveReglaDoble(col.id_columna, reglaIndex)
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
              ) : (
                <ReglasFilaEditor
                  columnaId={col.id_columna}
                  columnas={columnas}
                  reglas={reglasDeFila}
                  tituloColumna={col.titulo}
                  onAdd={onAddReglaFila}
                  onUpdate={onUpdateReglaFila}
                  onRemove={onRemoveReglaFila}
                  onCopyATodas={onCopyReglasFilaATodas}
                />
              )}

              {esYtd ? (
                ytdEsDoble || esDoble ? (
                  <div className={styles.dobleInputs}>
                    <div className={styles.dobleInputRow}>
                      <span className={styles.dobleLabel}>
                        {labelsForm.etiqueta1}
                      </span>
                      <input
                        className={styles.preguntaInput}
                        value={
                          ytdEsDoble
                            ? ytdCalc.v1 || ""
                            : typeof ytdCalc === "string"
                              ? ytdCalc
                              : ""
                        }
                        readOnly
                        style={
                          getEstiloCeldaDoble(
                            "v1",
                            ytdEsDoble
                              ? ytdCalc
                              : { v1: ytdCalc || "", v2: "" },
                            col.reglas,
                            respuestas,
                            reglasDobles[Number(col.id_columna)] ||
                              reglasDobles[col.id_columna] ||
                              [],
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
                        value={ytdEsDoble ? ytdCalc.v2 || "" : ""}
                        readOnly
                        style={
                          getEstiloCeldaDoble(
                            "v2",
                            ytdEsDoble
                              ? ytdCalc
                              : { v1: ytdCalc || "", v2: "" },
                            col.reglas,
                            respuestas,
                            reglasDobles[Number(col.id_columna)] ||
                              reglasDobles[col.id_columna] ||
                              [],
                          ) || undefined
                        }
                      />
                    </div>
                    <p className={styles.reglasHint}>
                      Se calcula solo; no se edita manualmente. Puedes agregar
                      reglas Bud/Act arriba.
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
                        getEstiloCelda(
                          ytdCalc || "",
                          col.reglas,
                          respuestas,
                          reglasDeFila,
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
                      type="text"
                      inputMode={esNumero ? "decimal" : "text"}
                      value={parseDobleValor(valor || emptyDobleValor()).v1}
                      onChange={(e) =>
                        handleDobleValorChange(
                          col.id_columna,
                          "v1",
                          e.target.value,
                          esNumero,
                        )
                      }
                      placeholder={
                        esNumero
                          ? `${labelsForm.etiqueta1} (número)`
                          : labelsForm.etiqueta1
                      }
                      style={
                        getEstiloCeldaDoble(
                          "v1",
                          parseDobleValor(valor),
                          col.reglas,
                          respuestas,
                          reglasDobles[Number(col.id_columna)] ||
                            reglasDobles[col.id_columna] ||
                            [],
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
                      type="text"
                      inputMode={esNumero ? "decimal" : "text"}
                      value={parseDobleValor(valor || emptyDobleValor()).v2}
                      onChange={(e) =>
                        handleDobleValorChange(
                          col.id_columna,
                          "v2",
                          e.target.value,
                          esNumero,
                        )
                      }
                      placeholder={
                        esNumero
                          ? `${labelsForm.etiqueta2} (número)`
                          : labelsForm.etiqueta2
                      }
                      style={
                        getEstiloCeldaDoble(
                          "v2",
                          parseDobleValor(valor),
                          col.reglas,
                          respuestas,
                          reglasDobles[Number(col.id_columna)] ||
                            reglasDobles[col.id_columna] ||
                            [],
                        ) || undefined
                      }
                    />
                  </div>
                </div>
              ) : esNumero ? (
                <input
                  id={`${idPrefix}-${col.id_columna}`}
                  className={styles.preguntaInput}
                  type="text"
                  inputMode="decimal"
                  value={valor ?? ""}
                  onChange={(e) =>
                    handleValorChange(col.id_columna, e.target.value, true)
                  }
                  placeholder="Solo números..."
                  style={
                    getEstiloCelda(
                      valor ?? "",
                      col.reglas,
                      respuestas,
                      reglasDeFila,
                    ) || undefined
                  }
                />
              ) : (
                <textarea
                  id={`${idPrefix}-${col.id_columna}`}
                  className={styles.preguntaInput}
                  value={valor ?? ""}
                  onChange={(e) =>
                    handleValorChange(col.id_columna, e.target.value, false)
                  }
                  rows={3}
                  placeholder="Escribe tu respuesta..."
                  style={
                    getEstiloCelda(
                      valor ?? "",
                      col.reglas,
                      respuestas,
                      reglasDeFila,
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

export function makeToggleColumnaDoble(
  setColumnasDobles,
  setReglasDobles,
  setRespuestas,
  setReglasFila,
) {
  return function toggleColumnaDoble(columnaId, checked) {
    const id = Number(columnaId);
    setColumnasDobles((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

    if (checked) {
      setReglasFila?.((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      // Al activar Doble: regla por defecto Bud vs Act (se comparan entre sí)
      setReglasDobles((prev) => {
        if ((prev[id] || []).length) return prev;
        return { ...prev, [id]: [emptyReglaDoble()] };
      });
    } else {
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
