import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let where: Record<string, unknown> = {};

  if (fecha) {
    const d = new Date(fecha);
    const d2 = new Date(fecha);
    d2.setDate(d2.getDate() + 1);
    where.fecha = { gte: d, lt: d2 };
  } else if (desde && hasta) {
    const h = new Date(hasta);
    h.setDate(h.getDate() + 1);
    where.fecha = { gte: new Date(desde), lt: h };
  }

  const movimientos = await prisma.movimientoCaja.findMany({
    where,
    include: { cliente: true, concepto: true, turno: true },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(movimientos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tipo, patente, conceptoId, monto, descripcion, horaEntrada, horaSalida, fecha } = body;

  if (!tipo || !monto) {
    return NextResponse.json({ error: "tipo y monto son requeridos" }, { status: 400 });
  }

  const mov = await prisma.movimientoCaja.create({
    data: {
      tipo,
      patente: patente?.toUpperCase() || null,
      conceptoId: conceptoId ? parseInt(conceptoId) : null,
      monto: parseFloat(monto),
      descripcion: descripcion || null,
      horaEntrada: horaEntrada ? new Date(horaEntrada) : null,
      horaSalida: horaSalida ? new Date(horaSalida) : null,
      fecha: fecha ? new Date(fecha) : new Date(),
    },
    include: { cliente: true, concepto: true },
  });

  return NextResponse.json(mov);
}
