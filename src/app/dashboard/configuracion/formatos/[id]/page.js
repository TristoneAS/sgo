"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ColumnasConReglasEditor from "@/app/components/ColumnasConReglasEditor";
import DashboardShell from "@/app/components/DashboardShell";
import { emptyColumna } from "@/libs/conditional_rules";
import styles from "@/app/dashboard/dashboard.module.css";

export default function EditarFormatoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [columnas, setColumnas] = useState([emptyColumna()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/formatos/${id}`);
      const data = await res.json();

      if (data.success) {
        setNombre(data.data.nombre);
        setDescripcion(data.data.descripcion || "");
        setColumnas(
          data.data.columnas?.length
            ? data.data.columnas.map((c) => ({
                titulo: c.titulo,
                tipo_dato: c.tipo_dato || "texto",
                reglas: (c.reglas || []).map((r) => ({
                  operador: r.operador,
                  valor_comparacion: r.valor_comparacion,
                  color_fondo: r.color_fondo,
                  color_texto: r.color_texto,
                })),
              }))
            : [emptyColumna()],
        );
      } else {
        setMessage({ text: data.error || "Formato no encontrado", type: "error" });
      }

      setLoading(false);
    }

    load();
  }, [id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    const res = await fetch(`/api/formatos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, descripcion, columnas }),
    });

    const data = await res.json();

    if (data.success) {
      setMessage({ text: "Formato actualizado", type: "success" });
      setSaving(false);
    } else {
      setMessage({ text: data.error || "Error al actualizar", type: "error" });
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Editar formato">
        <p>Cargando...</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Editar formato"
      subtitle="Modifica columnas y reglas de color"
    >
      <div className={styles.card}>
        {message.text ? (
          <div
            className={`${styles.message} ${
              message.type === "error" ? styles.messageError : styles.messageSuccess
            }`}
          >
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
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <ColumnasConReglasEditor columnas={columnas} onChange={setColumnas} />

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => router.push("/dashboard/configuracion/formatos")}
            >
              Volver
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
