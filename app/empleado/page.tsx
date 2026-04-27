"use client";
import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Modal } from "@/components/Modal";
import { Toast, useToast } from "@/components/Toast";
import { EstadoBadge } from "@/components/Badge";
import { Spinner } from "@/components/Spinner";
import { CalendarioMini } from "@/components/CalendarioMini";
import { labelTipoVehiculo, labelServicio, formatMonto } from "@/lib/utils";

interface Turno {
  id: number;
  patente: string | null;
  tipo_vehiculo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  tokenModificacion: string;
  cliente?: { nombre: string; apellido: string };
}

type Vista = "semana" | "dia";

const ESTADOS = ["pendiente", "confirmado", "completado", "cancelado"] as const;

export default function EmpleadoTurnosPage() {
  const [vista, setVista] = useState<Vista>("dia");
  const [fechaBase, setFechaBase] = useState(new Date());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const { toast, show, hide } = useToast();

  // Estado para nuevo turno
  const [nuevoTipo, setNuevoTipo] = useState("auto");
  const [nuevoServicio, setNuevoServicio] = useState("completo");
  const [nuevoFecha, setNuevoFecha] = useState<Date | null>(null);
  const [nuevoSlots, setNuevoSlots] = useState<string[]>([]);
  const [nuevoHora, setNuevoHora] = useState<string | null>(null);
  const [nuevoPatente, setNuevoPatente] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellido, setNuevoApellido] = useState("");
  const [nuevoCelular, setNuevoCelular] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [nuevoStep, setNuevoStep] = useState<1 | 2 | 3 | 4>(1);
  const [nuevoClienteEncontrado, setNuevoClienteEncontrado] = useState<boolean | null>(null);
  // grouped: { auto: { completo: {...}, ... }, ... }
  const [configsLavado, setConfigsLavado] = useState<Record<string, Record<string, { precio: number; duracion_minutos: number; activo: boolean }>>>({});
  const [urlBase, setUrlBase] = useState("http://localhost:3000");
  const [whatsappPendiente, setWhatsappPendiente] = useState<{ url: string; titulo: string } | null>(null);

  const cargarTurnos = useCallback(async () => {
    setLoading(true);
    let url = "";
    if (vista === "dia") {
      url = `/api/turnos?fecha=${format(fechaBase, "yyyy-MM-dd")}`;
    } else {
      const ini = startOfWeek(fechaBase, { weekStartsOn: 1 });
      const fin = endOfWeek(fechaBase, { weekStartsOn: 1 });
      url = `/api/turnos?desde=${format(ini, "yyyy-MM-dd")}&hasta=${format(fin, "yyyy-MM-dd")}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    setTurnos(data);
    setLoading(false);
  }, [vista, fechaBase]);

  useEffect(() => { cargarTurnos(); }, [cargarTurnos]);

  useEffect(() => {
    Promise.all([
      fetch("/api/configuracion/lavado").then((r) => r.json()),
      fetch("/api/configuracion/general").then((r) => r.json()),
    ]).then(([lavado, general]) => {
      const grouped: Record<string, Record<string, { precio: number; duracion_minutos: number; activo: boolean }>> = {};
      for (const c of lavado) {
        if (!grouped[c.tipo_vehiculo]) grouped[c.tipo_vehiculo] = {};
        grouped[c.tipo_vehiculo][c.servicio] = { precio: Number(c.precio), duracion_minutos: c.duracion_minutos, activo: c.activo };
      }
      setConfigsLavado(grouped);
      setUrlBase(general.url_base || "http://localhost:3000");
    });
  }, []);

  const cargarSlotsNuevo = async (fecha: Date, tipo: string, servicio: string) => {
    const f = format(fecha, "yyyy-MM-dd");
    const res = await fetch(`/api/turnos/disponibles?fecha=${f}&tipo=${tipo}&servicio=${servicio}`);
    const data = await res.json();
    setNuevoSlots(data.slots || []);
    setNuevoHora(null);
  };

  const handleNuevoFechaSelect = (fecha: Date) => {
    setNuevoFecha(fecha);
    cargarSlotsNuevo(fecha, nuevoTipo, nuevoServicio);
  };

  const buscarClienteNuevo = async (pat: string) => {
    if (pat.length < 6) return;
    const res = await fetch(`/api/clientes/${pat}`);
    if (res.ok) {
      const c = await res.json();
      setNuevoNombre(c.nombre);
      setNuevoApellido(c.apellido);
      setNuevoCelular(c.celular);
      setNuevoClienteEncontrado(true);
    } else {
      setNuevoNombre(""); setNuevoApellido(""); setNuevoCelular("");
      setNuevoClienteEncontrado(false);
    }
  };

  const handleGuardarNuevo = async () => {
    setGuardando(true);
    if (nuevoPatente && nuevoNombre) {
      await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patente: nuevoPatente, nombre: nuevoNombre, apellido: nuevoApellido, celular: nuevoCelular, tipo_vehiculo: nuevoTipo }),
      });
    }
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patente: nuevoPatente || null,
        tipo_vehiculo: nuevoTipo,
        servicio: nuevoServicio,
        fecha: format(nuevoFecha!, "yyyy-MM-dd"),
        hora_inicio: nuevoHora,
        creadoPor: "empleado",
      }),
    });
    if (res.ok) {
      const turno = await res.json();
      show("Turno creado", "success");
      setModalNuevo(false);
      setNuevoStep(1);

      // WhatsApp al cliente si tiene celular
      const celularDestino = nuevoCelular.replace(/\D/g, "");
      if (celularDestino) {
        const enlace = `${urlBase}/turno/${turno.tokenModificacion}`;
        const fechaFmt = format(nuevoFecha!, "dd/MM/yyyy");
        const cfg = configsLavado[nuevoTipo]?.[nuevoServicio];
        const texto = encodeURIComponent(
          `🚿 *¡Turno confirmado!*\n\n` +
          `👋 Hola *${nuevoNombre} ${nuevoApellido}*\n` +
          `🚗 *Patente:* ${nuevoPatente}\n` +
          `🏎️ *Vehículo:* ${labelTipoVehiculo(nuevoTipo)}\n` +
          `✨ *Servicio:* ${labelServicio(nuevoServicio)}\n` +
          `📅 *Fecha:* ${fechaFmt}\n` +
          `⏰ *Hora:* ${nuevoHora}\n` +
          (cfg ? `💰 *Precio:* ${formatMonto(cfg.precio)}\n` : "") +
          `\n🔗 *Modificar o cancelar tu turno:*\n${enlace}`
        );
        setWhatsappPendiente({ url: `https://wa.me/${celularDestino}?text=${texto}`, titulo: "Enviar confirmación al cliente" });
      }

      setNuevoPatente(""); setNuevoNombre(""); setNuevoApellido(""); setNuevoCelular("");
      setNuevoFecha(null); setNuevoHora(null); setNuevoClienteEncontrado(null); setNuevoServicio("completo");
      cargarTurnos();
    } else {
      show("Error al crear turno", "error");
    }
    setGuardando(false);
  };

  const handleCambiarEstado = async (id: number, estado: string) => {
    const res = await fetch(`/api/turnos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTurnos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (turnoSeleccionado?.id === id) setTurnoSeleccionado(updated);
      show(`Estado cambiado a: ${estado}`, "success");
    } else {
      show("Error al cambiar estado", "error");
    }
  };

  const diasSemana = vista === "semana"
    ? eachDayOfInterval({ start: startOfWeek(fechaBase, { weekStartsOn: 1 }), end: endOfWeek(fechaBase, { weekStartsOn: 1 }) })
    : [fechaBase];

  const turnosPorDia = (fecha: Date) =>
    turnos.filter((t) => t.fecha.slice(0, 10) === format(fecha, "yyyy-MM-dd"))
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const colorBg: Record<string, string> = {
    pendiente: "bg-yellow-50 border-l-4 border-yellow-400",
    confirmado: "bg-green-50 border-l-4 border-green-500",
    completado: "bg-gray-50 border-l-4 border-gray-400",
    cancelado: "bg-red-50 border-l-4 border-red-400 opacity-60",
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFechaBase(vista === "dia" ? subDays(fechaBase, 1) : subDays(fechaBase, 7))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >‹</button>
          <div className="font-semibold text-gray-800 min-w-[180px] text-center capitalize">
            {vista === "dia"
              ? format(fechaBase, "EEEE, d 'de' MMMM", { locale: es })
              : `Semana del ${format(startOfWeek(fechaBase, { weekStartsOn: 1 }), "d/M")} al ${format(endOfWeek(fechaBase, { weekStartsOn: 1 }), "d/M")}`}
          </div>
          <button
            onClick={() => setFechaBase(vista === "dia" ? addDays(fechaBase, 1) : addDays(fechaBase, 7))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >›</button>
          <button
            onClick={() => setFechaBase(new Date())}
            className="ml-2 text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-gray-600"
          >Hoy</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(["dia", "semana"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-3 py-1.5 text-sm ${vista === v ? "bg-blue-600 text-white" : "hover:bg-gray-50 text-gray-600"}`}
              >
                {v === "dia" ? "Día" : "Semana"}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setModalNuevo(true); setNuevoStep(1); }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition"
          >
            + Nuevo turno
          </button>
        </div>
      </div>

      {/* Calendario */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className={`grid gap-4 ${vista === "semana" ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-7" : "grid-cols-1 max-w-xl"}`}>
          {diasSemana.map((dia) => (
            <div key={dia.toISOString()} className="min-h-[200px]">
              <div className={`text-sm font-semibold mb-2 py-1 px-2 rounded-lg ${isToday(dia) ? "bg-blue-600 text-white" : "text-gray-600"}`}>
                {vista === "semana"
                  ? format(dia, "EEE d", { locale: es })
                  : format(dia, "EEEE d 'de' MMMM", { locale: es })}
              </div>
              <div className="space-y-2">
                {turnosPorDia(dia).length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-4">Sin turnos</p>
                )}
                {turnosPorDia(dia).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTurnoSeleccionado(t); setModalDetalle(true); }}
                    className={`w-full text-left p-2 rounded-lg text-xs ${colorBg[t.estado]} hover:opacity-80 transition`}
                  >
                    <div className="font-bold">{t.hora_inicio.slice(11, 16)}</div>
                    <div className="font-mono">{t.patente || "—"}</div>
                    <div className="text-gray-600">{labelTipoVehiculo(t.tipo_vehiculo)}</div>
                    {t.cliente && <div className="text-gray-500 truncate">{t.cliente.nombre} {t.cliente.apellido}</div>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalle turno */}
      <Modal open={modalDetalle} onClose={() => setModalDetalle(false)} title="Detalle del turno">
        {turnoSeleccionado && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Patente</span>
                <span className="font-mono font-bold">{turnoSeleccionado.patente || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vehículo</span>
                <span>{labelTipoVehiculo(turnoSeleccionado.tipo_vehiculo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span>{format(new Date(turnoSeleccionado.fecha), "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Horario</span>
                <span>
                  {turnoSeleccionado.hora_inicio.includes("T") ? turnoSeleccionado.hora_inicio.slice(11, 16) : turnoSeleccionado.hora_inicio.slice(0, 5)}
                  {" – "}
                  {turnoSeleccionado.hora_fin.includes("T") ? turnoSeleccionado.hora_fin.slice(11, 16) : turnoSeleccionado.hora_fin.slice(0, 5)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Estado</span>
                <EstadoBadge estado={turnoSeleccionado.estado} />
              </div>
              {turnoSeleccionado.cliente && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente</span>
                  <span>{turnoSeleccionado.cliente.nombre} {turnoSeleccionado.cliente.apellido}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Cambiar estado:</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => (
                  <button
                    key={e}
                    onClick={() => handleCambiarEstado(turnoSeleccionado.id, e)}
                    disabled={turnoSeleccionado.estado === e}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                      turnoSeleccionado.estado === e ? "bg-gray-200" : "hover:bg-gray-50"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nuevo turno */}
      <Modal open={modalNuevo} onClose={() => { setModalNuevo(false); setNuevoStep(1); setNuevoClienteEncontrado(null); setNuevoServicio("completo"); }} title="Nuevo turno" maxWidth="max-w-2xl">
        <div>
          {/* PASO 1: Tipo de vehículo */}
          {nuevoStep === 1 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Tipo de vehículo:</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(["auto", "camioneta", "suv", "moto"] as const).map((t) => {
                  const tipoConfigs = configsLavado[t];
                  const precioMin = tipoConfigs ? Math.min(...Object.values(tipoConfigs).filter(c => c.activo).map(c => c.precio)) : null;
                  return (
                    <button
                      key={t}
                      onClick={() => { setNuevoTipo(t); setNuevoServicio("completo"); setNuevoStep(2); }}
                      className={`p-3 border-2 rounded-xl text-left transition ${nuevoTipo === t ? "border-blue-500 bg-blue-50 text-blue-700" : "hover:border-gray-300"}`}
                    >
                      <div className="text-sm font-semibold">{labelTipoVehiculo(t)}</div>
                      {precioMin != null && (
                        <div className="text-xs mt-0.5 text-gray-500">desde {formatMonto(precioMin)}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 2: Tipo de servicio */}
          {nuevoStep === 2 && (
            <div>
              <button onClick={() => setNuevoStep(1)} className="text-blue-600 text-sm mb-3">← Volver</button>
              <p className="text-sm font-medium text-gray-700 mb-3">Servicio para {labelTipoVehiculo(nuevoTipo)}:</p>
              <div className="space-y-2 mb-4">
                {["completo", "externo", "aspirado"].map((srv) => {
                  const cfg = configsLavado[nuevoTipo]?.[srv];
                  if (!cfg?.activo) return null;
                  const ICONOS: Record<string, string> = { completo: "🚿", externo: "💧", aspirado: "🌀" };
                  return (
                    <button
                      key={srv}
                      onClick={() => { setNuevoServicio(srv); setNuevoStep(3); if (nuevoFecha) cargarSlotsNuevo(nuevoFecha, nuevoTipo, srv); }}
                      className={`w-full flex items-center justify-between p-3 border-2 rounded-xl transition text-left ${nuevoServicio === srv ? "border-blue-500 bg-blue-50" : "hover:border-gray-300"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{ICONOS[srv]}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{labelServicio(srv)}</div>
                          <div className="text-xs text-gray-500">{cfg.duracion_minutos} min</div>
                        </div>
                      </div>
                      <span className="font-bold text-blue-700">{formatMonto(cfg.precio)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 3: Fecha y hora */}
          {nuevoStep === 3 && (
            <div>
              <button onClick={() => setNuevoStep(2)} className="text-blue-600 text-sm mb-3">← Volver</button>
              <div className="grid md:grid-cols-2 gap-4">
                <CalendarioMini selected={nuevoFecha} onSelect={handleNuevoFechaSelect} disablePast={false} />
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Horarios</p>
                  {!nuevoFecha && <p className="text-sm text-gray-400">Elegí fecha</p>}
                  {nuevoFecha && (
                    <div className="grid grid-cols-3 gap-1 max-h-56 overflow-y-auto">
                      {nuevoSlots.map((s) => (
                        <button key={s} onClick={() => setNuevoHora(s)}
                          className={`py-1.5 rounded-lg text-xs border font-medium transition ${nuevoHora === s ? "bg-blue-600 text-white border-blue-600" : "hover:border-blue-400 hover:bg-blue-50"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setNuevoStep(4)}
                disabled={!nuevoFecha || !nuevoHora}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-2.5 font-medium"
              >
                Siguiente →
              </button>
            </div>
          )}
          {/* PASO 4: Datos del cliente */}
          {nuevoStep === 4 && (
            <div>
              <button onClick={() => { setNuevoStep(3); setNuevoClienteEncontrado(null); }} className="text-blue-600 text-sm mb-3">← Volver</button>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patente *</label>
                  <input
                    value={nuevoPatente}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      setNuevoPatente(v);
                      setNuevoClienteEncontrado(null);
                      if (v.length >= 6) buscarClienteNuevo(v);
                    }}
                    placeholder="ABC123"
                    className="w-full border rounded-xl px-4 py-2.5 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Cliente encontrado */}
                {nuevoClienteEncontrado === true && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm space-y-0.5">
                    <p className="font-semibold text-green-800">✅ Cliente encontrado</p>
                    <p className="text-gray-700">{nuevoNombre} {nuevoApellido}</p>
                    {nuevoCelular && <p className="text-gray-500">📱 {nuevoCelular}</p>}
                  </div>
                )}

                {/* Cliente no encontrado — alta inline */}
                {nuevoClienteEncontrado === false && (
                  <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-amber-700">Patente no registrada — ingresá los datos del cliente</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                        <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Juan"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Apellido *</label>
                        <input value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} placeholder="Pérez"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                      <input value={nuevoCelular} onChange={(e) => setNuevoCelular(e.target.value)} placeholder="3765000000" type="tel"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleGuardarNuevo}
                disabled={guardando || !nuevoPatente}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl py-3 font-semibold"
              >
                {guardando ? <Spinner size="sm" /> : "✅ Guardar turno"}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal WhatsApp (compatible iOS) */}
      <Modal open={!!whatsappPendiente} onClose={() => setWhatsappPendiente(null)} title="Enviar WhatsApp">
        {whatsappPendiente && (
          <div className="space-y-4 text-center">
            <p className="text-gray-600 text-sm">Tocá el botón para enviarle la confirmación al cliente.</p>
            <a
              href={whatsappPendiente.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setWhatsappPendiente(null)}
              className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-semibold text-lg transition"
            >
              💬 {whatsappPendiente.titulo}
            </a>
            <button onClick={() => setWhatsappPendiente(null)} className="w-full text-sm text-gray-400 hover:text-gray-600">
              Omitir
            </button>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
