import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";

export async function GET(_request, { params }) {
  try {
    const { emp_alias } = await params;

    if (!emp_alias) {
      return NextResponse.json(
        { success: false, error: "El alias del empleado es requerido" },
        { status: 400 },
      );
    }

    const [rows] = await empleados.query(
      "SELECT * FROM del_empleados WHERE emp_alias = ?",
      [emp_alias],
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error al buscar empleado:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al consultar la base de datos",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
