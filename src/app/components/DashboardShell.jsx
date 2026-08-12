"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  clearAuthStorageClient,
  isAuthenticatedClient,
  syncSessionCookieFromStorage,
} from "@/libs/auth_session";
import styles from "./DashboardShell.module.css";

function NavLink({ href, children, icon }) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
    >
      <span className={styles.navIcon}>{icon}</span>
      {children}
    </Link>
  );
}

export default function DashboardShell({
  title,
  subtitle,
  wide,
  compact,
  children,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState("");
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(
    pathname.startsWith("/dashboard/configuracion") ||
      pathname.startsWith("/dashboard/llenar-formatos") ||
      pathname.startsWith("/dashboard/documentos"),
  );

  useEffect(() => {
    syncSessionCookieFromStorage();

    if (!isAuthenticatedClient()) {
      router.replace("/");
      return;
    }

    setUsuario(localStorage.getItem("usuario") || "");
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (
      pathname.startsWith("/dashboard/configuracion") ||
      pathname.startsWith("/dashboard/llenar-formatos") ||
      pathname.startsWith("/dashboard/documentos")
    ) {
      setConfigOpen(true);
    }
  }, [pathname]);

  function handleLogout() {
    clearAuthStorageClient();
    router.replace("/");
  }

  if (!ready) {
    return <div className={styles.loading}>Cargando...</div>;
  }

  return (
    <div className={styles.dashboardShell}>
      {!sidebarOpen ? (
        <button
          type="button"
          className={styles.sidebarReveal}
          onClick={() => setSidebarOpen(true)}
          aria-label="Mostrar menú"
        >
          ☰
        </button>
      ) : null}

      <aside
        className={`${styles.sidebar} ${sidebarOpen ? "" : styles.sidebarHidden}`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeaderTop}>
            <div className={styles.brandBlock}>
              <div className={styles.brand}>
                <img
                  src="/tristone_logo_head.png"
                  alt="Tristone"
                  className={styles.brandImage}
                />
              </div>
              <div className={styles.brandMeta}>
                <div className={styles.sidebarTitle}>SGO</div>
                <div className={styles.sidebarSubtitle}>
                  Formatos y documentos
                </div>
              </div>
            </div>
            <button
              type="button"
              className={styles.sidebarHideBtn}
              onClick={() => setSidebarOpen(false)}
              aria-label="Ocultar menú"
            >
              ◀
            </button>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <div className={styles.navSectionTitle}>Principal</div>
            <NavLink href="/dashboard" icon="▦">
              Tablero
            </NavLink>
          </div>

          <div className={styles.navSection}>
            <div className={styles.navSectionTitle}>Menú</div>
            <button
              type="button"
              className={styles.navGroupButton}
              onClick={() => setConfigOpen((prev) => !prev)}
            >
              <span className={styles.navIcon}>⚙</span>
              Configuración
              <span style={{ marginLeft: "auto", fontSize: 12 }}>
                {configOpen ? "▾" : "▸"}
              </span>
            </button>

            {configOpen ? (
              <div className={styles.submenu}>
                <NavLink
                  href="/dashboard/configuracion/formatos/nuevo"
                  icon="✎"
                >
                  Crear Formatos
                </NavLink>
                <NavLink href="/dashboard/configuracion/formatos" icon="📋">
                  Gestionar Formatos
                </NavLink>
                <NavLink href="/dashboard/llenar-formatos" icon="✎">
                  Llenar formatos
                </NavLink>
                <NavLink href="/dashboard/documentos" icon="📁">
                  Cargar Documentos
                </NavLink>
              </div>
            ) : null}
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userBox}>
            <div className={styles.userLabel}>Usuario</div>
            <div className={styles.userName}>{usuario}</div>
          </div>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={styles.content}>
        {!compact && (title || subtitle) ? (
          <header className={styles.topBar}>
            {title ? <h1>{title}</h1> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </header>
        ) : null}
        <main
          className={`${styles.main} ${wide ? styles.mainWide : ""} ${compact ? styles.mainCompact : ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
