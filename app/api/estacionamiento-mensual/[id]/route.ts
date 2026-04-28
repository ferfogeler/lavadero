export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIPO_LABELS: Record<string, string> = {
  mensual_moto: "Mensual completa · Moto",
  mensual_auto: "Mensual completa · Auto",
  mensual_suv:  "Mensual completa · SUV/Camioneta",
  mensual_media_moto: "Mensual ½ estadía · Moto",
  mensual_media_auto: "Mensual ½ estadía · Auto",
  mensual_media_suv:  "Mensual ½ estadía · SUV/Camioneta",
  // legacy
  mensual_completa: "Mensual estadía completa",
  mensual_media:    "Mensual ½ estadía",
};

function labelTipo(tipo: string) {
  return TIPO_LABELS[tipo] ?? tipo;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const body = await req.json();

  const estadia = await prisma.estacionamientoMensual.findUnique({ where: { id } });
  if (!estadia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // ── Cobrar ────────────────────────────────────────────────────────────
  if (body.cobrar) {
    const { monto } = body;
    if (monto === undefined || monto === null) {
      return NextResponse.json({ error: "monto es requerido" }, { status: 400 });
    }
    if (estadia.estado === "pagado") return NextResponse.json({ error: "Ya está pagada" }, { status: 400 });

    await prisma.movimientoCaja.create({
      data: {
        tipo: "estacionamiento",
        patente: estadia.patente,
        monto: parseFloat(monto),
        descripcion: `${labelTipo(estadia.tipo)} ${estadia.mes}/${estadia.anio}`,
        // No horaEntrada/horaSalida — identifies it as a monthly payment (not open daily)
      },
    });

    const updated = await prisma.estacionamientoMensual.update({
      where: { id },
      data: { estado: "pagado", montoPagado: parseFloat(monto), fechaPago: new Date() },
      include: { cliente: true },
    });
    return NextResponse.json(updated);
  }

  // ── Editar monto (admin) ──────────────────────────────────────────────
  if (body.editarMonto) {
    const { monto } = body;
    if (monto === undefined || monto === null) {
      return NextResponse.json({ error: "monto es requerido" }, { status: 400 });
    }
    if (estadia.estado !== "pagado") return NextResponse.json({ error: "Solo se puede editar si está pagada" }, { status: 400 });

    // Update EstacionamientoMensual
    await prisma.estacionamientoMensual.update({
      where: { id },
      data: { montoPagado: parseFloat(monto) },
    });

    // Also update the associated MovimientoCaja (find by patente + no horaEntrada on payment day)
    if (estadia.fechaPago) {
      const start = new Date(estadia.fechaPago); start.setHours(0, 0, 0, 0);
      const end   = new Date(estadia.fechaPago); end.setHours(23, 59, 59, 999);
      await prisma.movimientoCaja.updateMany({
        where: { tipo: "estacionamiento", patente: estadia.patente, horaEntrada: null, fecha: { gte: start, lte: end } },
        data: { monto: parseFloat(monto) },
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);

  const estadia = await prisma.estacionamientoMensual.findUnique({ where: { id } });
  if (!estadia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // If already paid, remove the associated MovimientoCaja too
  if (estadia.estado === "pagado" && estadia.fechaPago) {
    const start = new Date(estadia.fechaPago); start.setHours(0, 0, 0, 0);
    const end   = new Date(estadia.fechaPago); end.setHours(23, 59, 59, 999);
    await prisma.movimientoCaja.deleteMany({
      where: {
        tipo: "estacionamiento",
        patente: estadia.patente,
        horaEntrada: null,
        fecha: { gte: start, lte: end },
      },
    });
  }

  await prisma.estacionamientoMensual.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
