"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DocumentoViewerModal from "@/app/components/DocumentoViewerModal";
import styles from "@/app/dashboard/dashboard.module.css";

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosQuickView({ compact = false }) {
  const [documentos, setDocumentos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewerDoc, setViewerDoc] = useState(null);

  const loadDocumentos = useCallback(async () => {
    const res = await fetch("/api/documentos");
    const data = await res.json();
    setDocumentos(data.success ? data.data : []);
  }, []);

  useEffect(() => {
    loadDocumentos().finally(() => setLoading(false));
  }, [loadDocumentos]);

  const documentosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return documentos;
    return documentos.filter((doc) =>
      String(doc.nombre || "")
        .toLowerCase()
        .includes(q),
    );
  }, [documentos, busqueda]);

  return (
    <section
      className={
        compact
          ? styles.tableroDocsPanel
          : `${styles.card} ${styles.tableroDocsPanel}`
      }
    >
      <div className={styles.tableroDocsHeader}>
        <h2 className={styles.sectionTitle}>Documentos</h2>
        <Link href="/dashboard/documentos" className={styles.linkButton}>
          Gestionar
        </Link>
      </div>

      <div className={styles.docsSearchBar}>
        <input
          type="search"
          className={styles.docsSearchInput}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar documento por nombre..."
          aria-label="Buscar documento por nombre"
        />
      </div>

      {loading ? (
        <p className={styles.loadingText}>Cargando documentos...</p>
      ) : !documentos.length ? (
        <p className={styles.reglasHint}>
          No hay documentos.{" "}
          <Link href="/dashboard/documentos">Carga uno aquí</Link>.
        </p>
      ) : !documentosFiltrados.length ? (
        <p className={styles.reglasHint}>
          No se encontraron documentos con “{busqueda.trim()}”.
        </p>
      ) : (
        <div className={styles.tableroDocsList}>
          {documentosFiltrados.map((doc) => (
            <div key={doc.id_documento} className={styles.tableroDocItem}>
              <div className={styles.tableroDocInfo}>
                <strong>{doc.nombre}</strong>
                {doc.descripcion ? <p>{doc.descripcion}</p> : null}
                <span className={styles.reglasHint}>
                  {doc.nombre_archivo} · {formatBytes(doc.tamano_archivo)}
                </span>
              </div>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setViewerDoc(doc)}
              >
                Ver
              </button>
            </div>
          ))}
        </div>
      )}

      {viewerDoc ? (
        <DocumentoViewerModal
          documento={viewerDoc}
          onClose={() => setViewerDoc(null)}
        />
      ) : null}
    </section>
  );
}
