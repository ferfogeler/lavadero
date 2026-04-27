"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarioMini } from "@/components/CalendarioMini";
import { Spinner } from "@/components/Spinner";
import { Toast, useToast } from "@/components/Toast";
import { EstadoBadge } from "@/components/Badge";
import { labelTipoVehiculo } from "@/lib/utils";

interface Turno {
  id: number;
  patente: string;
  tipo_vehiculo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  tokenModificacion: string;
  cliente?: { nombre: string; apellido: string };
}

export default function TurnoPage({ params }: { params: { token: string } }) {
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patenteInput, setPatenteInput] = useState("");
  const [verificado, setVerificado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [vista, setVista] = useState<"detalle" | "modificar" | "cancelar">("detalle");
  const [nuevaFecha, setNuevaFecha] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [nuevaHora, setNuevaHora] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [whatsapp, setWhatsapp] = useState("3765061400");
  const [whatsappPendiente, setWhatsappPendiente] = useState<{ url: string; titulo: string } | null>(null);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    Promise.all([
      fetch(`/api/turnos/token/${params.token}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/configuracion/general").then((r) => r.json()),
    ]).then(([t, cfg]) => {
      setTurno(t);
      setWhatsapp(cfg.whatsapp_lavadero || "3765061400");
      setLoading(false);
      if (!t) setError("Turno no encontrado");
    });
  }, [params.token]);

  const handleVerificar = () => {
    if (!turno) return;
    setVerificando(true);
    if (patenteInput.toUpperCase() === turno.patente?.toUpperCase()) {
      setVerificado(true);
    } else {
      show("Patente incorrecta. Verificá e intentá de nuevo.", "error");
    }
    setVerificando(false);
  };

  const cargarSlots = useCallback(async (fecha: Date) => {
    if (!turno) return;
    setLoadingSlots(true);
    setNuevaHora(null);
    const f = format(fecha, "yyyy-MM-dd");
    const res = await fetch(`/api/turnos/disponibles?fecha=${f}&tipo=${turno.tipo_vehiculo}&excluir=${turno.id}`);
    const data = await res.json();
    setSlots(data.slots || []);
    setLoadingSlots(false);
  }, [turno]);

  const handleFechaSelect = (fecha: Date) => {
    setNuevaFecha(fecha);
    cargarSlots(fecha);
  };

  const handleModificar = async () => {
    if (!nuevaFecha || !nuevaHora) { show("Elegí fecha y horario", "error"); return; }
    setProcesando(true);
    const res = await fetch(`/api/turnos/token/${params.token}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patente: patenteInput, fecha: format(nuevaFecha, "yyyy-MM-dd"), hora_inicio: nuevaHora }),
    });
    if (res.ok) {
      const t = await res.json();
      setTurno(t);
      setVista("detalle");
      show("Turno modificado correctamente", "success");
      const fechaFmt = format(nuevaFecha, "dd/MM/yyyy");
      const enlace = `${window.location.origin}/turno/${params.token}`;
      const texto = encodeURIComponent(
        `✏️ *Turno modificado*\n\n` +
        `🚗 *Patente:* ${turno!.patente}\n` +
        `📅 *Nueva fecha:* ${fechaFmt}\n` +
        `⏰ *Nuevo horario:* ${nuevaHora}\n\n` +
        `🔗 Gestionar turno:\n${enlace}`
      );
      setWhatsappPendiente({ url: `https://wa.me/${whatsapp}?text=${texto}`, titulo: "Avisar cambio de turno al lavadero" });
    } else {
      const e = await res.json();
      show(e.error || "Error al modificar el turno", "error");
    }
    setProcesando(false);
  };

  const handleCancelar = async () => {
    setProcesando(true);
    const fechaFmt = turno ? format(new Date(turno.fecha), "dd/MM/yyyy") : "";
    const hora = turno?.hora_inicio
      ? (turno.hora_inicio.includes("T") ? turno.hora_inicio.slice(11, 16) : turno.hora_inicio.slice(0, 5))
      : "";
    const res = await fetch(`/api/turnos/token/${params.token}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patente: patenteInput }),
    });
    if (res.ok) {
      setTurno((t) => t ? { ...t, estado: "cancelado" } : t);
      setVista("detalle");
      show("Turno cancelado", "info");
      const texto = encodeURIComponent(
        `❌ *Turno cancelado*\n\n` +
        `🚗 *Patente:* ${turno!.patente}\n` +
        `📅 *Fecha cancelada:* ${fechaFmt}\n` +
        `⏰ *Horario:* ${hora}\n\n` +
        `🔗 Reservar un nuevo turno:\nhttps://${window.location.host}/reserva`
      );
      setWhatsappPendiente({ url: `https://wa.me/${whatsapp}?text=${texto}`, titulo: "Avisar cancelación al lavadero" });
    } else {
      const e = await res.json();
      show(e.error || "Error al cancelar el turno", "error");
    }
    setProcesando(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  if (error || !turno) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Turno no encontrado</h1>
        <p className="text-gray-500 text-sm">El enlace puede ser incorrecto o el turno fue cancelado.</p>
      </div>
    </div>
  );

  const fechaTurno = format(new Date(turno.fecha), "dd/MM/yyyy");
  const horaTurno = turno.hora_inicio.includes("T")
    ? turno.hora_inicio.slice(11, 16)
    : turno.hora_inicio.slice(0, 5);
  const puedeModificar = ["pendiente", "confirmado"].includes(turno.estado);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900">🚿 Gestión de turno</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Detalle del turno */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Resumen del turno</h2>
              <EstadoBadge estado={turno.estado} />
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Patente</span>
                <span className="font-mono font-bold">{turno.patente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vehículo</span>
                <span>{labelTipoVehiculo(turno.tipo_vehiculo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span>{fechaTurno}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Horario</span>
                <span>{horaTurno}</span>
              </div>
              {turno.cliente && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente</span>
                  <span>{turno.cliente.nombre} {turno.cliente.apellido}</span>
                </div>
              )}
            </div>
          </div>

          {/* Verificación de identidad */}
          {!verificado && puedeModificar && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Para modificar o cancelar, ingresá la patente del vehículo:
              </p>
              <div className="flex gap-2">
                <input
                  value={patenteInput}
                  onChange={(e) => setPatenteInput(e.target.value.toUpperCase())}
                  placeholder="Patente"
                  maxLength={8}
                  className="flex-1 border rounded-xl px-4 py-2 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleVerificar()}
                />
                <button
                  onClick={handleVerificar}
                  disabled={verificando || !patenteInput}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-medium transition"
                >
                  Verificar
                </button>
              </div>
            </div>
          )}

          {/* Opciones tras verificar */}
          {verificado && puedeModificar && vista === "detalle" && (
            <div className="border-t pt-4 flex gap-3">
              <button
                onClick={() => setVista("modificar")}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium transition"
              >
                ✏️ Modificar turno
              </button>
              <button
                onClick={() => setVista("cancelar")}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-medium transition"
              >
                ❌ Cancelar turno
              </button>
            </div>
          )}

          {/* Vista modificar */}
          {verificado && vista === "modificar" && (
            <div className="border-t pt-4">
              <button onClick={() => setVista("detalle")} className="text-blue-600 text-sm mb-4">← Volver</button>
              <h3 className="font-semibold text-gray-800 mb-4">Seleccioná nueva fecha y horario</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <CalendarioMini selected={nuevaFecha} onSelect={handleFechaSelect} disablePast />
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Horarios disponibles</p>
                  {!nuevaFecha && <p className="text-sm text-gray-400">Elegí una fecha</p>}
                  {nuevaFecha && loadingSlots && <Spinner />}
                  {nuevaFecha && !loadingSlots && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                      {slots.length === 0 && <p className="col-span-3 text-sm text-gray-400">Sin disponibilidad</p>}
                      {slots.map((s) => (
                        <button
                          key={s}
                          onClick={() => setNuevaHora(s)}
                          className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            nuevaHora === s ? "bg-blue-600 text-white border-blue-600" : "hover:border-blue-400 hover:bg-blue-50"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleModificar}
                disabled={procesando || !nuevaFecha || !nuevaHora}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium transition"
              >
                {procesando ? <Spinner size="sm" /> : "Confirmar cambio"}
              </button>
            </div>
          )}

          {/* Vista cancelar */}
          {verificado && vista === "cancelar" && (
            <div className="border-t pt-4">
              <button onClick={() => setVista("detalle")} className="text-blue-600 text-sm mb-4">← Volver</button>
              <div className="bg-red-50 rounded-xl p-4 text-center mb-4">
                <p className="font-semibold text-red-800 mb-1">¿Estás seguro?</p>
                <p className="text-sm text-red-600">
                  Vas a cancelar el turno del {fechaTurno} a las {horaTurno}.<br />
                  Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setVista("detalle")}
                  className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl py-3 font-medium transition"
                >
                  No, mantener
                </button>
                <button
                  onClick={handleCancelar}
                  disabled={procesando}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium transition"
                >
                  {procesando ? <Spinner size="sm" /> : "Sí, cancelar"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <a href="/reserva" className="underline hover:text-gray-600">Hacer un nuevo turno</a>
        </p>
      </div>

      {/* Modal WhatsApp (compatible iOS) */}
      {whatsappPendiente && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="text-3xl">💬</div>
            <p className="font-semibold text-gray-800">Enviá el aviso por WhatsApp</p>
            <p className="text-sm text-gray-500">Tocá el botón para notificar al lavadero.</p>
            <a
              href={whatsappPendiente.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setWhatsappPendiente(null)}
              className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-semibold text-lg transition"
            >
              💬 {whatsappPendiente.titulo}
            </a>
            <button
              onClick={() => setWhatsappPendiente(null)}
              className="w-full text-sm text-gray-400 hover:text-gray-600"
            >
              Omitir
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
