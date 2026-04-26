export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) return NextResponse.json({ error: "desde y hasta requeridos" }, { status: 400 });

  const h = new Date(hasta);
  h.setDate(h.getDate() + 1);

  const movimientos = await prisma.movimientoCaja.findMany({
    where: { fecha: { gte: new Date(desde), lt: h } },
    include: { cliente: true, concepto: true, turno: true },
    orderBy: { fecha: "asc" },
  });

  type Mov = (typeof movimientos)[number];

  const ingresos = movimientos
    .filter((m: Mov) => ["lavado", "estacionamiento", "ingreso"].includes(m.tipo))
    .reduce((acc: number, m: Mov) => acc + Number(m.monto), 0);

  const egresos = movimientos
    .filter((m: Mov) => ["egreso", "gasto"].includes(m.tipo))
    .reduce((acc: number, m: Mov) => acc + Number(m.monto), 0);

  const porTipo = movimientos.reduce(
    (acc: Record<string, number>, m: Mov) => {
      acc[m.tipo] = (acc[m.tipo] || 0) + Number(m.monto);
      return acc;
    },
    {}
  );

  const porDia: Record<string, { ingresos: number; egresos: number }> = {};
  for (const m of movimientos) {
    const dia = m.fecha.toISOString().slice(0, 10);
    if (!porDia[dia]) porDia[dia] = { ingresos: 0, egresos: 0 };
    if (["lavado", "estacionamiento", "ingreso"].includes(m.tipo)) {
      porDia[dia].ingresos += Number(m.monto);
    } else {
      porDia[dia].egresos += Number(m.monto);
    }
  }

  return NextResponse.json({
    movimientos,
    resumen: { ingresos, egresos, neto: ingresos - egresos, porTipo },
    porDia,
  });
}
