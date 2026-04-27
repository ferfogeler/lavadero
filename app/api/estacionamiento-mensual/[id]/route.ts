export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const body = await req.json();

  if (!body.cobrar) {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  const { monto } = body;
  if (monto === undefined || monto === null) {
    return NextResponse.json({ error: "monto es requerido" }, { status: 400 });
  }

  const estadia = await prisma.estacionamientoMensual.findUnique({ where: { id } });
  if (!estadia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (estadia.estado === "pagado") return NextResponse.json({ error: "Ya está pagada" }, { status: 400 });

  const labelTipo = estadia.tipo === "mensual_completa" ? "Mensual estadía completa" : "Mensual media estadía";

  // Create real MovimientoCaja
  await prisma.movimientoCaja.create({
    data: {
      tipo: "estacionamiento",
      patente: estadia.patente,
      monto: parseFloat(monto),
      descripcion: `${labelTipo} ${estadia.mes}/${estadia.anio}`,
    },
  });

  // Mark as paid
  const updated = await prisma.estacionamientoMensual.update({
    where: { id },
    data: {
      estado: "pagado",
      montoPagado: parseFloat(monto),
      fechaPago: new Date(),
    },
    include: { cliente: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  await prisma.estacionamientoMensual.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
