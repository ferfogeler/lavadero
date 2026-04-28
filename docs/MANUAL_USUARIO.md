# Manual de Usuario — GarageUno

> Sistema de gestión de lavadero y estacionamiento  
> Versión actual · garageuno.ar

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Página de inicio (pública)](#2-página-de-inicio-pública)
3. [Panel de recepción](#3-panel-de-recepción)
   - 3.1 [Turnos de lavado](#31-turnos-de-lavado)
   - 3.2 [Caja diaria](#32-caja-diaria)
   - 3.3 [Estacionamiento diario](#33-estacionamiento-diario)
   - 3.4 [Estacionamiento mensual](#34-estacionamiento-mensual)
4. [Panel de administrador](#4-panel-de-administrador)
   - 4.1 [Clientes](#41-clientes)
   - 4.2 [Conceptos de caja](#42-conceptos-de-caja)
   - 4.3 [Arqueo de caja](#43-arqueo-de-caja)
   - 4.4 [Informe mensual](#44-informe-mensual)
   - 4.5 [Configuración de lavado](#45-configuración-de-lavado)
   - 4.6 [Configuración general](#46-configuración-general)
5. [Reserva de turno (cliente externo)](#5-reserva-de-turno-cliente-externo)
6. [Notificaciones por WhatsApp](#6-notificaciones-por-whatsapp)

---

## 1. Acceso al sistema

Desde la página de inicio tocá el botón **☰ Panel** (esquina superior derecha) y elegí:

| Opción | URL | Quién la usa |
|---|---|---|
| Panel recepción | `/empleado` | Empleados del día a día |
| Panel administrador | `/admin` | Dueño / administrador |

Ambos paneles requieren usuario y contraseña. Si no tenés credenciales, pedíselas al administrador.

---

## 2. Página de inicio (pública)

La ven los clientes que entran a `garageuno.ar`. Tiene:

- **Logo y nombre del negocio** — configurables desde el admin
- **Leyenda** — texto libre opcional (ej: "Abrimos de Lunes a Sábados de 8 a 20 hs")
- **Reservar turno de lavado** — lleva al formulario de reserva online
- **Cómo llegar** — abre Google Maps (si está configurado)
- **WhatsApp** — botón flotante inferior derecho que abre la conversación con el local

Todo el contenido (colores, logo, texto) se edita desde **Admin → Configuración general**.

---

## 3. Panel de recepción

Ingresá en `/empleado`. Desde la barra lateral tenés acceso a:

### 3.1 Turnos de lavado

Vista de agenda con dos modos:

- **Vista día** — muestra los turnos del día seleccionado
- **Vista semana** — panorama de 7 días

#### Crear un turno nuevo

1. Hacé clic en **"+ Nuevo turno"**
2. Elegí el **tipo de vehículo** (Auto / Camioneta / SUV / Moto)
3. Elegí el **tipo de servicio** (Completo / Exterior / Aspirado)
4. Seleccioná la **fecha** en el calendario y el **horario** disponible  
   _(solo se muestran slots libres a partir de la hora actual si es hoy)_
5. Ingresá la **patente** del cliente  
   - Si ya existe en el sistema se autocompletan los datos
   - Si es nuevo, completá nombre, apellido y celular
6. Confirmá → el turno queda registrado

#### Estados de un turno

| Estado | Descripción |
|---|---|
| 🟡 Pendiente | Creado pero no confirmado (reservas online) |
| 🔵 Confirmado | Confirmado por recepción |
| 🟢 Completado | Servicio realizado y cobrado |
| ⛔ Cancelado | Cancelado (se elimina el cobro de caja si lo había) |

#### Acciones sobre un turno

- **Confirmar / Completar** → cambia el estado y genera el movimiento de caja automáticamente
- **Cancelar** → borra el movimiento de caja asociado
- **Editar** → cambia fecha, hora o estado
- **WhatsApp** → envía al cliente el link de confirmación con detalles del turno

---

### 3.2 Caja diaria

Accedé desde **Caja** en el menú lateral. Muestra todos los movimientos del día actual.

#### Resumen superior

- **Total ingresos** del día (lavados + estacionamientos cobrados + ingresos manuales)
- **Total egresos** del día (gastos + egresos manuales)
- **Neto** = Ingresos − Egresos

#### Tipos de movimiento en caja

| Tipo | Generado por |
|---|---|
| Lavado | Turno completado / confirmado |
| Estacionamiento | Entrada/salida de vehículo |
| Ingreso | Manual (propinas, venta de accesorios, etc.) |
| Egreso | Manual (sueldos, alquiler, etc.) |
| Gasto | Manual (productos de limpieza, etc.) |

#### Agregar movimiento manual

1. Clic en **"+ Movimiento"**
2. Elegí el concepto (lista configurable desde Admin)
3. Ingresá el monto y una descripción opcional
4. Confirmá

#### Editar / Eliminar movimiento

- Cada fila tiene botones de **✏️ editar** y **🗑️ eliminar** (solo admin ve el de eliminar)
- Al eliminar un movimiento de lavado que venía de un turno, el turno vuelve a quedar sin cobro

---

### 3.3 Estacionamiento diario

Desde **Caja → "Nuevo estacionamiento"**:

1. Ingresá la **patente**
2. Si el cliente existe, se carga automáticamente; si no, completá los datos
3. Elegí el **tipo de cobro**:

| Tipo | Descripción |
|---|---|
| ½ Estadía | Tarifa fija por media jornada |
| Estadía completa | Tarifa fija por jornada completa |
| Por hora | Se cobra al salir según tiempo transcurrido |
| Mensual | Ver sección 3.4 |

4. Elegí el **tipo de vehículo** (Moto / Auto / SUV/Camioneta)
5. Clic en **"🅿️ Registrar entrada"** → queda registrado como "en curso"

#### Registrar salida

En la lista de movimientos, los estacionamientos en curso tienen el badge **"En curso"** y el botón **"Finalizar"**:

1. Clic en **"Finalizar"**
2. El sistema calcula el monto según la tarifa configurada y el tiempo transcurrido (si es por hora)
3. Podés ajustar el monto si es necesario
4. Confirmá → se registra la salida y se cierra el movimiento

---

### 3.4 Estacionamiento mensual

Los clientes con abono mensual tienen una tarifa fija por mes. El flujo es:

#### Alta de cliente mensual

Desde **Admin → Clientes**, editá el cliente y marcalo como **"Cliente mensual"** con su tipo de abono:
- Mensual completa (tarifa × tipo de vehículo)
- Mensual ½ estadía (tarifa × tipo de vehículo)

#### Generar cobros del mes

Desde **Caja → pestaña "Mensuales"**:

1. Clic en **"Generar mes"** (solo disponible para admin)
2. Ingresá el mes y año
3. Se crean automáticamente los registros pendientes para todos los clientes mensuales activos

#### Cobrar un mensual

1. En la tabla de mensuales, buscá el cliente con estado **Pendiente**
2. Clic en **"Cobrar"**
3. Se muestra el monto calculado:
   - Tarifa base del mes según tipo de vehículo
   - Si ya pasó el día 10 del mes, se aplica un interés diario configurable
4. Podés ajustar el monto manualmente si es necesario
5. Confirmá → queda registrado como **Pagado** con fecha y monto

#### Interés por atraso

- A partir del día 11 del mes, se aplica un porcentaje de interés diario sobre la tarifa base
- Las tasas son configurables por separado para mensual completa y mensual ½ estadía
- Se muestra el detalle del cálculo en el modal de cobro

---

## 4. Panel de administrador

Accedé en `/admin`. Incluye todo lo del panel de recepción más las secciones exclusivas:

### 4.1 Clientes

Lista completa de clientes con búsqueda por patente, nombre o apellido.

**Acciones disponibles:**
- **Crear** — nuevo cliente con patente, nombre, apellido, celular, tipo de vehículo
- **Editar** — modificar todos los datos, incluyendo si es cliente mensual y el tipo de abono
- **Eliminar** — elimina el cliente (solo si no tiene movimientos asociados)
- **Ver historial** — turnos y movimientos del cliente (próximamente)

---

### 4.2 Conceptos de caja

Desde **Admin → Conceptos**. Son las categorías para los movimientos manuales de caja.

**Tipos de concepto:**

| Tipo | Afecta |
|---|---|
| Ingreso | Suma al total ingresos |
| Egreso | Suma al total egresos |
| Gasto | Suma al total egresos (subcategoría) |

**Acciones:** crear, editar nombre/tipo, activar/desactivar, eliminar.  
Los conceptos inactivos no aparecen al registrar movimientos pero sí en el historial.

---

### 4.3 Arqueo de caja

Desde **Admin → Arqueo**. Reporte de movimientos por período.

**Filtros:**
- Por día, por mes o por año
- O un rango de fechas personalizado

**El reporte incluye:**
- Resumen: total ingresos, total egresos, neto del período
- Desglose por tipo de movimiento (lavados, estacionamientos, ingresos manuales, egresos, gastos)
- Gráfico de barras por día
- Tabla detallada de cada movimiento

**Nota:** los estacionamientos que están "en curso" (sin salida) no se incluyen hasta que se registre la salida.

---

### 4.4 Informe mensual

Desde **Admin → Informe mensual**. Resumen ejecutivo del mes seleccionado.

**Incluye:**
- Cantidad de lavados por tipo de vehículo y servicio
- Total ingresos desglosados: lavados / estacionamientos / ingresos manuales
- Total egresos: gastos / egresos / sueldos
- Resultado neto del mes

---

### 4.5 Configuración de lavado

Desde **Admin → Configuración → Lavado**.

Tabla de precios y duraciones para cada combinación de vehículo × servicio:

| Vehículo | Completo | Exterior | Aspirado |
|---|---|---|---|
| Auto | precio / duración | precio / duración | precio / duración |
| Camioneta | precio / duración | precio / duración | precio / duración |
| SUV | precio / duración | precio / duración | precio / duración |
| Moto | precio / duración | precio / duración | precio / duración |

Estos valores determinan:
- Los **slots disponibles** (duración define cuántos turnos caben por día)
- El **monto que se registra en caja** al completar un turno

---

### 4.6 Configuración general

Desde **Admin → Configuración → General**.

#### Apariencia de la página de inicio
- **Logo** — subí una imagen (PNG, JPG, WebP o SVG, máx. 500 KB). Se guarda como base64 en la BD.
- **Color del gradiente** — dos selectores de color para el fondo de la página pública

#### Datos del negocio
- **Nombre del negocio** — aparece en la página de inicio y en los mensajes de WhatsApp
- **WhatsApp** — número de contacto (formato: 3765061400, sin +54 ni 0). Aparece en el botón flotante
- **URL base** — URL del sistema en producción (se usa para generar links en los mensajes de WhatsApp)

#### Página de inicio — contacto y ubicación
- **Leyenda** — texto libre que aparece debajo del subtítulo (ej: horarios, promociones)
- **URL de Google Maps** — link al local en Maps. Activa el botón "📍 Cómo llegar"

#### Horarios
- **Horarios de lavado** — apertura y cierre. Determinan los slots disponibles para reservas
- **Horarios de estacionamiento** — apertura y cierre del servicio de estacionamiento

#### Tarifas de estacionamiento
- **Mensual completa** — precio por tipo de vehículo (Moto / Auto / SUV)
- **Mensual ½ estadía** — precio por tipo de vehículo
- **Interés diario mensual completa** — % diario que se aplica a partir del día 11
- **Interés diario mensual ½ estadía** — % diario que se aplica a partir del día 11
- **½ Estadía** — tarifa fija por vehículo
- **Diario completo** — tarifa fija por vehículo
- **Por hora** — tarifa única (sin diferencia por vehículo)

---

## 5. Reserva de turno (cliente externo)

Los clientes pueden reservar desde `garageuno.ar` → **"Reservar turno de lavado"**, sin necesidad de registrarse:

1. Eligen el **tipo de vehículo**
2. Eligen el **tipo de servicio** con precio y duración
3. Eligen **fecha y hora** (solo horarios libres y a partir de la hora actual si es hoy)
4. Completan **nombre, apellido, patente y celular** (o datos autocompletados si la patente ya existe)
5. Confirman → reciben un **link único** para gestionar el turno

Desde el link, el cliente puede:
- Ver los detalles del turno
- **Cancelar** el turno (hasta X tiempo antes)

El turno llega al panel con estado **Pendiente** y recepción puede confirmarlo.

---

## 6. Notificaciones por WhatsApp

El sistema genera links de WhatsApp para comunicarse con los clientes. Al hacer clic, abre WhatsApp Web con el mensaje prellenado.

**Cuándo se usa:**

| Situación | Quién lo envía |
|---|---|
| Turno confirmado | Empleado desde el panel de turnos |
| Estacionamiento finalizado | Empleado desde caja |
| Abono mensual cobrado | Empleado desde caja |

**Importante:** el mensaje incluye el nombre del negocio, los detalles del servicio y (cuando aplica) el link para que el cliente gestione su turno.

---

*Última actualización: abril 2026*
