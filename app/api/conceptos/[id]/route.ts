import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const c = await prisma.concepto.update({
    where: { id: parseInt(params.id) },
    data: body,
  });
  return NextResponse.json(c);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.concepto.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
