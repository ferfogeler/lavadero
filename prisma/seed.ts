import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ConfiguracionLavado (legacy - kept for compat)
  const lavados = [
    { tipo_vehiculo: "auto" as const, precio: 8000, duracion_minutos: 45 },
    { tipo_vehiculo: "camioneta" as const, precio: 10000, duracion_minutos: 60 },
    { tipo_vehiculo: "suv" as const, precio: 11000, duracion_minutos: 60 },
    { tipo_vehiculo: "moto" as const, precio: 4500, duracion_minutos: 30 },
  ];
  for (const l of lavados) {
    await prisma.configuracionLavado.upsert({
      where: { tipo_vehiculo: l.tipo_vehiculo },
      update: {},
      create: { ...l, activo: true },
    });
  }

  // ConfiguracionServicio (tipo_vehiculo x servicio)
  const preciosBase: Record<string, { precio: number; duracion: number }> = {
    auto:      { precio: 8000,  duracion: 45 },
    camioneta: { precio: 10000, duracion: 60 },
    suv:       { precio: 11000, duracion: 60 },
    moto:      { precio: 4500,  duracion: 30 },
  };
  const servicios = [
    { servicio: "completo", precioPct: 1.0,  durPct: 1.0  },
    { servicio: "externo",  precioPct: 0.70, durPct: 0.70 },
    { servicio: "aspirado", precioPct: 0.50, durPct: 0.55 },
  ];
  for (const [tipo, base] of Object.entries(preciosBase)) {
    for (const s of servicios) {
      await prisma.configuracionServicio.upsert({
        where: { tipo_vehiculo_servicio: { tipo_vehiculo: tipo, servicio: s.servicio } },
        update: {},
        create: {
          tipo_vehiculo: tipo,
          servicio: s.servicio,
          precio: Math.round(base.precio * s.precioPct),
          duracion_minutos: Math.round(base.duracion * s.durPct),
          activo: true,
        },
      });
    }
  }

  // ConfiguracionGeneral
  const configs = [
    { clave: "whatsapp_lavadero", valor: "3765061400" },
    { clave: "nombre_negocio", valor: "Lavadero Express" },
    { clave: "horario_apertura", valor: "08:00" },
    { clave: "horario_cierre", valor: "20:00" },
    { clave: "horario_apertura_lavado", valor: "08:00" },
    { clave: "horario_cierre_lavado", valor: "18:00" },
    { clave: "horario_apertura_estacionamiento", valor: "08:00" },
    { clave: "horario_cierre_estacionamiento", valor: "20:00" },
    { clave: "tarifa_estacionamiento_por_minuto", valor: "50" },
    { clave: "precio_estadia_completa", valor: "2000" },
    { clave: "precio_media_estadia", valor: "1000" },
    { clave: "url_base", valor: "http://localhost:3000" },
  ];
  for (const c of configs) {
    await prisma.configuracionGeneral.upsert({
      where: { clave: c.clave },
      update: {},
      create: c,
    });
  }

  // Conceptos
  const conceptos = [
    { nombre: "Producto de limpieza", tipoConcepto: "gasto" as const },
    { nombre: "Sueldo", tipoConcepto: "egreso" as const },
    { nombre: "Propina", tipoConcepto: "ingreso" as const },
    { nombre: "Alquiler", tipoConcepto: "egreso" as const },
    { nombre: "Venta de accesorios", tipoConcepto: "ingreso" as const },
  ];
  for (const c of conceptos) {
    const exists = await prisma.concepto.findFirst({ where: { nombre: c.nombre } });
    if (!exists) await prisma.concepto.create({ data: c });
  }

  // Clientes de ejemplo
  await prisma.cliente.upsert({
    where: { patente: "ABC123" },
    update: {},
    create: { patente: "ABC123", nombre: "Juan", apellido: "Pérez", celular: "3765000001", tipo_vehiculo: "auto" },
  });
  await prisma.cliente.upsert({
    where: { patente: "DEF456" },
    update: {},
    create: { patente: "DEF456", nombre: "María", apellido: "González", celular: "3765000002", tipo_vehiculo: "suv" },
  });
  await prisma.cliente.upsert({
    where: { patente: "GHI789" },
    update: {},
    create: { patente: "GHI789", nombre: "Carlos", apellido: "López", celular: "3765000003", tipo_vehiculo: "moto" },
  });

  console.log("✅ Seed completado");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
