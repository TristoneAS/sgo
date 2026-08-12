"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/app/components/DashboardShell";
import { getEstiloPorReglas } from "@/libs/conditional_rules";
import { getColumnWidth } from "@/libs/excel_column_styles";
import styles from "@/app/dashboard/dashboard.module.css";

function emptyRespuestas(columnas) {
  const map = {};
  for (const col of columnas) {
    map[col.id_columna] = "";
  }
  return map;
}

export default function FormatosPreguntasForm() {
  const [formatos, setFormatos] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [formato, setFormato] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [vistaIndex, setVistaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const loadFormatos = useCallback(async () => {
    const res = await fetch("/api/formatos");
    const data = await res.json();
    setFormatos(data.success ? data.data : []);
  }, []);

  const loadFormato = useCallback(async (id, options = {}) => {
    const { resetFormulario = true, keepVista = false } = options;

    if (!id) {
      setFormato(null);
      setRespuestas({});
      setEditingId(null);
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
        setRespuestas(emptyRespuestas(nextFormato.columnas || []));
        setEditingId(null);
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
  }, []);

  useEffect(() => {
    loadFormatos().finally(() => setLoading(false));
  }, [loadFormatos]);

  useEffect(() => {
    if (selectedId) loadFormato(selectedId);
    else loadFormato("");
  }, [selectedId, loadFormato]);

  function getUsuario() {
    return localStorage.getItem("usuario") || "";
  }

  function handleChange(columnaId, value) {
    setRespuestas((prev) => ({ ...prev, [columnaId]: value }));
  }

  function resetForm() {
    if (!formato) return;
    setRespuestas(emptyRespuestas(formato.columnas || []));
    setEditingId(null);
  }

  function startEdit(fila) {
    setEditingId(fila.id_fila);
    setRespuestas({ ...(fila.celdas || {}) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!formato) return;

    const wasEditing = Boolean(editingId);
    setSaving(true);
    setMessage({ text: "", type: "" });

    const url = editingId
      ? `/api/formatos/${formato.id_formato}/filas/${editingId}`
      : `/api/formatos/${formato.id_formato}/filas`;

    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creado_por: getUsuario(),
        respuestas,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setMessage({
        text: wasEditing ? "Respuesta actualizada" : "Respuesta guardada",
        type: "success",
      });
      const next = await loadFormato(String(formato.id_formato), {
        resetFormulario: true,
        keepVista: wasEditing,
      });
      if (!wasEditing && next?.filas?.length) {
        setVistaIndex(next.filas.length - 1);
      }
    } else {
      setMessage({ text: data.error || "Error al guardar", type: "error" });
    }

    setSaving(false);
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
      if (editingId === filaId) resetForm();
      await loadFormato(String(formato.id_formato), {
        resetFormulario: editingId === filaId,
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
            message.type === "error" ? styles.messageError : styles.messageSuccess
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
          <form className={styles.preguntasForm} onSubmit={handleSubmit}>
            <div className={styles.preguntasFormHeader}>
              <div>
                <h2>{formato.nombre}</h2>
                {formato.descripcion ? <p>{formato.descripcion}</p> : null}
              </div>
              <span className={styles.badge}>
                {editingId ? `Editando #${editingId}` : "Nueva respuesta"}
              </span>
            </div>

            <div className={styles.preguntasList}>
              {columnas.map((col, index) => {
                const valor = respuestas[col.id_columna] ?? "";
                const reglaStyle = getEstiloPorReglas(valor, col.reglas);
                return (
                  <div key={col.id_columna} className={styles.preguntaItem}>
                    <label htmlFor={`q-${col.id_columna}`}>
                      <span className={styles.preguntaNumero}>
                        {index + 1}.
                      </span>{" "}
                      {col.titulo}
                    </label>
                    <textarea
                      id={`q-${col.id_columna}`}
                      className={styles.preguntaInput}
                      value={valor}
                      onChange={(e) =>
                        handleChange(col.id_columna, e.target.value)
                      }
                      rows={3}
                      placeholder="Escribe tu respuesta..."
                      style={reglaStyle || undefined}
                    />
                  </div>
                );
              })}
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving}
              >
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Actualizar respuesta"
                    : "Guardar respuesta"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancelar edición
                </button>
              ) : null}
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
                          const valor =
                            filaActual.celdas?.[col.id_columna] ?? "";
                          const reglaStyle = getEstiloPorReglas(
                            valor,
                            col.reglas,
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
    </DashboardShell>
  );
}
