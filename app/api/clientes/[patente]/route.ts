import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { patente: string } }) {
  const cliente = await prisma.cliente.findUnique({
    where: { patente: params.patente.toUpperCase() },
  });
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(cliente);
}
