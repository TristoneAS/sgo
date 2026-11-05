"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/app/components/DashboardShell";
import styles from "@/app/dashboard/dashboard.module.css";

export default function FormatosListPage() {
  const [formatos, setFormatos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  async function loadData() {
    setLoading(true);
    const [resFormatos, resCategorias] = await Promise.all([
      fetch("/api/formatos"),
      fetch("/api/categorias"),
    ]);
    const dataFormatos = await resFormatos.json();
    const dataCategorias = await resCategorias.json();
    setFormatos(dataFormatos.success ? dataFormatos.data : []);
    setCategorias(dataCategorias.success ? dataCategorias.data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const formatosFiltrados = useMemo(() => {
    if (!filtroCategoria) return formatos;
    if (filtroCategoria === "sin") {
      return formatos.filter((f) => !f.id_categoria);
    }
    const id = Number(filtroCategoria);
    return formatos.filter((f) => Number(f.id_categoria) === id);
  }, [formatos, filtroCategoria]);

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este formato? Se perderán sus filas.")) {
      return;
    }

    const res = await fetch(`/api/formatos/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      setMessage({ text: "Formato eliminado", type: "success" });
      loadData();
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
        ) : !formatosFiltrados.length ? (
          <p style={{ color: "#64748b" }}>
            No hay formatos en esta categoría.
          </p>
        ) : (
          <div className={styles.formatList}>
            {formatosFiltrados.map((formato) => (
              <div key={formato.id_formato} className={styles.formatItem}>
                <div>
                  <h3>
                    {formato.nombre}
                    {formato.categoria_nombre ? (
                      <span className={styles.categoriaBadge}>
                        {formato.categoria_nombre}
                      </span>
                    ) : null}
                  </h3>
                  {formato.descripcion ? <p>{formato.descripcion}</p> : null}
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
