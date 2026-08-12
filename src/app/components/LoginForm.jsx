"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSafeRedirectPath,
  getSessionExpiresAt,
  setSessionCookieClient,
} from "@/libs/auth_session";
import styles from "../page.module.css";

export default function LoginForm() {
  const router = useRouter();
  const submittingRef = useRef(false);
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

  async function doLogin(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (submittingRef.current || isLoading) return;

    const username = user.user.trim();
    const password = user.password;

    if (!username || !password) {
      setMessage({ text: "Favor de llenar todos los campos", type: "warning" });
      return;
    }

    submittingRef.current = true;
    setIsLoading(true);
    setMessage({ text: "Validando usuario...", type: "" });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || !data.success) {
        setMessage({
          text: data.error || "No se pudo iniciar sesión",
          type: "error",
        });
        return;
      }

      const authData = data.data?.auth || {};
      const empleado = data.data?.empleado || {};

      localStorage.setItem("infoUser", JSON.stringify(empleado));
      localStorage.setItem("user", JSON.stringify(authData));
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("usuario", username);

      const adminFlag =
        authData.isAdmin === true ||
        authData.isAdmin === "true" ||
        authData.isAdmin === 1;
      localStorage.setItem("isAdmin", adminFlag ? "true" : "false");

      const expiresAt = getSessionExpiresAt();
      localStorage.setItem("sessionExpiresAt", expiresAt.toString());
      setSessionCookieClient(expiresAt);

      setMessage({ text: "Iniciando sesión en SGO...", type: "success" });
      setTimeout(() => router.replace(getRedirectPath()), 250);
    } catch (error) {
      console.error("Login error:", error);
      setMessage({
        text: "Error al conectar con el servidor, contacte a soporte",
        type: "error",
      });
    } finally {
      submittingRef.current = false;
      setIsLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      void doLogin(event);
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
                className={`${styles.alert} ${
                  message.type === "error"
                    ? styles.alertError
                    : message.type === "warning"
                      ? styles.alertWarning
                      : message.type === "success"
                        ? styles.alertSuccess
                        : ""
                }`}
                role="alert"
              >
                {message.text}
              </div>
            ) : null}

            <form
              className={styles.form}
              method="post"
              action="/api/auth/login"
              onSubmit={doLogin}
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
                  onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
                {isLoading ? "Validando..." : "Iniciar sesión"}
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
