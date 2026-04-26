-- CreateEnum
CREATE TYPE "TipoVehiculo" AS ENUM ('auto', 'camioneta', 'suv', 'moto');

-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('pendiente', 'confirmado', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "CreadoPor" AS ENUM ('web', 'empleado', 'admin');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('lavado', 'estacionamiento', 'ingreso', 'egreso', 'gasto');

-- CreateEnum
CREATE TYPE "TipoConcepto" AS ENUM ('ingreso', 'egreso', 'gasto');

-- CreateTable
CREATE TABLE "Cliente" (
    "patente" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "tipo_vehiculo" "TipoVehiculo" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("patente")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" SERIAL NOT NULL,
    "patente" TEXT,
    "tipo_vehiculo" "TipoVehiculo" NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'pendiente',
    "creadoPor" "CreadoPor" NOT NULL DEFAULT 'web',
    "tokenModificacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCaja" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoMovimiento" NOT NULL,
    "patente" TEXT,
    "conceptoId" INTEGER,
    "monto" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "horaEntrada" TIMESTAMP(3),
    "horaSalida" TIMESTAMP(3),
    "turnoId" INTEGER,

    CONSTRAINT "MovimientoCaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concepto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoConcepto" "TipoConcepto" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Concepto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionLavado" (
    "tipo_vehiculo" "TipoVehiculo" NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "duracion_minutos" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConfiguracionLavado_pkey" PRIMARY KEY ("tipo_vehiculo")
);

-- CreateTable
CREATE TABLE "ConfiguracionGeneral" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "ConfiguracionGeneral_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Turno_tokenModificacion_key" ON "Turno"("tokenModificacion");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoCaja_turnoId_key" ON "MovimientoCaja"("turnoId");

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_patente_fkey" FOREIGN KEY ("patente") REFERENCES "Cliente"("patente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_patente_fkey" FOREIGN KEY ("patente") REFERENCES "Cliente"("patente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "Concepto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE SET NULL ON UPDATE CASCADE;
