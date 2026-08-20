"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/app/components/DashboardShell";
import PreguntasCamposEditor, {
  makeToggleColumnaDoble,
} from "@/app/components/PreguntasCamposEditor";
import {
  emptyReglaDoble,
  emptyReglaFila,
  getEstiloCelda,
  getEstiloCeldaDoble,
  parseReglasDobles,
  parseReglasFila,
} from "@/libs/conditional_rules";
import {
  etiquetasDoble,
  isValorDoble,
  parseColumnasDobles,
  parseDobleValor,
  valorCeldaParaEditar,
  valorCeldaParaGuardar,
  valorEscalar,
} from "@/libs/doble_valor";
import { getColumnWidth } from "@/libs/excel_column_styles";
import {
  isColumnaYtd,
  promedioYtdParaGuardar,
  valorCeldaConYtd,
} from "@/libs/ytd_promedio";
import styles from "@/app/dashboard/dashboard.module.css";

function emptyRespuestas(columnas) {
  const map = {};
  for (const col of columnas) {
    map[col.id_columna] = "";
  }
  return map;
}

function respuestasDesdeFila(columnas, fila) {
  const dobles = new Set(parseColumnasDobles(fila?.columnas_dobles));
  const map = {};
  for (const col of columnas) {
    const raw = fila?.celdas?.[col.id_columna];
    const esDoble = dobles.has(Number(col.id_columna)) || isValorDoble(raw);
    map[col.id_columna] = valorCeldaParaEditar(esDoble, raw);
  }
  return map;
}

function respuestasParaGuardar(columnas, respuestas, columnasDoblesSet) {
  const map = {};
  for (const col of columnas) {
    if (isColumnaYtd(col.titulo)) continue;
    const esDoble = columnasDoblesSet.has(Number(col.id_columna));
    map[col.id_columna] = valorCeldaParaGuardar(
      esDoble,
      respuestas[col.id_columna],
    );
  }

  for (const col of columnas) {
    if (!isColumnaYtd(col.titulo)) continue;
    map[col.id_columna] = promedioYtdParaGuardar(
      { ...respuestas, ...map },
      col.promedio_columnas || [],
    );
  }

  return map;
}

function useCamposState() {
  const [respuestas, setRespuestas] = useState({});
  const [columnasDobles, setColumnasDobles] = useState(() => new Set());
  const [reglasDobles, setReglasDobles] = useState({});
  const [reglasFila, setReglasFila] = useState({});
  const [etiqueta1, setEtiqueta1] = useState("Bud");
  const [etiqueta2, setEtiqueta2] = useState("Act");

  function reset(columnas = []) {
    setRespuestas(emptyRespuestas(columnas));
    setColumnasDobles(new Set());
    setReglasDobles({});
    setReglasFila({});
    setEtiqueta1("Bud");
    setEtiqueta2("Act");
  }

  function loadFromFila(columnas, fila) {
    setColumnasDobles(new Set(parseColumnasDobles(fila.columnas_dobles)));
    setReglasDobles(parseReglasDobles(fila.reglas_dobles));
    setReglasFila(parseReglasFila(fila.reglas_fila));
    setEtiqueta1(fila.etiqueta_1 || "Bud");
    setEtiqueta2(fila.etiqueta_2 || "Act");
    setRespuestas(respuestasDesdeFila(columnas, fila));
  }

  const handlers = {
    onChange(columnaId, value) {
      setRespuestas((prev) => ({ ...prev, [columnaId]: value }));
    },
    onDobleChange(columnaId, parte, value) {
      setRespuestas((prev) => {
        const actual = parseDobleValor(prev[columnaId]);
        return {
          ...prev,
          [columnaId]: { ...actual, [parte]: value },
        };
      });
    },
    onToggleDoble: makeToggleColumnaDoble(
      setColumnasDobles,
      setReglasDobles,
      setRespuestas,
      setReglasFila,
    ),
    onAddReglaDoble(columnaId) {
      const id = Number(columnaId);
      setReglasDobles((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), emptyReglaDoble()],
      }));
    },
    onUpdateReglaDoble(columnaId, reglaIndex, patch) {
      const id = Number(columnaId);
      setReglasDobles((prev) => ({
        ...prev,
        [id]: (prev[id] || []).map((regla, i) =>
          i === reglaIndex ? { ...regla, ...patch } : regla,
        ),
      }));
    },
    onRemoveReglaDoble(columnaId, reglaIndex) {
      const id = Number(columnaId);
      setReglasDobles((prev) => {
        const list = (prev[id] || []).filter((_, i) => i !== reglaIndex);
        const next = { ...prev };
        if (list.length) next[id] = list;
        else delete next[id];
        return next;
      });
    },
    onAddReglaFila(columnaId) {
      const id = Number(columnaId);
      setReglasFila((prev) => ({
        ...prev,
        [id]: [...(prev[id] || []), emptyReglaFila()],
      }));
    },
    onUpdateReglaFila(columnaId, reglaIndex, patch) {
      const id = Number(columnaId);
      setReglasFila((prev) => ({
        ...prev,
        [id]: (prev[id] || []).map((regla, i) =>
          i === reglaIndex ? { ...regla, ...patch } : regla,
        ),
      }));
    },
    onRemoveReglaFila(columnaId, reglaIndex) {
      const id = Number(columnaId);
      setReglasFila((prev) => {
        const list = (prev[id] || []).filter((_, i) => i !== reglaIndex);
        const next = { ...prev };
        if (list.length) next[id] = list;
        else delete next[id];
        return next;
      });
    },
    onCopyReglasFilaATodas(columnaId, columnasList = []) {
      const fromId = Number(columnaId);
      setReglasFila((prev) => {
        const source = (prev[fromId] || []).map((regla) => ({ ...regla }));
        if (!source.length) return prev;
        const next = { ...prev };
        for (const col of columnasList) {
          const id = Number(col.id_columna);
          if (id === fromId) continue;
          if (isColumnaYtd(col.titulo)) continue;
          next[id] = source.map((regla) => ({ ...regla }));
        }
        return next;
      });
    },
    onEtiqueta1Change: setEtiqueta1,
    onEtiqueta2Change: setEtiqueta2,
  };

  return {
    respuestas,
    columnasDobles,
    reglasDobles,
    reglasFila,
    etiqueta1,
    etiqueta2,
    reset,
    loadFromFila,
    handlers,
  };
}

