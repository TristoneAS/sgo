"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [viewerDoc, setViewerDoc] = useState(null);

  const loadDocumentos = useCallback(async () => {
    const res = await fetch("/api/documentos");
    const data = await res.json();
    setDocumentos(data.success ? data.data : []);
  }, []);

  useEffect(() => {
    loadDocumentos().finally(() => setLoading(false));
  }, [loadDocumentos]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!archivo) {
      setMessage({ text: "Selecciona un archivo", type: "error" });
      return;
    }

    setSaving(true);
    setMessage({ text: "", type: "" });

    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("descripcion", descripcion);
    formData.append("creado_por", localStorage.getItem("usuario") || "");
    formData.append("archivo", archivo);

    const res = await fetch("/api/documentos", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      setMessage({ text: "Documento cargado", type: "success" });
      setNombre("");
      setDescripcion("");
      setArchivo(null);
      event.target.reset?.();
      await loadDocumentos();
    } else {
      setMessage({ text: data.error || "Error al subir", type: "error" });
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
            message.type === "error" ? styles.messageError : styles.messageSuccess
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className={styles.documentosLayout}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <h2 className={styles.sectionTitle}>Nuevo documento</h2>

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
              <label htmlFor="doc-desc">Descripción</label>
              <textarea
                id="doc-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="doc-file">Archivo</label>
              <input
                id="doc-file"
                type="file"
                accept={ACCEPT_DOCUMENTOS}
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                required
              />
              <p className={styles.reglasHint}>{DOCUMENTOS_HINT}</p>
              {archivo ? (
                <p className={styles.fileSelected}>
                  Seleccionado: {archivo.name} ({formatBytes(archivo.size)})
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={saving}
            >
              {saving ? "Subiendo..." : "Subir documento"}
            </button>
          </div>
        </form>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Documentos cargados</h2>

          {loading ? (
            <p>Cargando...</p>
          ) : !documentos.length ? (
            <p className={styles.reglasHint}>No hay documentos aún.</p>
          ) : (
            <div className={styles.formatList}>
              {documentos.map((doc) => (
                <div key={doc.id_documento} className={styles.formatItem}>
                  <div>
                    <h3>
                      #{doc.id_documento} — {doc.nombre}
                    </h3>
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
