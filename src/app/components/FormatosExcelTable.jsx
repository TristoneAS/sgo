"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getEstiloCeldaDoble, getEstiloPorReglas } from "@/libs/conditional_rules";
import {
  etiquetasDoble,
  isValorDoble,
  parseColumnasDobles,
  parseDobleValor,
  valorEscalar,
} from "@/libs/doble_valor";
import {
  getColumnWidth,
  getTableMinWidth,
} from "@/libs/excel_column_styles";
import { valorCeldaConYtd } from "@/libs/ytd_promedio";
import styles from "@/app/dashboard/dashboard.module.css";

export default function FormatosExcelTable() {
  const [formatos, setFormatos] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [formato, setFormato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [titulosHorizontales, setTitulosHorizontales] = useState(false);

  const loadFormatos = useCallback(async () => {
    const res = await fetch("/api/formatos");
    const data = await res.json();
    setFormatos(data.success ? data.data : []);
  }, []);

  const loadFormato = useCallback(async (id) => {
    if (!id) {
      setFormato(null);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/formatos/${id}`);
    const data = await res.json();

    if (data.success) {
      setFormato(data.data);
    } else {
      setFormato(null);
      setMessage({
        text: data.error || "No se pudo cargar el formato",
        type: "error",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFormatos().finally(() => setLoading(false));
  }, [loadFormatos]);

  useEffect(() => {
    if (selectedId) loadFormato(selectedId);
  }, [selectedId, loadFormato]);

  const columnas = formato?.columnas || [];
  const filas = formato?.filas || [];
  const widthOpts = { horizontal: titulosHorizontales };
  const tableMinWidth = columnas.length
    ? getTableMinWidth(columnas, widthOpts)
    : 1100;

  return (
    <div className={styles.tableWorkspace}>
      {message.text ? (
        <div
          className={`${styles.message} ${styles.messageCompact} ${
            message.type === "error" ? styles.messageError : styles.messageSuccess
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className={styles.toolbarCompact}>
        <select
          className={styles.selectCompact}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Selecciona un formato...</option>
          {formatos.map((f) => (
            <option key={f.id_formato} value={f.id_formato}>
              {f.nombre}
            </option>
          ))}
        </select>

        <label className={styles.toggleTitulos}>
          <input
            type="checkbox"
            checked={titulosHorizontales}
            onChange={(e) => setTitulosHorizontales(e.target.checked)}
          />
          <span>
            {titulosHorizontales
              ? "Títulos horizontales"
              : "Títulos verticales"}
          </span>
        </label>

        <Link href="/dashboard/llenar-formatos" className={styles.linkButton}>
          Ir a llenar formatos
        </Link>
      </div>

      {loading && selectedId ? (
        <p className={styles.loadingText}>Cargando formato...</p>
      ) : !selectedId ? (
        <div className={styles.emptyStateCompact}>
          Selecciona un formato para visualizar sus respuestas en tabla.
        </div>
      ) : !formato ? (
        <div className={styles.emptyStateCompact}>Formato no encontrado.</div>
      ) : !filas.length ? (
        <div className={styles.emptyStateCompact}>
          Este formato aún no tiene respuestas.{" "}
          <Link href="/dashboard/llenar-formatos">Llénalo aquí</Link>.
        </div>
      ) : (
        <div className={styles.tableWrapWide}>
          <table
            className={styles.tableWide}
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            <thead>
              <tr>
                <th
                  className={`${styles.rowHeader} ${styles.stickyCol}`}
                  style={{ width: 36, minWidth: 36 }}
                >
                  #
                </th>
                {columnas.map((col) => {
                  const width = getColumnWidth(col.titulo, widthOpts);
                  return (
                    <th
                      key={col.id_columna}
                      className={
                        titulosHorizontales
                          ? styles.columnHeaderHorizontal
                          : styles.columnHeader
                      }
                      style={{ width, minWidth: width }}
                      title={col.titulo}
                    >
                      {col.titulo}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, index) => (
                <tr key={fila.id_fila}>
                  <td className={`${styles.rowHeader} ${styles.stickyCol}`}>
                    {index + 1}
                  </td>
                    {columnas.map((col) => {
                      const width = getColumnWidth(col.titulo, widthOpts);
                      const raw = valorCeldaConYtd(col, fila.celdas || {});
                      const labels = etiquetasDoble(fila);
                      const dobles = new Set(
                        parseColumnasDobles(fila.columnas_dobles),
                      );
                      const esDoble =
                        (typeof raw === "object" && raw != null) ||
                        dobles.has(Number(col.id_columna)) ||
                        isValorDoble(raw);

                      if (esDoble) {
                        const doble = parseDobleValor(raw);
                        const reglasFila =
                          fila.reglas_dobles?.[Number(col.id_columna)] || [];
                        const style1 = getEstiloCeldaDoble(
                          "v1",
                          doble,
                          col.reglas,
                          fila.celdas || {},
                          reglasFila,
                        );
                        const style2 = getEstiloCeldaDoble(
                          "v2",
                          doble,
                          col.reglas,
                          fila.celdas || {},
                          reglasFila,
                        );
                        return (
                          <td
                            key={col.id_columna}
                            className={styles.cell}
                            style={{
                              width,
                              minWidth: width,
                              maxWidth: width,
                            }}
                          >
                            <div className={styles.dobleCell}>
                              <div
                                className={styles.dobleCellHalf}
                                style={style1 || undefined}
                              >
                                <span className={styles.dobleCellTag}>
                                  {labels.etiqueta1}
                                </span>
                                {doble.v1 || "—"}
                              </div>
                              <div
                                className={styles.dobleCellHalf}
                                style={style2 || undefined}
                              >
                                <span className={styles.dobleCellTag}>
                                  {labels.etiqueta2}
                                </span>
                                {doble.v2 || "—"}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      const valor = valorEscalar(raw);
                      const reglaStyle = getEstiloPorReglas(
                        valor,
                        col.reglas,
                        fila.celdas || {},
                      );
                      return (
                        <td
                          key={col.id_columna}
                          className={styles.cell}
                          style={{
                            width,
                            minWidth: width,
                            maxWidth: width,
                            ...(reglaStyle || {}),
                          }}
                        >
                          <div
                            className={styles.cellReadonly}
                            style={
                              reglaStyle
                                ? {
                                    color: reglaStyle.color,
                                    background: "transparent",
                                  }
                                : undefined
                            }
                          >
                            {valor || "—"}
                          </div>
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
