export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarSlotsDisponibles } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const tipo = searchParams.get("tipo");
  const servicio = searchParams.get("servicio") || "completo";
  const excluirTurnoId = searchParams.get("excluir");

  if (!fecha || !tipo) {
    return NextResponse.json({ error: "fecha y tipo requeridos" }, { status: 400 });
  }

  const [config, configGeneral, turnosDelDia] = await Promise.all([
    prisma.configuracionServicio.findUnique({
      where: { tipo_vehiculo_servicio: { tipo_vehiculo: tipo, servicio } },
    }),
    prisma.configuracionGeneral.findMany(),
    prisma.turno.findMany({
      where: {
        fecha: new Date(fecha),
        estado: { not: "cancelado" },
        id: excluirTurnoId ? { not: parseInt(excluirTurnoId) } : undefined,
      },
    }),
  ]);

  if (!config) return NextResponse.json({ error: "Servicio no configurado" }, { status: 400 });

  const cfg = Object.fromEntries(configGeneral.map((c: { clave: string; valor: string }) => [c.clave, c.valor]));
  // Usar horarios específicos de lavado, con fallback a los generales
  const apertura = cfg.horario_apertura_lavado || cfg.horario_apertura || "08:00";
  const cierre = cfg.horario_cierre_lavado || cfg.horario_cierre || "18:00";

  const ocupados = turnosDelDia.map((t: { hora_inicio: Date; hora_fin: Date }) => ({
    inicio: t.hora_inicio.toISOString().slice(11, 16),
    fin: t.hora_fin.toISOString().slice(11, 16),
  }));

  let slots = generarSlotsDisponibles(apertura, cierre, config.duracion_minutos, ocupados);

  // Si es hoy, filtrar slots que ya pasaron (mostrar solo desde ahora en adelante)
  const hoy = new Date();
  const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  if (fecha === fechaLocal) {
    const horaActual = `${String(hoy.getHours()).padStart(2, "0")}:${String(hoy.getMinutes()).padStart(2, "0")}`;
    slots = slots.filter((s) => s > horaActual);
  }

  return NextResponse.json({ slots, duracion: config.duracion_minutos, precio: config.precio });
}
