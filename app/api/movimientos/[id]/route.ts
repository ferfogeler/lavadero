export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { horaSalida, monto, descripcion, tipo, conceptoId, fecha } = body;

  const data: Record<string, unknown> = {};
  if (horaSalida !== undefined) data.horaSalida = horaSalida ? new Date(horaSalida) : null;
  if (monto !== undefined) data.monto = parseFloat(monto);
  if (descripcion !== undefined) data.descripcion = descripcion || null;
  if (tipo !== undefined) data.tipo = tipo;
  if (conceptoId !== undefined) data.conceptoId = conceptoId ? parseInt(conceptoId) : null;
  if (fecha !== undefined) data.fecha = fecha ? new Date(fecha) : undefined;

  const mov = await prisma.movimientoCaja.update({
    where: { id: parseInt(params.id) },
    data,
    include: { cliente: true, concepto: true },
  });

  return NextResponse.json(mov);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.movimientoCaja.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
