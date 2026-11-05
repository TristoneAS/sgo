"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ColumnasConReglasEditor from "@/app/components/ColumnasConReglasEditor";
import DashboardShell from "@/app/components/DashboardShell";
import { emptyColumna } from "@/libs/conditional_rules";
import styles from "@/app/dashboard/dashboard.module.css";

export default function NuevoFormatoPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [idCategoria, setIdCategoria] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [columnas, setColumnas] = useState([emptyColumna(), emptyColumna()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    async function loadCategorias() {
      const res = await fetch("/api/categorias");
      const data = await res.json();
      setCategorias(data.success ? data.data : []);
    }
    loadCategorias();
  }, []);

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
        id_categoria: idCategoria || null,
        creado_por: localStorage.getItem("usuario") || "",
        columnas,
      }),
    });

    const data = await res.json();

    if (data.success) {
      router.push("/dashboard/configuracion/formatos");
    } else {
      const detail = data.details ? ` (${data.details})` : "";
      setMessage({
        text: `${data.error || "Error al crear formato"}${detail}`,
        type: "error",
      });
      setSaving(false);
    }
  }

  return (
    <DashboardShell
      title="Crear Formatos"
      subtitle="Define columnas, reglas de color y categoría"
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
            <label htmlFor="formato-categoria">Categoría</label>
            <select
              id="formato-categoria"
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
