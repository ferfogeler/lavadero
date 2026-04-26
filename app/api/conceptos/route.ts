export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const soloActivos = searchParams.get("activos") === "true";

  const conceptos = await prisma.concepto.findMany({
    where: {
      ...(tipo ? { tipoConcepto: tipo as "ingreso" | "egreso" | "gasto" } : {}),
      ...(soloActivos ? { activo: true } : {}),
    },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(conceptos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, tipoConcepto } = body;
  if (!nombre || !tipoConcepto) return NextResponse.json({ error: "Campos requeridos" }, { status: 400 });
  const c = await prisma.concepto.create({ data: { nombre, tipoConcepto } });
  return NextResponse.json(c);
}