export default function FormatosPreguntasForm() {
  const [formatos, setFormatos] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [formato, setFormato] = useState(null);
  const [vistaIndex, setVistaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const create = useCamposState();
  const edit = useCamposState();

  const loadFormatos = useCallback(async () => {
    const res = await fetch("/api/formatos");
    const data = await res.json();
    setFormatos(data.success ? data.data : []);
  }, []);

  const loadFormato = useCallback(
    async (id, options = {}) => {
      const { resetFormulario = true, keepVista = false } = options;

      if (!id) {
        setFormato(null);
        create.reset([]);
        setEditingId(null);
        setEditModalOpen(false);
        setVistaIndex(0);
        return null;
      }

      setLoading(true);
      const res = await fetch(`/api/formatos/${id}`);
      const data = await res.json();

      if (data.success) {
        const nextFormato = data.data;
        setFormato(nextFormato);
        if (resetFormulario) {
          create.reset(nextFormato.columnas || []);
        }
        if (!keepVista) {
          setVistaIndex(0);
        } else {
          setVistaIndex((prev) => {
            const total = nextFormato.filas?.length || 0;
            if (total === 0) return 0;
            return Math.min(prev, total - 1);
          });
        }
        setLoading(false);
        return nextFormato;
      }

      setFormato(null);
      setMessage({
        text: data.error || "No se pudo cargar el formato",
        type: "error",
      });
      setLoading(false);
      return null;
    },
    // create.reset is stable enough for our usage; avoid stale closure on columnas
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    loadFormatos().finally(() => setLoading(false));
  }, [loadFormatos]);

  useEffect(() => {
    if (selectedId) loadFormato(selectedId);
    else loadFormato("");
  }, [selectedId, loadFormato]);

  useEffect(() => {
    if (!editModalOpen) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape" && !saving) closeEditModal();
    }

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [editModalOpen, saving]);

  function getUsuario() {
    return localStorage.getItem("usuario") || "";
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditingId(null);
    edit.reset(formato?.columnas || []);
  }

  function startEdit(fila) {
    if (!formato) return;
    setEditingId(fila.id_fila);
    edit.loadFromFila(formato.columnas || [], fila);
    setEditModalOpen(true);
    setMessage({ text: "", type: "" });
  }

  async function saveFila({ idFila, campos, successText, closeModal }) {
    if (!formato) return false;

    setSaving(true);
    setMessage({ text: "", type: "" });

    const url = idFila
      ? `/api/formatos/${formato.id_formato}/filas/${idFila}`
      : `/api/formatos/${formato.id_formato}/filas`;

    const res = await fetch(url, {
      method: idFila ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creado_por: getUsuario(),
        etiqueta_1: campos.etiqueta1,
        etiqueta_2: campos.etiqueta2,
        columnas_dobles: [...campos.columnasDobles],
        reglas_dobles: Object.fromEntries(
          [...campos.columnasDobles].map((id) => [
            id,
            campos.reglasDobles[id] || [],
          ]),
        ),
        reglas_fila: Object.fromEntries(
          Object.entries(campos.reglasFila || {}).filter(
            ([id]) => !campos.columnasDobles.has(Number(id)),
          ),
        ),
        respuestas: respuestasParaGuardar(
          formato.columnas || [],
          campos.respuestas,
          campos.columnasDobles,
        ),
      }),
    });

    const data = await res.json();

    if (data.success) {
      setMessage({ text: successText, type: "success" });
      if (closeModal) closeEditModal();
      const next = await loadFormato(String(formato.id_formato), {
        resetFormulario: !idFila,
        keepVista: Boolean(idFila),
      });
      if (!idFila && next?.filas?.length) {
        setVistaIndex(next.filas.length - 1);
      }
      setSaving(false);
      return true;
    }

    setMessage({ text: data.error || "Error al guardar", type: "error" });
    setSaving(false);
    return false;
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const ok = await saveFila({
      idFila: null,
      campos: create,
      successText: "Guardado con éxito",
      closeModal: false,
    });
    if (ok) create.reset(formato?.columnas || []);
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    if (!editingId) return;
    await saveFila({
      idFila: editingId,
      campos: edit,
      successText: "Guardado con éxito",
      closeModal: true,
    });
  }

  async function handleDelete(filaId) {
    if (!window.confirm("¿Eliminar esta respuesta?")) return;

    setSaving(true);
    const res = await fetch(
      `/api/formatos/${formato.id_formato}/filas/${filaId}`,
      { method: "DELETE" },
    );
    const data = await res.json();

    if (data.success) {
      setMessage({ text: "Respuesta eliminada", type: "success" });
      if (editingId === filaId) closeEditModal();
      await loadFormato(String(formato.id_formato), {
        resetFormulario: false,
        keepVista: true,
      });
    } else {
      setMessage({ text: data.error || "Error al eliminar", type: "error" });
    }

    setSaving(false);
  }

  const columnas = formato?.columnas || [];
  const filas = formato?.filas || [];
  const safeIndex =
    filas.length === 0 ? 0 : Math.min(vistaIndex, filas.length - 1);
  const filaActual = filas[safeIndex] || null;

  return (
    <DashboardShell
      title="Llenar formatos"
      subtitle="Responde cada pregunta y gestiona tus respuestas"
    >
      {message.text ? (
        <div
          className={`${styles.message} ${
            message.type === "error"
              ? styles.messageError
              : styles.messageSuccess
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Selecciona un formato...</option>
          {formatos.map((f) => (
            <option key={f.id_formato} value={f.id_formato}>
              {f.nombre}
            </option>
          ))}
        </select>
      </div>

      {loading && selectedId ? (
        <p className={styles.loadingText}>Cargando formato...</p>
      ) : !selectedId ? (
        <div className={styles.emptyState}>
          Selecciona un formato para comenzar a responder.
        </div>
      ) : !formato ? (
        <div className={styles.emptyState}>Formato no encontrado.</div>
      ) : (
        <div className={styles.preguntasLayout}>
          <form className={styles.preguntasForm} onSubmit={handleCreateSubmit}>
            <div className={styles.preguntasFormHeader}>
              <div>
                <h2>{formato.nombre}</h2>
                {formato.descripcion ? <p>{formato.descripcion}</p> : null}
              </div>
              <span className={styles.badge}>Nueva respuesta</span>
            </div>

            <PreguntasCamposEditor
              columnas={columnas}
              respuestas={create.respuestas}
              columnasDobles={create.columnasDobles}
              reglasDobles={create.reglasDobles}
              reglasFila={create.reglasFila}
              etiqueta1={create.etiqueta1}
              etiqueta2={create.etiqueta2}
              idPrefix="q"
              {...create.handlers}
            />

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar respuesta"}
              </button>
            </div>
          </form>

          <section className={styles.respuestasSection}>
            <div className={styles.respuestaViewerHeader}>
              <h3>Respuestas guardadas ({filas.length})</h3>
              {filas.length > 0 ? (
                <div className={styles.respuestaNav}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setVistaIndex((i) => Math.max(0, i - 1))}
                    disabled={safeIndex <= 0}
                  >
                    ← Anterior
                  </button>
                  <span className={styles.respuestaNavLabel}>
                    {safeIndex + 1} de {filas.length}
                  </span>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                      setVistaIndex((i) => Math.min(filas.length - 1, i + 1))
                    }
                    disabled={safeIndex >= filas.length - 1}
                  >
                    Siguiente →
                  </button>
                </div>
              ) : null}
            </div>

            {!filas.length || !filaActual ? (
              <p className={styles.reglasHint}>Aún no hay respuestas.</p>
            ) : (
              <article className={styles.respuestaCard}>
                <header className={styles.respuestaCardHeader}>
                  <strong>Respuesta #{safeIndex + 1}</strong>
                  <div className={styles.formatActions}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => startEdit(filaActual)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleDelete(filaActual.id_fila)}
                      disabled={saving}
                    >
                      Eliminar
                    </button>
                  </div>
                </header>

                <div className={styles.respuestaTableWrap}>
                  <table className={styles.respuestaTable}>
                    <thead>
                      <tr>
                        {columnas.map((col) => {
                          const width = getColumnWidth(col.titulo);
                          return (
                            <th
                              key={col.id_columna}
                              style={{ width, minWidth: width }}
                              title={col.titulo}
                            >
                              {col.titulo}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {columnas.map((col) => {
                          const width = getColumnWidth(col.titulo);
                          const raw = valorCeldaConYtd(
                            col,
                            filaActual.celdas || {},
                          );
                          const labels = etiquetasDoble(filaActual);
                          const dobles = new Set(
                            parseColumnasDobles(filaActual.columnas_dobles),
                          );
                          const esDoble =
                            (typeof raw === "object" && raw != null) ||
                            dobles.has(Number(col.id_columna)) ||
                            isValorDoble(raw);

                          if (esDoble) {
                            const doble = parseDobleValor(raw);
                            const reglasFila =
                              filaActual.reglas_dobles?.[
                                Number(col.id_columna)
                              ] || [];
                            return (
                              <td
                                key={col.id_columna}
                                style={{ width, minWidth: width }}
                              >
                                <div className={styles.dobleCell}>
                                  <div
                                    className={styles.dobleCellHalf}
                                    style={
                                      getEstiloCeldaDoble(
                                        "v1",
                                        doble,
                                        col.reglas,
                                        filaActual.celdas || {},
                                        reglasFila,
                                      ) || undefined
                                    }
                                  >
                                    <span className={styles.dobleCellTag}>
                                      {labels.etiqueta1}
                                    </span>
                                    {doble.v1 || "—"}
                                  </div>
                                  <div
                                    className={styles.dobleCellHalf}
                                    style={
                                      getEstiloCeldaDoble(
                                        "v2",
                                        doble,
                                        col.reglas,
                                        filaActual.celdas || {},
                                        reglasFila,
                                      ) || undefined
                                    }
                                  >
                                    <span className={styles.dobleCellTag}>
                                      {labels.etiqueta2}
                                    </span>
                                    {doble.v2 || "—"}
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          const valor = valorEscalar(raw);
                          const reglaStyle = getEstiloCelda(
                            valor,
                            col.reglas,
                            filaActual.celdas || {},
                            filaActual.reglas_fila?.[Number(col.id_columna)] ||
                              [],
                          );
                          return (
                            <td
                              key={col.id_columna}
                              style={{
                                width,
                                minWidth: width,
                                ...(reglaStyle || {}),
                              }}
                            >
                              {valor || "—"}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>
            )}
          </section>
        </div>
      )}

      {editModalOpen && formato ? (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (!saving) closeEditModal();
          }}
          role="presentation"
        >
          <div
            className={`${styles.modalPanel} ${styles.editRespuestaModal}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Editar respuesta #${editingId}`}
          >
            <header className={styles.modalHeader}>
              <div>
                <h2>Editar respuesta</h2>
                <p>
                  {formato.nombre}
                  {editingId ? ` · #${editingId}` : ""}
                </p>
              </div>
              <div className={styles.modalHeaderActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeEditModal}
                  disabled={saving}
                >
                  Cerrar
                </button>
              </div>
            </header>

            <form className={styles.editRespuestaBody} onSubmit={handleEditSubmit}>
              <PreguntasCamposEditor
                columnas={columnas}
                respuestas={edit.respuestas}
                columnasDobles={edit.columnasDobles}
                reglasDobles={edit.reglasDobles}
                reglasFila={edit.reglasFila}
                etiqueta1={edit.etiqueta1}
                etiqueta2={edit.etiqueta2}
                idPrefix="edit-q"
                {...edit.handlers}
              />

              <div className={styles.editRespuestaFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeEditModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
