import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";
import { sgoDb } from "@/libs/sgo_db";

export async function GET() {
  const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL || "";
  const checks = {
    ok: true,
    authUrlConfigured: Boolean(authUrl),
    authUrlHost: authUrl ? (() => {
      try {
        return new URL(authUrl).host;
      } catch {
        return "URL inválida";
      }
    })() : null,
    mysqlHost: process.env.MYSQL_HOST || null,
    mysqlEmpDb: process.env.MYSQL_DATABASE_EMP || null,
    mysqlSgoDb: process.env.MYSQL_DATABASE_SGO || null,
    authReachable: false,
    empleadosDbOk: false,
    sgoDbOk: false,
    errors: [],
  };

  if (!authUrl) {
    checks.ok = false;
    checks.errors.push(
      "Falta NEXT_PUBLIC_AUTH_SERVER_URL en el .env del servidor",
    );
  } else {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${authUrl}/SYSTEMVDOCS/AUTHENTICATE`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "__health__", password: "__health__" }),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      // Cualquier respuesta HTTP cuenta como alcanzable
      checks.authReachable = true;
      checks.authStatus = res.status;
    } catch (error) {
      checks.ok = false;
      checks.errors.push(
        `No se alcanza el servidor de auth (${authUrl}): ${error.message}`,
      );
    }
  }

  try {
    await empleados.query("SELECT 1 AS ok");
    checks.empleadosDbOk = true;
  } catch (error) {
    checks.ok = false;
    checks.errors.push(
      `MySQL empleados (${process.env.MYSQL_DATABASE_EMP}): ${error.message}`,
    );
  }

  try {
    await sgoDb.query("SELECT 1 AS ok");
    checks.sgoDbOk = true;
  } catch (error) {
    checks.ok = false;
    checks.errors.push(
      `MySQL sgo (${process.env.MYSQL_DATABASE_SGO}): ${error.message}`,
    );
  }

  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
