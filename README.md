# 🚿 Lavadero Express — Sistema de gestión

Aplicación web fullstack para gestión de lavadero de autos y estacionamiento por horas.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL

---

## Instalación local

### Prerrequisitos
- Node.js 20+
- PostgreSQL corriendo localmente

### Pasos

```bash
# 1. Clonar e instalar dependencias
cd lavadero
npm install

# 2. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores (DATABASE_URL, passwords, etc.)

# 3. Generar cliente Prisma
npx prisma generate

# 4. Crear base de datos y correr migraciones
npx prisma migrate dev --name init

# 5. Poblar con datos de ejemplo
npx prisma db seed

# 6. Iniciar en modo desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/lavadero` |
| `NEXTAUTH_SECRET` | Secreto para JWT (mínimo 32 chars) | `un-secreto-largo-aleatorio` |
| `NEXTAUTH_URL` | URL base del sistema | `http://localhost:3000` |
| `EMPLEADO_PASSWORD` | Contraseña del usuario "empleado" | `empleado123` |
| `ADMIN_PASSWORD` | Contraseña del usuario "admin" | `admin123` |

---

## Rutas principales

| URL | Descripción |
|---|---|
| `/` | Página principal |
| `/reserva` | Formulario público de reserva de turno (3 pasos) |
| `/turno/[token]` | Gestión pública del turno (modificar/cancelar) |
| `/login` | Login para empleado y admin |
| `/empleado` | Calendario de turnos del empleado |
| `/empleado/caja` | Movimientos de caja del día |
| `/admin` | Panel admin (misma vista de turnos) |
| `/admin/caja` | Caja admin |
| `/admin/configuracion/lavado` | Precios y duración por tipo de vehículo |
| `/admin/configuracion/general` | WhatsApp, horarios, tarifa estacionamiento, URL |
| `/admin/conceptos` | ABM de conceptos de caja |
| `/admin/arqueo` | Arqueo por día o por mes con gráfico |
| `/admin/mensual` | Informe mensual imprimible |

---

## Deploy en Easypanel

### 1. Crear servicio PostgreSQL en Easypanel
- Agregar servicio → Database → PostgreSQL
- Anotar los datos de conexión

### 2. Crear servicio de la app
- Agregar servicio → App → Docker Image / Git
- Apuntar al repositorio o subir la imagen

### 3. Variables de entorno en Easypanel
```
DATABASE_URL=postgresql://user:pass@postgres:5432/lavadero
NEXTAUTH_SECRET=<generar con: openssl rand -base64 32>
NEXTAUTH_URL=https://tu-dominio.easypanel.host
EMPLEADO_PASSWORD=tu-password-empleado
ADMIN_PASSWORD=tu-password-admin
```

### 4. Migración en producción
En la consola del contenedor o vía deploy hook:
```bash
npx prisma migrate deploy
npx prisma db seed
```

### 5. Configuración importante post-deploy
Ir a `/admin/configuracion/general` y actualizar:
- **URL base del sistema** → `https://tu-dominio.easypanel.host`
- **WhatsApp del lavadero** → número correcto sin + ni 0
- **Horarios de apertura/cierre**
- **Tarifa de estacionamiento por minuto**

---

## Usuarios del sistema

| Usuario | Password (por defecto) | Acceso |
|---|---|---|
| `empleado` | `EMPLEADO_PASSWORD` del .env | `/empleado` |
| `admin` | `ADMIN_PASSWORD` del .env | `/admin` + `/empleado` |

---

## Estructura del proyecto

```
app/
  api/           # API Routes (Next.js)
    turnos/
    clientes/
    movimientos/
    conceptos/
    configuracion/
    reportes/
  reserva/       # Módulo público de reserva
  turno/[token]/ # Gestión pública de turno
  login/         # Login
  empleado/      # Panel empleado
  admin/         # Panel administrador
components/      # Componentes reutilizables
lib/             # Prisma client, NextAuth, utils
prisma/          # Schema y seed
```
