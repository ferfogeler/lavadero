export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes");
  const anio = searchParams.get("anio");
  const estado = searchParams.get("estado");

  const where: Record<string, unknown> = {};
  if (mes) where.mes = parseInt(mes);
  if (anio) where.anio = parseInt(anio);
  if (estado) where.estado = estado;

  const mensuales = await prisma.estacionamientoMensual.findMany({
    where,
    include: { cliente: true },
    orderBy: [{ anio: "asc" }, { mes: "asc" }, { fechaAlta: "asc" }],
  });

  return NextResponse.json(mensuales);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Batch generation for all monthly clients
  if (body.generar) {
    const { mes, anio } = body;
    if (!mes || !anio) {
      return NextResponse.json({ error: "mes y anio son requeridos" }, { status: 400 });
    }

    const clientesMensuales = await prisma.cliente.findMany({
      where: { clienteMensual: true, tipoMensual: { not: null } },
    });

    let created = 0;
    const items = [];
    for (const c of clientesMensuales) {
      try {
        const estadia = await prisma.estacionamientoMensual.upsert({
          where: { patente_mes_anio: { patente: c.patente, mes, anio } },
          update: {},
          create: { patente: c.patente, tipo: c.tipoMensual!, mes, anio },
          include: { cliente: true },
        });
        // upsert returns existing or new — only count if truly new
        if (estadia.estado === "pendiente" && !estadia.montoPagado) created++;
        items.push(estadia);
      } catch {
        // skip conflicts
      }
    }
    return NextResponse.json({ created, total: items.length, items });
  }

  // Single creation
  const { patente, tipo, mes, anio } = body;
  if (!patente || !tipo || !mes || !anio) {
    return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
  }

  try {
    const estadia = await prisma.estacionamientoMensual.create({
      data: { patente: patente.toUpperCase(), tipo, mes, anio },
      include: { cliente: true },
    });
    return NextResponse.json(estadia);
  } catch {
    return NextResponse.json({ error: "Ya existe una estadía para esa patente en este mes" }, { status: 409 });
  }
}
