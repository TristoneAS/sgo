import { NextResponse } from "next/server";
import { isAuthResponseOk, mensajeErrorAuth } from "@/libs/auth_login";
import { empleados } from "@/libs/empleados";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_VALUE,
  getSessionExpiresAt,
  getSafeRedirectPath,
} from "@/libs/auth_session";

function wantsHtmlResponse(request, contentType) {
  if (contentType.includes("application/json")) return false;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

function jsonError(error, status, step, details) {
  return NextResponse.json(
    {
      success: false,
      error,
      step,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

function htmlRedirect(path, message) {
  const safePath = getSafeRedirectPath(path);
  const msg = message
    ? `<p>${String(message).replace(/</g, "&lt;")}</p>`
    : "<p>Entrando al sistema...</p>";
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=${safePath}" />
  <title>SGO</title>
</head>
<body>
  ${msg}
  <script>location.replace(${JSON.stringify(safePath)});</script>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function htmlLoginSuccess({ authData, empleado, username, redirectPath }) {
  const expiresAt = getSessionExpiresAt();
  const expires = new Date(expiresAt).toUTCString();
  const adminFlag =
    authData?.isAdmin === true ||
    authData?.isAdmin === "true" ||
    authData?.isAdmin === 1;

  const payload = {
    infoUser: empleado,
    user: authData,
    isAuthenticated: "true",
    usuario: username,
    isAdmin: adminFlag ? "true" : "false",
    sessionExpiresAt: String(expiresAt),
    redirect: getSafeRedirectPath(redirectPath),
    cookie: `${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}; expires=${expires}; path=/; SameSite=Lax`,
  };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Entrando a SGO...</title>
</head>
<body>
  <p>Iniciando sesión en SGO...</p>
  <script>
    (function () {
      var d = ${JSON.stringify(payload)};
      try {
        localStorage.setItem("infoUser", JSON.stringify(d.infoUser));
        localStorage.setItem("user", JSON.stringify(d.user));
        localStorage.setItem("isAuthenticated", d.isAuthenticated);
        localStorage.setItem("usuario", d.usuario);
        localStorage.setItem("isAdmin", d.isAdmin);
        localStorage.setItem("sessionExpiresAt", d.sessionExpiresAt);
        document.cookie = d.cookie;
      } catch (e) {}
      location.replace(d.redirect);
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  const asHtml = wantsHtmlResponse(request, contentType);

  try {
    let username = "";
    let password = "";
    let redirectPath = "/dashboard";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      username = String(body?.username || "").trim();
      password = String(body?.password || "");
      redirectPath = getSafeRedirectPath(body?.redirect);
    } else {
      const form = await request.formData();
      username = String(form.get("user") || form.get("username") || "").trim();
      password = String(form.get("password") || "");
      redirectPath = getSafeRedirectPath(form.get("redirect"));
    }

    if (!username || !password) {
      if (asHtml) {
        return htmlRedirect("/?error=campos", "Favor de llenar todos los campos");
      }
      return jsonError("Favor de llenar todos los campos", 400, "validation");
    }

    const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
    if (!authUrl) {
      if (asHtml) {
        return htmlRedirect(
          "/?error=config",
          "Servidor de autenticación no configurado",
        );
      }
      return jsonError(
        "Servidor de autenticación no configurado (.env.local)",
        500,
        "config",
      );
    }

    let authData = {};
    try {
      const response = await fetch(`${authUrl}/SYSTEMVDOCS/AUTHENTICATE`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      });

      try {
        authData = await response.json();
      } catch {
        authData = {};
      }

      // Mismo criterio que system-v-docs: solo si authenticated === true
      if (!isAuthResponseOk(response, authData)) {
        const msg = mensajeErrorAuth(authData);
        if (asHtml) return htmlRedirect("/?error=auth", msg);
        return jsonError(msg, 401, "authenticate");
      }
    } catch (error) {
      console.error("Error contactando AUTH:", error);
      const msg =
        "Error al conectar con el servidor de autenticación, contacte a soporte";
      if (asHtml) return htmlRedirect("/?error=auth_unreachable", msg);
      return jsonError(msg, 502, "auth_unreachable", error.message);
    }

    let empleado;
    try {
      const [rows] = await empleados.query(
        "SELECT * FROM del_empleados WHERE emp_alias = ?",
        [username],
      );

      if (!rows.length) {
        const msg = "El alias del empleado no está registrado";
        if (asHtml) return htmlRedirect("/?error=empleado", msg);
        return jsonError(msg, 404, "empleado");
      }

      empleado = rows[0];
    } catch (error) {
      console.error("Error consultando empleados:", error);
      const msg = "No se pudo consultar la base de empleados";
      if (asHtml) return htmlRedirect("/?error=empleado_db", msg);
      return jsonError(msg, 500, "empleado_db", error.message);
    }

    if (asHtml) {
      return htmlLoginSuccess({
        authData,
        empleado,
        username,
        redirectPath,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        auth: authData,
        empleado,
      },
    });
  } catch (error) {
    console.error("Error en /api/auth/login:", error);
    if (asHtml) {
      return htmlRedirect("/?error=internal", "Error interno al iniciar sesión");
    }
    return jsonError(
      "Error interno al iniciar sesión",
      500,
      "internal",
      error.message,
    );
  }
}
