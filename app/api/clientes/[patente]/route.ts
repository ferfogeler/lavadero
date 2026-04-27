export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { patente: string } }) {
  const cliente = await prisma.cliente.findUnique({
    where: { patente: params.patente.toUpperCase() },
  });
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(cliente);
}

export async function PUT(req: NextRequest, { params }: { params: { patente: string } }) {
  const body = await req.json();
  const { nombre, apellido, celular, tipo_vehiculo, clienteMensual, tipoMensual } = body;
  if (!nombre || !apellido || !celular || !tipo_vehiculo) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }
  const cliente = await prisma.cliente.update({
    where: { patente: params.patente.toUpperCase() },
    data: {
      nombre,
      apellido,
      celular,
      tipo_vehiculo,
      clienteMensual: clienteMensual ?? false,
      tipoMensual: clienteMensual ? (tipoMensual ?? null) : null,
    },
  });
  return NextResponse.json(cliente);
}

export async function DELETE(_: NextRequest, { params }: { params: { patente: string } }) {
  await prisma.cliente.delete({
    where: { patente: params.patente.toUpperCase() },
  });
  return NextResponse.json({ ok: true });
}
