"use client";

import { useEffect } from "react";
import { obtenerExtension } from "@/libs/documentos_files";
import styles from "@/app/dashboard/dashboard.module.css";

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function tipoVista(nombreArchivo) {
  const ext = obtenerExtension(nombreArchivo);
  if (ext === ".pdf") return "pdf";
  if ([".doc", ".docx"].includes(ext)) return "word";
  if ([".xls", ".xlsx"].includes(ext)) return "excel";
  if ([".ppt", ".pptx"].includes(ext)) return "powerpoint";
  return "otro";
}

export default function DocumentoViewerModal({ documento, onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!documento) return null;

  const vista = tipoVista(documento.nombre_archivo);
  const puedeEmbeber = vista === "pdf";

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalPanel}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Documento ${documento.nombre}`}
      >
        <header className={styles.modalHeader}>
          <div>
            <h2>
              #{documento.id_documento} — {documento.nombre}
            </h2>
            <p>
              {documento.nombre_archivo} · {formatBytes(documento.tamano_archivo)}
            </p>
          </div>
          <div className={styles.modalHeaderActions}>
            <a
              href={documento.ruta_archivo}
              download={documento.nombre_archivo}
              className={styles.primaryButton}
            >
              Descargar
            </a>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </header>

        {documento.descripcion ? (
          <p className={styles.modalDescription}>{documento.descripcion}</p>
        ) : null}

        <div className={styles.modalBody}>
          {puedeEmbeber ? (
            <iframe
              title={documento.nombre}
              src={documento.ruta_archivo}
              className={styles.modalIframe}
            />
          ) : (
            <div className={styles.modalOfficeFallback}>
              <div className={styles.modalOfficeIcon}>
                {vista === "word"
                  ? "W"
                  : vista === "excel"
                    ? "X"
                    : vista === "powerpoint"
                      ? "P"
                      : "📄"}
              </div>
              <h3>Vista previa no disponible en el navegador</h3>
              <p>
                Los archivos de Word, Excel y PowerPoint no se pueden mostrar
                embebidos aquí. Usa <strong>Descargar</strong> para abrirlos en
                tu aplicación.
              </p>
              <a
                href={documento.ruta_archivo}
                download={documento.nombre_archivo}
                className={styles.primaryButton}
              >
                Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
