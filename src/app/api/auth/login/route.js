import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Favor de llenar todos los campos" },
        { status: 400 },
      );
    }

    const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
    if (!authUrl) {
      return NextResponse.json(
        { success: false, error: "Servidor de autenticación no configurado" },
        { status: 500 },
      );
    }

    const response = await fetch(`${authUrl}/SYSTEMVDOCS/AUTHENTICATE`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok || data.authorization === "Unauthorized") {
      return NextResponse.json(
        {
          success: false,
          error:
            data.message ||
            data.error ||
            "Credenciales inválidas",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error en /api/auth/login:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al conectar con el servidor de autenticación",
      },
      { status: 502 },
    );
  }
}
