export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) return NextResponse.json({ error: "desde y hasta requeridos" }, { status: 400 });

  // Parse as local noon to avoid UTC±offset shifting the date
  const desdeDate = new Date(desde + "T12:00:00");
  desdeDate.setHours(0, 0, 0, 0);
  const hastaDate = new Date(hasta + "T12:00:00");
  hastaDate.setHours(23, 59, 59, 999);

  const movimientos = await prisma.movimientoCaja.findMany({
    where: { fecha: { gte: desdeDate, lte: hastaDate } },
    include: { cliente: true, concepto: true, turno: true },
    orderBy: { fecha: "asc" },
  });

  // Include confirmed/completed turnos without a real MovimientoCaja (same as caja page)
  const turnosSinMov = await prisma.turno.findMany({
    where: {
      fecha: { gte: desdeDate, lte: hastaDate },
      estado: { in: ["confirmado", "completado"] },
      movimiento: null,
    },
    include: { cliente: true },
  });

  const configsServicio = turnosSinMov.length > 0
    ? await prisma.configuracionServicio.findMany()
    : [];
  const precioServicioMap: Record<string, number> = {};
  const precioFallback: Record<string, number> = {};
  for (const c of configsServicio) {
    precioServicioMap[`${c.tipo_vehiculo}__${c.servicio}`] = Number(c.precio);
    if (c.servicio === "completo") precioFallback[c.tipo_vehiculo] = Number(c.precio);
  }

  const turnosVirtuales = turnosSinMov.map((t: typeof turnosSinMov[number]) => {
    const srv = (t as { servicio?: string | null }).servicio || "completo";
    const monto = precioServicioMap[`${t.tipo_vehiculo}__${srv}`] ?? precioFallback[t.tipo_vehiculo] ?? 0;
    return {
      id: -(t.id),
      fecha: t.fecha,
      tipo: "lavado" as const,
      patente: t.patente,
      monto: String(monto),
      descripcion: `Lavado ${t.tipo_vehiculo}`,
      horaEntrada: null,
      horaSalida: null,
      cliente: t.cliente,
      concepto: null,
    };
  });

  type TodoItem = { fecha: Date | string; tipo: string; monto: string | number | { toString(): string } };
  type MovRow = { tipo: string; horaEntrada: Date | string | null; horaSalida: Date | string | null };
  // Exclude daily parkings that are still open (have horaEntrada but no horaSalida).
  // Monthly payments (horaEntrada=null, horaSalida=null) must NOT be filtered out.
  const todos: TodoItem[] = [
    ...movimientos.filter((m: MovRow) => !(m.tipo === "estacionamiento" && m.horaEntrada && !m.horaSalida)),
    ...turnosVirtuales,
  ].sort((a: TodoItem, b: TodoItem) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const ingresos = todos
    .filter((m) => ["lavado", "estacionamiento", "ingreso"].includes(m.tipo))
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const egresos = todos
    .filter((m) => ["egreso", "gasto"].includes(m.tipo))
    .reduce((acc, m) => acc + Number(m.monto), 0);

  const porTipo = todos.reduce(
    (acc: Record<string, number>, m) => {
      acc[m.tipo] = (acc[m.tipo] || 0) + Number(m.monto);
      return acc;
    },
    {}
  );

  const porDia: Record<string, { ingresos: number; egresos: number }> = {};
  for (const m of todos) {
    const dia = new Date(m.fecha).toISOString().slice(0, 10);
    if (!porDia[dia]) porDia[dia] = { ingresos: 0, egresos: 0 };
    if (["lavado", "estacionamiento", "ingreso"].includes(m.tipo)) {
      porDia[dia].ingresos += Number(m.monto);
    } else {
      porDia[dia].egresos += Number(m.monto);
    }
  }

  return NextResponse.json({
    movimientos: todos,
    resumen: { ingresos, egresos, neto: ingresos - egresos, porTipo },
    porDia,
  });
}
