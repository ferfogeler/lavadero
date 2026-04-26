export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const turno = await prisma.turno.findUnique({
    where: { id: parseInt(params.id) },
    include: { cliente: true },
  });
  if (!turno) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(turno);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { estado, fecha, hora_inicio } = body;

  const turno = await prisma.turno.findUnique({
    where: { id: parseInt(params.id) },
    include: { movimiento: true },
  });
  if (!turno) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (estado) updateData.estado = estado;

  if (fecha && hora_inicio) {
    const config = await prisma.configuracionLavado.findUnique({
      where: { tipo_vehiculo: turno.tipo_vehiculo },
    });
    const inicio = new Date(`1970-01-01T${hora_inicio}:00`);
    const fin = new Date(inicio.getTime() + (config?.duracion_minutos || 60) * 60000);
    updateData.fecha = new Date(fecha);
    updateData.hora_inicio = inicio;
    updateData.hora_fin = fin;
  }

  const updated = await prisma.turno.update({
    where: { id: parseInt(params.id) },
    data: updateData,
    include: { cliente: true },
  });

  // Si se confirma o completa, crear movimiento de caja automáticamente
  if ((estado === "confirmado" || estado === "completado") && !turno.movimiento) {
    const config = await prisma.configuracionLavado.findUnique({
      where: { tipo_vehiculo: turno.tipo_vehiculo },
    });
    if (config) {
      await prisma.movimientoCaja.create({
        data: {
          tipo: "lavado",
          patente: turno.patente,
          monto: config.precio,
          descripcion: `Lavado ${turno.tipo_vehiculo} - ${turno.patente || "s/patente"}`,
          turnoId: turno.id,
        },
      });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.turno.update({
    where: { id: parseInt(params.id) },
    data: { estado: "cancelado" },
  });
  return NextResponse.json({ ok: true });
}
