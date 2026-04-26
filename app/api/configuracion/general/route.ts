export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const configs = await prisma.configuracionGeneral.findMany();
  const obj = Object.fromEntries(configs.map((c: { clave: string; valor: string }) => [c.clave, c.valor]));
  return NextResponse.json(obj);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const updates = await Promise.all(
    Object.entries(body).map(([clave, valor]) =>
      prisma.configuracionGeneral.upsert({
        where: { clave },
        update: { valor: String(valor) },
        create: { clave, valor: String(valor) },
      })
    )
  );
  const obj = Object.fromEntries(updates.map((c) => [c.clave, c.valor]));
  return NextResponse.json(obj);
}
