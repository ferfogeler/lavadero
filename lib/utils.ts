import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatFecha(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy", { locale: es });
}

export function formatHora(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "HH:mm");
}

export function formatMonto(monto: number | string): string {
  const n = typeof monto === "string" ? parseFloat(monto) : monto;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(n);
}

export function labelTipoVehiculo(tipo: string): string {
  const labels: Record<string, string> = {
    auto: "Auto",
    camioneta: "Camioneta",
    suv: "SUV",
    moto: "Moto",
  };
  return labels[tipo] ?? tipo;
}

export function labelEstado(estado: string): string {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    completado: "Completado",
    cancelado: "Cancelado",
  };
  return labels[estado] ?? estado;
}

export function colorEstado(estado: string): string {
  const colors: Record<string, string> = {
    pendiente: "bg-yellow-100 text-yellow-800",
    confirmado: "bg-green-100 text-green-800",
    completado: "bg-gray-100 text-gray-800",
    cancelado: "bg-red-100 text-red-800",
  };
  return colors[estado] ?? "bg-gray-100 text-gray-800";
}

export function addMinutes(baseTime: string, minutes: number): string {
  const [h, m] = baseTime.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function generarSlotsDisponibles(
  apertura: string,
  cierre: string,
  duracion: number,
  ocupados: Array<{ inicio: string; fin: string }>
): string[] {
  const slots: string[] = [];
  let current = timeToMinutes(apertura);
  const end = timeToMinutes(cierre);

  while (current + duracion <= end) {
    const hh = Math.floor(current / 60);
    const mm = current % 60;
    const slot = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const slotEnd = current + duracion;

    const ocupado = ocupados.some(({ inicio, fin }) => {
      const ini = timeToMinutes(inicio);
      const fi = timeToMinutes(fin);
      return current < fi && slotEnd > ini;
    });

    if (!ocupado) slots.push(slot);
    current += 30;
  }

  return slots;
}
