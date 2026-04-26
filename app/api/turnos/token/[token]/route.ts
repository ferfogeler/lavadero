import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function verificarPatente(token: string, patente: string) {
  const turno = await prisma.turno.findUnique({
    where: { tokenModificacion: token },
    include: { cliente: true },
  });
  if (!turno) return { turno: null, error: "Turno no encontrado" };
  if (turno.patente?.toUpperCase() !== patente.toUpperCase()) {
    return { turno: null, error: "Patente incorrecta" };
  }
  return { turno, error: null };
}

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const turno = await prisma.turno.findUnique({
    where: { tokenModificacion: params.token },
    include: { cliente: true },
  });
  if (!turno) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  return NextResponse.json(turno);
}

export async function PUT(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json();
  const { patente, fecha, hora_inicio } = body;

  const { turno, error } = await verificarPatente(params.token, patente);
  if (error || !turno) return NextResponse.json({ error }, { status: 400 });

  if (!["pendiente", "confirmado"].includes(turno.estado)) {
    return NextResponse.json({ error: "El turno no puede ser modificado" }, { status: 400 });
  }

  const config = await prisma.configuracionLavado.findUnique({
    where: { tipo_vehiculo: turno.tipo_vehiculo },
  });
  const inicio = new Date(`1970-01-01T${hora_inicio}:00`);
  const fin = new Date(inicio.getTime() + (config?.duracion_minutos || 60) * 60000);

  const updated = await prisma.turno.update({
    where: { tokenModificacion: params.token },
    data: { fecha: new Date(fecha), hora_inicio: inicio, hora_fin: fin },
    include: { cliente: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json();
  const { patente } = body;

  const { turno, error } = await verificarPatente(params.token, patente);
  if (error || !turno) return NextResponse.json({ error }, { status: 400 });

  if (!["pendiente", "confirmado"].includes(turno.estado)) {
    return NextResponse.json({ error: "El turno no puede ser cancelado" }, { status: 400 });
  }

  const updated = await prisma.turno.update({
    where: { tokenModificacion: params.token },
    data: { estado: "cancelado" },
  });

  return NextResponse.json(updated);
}
