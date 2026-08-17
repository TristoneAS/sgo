"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/app/components/DashboardShell";
import DocumentoViewerModal from "@/app/components/DocumentoViewerModal";
import {
  ACCEPT_DOCUMENTOS,
  DOCUMENTOS_HINT,
} from "@/libs/documentos_files";
import styles from "@/app/dashboard/dashboard.module.css";

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [idCategoria, setIdCategoria] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [archivoActual, setArchivoActual] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [viewerDoc, setViewerDoc] = useState(null);

  const loadCategorias = useCallback(async () => {
    const res = await fetch("/api/categorias");
    const data = await res.json();
    setCategorias(data.success ? data.data : []);
  }, []);

  const loadDocumentos = useCallback(async () => {
    const res = await fetch("/api/documentos");
    const data = await res.json();
    setDocumentos(data.success ? data.data : []);
  }, []);

  useEffect(() => {
    Promise.all([loadDocumentos(), loadCategorias()]).finally(() =>
      setLoading(false),
    );
  }, [loadDocumentos, loadCategorias]);

  const documentosFiltrados = useMemo(() => {
    if (!filtroCategoria) return documentos;
    if (filtroCategoria === "sin") {
      return documentos.filter((doc) => !doc.id_categoria);
    }
    const id = Number(filtroCategoria);
    return documentos.filter((doc) => Number(doc.id_categoria) === id);
  }, [documentos, filtroCategoria]);

  function resetForm(formEl) {
    setNombre("");
    setDescripcion("");
    setIdCategoria("");
    setArchivo(null);
    setEditingId(null);
    setArchivoActual("");
    formEl?.reset?.();
  }

  function startEdit(doc) {
    setEditingId(doc.id_documento);
    setNombre(doc.nombre || "");
    setDescripcion(doc.descripcion || "");
    setIdCategoria(doc.id_categoria ? String(doc.id_categoria) : "");
    setArchivo(null);
    setArchivoActual(doc.nombre_archivo || "");
    setMessage({ text: "", type: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!editingId && !archivo) {
      setMessage({ text: "Selecciona un archivo", type: "error" });
      return;
    }

    setSaving(true);
    setMessage({ text: "", type: "" });

    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("descripcion", descripcion);
    formData.append("creado_por", localStorage.getItem("usuario") || "");
    if (idCategoria) {
      formData.append("id_categoria", idCategoria);
    } else {
      formData.append("id_categoria", "");
    }

    if (editingId) {
      formData.append("id_documento", String(editingId));
      if (archivo) {
        formData.append("archivo", archivo);
      }
    } else {
      formData.append("archivo", archivo);
    }

    const res = await fetch("/api/documentos", {
      method: editingId ? "PUT" : "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      setMessage({
        text: editingId ? "Documento actualizado" : "Documento cargado",
        type: "success",
      });
      resetForm(event.target);
      await loadDocumentos();
    } else {
      setMessage({ text: data.error || "Error al guardar", type: "error" });
    }

    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este documento?")) return;

    const res = await fetch(`/api/documentos?id=${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      setMessage({ text: "Documento eliminado", type: "success" });
      if (viewerDoc?.id_documento === id) setViewerDoc(null);
      if (editingId === id) resetForm();
      loadDocumentos();
    } else {
      setMessage({ text: data.error || "Error al eliminar", type: "error" });
    }
  }

  return (
    <DashboardShell
      title="Documentos"
      subtitle="Sube PDF, Excel, Word o PowerPoint"
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
            {editingId
              ? `Editar documento #${editingId}`
              : "Nuevo documento"}
          </h2>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="doc-nombre">Nombre</label>
              <input
                id="doc-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del documento"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="doc-categoria">Categoría</label>
              <select
                id="doc-categoria"
                className={styles.select}
                value={idCategoria}
                onChange={(e) => setIdCategoria(e.target.value)}
              >
                <option value="">Sin categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
              {!categorias.length ? (
                <p className={styles.reglasHint}>
                  No hay categorías.{" "}
                  <Link href="/dashboard/configuracion/categorias">
                    Créalas aquí
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor="doc-desc">Descripción</label>
              <textarea
                id="doc-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="doc-file">
                {editingId ? "Reemplazar archivo (opcional)" : "Archivo"}
              </label>
              <input
                id="doc-file"
                type="file"
                accept={ACCEPT_DOCUMENTOS}
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                required={!editingId}
              />
              <p className={styles.reglasHint}>{DOCUMENTOS_HINT}</p>
              {editingId && archivoActual && !archivo ? (
                <p className={styles.fileSelected}>
                  Archivo actual: {archivoActual}
                </p>
              ) : null}
              {archivo ? (
                <p className={styles.fileSelected}>
                  Seleccionado: {archivo.name} ({formatBytes(archivo.size)})
                </p>
              ) : null}
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
                    ? "Actualizar documento"
                    : "Subir documento"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => resetForm()}
                  disabled={saving}
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <section className={styles.card}>
          <div className={styles.docsListHeader}>
            <h2 className={styles.sectionTitle}>Documentos cargados</h2>
            <select
              className={styles.select}
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              <option value="sin">Sin categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p>Cargando...</p>
          ) : !documentos.length ? (
            <p className={styles.reglasHint}>No hay documentos aún.</p>
          ) : !documentosFiltrados.length ? (
            <p className={styles.reglasHint}>
              No hay documentos en esta categoría.
            </p>
          ) : (
            <div className={styles.formatList}>
              {documentosFiltrados.map((doc) => (
                <div key={doc.id_documento} className={styles.formatItem}>
                  <div>
                    <h3>
                      #{doc.id_documento} — {doc.nombre}
                    </h3>
                    {doc.categoria_nombre ? (
                      <span className={styles.categoriaBadge}>
                        {doc.categoria_nombre}
                      </span>
                    ) : (
                      <span className={styles.reglasHint}>Sin categoría</span>
                    )}
                    {doc.descripcion ? <p>{doc.descripcion}</p> : null}
                    <p className={styles.reglasHint}>
                      {doc.nombre_archivo} · {formatBytes(doc.tamano_archivo)}
                    </p>
                  </div>
                  <div className={styles.formatActions}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => setViewerDoc(doc)}
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => startEdit(doc)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleDelete(doc.id_documento)}
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

      {viewerDoc ? (
        <DocumentoViewerModal
          documento={viewerDoc}
          onClose={() => setViewerDoc(null)}
        />
      ) : null}
    </DashboardShell>
  );
}
