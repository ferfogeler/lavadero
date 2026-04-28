# Arquitectura técnica — GarageUno

> Referencia interna para desarrollo futuro  
> Stack: Next.js 14 · Prisma · PostgreSQL · NextAuth · Tailwind CSS

---

## Índice

1. [Stack y versiones](#1-stack-y-versiones)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Base de datos — Modelos Prisma](#3-base-de-datos--modelos-prisma)
4. [Rutas de API](#4-rutas-de-api)
5. [Rutas de páginas](#5-rutas-de-páginas)
6. [Componentes compartidos](#6-componentes-compartidos)
7. [Utilidades (lib/)](#7-utilidades-lib)
8. [Autenticación y roles](#8-autenticación-y-roles)
9. [Flujos de negocio clave](#9-flujos-de-negocio-clave)
10. [Variables de entorno](#10-variables-de-entorno)
11. [Decisiones técnicas y quirks conocidos](#11-decisiones-técnicas-y-quirks-conocidos)
12. [Tareas habituales de mantenimiento](#12-tareas-habituales-de-mantenimiento)

---

## 1. Stack y versiones

| Tecnología | Versión | Rol |
|---|---|---|
| Next.js | 14.2.x | Framework fullstack (App Router) |
| React | 18 | UI |
| TypeScript | 5 | Tipado |
| Prisma ORM | 6.x | Acceso a BD |
| PostgreSQL | latest | Base de datos |
| NextAuth | 4.x | Autenticación JWT |
| Tailwind CSS | 3.4 | Estilos |
| date-fns | 4.x | Manipulación de fechas |
| bcryptjs | 3.x | Hash de contraseñas |

---

## 2. Estructura de carpetas

```
lavadero/
├── app/
│   ├── page.tsx                        # Página pública (inicio)
│   ├── layout.tsx                      # Layout raíz (fonts, metadata)
│   ├── login/page.tsx                  # Login
│   ├── reserva/page.tsx                # Reserva de turno (público)
│   │
│   ├── empleado/                       # Panel recepción (rol: empleado | admin)
│   │   ├── layout.tsx                  # SessionProvider + nav lateral
│   │   ├── page.tsx                    # Agenda de turnos
│   │   ├── caja/page.tsx               # Caja diaria + estacionamiento
│   │   └── clientes/page.tsx           # Tabla de clientes (solo lectura)
│   │
│   ├── admin/                          # Panel administrador (rol: admin)
│   │   ├── layout.tsx                  # Auth guard → redirige si no es admin
│   │   ├── page.tsx                    # Redirect a /empleado
│   │   ├── caja/page.tsx               # Redirect a /empleado/caja
│   │   ├── clientes/page.tsx           # CRUD completo clientes
│   │   ├── conceptos/page.tsx          # CRUD conceptos de caja
│   │   ├── arqueo/page.tsx             # Arqueo / reporte por período
│   │   ├── mensual/page.tsx            # Informe mensual
│   │   └── configuracion/
│   │       ├── general/page.tsx        # Config general (logo, colores, tarifas)
│   │       └── lavado/page.tsx         # Precios y duración por vehículo × servicio
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── turnos/
│       │   ├── route.ts                # GET list / POST create
│       │   ├── [id]/route.ts           # GET / PUT / DELETE
│       │   ├── disponibles/route.ts    # GET slots disponibles
│       │   └── token/[token]/route.ts  # GET + PUT por token público
│       ├── movimientos/
│       │   ├── route.ts                # GET list / POST create
│       │   └── [id]/route.ts           # GET / PUT / DELETE
│       ├── clientes/
│       │   ├── route.ts                # GET search / POST upsert
│       │   └── [patente]/route.ts      # GET / PUT / DELETE
│       ├── conceptos/
│       │   ├── route.ts                # GET list / POST create
│       │   └── [id]/route.ts           # GET / PUT / DELETE
│       ├── estacionamiento-mensual/
│       │   ├── route.ts                # GET list / POST upsert-or-generate
│       │   └── [id]/route.ts           # GET / PUT (cobrar|editarMonto) / DELETE
│       ├── configuracion/
│       │   ├── general/route.ts        # GET all / PUT bulk
│       │   └── lavado/route.ts         # GET all / PUT bulk
│       └── reportes/
│           ├── arqueo/route.ts         # GET (desde, hasta)
│           └── mensual/route.ts        # GET (mes, anio)
│
├── components/
│   ├── Badge.tsx
│   ├── CalendarioMini.tsx
│   ├── ClientesTabla.tsx
│   ├── Modal.tsx
│   ├── Spinner.tsx
│   └── Toast.tsx
│
├── lib/
│   ├── prisma.ts                       # Singleton PrismaClient
│   └── utils.ts                        # Helpers de formato y lógica de slots
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                         # Datos iniciales
│
└── docs/
    ├── MANUAL_USUARIO.md
    └── ARQUITECTURA.md                 # (este archivo)
```

---

## 3. Base de datos — Modelos Prisma

### Cliente
```prisma
model Cliente {
  patente           String    @id          // Patente como PK (única por vehículo)
  nombre            String
  apellido          String
  celular           String
  tipo_vehiculo     TipoVehiculo           // auto | camioneta | suv | moto
  clienteMensual    Boolean   @default(false)
  tipoMensual       String?               // mensual_completa | mensual_media
  createdAt         DateTime  @default(now())

  turnos            Turno[]
  movimientos       MovimientoCaja[]
  estadiasMensuales EstacionamientoMensual[]
}
```

### Turno
```prisma
model Turno {
  id                Int          @id @default(autoincrement())
  patente           String?      // nullable: turnos sin cliente registrado
  tipo_vehiculo     TipoVehiculo
  servicio          String?      @default("completo")  // completo | externo | aspirado
  fecha             DateTime     @db.Date
  hora_inicio       DateTime     @db.Time
  hora_fin          DateTime     @db.Time
  estado            EstadoTurno  @default(pendiente)
  creadoPor         CreadoPor    @default(web)          // web | empleado | admin
  tokenModificacion String       @unique @default(uuid())
  createdAt         DateTime     @default(now())

  movimiento        MovimientoCaja?   // relación 1-to-1 opcional
  cliente           Cliente?
}
```

> **Nota:** `hora_inicio` y `hora_fin` se guardan como `@db.Time` (sin fecha).  
> Al leer: `.toISOString().slice(11, 16)` para obtener "HH:mm".

### MovimientoCaja
```prisma
model MovimientoCaja {
  id          Int            @id @default(autoincrement())
  fecha       DateTime       @default(now())
  tipo        TipoMovimiento  // lavado | estacionamiento | ingreso | egreso | gasto
  patente     String?
  conceptoId  Int?
  monto       Decimal        @db.Decimal(10, 2)
  descripcion String?
  horaEntrada DateTime?      // null = mensual o lavado; con valor = estacionamiento en curso
  horaSalida  DateTime?      // null = en curso; con valor = cerrado
  turnoId     Int?  @unique   // link al turno si es movimiento de lavado

  cliente     Cliente?
  concepto    Concepto?
  turno       Turno?
}
```

> **Lógica de estados de estacionamiento:**  
> - `horaEntrada != null && horaSalida == null` → **en curso** (no se muestra en arqueo)  
> - `horaEntrada != null && horaSalida != null` → **finalizado** (se incluye en arqueo)  
> - `horaEntrada == null` → **mensual** (siempre se incluye en arqueo)

> **Movimientos virtuales:** los turnos confirmados/completados sin MovimientoCaja real  
> se exponen en el GET de movimientos con `id` negativo (`-turno.id`). Son solo lectura.

### EstacionamientoMensual
```prisma
model EstacionamientoMensual {
  id          Int       @id @default(autoincrement())
  patente     String
  tipo        String    // mensual_completa | mensual_media | mensual_moto | etc.
  mes         Int       // 1-12
  anio        Int
  fechaAlta   DateTime  @default(now())
  estado      String    @default("pendiente")   // pendiente | pagado
  montoPagado Decimal?  @db.Decimal(10, 2)
  fechaPago   DateTime?

  cliente     Cliente?

  @@unique([patente, mes, anio])  // un registro por cliente por mes
}
```

### ConfiguracionGeneral
Tabla clave-valor. Claves definidas:

| Clave | Tipo | Descripción |
|---|---|---|
| `nombre_negocio` | string | Nombre del negocio |
| `whatsapp_lavadero` | string | Número WhatsApp sin +54 ni 0 |
| `url_base` | string | URL base (ej: https://garageuno.ar) |
| `leyenda_inicio` | string | Texto en la home |
| `ubicacion_maps_url` | string | Link Google Maps |
| `logo_base64` | string | Logo en base64 (data:image/...) |
| `color_fondo_inicio` | string | Hex color gradiente inicio |
| `color_fondo_fin` | string | Hex color gradiente fin |
| `horario_apertura_lavado` | HH:mm | Apertura lavadero |
| `horario_cierre_lavado` | HH:mm | Cierre lavadero |
| `horario_apertura_estacionamiento` | HH:mm | Apertura parking |
| `horario_cierre_estacionamiento` | HH:mm | Cierre parking |
| `precio_mensual_moto/auto/suv` | number | Precio abono mensual completo |
| `precio_mensual_media_moto/auto/suv` | number | Precio abono mensual ½ estadía |
| `interes_mensual_diario_pct` | float | % diario tras día 10 (mensual completo) |
| `interes_mensual_media_diario_pct` | float | % diario tras día 10 (mensual ½) |
| `precio_media_moto/auto/suv` | number | Tarifa ½ estadía diaria |
| `precio_diaria_moto/auto/suv` | number | Tarifa estadía completa diaria |
| `precio_hora` | number | Tarifa por hora |

### ConfiguracionServicio
```prisma
model ConfiguracionServicio {
  id               Int
  tipo_vehiculo    String   // auto | camioneta | suv | moto
  servicio         String   // completo | externo | aspirado
  precio           Decimal
  duracion_minutos Int
  activo           Boolean

  @@unique([tipo_vehiculo, servicio])
}
```
12 combinaciones (4 vehículos × 3 servicios). Determina duración de turnos y precio cobrado.

### Enums
```
TipoVehiculo:  auto | camioneta | suv | moto
EstadoTurno:   pendiente | confirmado | completado | cancelado
CreadoPor:     web | empleado | admin
TipoMovimiento: lavado | estacionamiento | ingreso | egreso | gasto
TipoConcepto:  ingreso | egreso | gasto
```

---

## 4. Rutas de API

Todas usan `export const dynamic = 'force-dynamic'` para evitar caché estático.

### `/api/turnos`
| Método | Params | Descripción |
|---|---|---|
| GET | `?fecha=YYYY-MM-DD` o `?desde=&hasta=` | Lista turnos del período |
| POST | body: `{patente, tipo_vehiculo, servicio, fecha, hora_inicio, nombre?, apellido?, celular?}` | Crea turno + upsert cliente |

### `/api/turnos/[id]`
| Método | Body | Descripción |
|---|---|---|
| GET | — | Turno con cliente |
| PUT | `{estado?} \| {fecha, hora_inicio}` | Cambia estado o reprograma. Si `estado=cancelado` → elimina MovimientoCaja. Si `estado=confirmado/completado` → crea MovimientoCaja si no existe |
| DELETE | — | Elimina MovimientoCaja si existe, luego pone estado=cancelado |

### `/api/turnos/disponibles`
| Param | Descripción |
|---|---|
| `fecha` | YYYY-MM-DD |
| `tipo` | tipo_vehiculo |
| `servicio` | completo \| externo \| aspirado |
| `excluir` | id de turno a ignorar (para edición) |

Devuelve `{slots: string[], duracion: number, precio: number}`.  
**El filtrado por hora actual se hace en el cliente** (no aquí) para respetar UTC-3.

### `/api/turnos/token/[token]`
| Método | Descripción |
|---|---|
| GET | Devuelve turno por tokenModificacion |
| PUT | Permite cancelar desde link público |

### `/api/movimientos`
| Método | Params / Body | Descripción |
|---|---|---|
| GET | `?fecha=YYYY-MM-DD` | Lista real + virtuales (id negativo para turnos sin movimiento) |
| POST | `{tipo, patente?, conceptoId?, monto, descripcion?, horaEntrada?, turnoId?}` | Crea movimiento |

Los movimientos virtuales tienen `id < 0` y `virtual: true`. Solo se usan para mostrar, no se pueden editar.

### `/api/movimientos/[id]`
| Método | Body | Descripción |
|---|---|---|
| PUT | `{monto?, descripcion?, fecha?, horaSalida?}` | Edita el movimiento |
| DELETE | — | Elimina movimiento |

### `/api/estacionamiento-mensual`
| Método | Body | Descripción |
|---|---|---|
| GET | `?mes=&anio=&estado=` | Lista estadías del período |
| POST | `{patente, tipo, mes, anio}` → upsert 1 | Crea/busca estadía individual |
| POST | `{generarMes: true, mes, anio}` | Genera estadías para todos los clientes mensuales activos |

### `/api/estacionamiento-mensual/[id]`
| Método | Body | Descripción |
|---|---|---|
| PUT | `{action: "cobrar", monto}` | Marca como pagado + crea MovimientoCaja |
| PUT | `{action: "editarMonto", monto}` | Edita monto pagado |
| DELETE | — | Elimina estadía + MovimientoCaja asociado si existe |

### `/api/reportes/arqueo`
Params: `desde=YYYY-MM-DD&hasta=YYYY-MM-DD`  
Devuelve: `{movimientos[], resumen: {ingresos, egresos, neto}, porTipo: {...}, porDia: [...]}`  
Excluye: estacionamientos en curso (`horaEntrada != null && horaSalida == null`)

### `/api/reportes/mensual`
Params: `mes=N&anio=YYYY`  
Devuelve: conteo de turnos, ingresos y egresos categorizados, neto.

### `/api/configuracion/general`
| Método | Descripción |
|---|---|
| GET | Devuelve objeto `{clave: valor}` de toda la tabla |
| PUT | Recibe objeto `{clave: valor}` y hace upsert de cada par |

### `/api/configuracion/lavado`
| Método | Descripción |
|---|---|
| GET | Lista de ConfiguracionServicio (todas las 12 combinaciones) |
| PUT | Actualiza array de `{tipo_vehiculo, servicio, precio, duracion_minutos}` |

---

## 5. Rutas de páginas

| Ruta | Archivo | Auth | Descripción |
|---|---|---|---|
| `/` | `app/page.tsx` | No | Home pública con logo, botones, WhatsApp flotante |
| `/login` | `app/login/page.tsx` | No | Login NextAuth |
| `/reserva` | `app/reserva/page.tsx` | No | Reserva de turno step-by-step |
| `/turno/[token]` | `app/turno/[token]/page.tsx` | No | Gestión de turno vía link |
| `/empleado` | `app/empleado/page.tsx` | empleado/admin | Agenda de turnos |
| `/empleado/caja` | `app/empleado/caja/page.tsx` | empleado/admin | Caja + estacionamiento |
| `/empleado/clientes` | `app/empleado/clientes/page.tsx` | empleado/admin | Lista clientes |
| `/admin` | redirige a `/empleado` | admin | — |
| `/admin/caja` | redirige a `/empleado/caja` | admin | — |
| `/admin/clientes` | `app/admin/clientes/page.tsx` | admin | CRUD clientes |
| `/admin/conceptos` | `app/admin/conceptos/page.tsx` | admin | CRUD conceptos |
| `/admin/arqueo` | `app/admin/arqueo/page.tsx` | admin | Arqueo de caja |
| `/admin/mensual` | `app/admin/mensual/page.tsx` | admin | Informe mensual |
| `/admin/configuracion/general` | `app/admin/configuracion/general/page.tsx` | admin | Config general |
| `/admin/configuracion/lavado` | `app/admin/configuracion/lavado/page.tsx` | admin | Precios lavado |

---

## 6. Componentes compartidos

| Componente | Props clave | Descripción |
|---|---|---|
| `<Modal>` | `open, onClose, title, children` | Overlay modal genérico |
| `<Toast>` | `message, type, onClose` | Notificación flotante (success/error/info) |
| `useToast()` | — | Hook: `{toast, show(msg, type), hide}` |
| `<Spinner>` | `size: "sm"\|"md"\|"lg"` | Indicador de carga |
| `<Badge>` | `estado: EstadoTurno` | Chip de color para estados de turno |
| `<CalendarioMini>` | `value, onChange, minDate?` | Selector de fecha compacto |
| `<ClientesTabla>` | `role` | Tabla CRUD de clientes (admin ve botón eliminar) |

---

## 7. Utilidades (lib/)

### lib/prisma.ts
Singleton de PrismaClient para no crear múltiples conexiones en desarrollo:
```ts
const globalForPrisma = global as typeof global & { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### lib/utils.ts

**Formateo:**
```ts
formatFecha(date: Date | string): string       // "28/04/2026"
formatHora(date: Date | string): string        // "14:30"
formatMonto(n: number | Decimal): string       // "$8.000"
```

**Labels:**
```ts
labelTipoVehiculo(tipo: string): string        // "auto" → "Auto"
labelServicio(servicio: string): string        // "completo" → "Lavado completo"
labelEstado(estado: string): string            // "pendiente" → "Pendiente"
colorEstado(estado: string): string            // clases Tailwind según estado
labelTipoEstacionamiento(tipo: string): string // código interno → descripción legible
```

**Generación de slots:**
```ts
generarSlotsDisponibles(
  apertura: string,         // "08:00"
  cierre: string,           // "18:00"
  duracion: number,         // minutos
  ocupados: {inicio: string, fin: string}[]
): string[]                 // ["08:00", "08:45", "09:30", ...]
```

El slot se incluye si todo su rango `[inicio, inicio+duracion)` está libre de turnos.  
**Importante:** el filtrado por hora actual se hace en el cliente, no aquí.

---

## 8. Autenticación y roles

### Setup
NextAuth v4 con `CredentialsProvider`. Usuarios hardcodeados en `auth.ts` (o tabla Users — revisar implementación actual).

### Roles
```ts
session.user.role: "admin" | "empleado"
```

### Guards

**Layout de empleado** (`app/empleado/layout.tsx`):
```tsx
<SessionProvider refetchOnWindowFocus refetchInterval={60}>
```
Redirige a `/login` si no hay sesión. Muestra todo el nav a ambos roles.

**Layout de admin** (`app/admin/layout.tsx`):
Redirige a `/empleado` si el rol no es `admin`.

**En componentes** — el rol controla visibilidad:
```tsx
const { data: session } = useSession();
const isAdmin = session?.user?.role === "admin";
// Luego: {isAdmin && <button>Eliminar</button>}
```

### Diferencias por rol en la UI

| Feature | Empleado | Admin |
|---|---|---|
| Ver caja | ✅ | ✅ |
| Eliminar movimientos | ❌ | ✅ |
| Editar mensuales | ❌ | ✅ |
| Eliminar mensuales | ❌ | ✅ |
| Generar mes | ❌ | ✅ |
| Clientes CRUD | Solo lectura | ✅ |
| Configuración | ❌ | ✅ |
| Arqueo / Informe mensual | ❌ | ✅ |

---

## 9. Flujos de negocio clave

### Turno → Cobro

```
1. POST /api/turnos → crea Turno (estado: confirmado | pendiente)
2. PUT /api/turnos/[id] {estado: "completado"}
   → si !turno.movimiento: crea MovimientoCaja {tipo: "lavado", monto: config.precio}
3. PUT /api/turnos/[id] {estado: "cancelado"}
   → si turno.movimiento: delete MovimientoCaja
4. DELETE /api/turnos/[id]
   → si turno.movimiento: delete MovimientoCaja; luego estado = "cancelado"
```

### Estacionamiento diario → Cobro

```
1. POST /api/movimientos {tipo: "estacionamiento", horaEntrada: now(), monto: 0}
   → queda "en curso" (no visible en arqueo)
2. PUT /api/movimientos/[id] {horaSalida: now(), monto: calculado}
   → queda cerrado (visible en arqueo)
```

### Estacionamiento mensual → Cobro

```
1. POST /api/estacionamiento-mensual {patente, tipo, mes, anio}
   → upsert: devuelve estadía existente o crea nueva (estado: pendiente)
2. PUT /api/estacionamiento-mensual/[id] {action: "cobrar", monto}
   → crea MovimientoCaja {tipo: "estacionamiento", horaEntrada: null}
   → EstacionamientoMensual.estado = "pagado"
3. DELETE /api/estacionamiento-mensual/[id]
   → busca MovimientoCaja del día para esa patente con horaEntrada=null
   → los elimina + elimina EstacionamientoMensual
```

### Cálculo de interés mensual

```ts
function calcularMontoMensual(estadia, cfg, hoy) {
  const precioBase = cfg[`precio_mensual_${tipo_key}`]  // según tipo y vehículo
  const diaActual = hoy.getDate()  // 1-31
  const esMedia = estadia.tipo.includes("media")
  const tasaPct = esMedia
    ? cfg.interes_mensual_media_diario_pct   // ej: 1.5
    : cfg.interes_mensual_diario_pct
  const diasAtraso = Math.max(0, diaActual - 10)
  const interes = diasAtraso * (tasaPct / 100) * precioBase
  return { monto: precioBase + interes, tasaPct, diasAtraso }
}
```

### Filtrado de slots (zona horaria)

El servidor devuelve **todos** los slots disponibles (apertura → cierre, sin turnos ocupados).  
El cliente filtra los pasados **solo si la fecha seleccionada es hoy**:
```ts
if (fechaSeleccionada === format(new Date(), "yyyy-MM-dd")) {
  const ahora = format(new Date(), "HH:mm");  // usa timezone del browser
  slots = slots.filter(s => s > ahora);
}
```
Esto evita el bug de UTC vs UTC-3: a las 9 AM Argentina el servidor (UTC) ve las 12, y habría cortado mal.

---

## 10. Variables de entorno

```env
# Requeridas
DATABASE_URL="postgresql://user:pass@host:5432/lavadero"
NEXTAUTH_SECRET="string-secreto-aleatorio"
NEXTAUTH_URL="https://garageuno.ar"

# Para credenciales de usuarios (según implementación)
ADMIN_USER="admin"
ADMIN_PASS="hash-bcrypt"
EMPLEADO_USER="recepcion"
EMPLEADO_PASS="hash-bcrypt"
```

---

## 11. Decisiones técnicas y quirks conocidos

### WhatsApp URL
- **NO usar** `wa.me/` ni `https://wa.me/` — en Windows Desktop el OS intercepta el protocolo y corrompe los emojis suplementarios (aparecen como ◆)
- **Usar** `https://web.whatsapp.com/send?phone=549XXXXXXXX&text=...`
- El número debe tener prefijo `549` (país Argentina + 9 de celular) sin el 0 provincial

### Logo en base64
- Se guarda en `ConfiguracionGeneral` con clave `logo_base64`
- Límite: 500 KB antes de codificar (el base64 ocupa ~33% más)
- En `<img>` siempre agregar `// eslint-disable-next-line @next/next/no-img-element`
- En la home se cachea en localStorage para evitar flash en recargas

### Horarios como `@db.Time`
- Prisma guarda `hora_inicio` y `hora_fin` como `TIME` en PostgreSQL (sin fecha)
- Al leer del cliente llegan como objetos Date con fecha base 1970-01-01
- Para extraer "HH:mm": `date.toISOString().slice(11, 16)`
- Para crear: `new Date("1970-01-01T${hora}:00")`

### Movimientos virtuales
- Los turnos confirmados/completados sin MovimientoCaja real se incluyen en el GET de movimientos con `id = -turno.id` y `virtual: true`
- Son solo para visualización — nunca hacer PUT/DELETE sobre ellos
- Al completar el turno vía PUT, se crea el MovimientoCaja real y el virtual desaparece

### Carga de config en home
- Estado inicial: lee de `localStorage` (si existe) para evitar flash de colores por defecto
- Luego fetch → actualiza state + localStorage
- Si el admin cambia la config, la próxima visita ya lo verá

### ESLint en build
- `@next/next/no-img-element` es error de build — siempre usar `<Image>` de Next.js o agregar el disable comment
- `react/no-unescaped-entities` — no usar `"` ni `'` literales dentro de JSX, usar `&quot;` o mover a variable string

### `export const dynamic = 'force-dynamic'`
- Todas las rutas de API lo tienen para deshabilitar el caché estático de Next.js
- Sin esto, rutas GET quedan cacheadas en producción y no muestran datos frescos

---

## 12. Tareas habituales de mantenimiento

### Agregar un nuevo tipo de vehículo
1. Actualizar enum `TipoVehiculo` en `prisma/schema.prisma`
2. `npx prisma migrate dev --name add_tipo_vehiculo`
3. Agregar entradas en `seed.ts` (ConfiguracionLavado + ConfiguracionServicio)
4. Actualizar los maps de iconos/labels en `lib/utils.ts` y en las páginas de turnos/caja
5. Agregar tarifas en `configuracion/general/page.tsx` y en `seed.ts`

### Agregar un nuevo tipo de servicio de lavado
1. Agregar en el array `ORDEN_SERVICIO` en `reserva/page.tsx` y `empleado/page.tsx`
2. Agregar en `seed.ts` → `configuracionServicio` para cada tipo de vehículo
3. Agregar label en `labelServicio()` en `utils.ts`

### Agregar un nuevo campo de configuración general
1. Agregar en `seed.ts` → `configs` array
2. Agregar en `admin/configuracion/general/page.tsx` → `SECCIONES`
3. Consumir con `cfg.nueva_clave` donde sea necesario

### Correr migraciones en producción
```bash
npx prisma migrate deploy    # aplica migraciones pendientes
npx prisma db seed           # poblar datos iniciales (solo 1 vez o con upsert)
```

### Reset completo de BD (solo dev)
```bash
npx prisma migrate reset     # borra todo, re-migra y corre seed
```

---

*Última actualización: abril 2026*
