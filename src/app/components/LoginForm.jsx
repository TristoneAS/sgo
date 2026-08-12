"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSafeRedirectPath,
  getSessionExpiresAt,
  setSessionCookieClient,
} from "@/libs/auth_session";
import styles from "../page.module.css";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState({ user: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  function handleInputChange(event) {
    const { name, value } = event.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    if (message.text) setMessage({ text: "", type: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user.user.trim() || !user.password) {
      setMessage({ text: "Favor de llenar todos los campos", type: "warning" });
      return;
    }

    const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
    if (!authUrl) {
      setMessage({
        text: "Servidor de autenticación no configurado",
        type: "error",
      });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ text: "", type: "" });

      const response = await fetch(
        `${authUrl}/SYSTEMVDOCS/AUTHENTICATE`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.user.trim(),
            password: user.password,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.authorization !== "Unauthorized") {
        try {
          const empleadoResponse = await fetch(
            `/api/empleados/by-alias/${encodeURIComponent(user.user.trim())}`,
          );
          const empleadoData = await empleadoResponse.json();

          if (empleadoResponse.ok && empleadoData.success) {
            localStorage.setItem("infoUser", JSON.stringify(empleadoData.data));
            localStorage.setItem("user", JSON.stringify(data));
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("usuario", user.user.trim());

            const adminFlag =
              data.isAdmin === true ||
              data.isAdmin === "true" ||
              data.isAdmin === 1;
            localStorage.setItem("isAdmin", adminFlag ? "true" : "false");

            const expiresAt = getSessionExpiresAt();
            localStorage.setItem("sessionExpiresAt", expiresAt.toString());
            setSessionCookieClient(expiresAt);

            setMessage({ text: "Iniciando sesión en SGO...", type: "success" });

            const dest = getSafeRedirectPath(searchParams.get("redirect"));
            setTimeout(() => router.replace(dest), 300);
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
      } else {
        setMessage({
          text:
            "Error en autenticación: " +
            (data.message || "Credenciales inválidas"),
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

            <form className={styles.form} onSubmit={handleSubmit}>
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
