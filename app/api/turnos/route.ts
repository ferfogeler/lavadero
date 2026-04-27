export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const fecha = searchParams.get("fecha");

  const whereDate = fecha
    ? { fecha: new Date(fecha) }
    : desde && hasta
    ? { fecha: { gte: new Date(desde), lte: new Date(hasta) } }
    : {};

  const turnos = await prisma.turno.findMany({
    where: whereDate,
    include: { cliente: true },
    orderBy: [{ fecha: "asc" }, { hora_inicio: "asc" }],
  });

  return NextResponse.json(turnos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patente, tipo_vehiculo, servicio = "completo", fecha, hora_inicio, creadoPor = "web" } = body;

  if (!tipo_vehiculo || !fecha || !hora_inicio) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  // Buscar duración en ConfiguracionServicio
  const configServicio = await prisma.configuracionServicio.findUnique({
    where: { tipo_vehiculo_servicio: { tipo_vehiculo, servicio } },
  });

  // Fallback a ConfiguracionLavado legacy
  const duracion = configServicio?.duracion_minutos
    ?? (await prisma.configuracionLavado.findUnique({ where: { tipo_vehiculo } }))?.duracion_minutos
    ?? 60;

  const inicio = new Date(`1970-01-01T${hora_inicio}:00`);
  const fin = new Date(inicio.getTime() + duracion * 60000);

  const turno = await prisma.turno.create({
    data: {
      patente: patente?.toUpperCase() || null,
      tipo_vehiculo,
      servicio,
      fecha: new Date(fecha),
      hora_inicio: inicio,
      hora_fin: fin,
      creadoPor,
    },
    include: { cliente: true },
  });

  return NextResponse.json(turno);
}
