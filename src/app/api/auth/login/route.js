import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let username = "";
    let password = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      username = String(body?.username || "").trim();
      password = String(body?.password || "");
    } else {
      // Fallback si el navegador envía el form sin JS (x-www-form-urlencoded)
      const form = await request.formData();
      username = String(form.get("user") || form.get("username") || "").trim();
      password = String(form.get("password") || "");
    }

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Favor de llenar todos los campos",
          step: "validation",
        },
        { status: 400 },
      );
    }

    const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
    if (!authUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Servidor de autenticación no configurado (.env.local)",
          step: "config",
        },
        { status: 500 },
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

      if (!response.ok || authData.authorization === "Unauthorized") {
        return NextResponse.json(
          {
            success: false,
            error:
              authData.message ||
              authData.error ||
              "Credenciales inválidas",
            step: "authenticate",
          },
          { status: 401 },
        );
      }
    } catch (error) {
      console.error("Error contactando AUTH:", error);
      return NextResponse.json(
        {
          success: false,
          error: `No se pudo contactar el servidor de autenticación (${authUrl})`,
          step: "auth_unreachable",
          details: error.message,
        },
        { status: 502 },
      );
    }

    let empleado;
    try {
      const [rows] = await empleados.query(
        "SELECT * FROM del_empleados WHERE emp_alias = ?",
        [username],
      );

      if (!rows.length) {
        return NextResponse.json(
          {
            success: false,
            error: `El alias "${username}" no está en empleados.del_empleados`,
            step: "empleado",
          },
          { status: 404 },
        );
      }

      empleado = rows[0];
    } catch (error) {
      console.error("Error consultando empleados:", error);
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo consultar MySQL (empleados)",
          step: "empleado_db",
          details: error.message,
        },
        { status: 500 },
      );
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
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al iniciar sesión",
        step: "internal",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
