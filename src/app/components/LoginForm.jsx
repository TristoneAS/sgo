"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSafeRedirectPath,
  getSessionExpiresAt,
  setSessionCookieClient,
} from "@/libs/auth_session";
import styles from "../page.module.css";

export default function LoginForm() {
  const router = useRouter();
  const [user, setUser] = useState({ user: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  function handleInputChange(event) {
    const { name, value } = event.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    if (message.text) setMessage({ text: "", type: "" });
  }

  function getRedirectPath() {
    if (typeof window === "undefined") return "/dashboard";
    const params = new URLSearchParams(window.location.search);
    return getSafeRedirectPath(params.get("redirect"));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!user.user.trim() || !user.password) {
      setMessage({ text: "Favor de llenar todos los campos", type: "warning" });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ text: "", type: "" });

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.user.trim(),
          password: user.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage({
          text: data.error || "Credenciales inválidas",
          type: "error",
        });
        setIsLoading(false);
        return;
      }

      const authData = data.data || {};

      try {
        const empleadoResponse = await fetch(
          `/api/empleados/by-alias/${encodeURIComponent(user.user.trim())}`,
        );
        const empleadoData = await empleadoResponse.json();

        if (empleadoResponse.ok && empleadoData.success) {
          localStorage.setItem("infoUser", JSON.stringify(empleadoData.data));
          localStorage.setItem("user", JSON.stringify(authData));
          localStorage.setItem("isAuthenticated", "true");
          localStorage.setItem("usuario", user.user.trim());

          const adminFlag =
            authData.isAdmin === true ||
            authData.isAdmin === "true" ||
            authData.isAdmin === 1;
          localStorage.setItem("isAdmin", adminFlag ? "true" : "false");

          const expiresAt = getSessionExpiresAt();
          localStorage.setItem("sessionExpiresAt", expiresAt.toString());
          setSessionCookieClient(expiresAt);

          setMessage({ text: "Iniciando sesión en SGO...", type: "success" });
          setTimeout(() => router.replace(getRedirectPath()), 300);
        } else {
          setMessage({
            text: "El alias del empleado no está registrado",
            type: "error",
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error al obtener información del empleado:", error);
        setMessage({
          text: "El alias del empleado no está registrado",
          type: "error",
        });
        setIsLoading(false);
      }
    } catch {
      setMessage({
        text: "Error al conectar con el servidor, contacte a soporte",
        type: "error",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.background}>
        <div className={styles.mesh} />
        <div className={styles.orbOne} />
        <div className={styles.orbTwo} />
        <div className={styles.orbThree} />
        <div className={styles.gridOverlay} />
      </div>

      <main className={styles.main}>
        <section className={styles.loginShell}>
          <aside className={styles.brandPanel}>
            <div className={styles.brandGlow} />
            <div className={styles.logoMark}>
              <img
                src="/tristone_logo_head.png"
                alt="Tristone"
                className={styles.logoImage}
              />
            </div>
            <p className={styles.brandEyebrow}>Tristone Flowtech</p>
            <h1 className={styles.brandTitle}>SGO</h1>
            <p className={styles.brandCopy}>
              Formatos, documentos y operación en un solo lugar.
            </p>
            <ul className={styles.brandPoints}>
              <li>Visualiza formatos llenados</li>
              <li>Gestiona documentos</li>
              <li>Acceso seguro con tu alias</li>
            </ul>
          </aside>

          <div className={styles.card}>
            <header className={styles.header}>
              <h2>Bienvenido</h2>
              <p>Ingresa con tu usuario de Tristone</p>
            </header>

            {message.text ? (
              <div
                className={`${styles.alert} ${styles[`alert${message.type.charAt(0).toUpperCase()}${message.type.slice(1)}`]}`}
                role="alert"
              >
                {message.text}
              </div>
            ) : null}

            <form
              className={styles.form}
              method="post"
              action="#"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className={styles.field}>
                <label htmlFor="user">Usuario</label>
                <input
                  id="user"
                  name="user"
                  type="text"
                  placeholder="Tu alias de Tristone"
                  value={user.user}
                  onChange={handleInputChange}
                  autoComplete="username"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="password">Contraseña</label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={user.password}
                    onChange={handleInputChange}
                    autoComplete="current-password"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
            </form>

            <footer className={styles.footer}>
              <p>Sistema de Gestión Operativa</p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
