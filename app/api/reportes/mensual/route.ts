export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = parseInt(searchParams.get("mes") || "");
  const anio = parseInt(searchParams.get("anio") || "");

  if (!mes || !anio) return NextResponse.json({ error: "mes y anio requeridos" }, { status: 400 });

  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 1);

  const [movimientos, turnos] = await Promise.all([
    prisma.movimientoCaja.findMany({
      where: { fecha: { gte: desde, lt: hasta } },
      include: { concepto: true },
    }),
    prisma.turno.findMany({
      where: { fecha: { gte: desde, lt: hasta }, estado: { not: "cancelado" } },
    }),
  ]);

  type Turno = (typeof turnos)[number];
  type Mov = (typeof movimientos)[number];

  const lavadasPorTipo = turnos.reduce(
    (acc: Record<string, number>, t: Turno) => {
      acc[t.tipo_vehiculo] = (acc[t.tipo_vehiculo] || 0) + 1;
      return acc;
    },
    {}
  );

  const sum = (tipo: string) => movimientos.filter((m: Mov) => m.tipo === tipo).reduce((a: number, m: Mov) => a + Number(m.monto), 0);

  const ingresosLavado = sum("lavado");
  const ingresosEstacionamiento = sum("estacionamiento");
  const otrosIngresos = sum("ingreso");
  const gastos = sum("gasto");
  const egresos = sum("egreso");
  const totalIngresos = ingresosLavado + ingresosEstacionamiento + otrosIngresos;
  const totalEgresos = gastos + egresos;

  return NextResponse.json({
    mes,
    anio,
    lavadasPorTipo,
    totalLavados: turnos.length,
    ingresosLavado,
    ingresosEstacionamiento,
    otrosIngresos,
    totalIngresos,
    gastos,
    egresos,
    totalEgresos,
    neto: totalIngresos - totalEgresos,
  });
}
