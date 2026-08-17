"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/app/components/DashboardShell";
import styles from "@/app/dashboard/dashboard.module.css";

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const loadCategorias = useCallback(async () => {
    const res = await fetch("/api/categorias");
    const data = await res.json();
    setCategorias(data.success ? data.data : []);
  }, []);

  useEffect(() => {
    loadCategorias().finally(() => setLoading(false));
  }, [loadCategorias]);

  function resetForm() {
    setNombre("");
    setDescripcion("");
    setEditingId(null);
  }

  function startEdit(cat) {
    setEditingId(cat.id_categoria);
    setNombre(cat.nombre || "");
    setDescripcion(cat.descripcion || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    const url = editingId
      ? `/api/categorias/${editingId}`
      : "/api/categorias";

    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        descripcion,
        creado_por: localStorage.getItem("usuario") || "",
      }),
    });

    const data = await res.json();

    if (data.success) {
      setMessage({
        text: editingId ? "Categoría actualizada" : "Categoría creada",
        type: "success",
      });
      resetForm();
      await loadCategorias();
    } else {
      setMessage({ text: data.error || "Error al guardar", type: "error" });
    }

    setSaving(false);
  }

  async function handleDelete(id) {
    if (
      !window.confirm(
        "¿Eliminar esta categoría? Los documentos quedarán sin categoría.",
      )
    ) {
      return;
    }

    const res = await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      setMessage({ text: "Categoría eliminada", type: "success" });
      if (editingId === id) resetForm();
      loadCategorias();
    } else {
      setMessage({ text: data.error || "Error al eliminar", type: "error" });
    }
  }

  return (
    <DashboardShell
      title="Categorías"
      subtitle="Organiza los documentos por categoría"
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

      <div className={styles.documentosLayout}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h2 className={styles.sectionTitle}>
            {editingId ? "Editar categoría" : "Nueva categoría"}
          </h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="cat-nombre">Nombre</label>
              <input
                id="cat-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Políticas, Manuales, Reportes"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="cat-desc">Descripción</label>
              <textarea
                id="cat-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional"
              />
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
                    ? "Actualizar"
                    : "Agregar categoría"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>
            Categorías ({categorias.length})
          </h2>

          {loading ? (
            <p>Cargando...</p>
          ) : !categorias.length ? (
            <p className={styles.reglasHint}>
              Aún no hay categorías. Crea una para clasificar documentos.
            </p>
          ) : (
            <div className={styles.formatList}>
              {categorias.map((cat) => (
                <div key={cat.id_categoria} className={styles.formatItem}>
                  <div>
                    <h3>{cat.nombre}</h3>
                    {cat.descripcion ? <p>{cat.descripcion}</p> : null}
                  </div>
                  <div className={styles.formatActions}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => startEdit(cat)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleDelete(cat.id_categoria)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
