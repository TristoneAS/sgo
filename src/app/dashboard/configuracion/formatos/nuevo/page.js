"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ColumnasConReglasEditor from "@/app/components/ColumnasConReglasEditor";
import DashboardShell from "@/app/components/DashboardShell";
import { emptyColumna } from "@/libs/conditional_rules";
import styles from "@/app/dashboard/dashboard.module.css";

export default function NuevoFormatoPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [columnas, setColumnas] = useState([emptyColumna(), emptyColumna()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    const res = await fetch("/api/formatos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        descripcion,
        creado_por: localStorage.getItem("usuario") || "",
        columnas,
      }),
    });

    const data = await res.json();

    if (data.success) {
      router.push("/dashboard/configuracion/formatos");
    } else {
      setMessage({ text: data.error || "Error al crear formato", type: "error" });
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      title="Crear Formatos"
      subtitle="Define columnas y reglas de color"
    >
      <div className={styles.card}>
        {message.text ? (
          <div className={`${styles.message} ${styles.messageError}`}>
            {message.text}
          </div>
        ) : null}

        <form className={styles.formGrid} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="nombre">Nombre del formato</label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Reporte semanal"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="descripcion">Descripción (opcional)</label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el propósito de este formato"
            />
          </div>

          <ColumnasConReglasEditor columnas={columnas} onChange={setColumnas} />

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Crear formato"}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => router.back()}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
