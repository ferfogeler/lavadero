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

  const slots = generarSlotsDisponibles(apertura, cierre, config.duracion_minutos, ocupados);
  // Nota: el filtrado de horarios pasados se hace en el cliente para respetar la zona horaria local (UTC-3).
  return NextResponse.json({ slots, duracion: config.duracion_minutos, precio: config.precio });
}
