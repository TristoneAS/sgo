import { NextResponse } from "next/server";

export function jsonOk(data, message, status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function jsonError(error, status = 500, details) {
  return NextResponse.json(
    { success: false, error, ...(details ? { details } : {}) },
    { status },
  );
}

export function parseId(params, key) {
  const raw = params?.[key];
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
