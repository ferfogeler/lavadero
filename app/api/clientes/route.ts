export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const take = parseInt(searchParams.get("take") || "20");
  const clientes = await prisma.cliente.findMany({
    where: q ? {
      OR: [
        { patente: { contains: q.toUpperCase() } },
        { nombre: { contains: q, mode: "insensitive" } },
        { apellido: { contains: q, mode: "insensitive" } },
      ],
    } : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });
  return NextResponse.json(clientes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patente, nombre, apellido, celular, tipo_vehiculo, clienteMensual, tipoMensual } = body;

  if (!patente || !nombre || !apellido || !celular || !tipo_vehiculo) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  const cliente = await prisma.cliente.upsert({
    where: { patente: patente.toUpperCase() },
    update: { nombre, apellido, celular, tipo_vehiculo, clienteMensual: clienteMensual ?? false, tipoMensual: tipoMensual ?? null },
    create: { patente: patente.toUpperCase(), nombre, apellido, celular, tipo_vehiculo, clienteMensual: clienteMensual ?? false, tipoMensual: tipoMensual ?? null },
  });

  return NextResponse.json(cliente);
}
