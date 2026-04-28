"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarioMini } from "@/components/CalendarioMini";
import { Spinner } from "@/components/Spinner";
import { Toast, useToast } from "@/components/Toast";
import { labelTipoVehiculo, labelServicio, formatMonto } from "@/lib/utils";

type Paso = 1 | 2 | 3 | 4 | 5;
type TipoVehiculo = "auto" | "camioneta" | "suv" | "moto";

const ICONOS_VEHICULO: Record<TipoVehiculo, string> = {
  auto: "🚗", camioneta: "🛻", suv: "🚙", moto: "🏍️",
};
const ICONOS_SERVICIO: Record<string, string> = {
  completo: "🚿", externo: "💧", aspirado: "🌀",
};
const ORDEN_SERVICIO = ["completo", "externo", "aspirado"];

interface ConfigServicio {
  tipo_vehiculo: string;
  servicio: string;
  precio: number;
  duracion_minutos: number;
  activo: boolean;
}

export default function ReservaPage() {
  const [paso, setPaso] = useState<Paso>(1);
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo | null>(null);
  const [tipoServicio, setTipoServicio] = useState<string | null>(null);
  // grouped: { auto: { completo: {...}, externo: {...}, aspirado: {...} }, ... }
  const [configs, setConfigs] = useState<Record<string, Record<string, ConfigServicio>>>({});
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patente, setPatente] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [celular, setCelular] = useState("");
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [turnoCreado, setTurnoCreado] = useState<{ token: string; fecha: string; hora: string } | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [urlBase, setUrlBase] = useState("http://localhost:3000");
  const [whatsapp, setWhatsapp] = useState("3765061400");
  const { toast, show, hide } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/configuracion/lavado").then((r) => r.json()),
      fetch("/api/configuracion/general").then((r) => r.json()),
    ]).then(([lavado, general]) => {
      const grouped: Record<string, Record<string, ConfigServicio>> = {};
      for (const c of lavado) {
        if (!grouped[c.tipo_vehiculo]) grouped[c.tipo_vehiculo] = {};
        grouped[c.tipo_vehiculo][c.servicio] = { ...c, precio: Number(c.precio) };
      }
      setConfigs(grouped);
      setUrlBase(general.url_base || "http://localhost:3000");
      setWhatsapp(general.whatsapp_lavadero || "3765061400");
    });
  }, []);

  const cargarSlots = useCallback(async (fecha: Date, tipo: TipoVehiculo, servicio: string) => {
    setLoadingSlots(true);
    setHoraSeleccionada(null);
    const f = format(fecha, "yyyy-MM-dd");
    const res = await fetch(`/api/turnos/disponibles?fecha=${f}&tipo=${tipo}&servicio=${servicio}`);
    const data = await res.json();
    let slotsData: string[] = data.slots || [];
    // Filtrar horarios pasados con hora LOCAL del cliente (evita desfase UTC vs UTC-3)
    if (f === format(new Date(), "yyyy-MM-dd")) {
      const ahora = format(new Date(), "HH:mm");
      slotsData = slotsData.filter((s) => s > ahora);
    }
    setSlots(slotsData);
    setLoadingSlots(false);
  }, []);

  const handleFechaSelect = (fecha: Date) => {
    setFechaSeleccionada(fecha);
    if (tipoVehiculo && tipoServicio) cargarSlots(fecha, tipoVehiculo, tipoServicio);
  };

  const buscarCliente = useCallback(async (pat: string) => {
    if (pat.length < 6) return;
    setBuscandoCliente(true);
    const res = await fetch(`/api/clientes/${pat}`);
    if (res.ok) {
      const c = await res.json();
      setNombre(c.nombre); setApellido(c.apellido); setCelular(c.celular);
    }
    setBuscandoCliente(false);
  }, []);

  const handleConfirmar = async () => {
    if (!patente || !nombre || !apellido || !celular) {
      show("Completá todos los campos", "error"); return;
    }
    setEnviando(true);
    try {
      await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patente, nombre, apellido, celular, tipo_vehiculo: tipoVehiculo }),
      });

      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patente,
          tipo_vehiculo: tipoVehiculo,
          servicio: tipoServicio,
          fecha: format(fechaSeleccionada!, "yyyy-MM-dd"),
          hora_inicio: horaSeleccionada,
          creadoPor: "web",
        }),
      });

      if (!res.ok) throw new Error();
      const turno = await res.json();

      const enlace = `${urlBase}/turno/${turno.tokenModificacion}`;
      const fechaFmt = format(fechaSeleccionada!, "dd/MM/yyyy");
      const cfg = configs[tipoVehiculo!]?.[tipoServicio!];
      const texto = encodeURIComponent(
        `🚿 *¡Turno confirmado!*\n\n` +
        `👤 *Cliente:* ${nombre} ${apellido}\n` +
        `🚗 *Patente:* ${patente}\n` +
        `🏎️ *Vehículo:* ${labelTipoVehiculo(tipoVehiculo!)}\n` +
        `✨ *Servicio:* ${labelServicio(tipoServicio!)}\n` +
        `📅 *Fecha:* ${fechaFmt}\n` +
        `⏰ *Hora:* ${horaSeleccionada}\n` +
        (cfg ? `💰 *Precio:* ${formatMonto(cfg.precio)}\n` : "") +
        `\n🔗 *Modificar o cancelar tu turno:*\n${enlace}`
      );
      setWhatsappUrl(`https://wa.me/${whatsapp}?text=${texto}`);
      setTurnoCreado({ token: turno.tokenModificacion, fecha: fechaFmt, hora: horaSeleccionada! });
      setPaso(5);
    } catch {
      show("Error al confirmar el turno. Intentá de nuevo.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const resetear = () => {
    setPaso(1); setTipoVehiculo(null); setTipoServicio(null);
    setFechaSeleccionada(null); setHoraSeleccionada(null);
    setPatente(""); setNombre(""); setApellido(""); setCelular("");
    setTurnoCreado(null); setWhatsappUrl("");
  };

  // PASO 5: Confirmación
  if (paso === 5 && turnoCreado) {
    const cfg = configs[tipoVehiculo!]?.[tipoServicio!];
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Turno solicitado!</h1>
          <p className="text-gray-600 mb-6">Enviá el mensaje de WhatsApp para confirmar.</p>
          <div className="bg-blue-50 rounded-xl p-4 text-left mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Vehículo</span>
              <span className="font-medium">{labelTipoVehiculo(tipoVehiculo!)} — {patente}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Servicio</span>
              <span className="font-medium">{ICONOS_SERVICIO[tipoServicio!]} {labelServicio(tipoServicio!)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha</span>
              <span className="font-medium">{turnoCreado.fecha} a las {turnoCreado.hora}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente</span>
              <span className="font-medium">{nombre} {apellido}</span>
            </div>
            {cfg && (
              <div className="flex justify-between">
                <span className="text-gray-500">Precio</span>
                <span className="font-semibold text-blue-700">{formatMonto(cfg.precio)}</span>
              </div>
            )}
          </div>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-semibold text-lg transition mb-3">
              💬 Confirmar por WhatsApp
            </a>
          )}
          <a href={`/turno/${turnoCreado.token}`}
            className="block text-center text-blue-600 text-sm underline mb-4">
            Ver / gestionar mi turno
          </a>
          <button onClick={resetear}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl py-3 font-medium transition">
            Hacer otro turno
          </button>
        </div>
      </div>
    );
  }

  const STEPS = ["Vehículo", "Servicio", "Fecha y hora", "Tus datos"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900">🚿 Reservar turno</h1>
          <p className="text-gray-600 mt-1">Elegí tu servicio y horario</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-8 gap-1 sm:gap-2 overflow-x-auto">
          {STEPS.map((label, idx) => {
            const s = idx + 1;
            return (
              <div key={s} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  paso > s ? "bg-green-500 text-white" : paso === s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {paso > s ? "✓" : s}
                </div>
                <span className={`text-xs hidden sm:block whitespace-nowrap ${paso === s ? "font-semibold text-blue-600" : "text-gray-400"}`}>
                  {label}
                </span>
                {s < STEPS.length && <div className="w-6 sm:w-8 h-0.5 bg-gray-200 mx-0.5" />}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">

          {/* PASO 1: Tipo de vehículo */}
          {paso === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">¿Qué tipo de vehículo traés?</h2>
              <div className="grid grid-cols-2 gap-4">
                {(["auto", "camioneta", "suv", "moto"] as TipoVehiculo[]).map((tipo) => {
                  const tipoConfigs = configs[tipo];
                  const hayActivo = tipoConfigs && Object.values(tipoConfigs).some((c) => c.activo);
                  if (!hayActivo) return null;
                  const precioMin = Math.min(...Object.values(tipoConfigs).filter((c) => c.activo).map((c) => c.precio));
                  return (
                    <button
                      key={tipo}
                      onClick={() => { setTipoVehiculo(tipo); setTipoServicio(null); setPaso(2); }}
                      className="flex flex-col items-center justify-center p-6 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <span className="text-4xl mb-2">{ICONOS_VEHICULO[tipo]}</span>
                      <span className="font-semibold text-gray-800 group-hover:text-blue-600">{labelTipoVehiculo(tipo)}</span>
                      <span className="text-xs text-gray-400 mt-1">desde {formatMonto(precioMin)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 2: Tipo de servicio */}
          {paso === 2 && tipoVehiculo && (
            <div>
              <button onClick={() => setPaso(1)} className="text-blue-600 text-sm mb-4 flex items-center gap-1">← Volver</button>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                {ICONOS_VEHICULO[tipoVehiculo]} {labelTipoVehiculo(tipoVehiculo)} — ¿Qué servicio necesitás?
              </h2>
              <div className="space-y-3 mt-4">
                {ORDEN_SERVICIO.map((srv) => {
                  const c = configs[tipoVehiculo]?.[srv];
                  if (!c?.activo) return null;
                  return (
                    <button
                      key={srv}
                      onClick={() => { setTipoServicio(srv); setPaso(3); if (fechaSeleccionada) cargarSlots(fechaSeleccionada, tipoVehiculo, srv); }}
                      className="w-full flex items-center justify-between p-4 border-2 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{ICONOS_SERVICIO[srv]}</span>
                        <div>
                          <div className="font-semibold text-gray-800 group-hover:text-blue-600">{labelServicio(srv)}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Duración aprox. {c.duracion_minutos} min</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-700 text-lg">{formatMonto(c.precio)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 3: Fecha y horario */}
          {paso === 3 && tipoVehiculo && tipoServicio && (
            <div>
              <button onClick={() => setPaso(2)} className="text-blue-600 text-sm mb-4 flex items-center gap-1">← Volver</button>
              <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center">
                {ICONOS_SERVICIO[tipoServicio]} {labelServicio(tipoServicio)} — Elegí fecha y horario
              </h2>
              <p className="text-center text-sm text-gray-500 mb-4">{labelTipoVehiculo(tipoVehiculo)}</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Fecha</p>
                  <CalendarioMini selected={fechaSeleccionada} onSelect={handleFechaSelect} disablePast />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Horario disponible</p>
                  {!fechaSeleccionada && (
                    <div className="border rounded-xl p-8 text-center text-gray-400 text-sm">Seleccioná una fecha primero</div>
                  )}
                  {fechaSeleccionada && loadingSlots && (
                    <div className="border rounded-xl p-8 flex justify-center"><Spinner /></div>
                  )}
                  {fechaSeleccionada && !loadingSlots && (
                    <div className="border rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {slots.length === 0 && (
                        <p className="col-span-3 text-center text-gray-400 text-sm py-4">No hay horarios disponibles</p>
                      )}
                      {slots.map((slot) => (
                        <button key={slot} onClick={() => setHoraSeleccionada(slot)}
                          className={`py-2 rounded-lg text-sm font-medium transition-colors border ${
                            horaSeleccionada === slot ? "bg-blue-600 text-white border-blue-600" : "hover:border-blue-400 hover:bg-blue-50"
                          }`}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  disabled={!fechaSeleccionada || !horaSeleccionada}
                  onClick={() => setPaso(4)}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-8 py-3 font-medium transition"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: Datos del cliente */}
          {paso === 4 && (
            <div>
              <button onClick={() => setPaso(3)} className="text-blue-600 text-sm mb-4 flex items-center gap-1">← Volver</button>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Tus datos</h2>

              {/* Resumen */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehículo</span>
                  <span className="font-medium">{labelTipoVehiculo(tipoVehiculo!)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicio</span>
                  <span className="font-medium">{ICONOS_SERVICIO[tipoServicio!]} {labelServicio(tipoServicio!)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha y hora</span>
                  <span className="font-medium">{format(fechaSeleccionada!, "dd/MM/yyyy")} a las {horaSeleccionada}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 mt-1.5">
                  <span className="text-gray-600">Precio</span>
                  <span className="font-semibold text-blue-700">{formatMonto(configs[tipoVehiculo!]?.[tipoServicio!]?.precio || 0)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patente *{buscandoCliente && <span className="ml-2 text-xs text-blue-500">Buscando...</span>}
                  </label>
                  <input
                    value={patente}
                    onChange={(e) => { const v = e.target.value.toUpperCase(); setPatente(v); if (v.length >= 6) buscarCliente(v); }}
                    placeholder="Ej: ABC123 o AB123CD"
                    maxLength={8}
                    className="w-full border rounded-xl px-4 py-3 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre"
                      className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                    <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido"
                      className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Celular *</label>
                  <input value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="Ej: 3765000000"
                    type="tel"
                    className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <button
                disabled={enviando || !patente || !nombre || !apellido || !celular}
                onClick={handleConfirmar}
                className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl py-4 font-semibold text-lg transition"
              >
                {enviando ? <Spinner size="sm" /> : "✅ Confirmar turno"}
              </button>
            </div>
          )}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
