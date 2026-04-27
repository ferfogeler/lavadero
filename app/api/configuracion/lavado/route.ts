export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const configs = await prisma.configuracionServicio.findMany({
    orderBy: [{ tipo_vehiculo: "asc" }, { servicio: "asc" }],
  });
  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const updates = await Promise.all(
    body.map((item: { tipo_vehiculo: string; servicio: string; precio: number; duracion_minutos: number; activo: boolean }) =>
      prisma.configuracionServicio.update({
        where: { tipo_vehiculo_servicio: { tipo_vehiculo: item.tipo_vehiculo, servicio: item.servicio } },
        data: {
          precio: item.precio,
          duracion_minutos: item.duracion_minutos,
          activo: item.activo,
        },
      })
    )
  );
  return NextResponse.json(updates);
}
