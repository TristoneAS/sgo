"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/app/components/DashboardShell";
import styles from "@/app/dashboard/dashboard.module.css";

export default function FormatosListPage() {
  const [formatos, setFormatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  async function loadFormatos() {
    setLoading(true);
    const res = await fetch("/api/formatos");
    const data = await res.json();
    setFormatos(data.success ? data.data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadFormatos();
  }, []);

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este formato? Se perderán sus filas.")) {
      return;
    }

    const res = await fetch(`/api/formatos/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      setMessage({ text: "Formato eliminado", type: "success" });
      loadFormatos();
    } else {
      setMessage({ text: data.error || "Error al eliminar", type: "error" });
    }
  }

  return (
    <DashboardShell
      title="Gestionar Formatos"
      subtitle="Administra tus plantillas y columnas"
    >
      <div className={styles.toolbar}>
        <div />
        <Link
          href="/dashboard/configuracion/formatos/nuevo"
          className={styles.primaryButton}
          style={{ display: "inline-block", textDecoration: "none" }}
        >
          + Crear Formatos
        </Link>
      </div>

      {message.text ? (
        <div
          className={`${styles.message} ${
            message.type === "error" ? styles.messageError : styles.messageSuccess
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className={styles.card}>
        <h2 style={{ marginBottom: 16, fontSize: 18 }}>Formatos registrados</h2>

        {loading ? (
          <p>Cargando...</p>
        ) : !formatos.length ? (
          <p style={{ color: "#64748b" }}>
            Aún no hay formatos creados. Usa &quot;Crear Formatos&quot; para
            definir columnas personalizadas.
          </p>
        ) : (
          <div className={styles.formatList}>
            {formatos.map((formato) => (
              <div key={formato.id_formato} className={styles.formatItem}>
                <div>
                  <h3>{formato.nombre}</h3>
                  {formato.descripcion ? (
                    <p>{formato.descripcion}</p>
                  ) : null}
                </div>
                <div className={styles.formatActions}>
                  <Link
                    href={`/dashboard/configuracion/formatos/${formato.id_formato}`}
                    className={styles.linkButton}
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleDelete(formato.id_formato)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
