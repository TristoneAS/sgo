"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ColumnasConReglasEditor from "@/app/components/ColumnasConReglasEditor";
import DashboardShell from "@/app/components/DashboardShell";
import { emptyColumna } from "@/libs/conditional_rules";
import { parsePromedioColumnas } from "@/libs/ytd_promedio";
import styles from "@/app/dashboard/dashboard.module.css";

function mapColumnasParaEditor(columnasApi = []) {
  return columnasApi.map((c) => {
    const promedioIds = parsePromedioColumnas(c.promedio_columnas);
    const promedioIndices = promedioIds
      .map((id) =>
        columnasApi.findIndex((x) => Number(x.id_columna) === Number(id)),
      )
      .filter((idx) => idx >= 0);

    return {
      titulo: c.titulo,
      tipo_dato: c.tipo_dato || "texto",
      id_columna: c.id_columna,
      promedio_columnas_indices: promedioIndices,
      reglas: (c.reglas || []).map((r) => {
        const tipoFuente = r.tipo_fuente || "valor";
        let columnaRefIndex = "";
        if (tipoFuente === "columna" && r.id_columna_ref != null) {
          const idx = columnasApi.findIndex(
            (x) => x.id_columna === r.id_columna_ref,
          );
          columnaRefIndex = idx >= 0 ? String(idx) : "";
        }
        return {
          operador: r.operador,
          tipo_fuente: tipoFuente,
          valor_comparacion: r.valor_comparacion || "",
          columna_ref_index: columnaRefIndex,
          id_columna_ref: r.id_columna_ref ?? null,
          color_fondo: r.color_fondo,
          color_texto: r.color_texto,
        };
      }),
    };
  });
}

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
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/formatos/${id}`);
      const data = await res.json();

      if (data.success) {
        setNombre(data.data.nombre);
        setDescripcion(data.data.descripcion || "");
        setColumnas(
          data.data.columnas?.length
            ? mapColumnasParaEditor(data.data.columnas)
            : [emptyColumna()],
        );
      } else {
        setMessage({
          text: data.error || "Formato no encontrado",
          type: "error",
        });
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
      setMessage({ text: "", type: "" });
      if (data.data?.columnas?.length) {
        setColumnas(mapColumnasParaEditor(data.data.columnas));
      }
      setSuccessModalOpen(true);
      setSaving(false);
    } else {
      const detail = data.details ? ` (${data.details})` : "";
      setMessage({
        text: `${data.error || "Error al actualizar"}${detail}`,
        type: "error",
      });
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
              message.type === "error"
                ? styles.messageError
                : styles.messageSuccess
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

      {successModalOpen ? (
        <div
          className={styles.modalOverlay}
          onClick={() => setSuccessModalOpen(false)}
          role="presentation"
        >
          <div
            className={`${styles.modalPanel} ${styles.successModal}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="formato-actualizado-titulo"
          >
            <header className={styles.modalHeader}>
              <div>
                <h2 id="formato-actualizado-titulo">Formato actualizado</h2>
                <p>Los cambios se guardaron correctamente.</p>
              </div>
            </header>
            <div className={styles.successModalBody}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setSuccessModalOpen(false)}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
