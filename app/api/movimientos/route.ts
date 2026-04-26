export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const whereMovimiento: Record<string, unknown> = {};
  let fechaInicio: Date | null = null;
  let fechaFin: Date | null = null;

  if (fecha) {
    fechaInicio = new Date(fecha);
    fechaFin = new Date(fecha);
    fechaFin.setDate(fechaFin.getDate() + 1);
    whereMovimiento.fecha = { gte: fechaInicio, lt: fechaFin };
  } else if (desde && hasta) {
    fechaInicio = new Date(desde);
    fechaFin = new Date(hasta);
    fechaFin.setDate(fechaFin.getDate() + 1);
    whereMovimiento.fecha = { gte: fechaInicio, lt: fechaFin };
  }

  const movimientos = await prisma.movimientoCaja.findMany({
    where: whereMovimiento,
    include: { cliente: true, concepto: true, turno: true },
    orderBy: { fecha: "desc" },
  });

  // Incluir turnos confirmados/completados sin movimiento de caja
  if (fechaInicio && fechaFin) {
    const turnosSinMovimiento = await prisma.turno.findMany({
      where: {
        fecha: { gte: fechaInicio, lt: fechaFin },
        estado: { in: ["confirmado", "completado"] },
        movimiento: null,
      },
      include: { cliente: true },
    });

    if (turnosSinMovimiento.length > 0) {
      const configs = await prisma.configuracionLavado.findMany();
      const precioMap = Object.fromEntries(configs.map((c) => [c.tipo_vehiculo, c.precio]));

      const turnosComoMov = turnosSinMovimiento.map((t) => ({
        id: -(t.id),
        fecha: t.fecha,
        tipo: "lavado",
        patente: t.patente,
        conceptoId: null,
        monto: (precioMap[t.tipo_vehiculo] ?? 0).toString(),
        descripcion: `Lavado ${t.tipo_vehiculo} - ${t.patente ?? "s/patente"}`,
        horaEntrada: null,
        horaSalida: null,
        turnoId: t.id,
        cliente: t.cliente,
        concepto: null,
        turno: t,
      }));

      return NextResponse.json([...movimientos, ...turnosComoMov]);
    }
  }

  return NextResponse.json(movimientos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tipo, patente, conceptoId, monto, descripcion, horaEntrada, horaSalida, fecha } = body;

  if (!tipo || monto === undefined || monto === null) {
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
