"use client";

import { useState } from "react";
import DashboardShell from "@/app/components/DashboardShell";
import DocumentosQuickView from "@/app/components/DocumentosQuickView";
import FormatosExcelTable from "@/app/components/FormatosExcelTable";
import styles from "@/app/dashboard/dashboard.module.css";

export default function DashboardPage() {
  const [vista, setVista] = useState("formatos");

  return (
    <DashboardShell
      title="Tablero"
      subtitle="Consulta formatos llenados o documentos"
      wide
      compact
    >
      <div className={styles.tableroSwitch}>
        <button
          type="button"
          className={`${styles.tableroSwitchBtn} ${
            vista === "formatos" ? styles.tableroSwitchBtnActive : ""
          }`}
          onClick={() => setVista("formatos")}
        >
          Formatos
        </button>
        <button
          type="button"
          className={`${styles.tableroSwitchBtn} ${
            vista === "documentos" ? styles.tableroSwitchBtnActive : ""
          }`}
          onClick={() => setVista("documentos")}
        >
          Documentos
        </button>
      </div>

      {vista === "formatos" ? (
        <div className={styles.tableroSoloVista}>
          <FormatosExcelTable />
        </div>
      ) : (
        <div className={styles.tableroSoloVista}>
          <DocumentosQuickView />
        </div>
      )}
    </DashboardShell>
  );
}
