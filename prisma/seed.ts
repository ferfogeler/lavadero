import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ConfiguracionLavado
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

  // ConfiguracionGeneral
  const configs = [
    { clave: "whatsapp_lavadero", valor: "3765061400" },
    { clave: "nombre_negocio", valor: "Lavadero Express" },
    { clave: "horario_apertura", valor: "08:00" },
    { clave: "horario_cierre", valor: "20:00" },
    { clave: "tarifa_estacionamiento_por_minuto", valor: "50" },
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

  // Turnos de ejemplo
  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);

  const turnoExistente = await prisma.turno.findFirst({ where: { patente: "ABC123" } });
  if (!turnoExistente) {
    await prisma.turno.create({
      data: {
        patente: "ABC123",
        tipo_vehiculo: "auto",
        fecha: hoy,
        hora_inicio: new Date("1970-01-01T09:00:00"),
        hora_fin: new Date("1970-01-01T09:45:00"),
        estado: "confirmado",
        creadoPor: "web",
      },
    });
    await prisma.turno.create({
      data: {
        patente: "DEF456",
        tipo_vehiculo: "suv",
        fecha: manana,
        hora_inicio: new Date("1970-01-01T10:00:00"),
        hora_fin: new Date("1970-01-01T11:00:00"),
        estado: "pendiente",
        creadoPor: "web",
      },
    });
    await prisma.turno.create({
      data: {
        patente: "GHI789",
        tipo_vehiculo: "moto",
        fecha: hoy,
        hora_inicio: new Date("1970-01-01T14:00:00"),
        hora_fin: new Date("1970-01-01T14:30:00"),
        estado: "completado",
        creadoPor: "empleado",
      },
    });
  }

  console.log("✅ Seed completado");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
