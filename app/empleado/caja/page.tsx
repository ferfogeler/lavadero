"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { formatMonto, labelTipoVehiculo, labelTipoEstacionamiento } from "@/lib/utils";

interface Movimiento {
  id: number;
  fecha: string;
  tipo: string;
  patente: string | null;
  monto: string;
  descripcion: string | null;
  horaEntrada: string | null;
  horaSalida: string | null;
  turnoId: number | null;
  cliente?: { nombre: string; apellido: string; celular: string; tipo_vehiculo: string } | null;
  concepto?: { nombre: string; tipoConcepto: string } | null;
  turno?: { id: number; estado: string; tipo_vehiculo: string; hora_inicio: string } | null;
}

interface Concepto {
  id: number;
  nombre: string;
  tipoConcepto: string;
}

interface EstacionamientoMensual {
  id: number;
  patente: string;
  tipo: string;
  mes: number;
  anio: number;
  fechaAlta: string;
  estado: string;
  montoPagado: string | null;
  fechaPago: string | null;
  cliente?: { nombre: string; apellido: string; celular: string } | null;
}

const MESES_LABEL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function CajaPage() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = (session?.user as { role?: string })?.role === "admin" && pathname.startsWith("/admin");

  // ── Tabs ──────────────────────────────────────────────────────────────
  const [tabActiva, setTabActiva] = useState<"movimientos" | "mensuales">("movimientos");

  // ── Movimientos ───────────────────────────────────────────────────────
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [busquedaPatente, setBusquedaPatente] = useState("");
  const [clienteBuscado, setClienteBuscado] = useState<{ nombre: string; apellido: string; tipo_vehiculo: string } | null>(null);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [modalEstacionamiento, setModalEstacionamiento] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState<Movimiento | null>(null);
  const [modalEditar, setModalEditar] = useState<Movimiento | null>(null);
  const [modalEliminar, setModalEliminar] = useState<Movimiento | null>(null);
  const [modalGestionarLavado, setModalGestionarLavado] = useState<Movimiento | null>(null);
  const [guardandoTurno, setGuardandoTurno] = useState(false);
  const [whatsappPendiente, setWhatsappPendiente] = useState<{ url: string; titulo: string } | null>(null);
  const [editMonto, setEditMonto] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const { toast, show, hide } = useToast();

  // ── Estacionamiento entrada ───────────────────────────────────────────
  const [estPatente, setEstPatente] = useState("");
  const [estCliente, setEstCliente] = useState<{ nombre: string; apellido: string; celular: string; tipo_vehiculo: string } | null>(null);
  const [estNuevoNombre, setEstNuevoNombre] = useState("");
  const [estNuevoApellido, setEstNuevoApellido] = useState("");
  const [estNuevoCelular, setEstNuevoCelular] = useState("");
  const [estNuevoTipoVehiculo, setEstNuevoTipoVehiculo] = useState("auto");
  const [estTipoPrecio, setEstTipoPrecio] = useState<"hora" | "diaria" | "media_diaria">("hora");
  const [guardandoEst, setGuardandoEst] = useState(false);

  // ── Movimiento manual ─────────────────────────────────────────────────
  const [movConceptoId, setMovConceptoId] = useState("");
  const [movMonto, setMovMonto] = useState("");
  const [movDesc, setMovDesc] = useState("");
  const [movFecha, setMovFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [guardandoMov, setGuardandoMov] = useState(false);

  // ── Precios desde config ──────────────────────────────────────────────
  const [tarifa, setTarifa] = useState(50);                  // legacy fraccion/min
  const [precioHora, setPrecioHora] = useState(500);
  const [precioDiaria, setPrecioDiaria] = useState(2000);
  const [precioMediaDiaria, setPrecioMediaDiaria] = useState(1000);
  const [precioMensualCompleta, setPrecioMensualCompleta] = useState(25000);
  const [precioMensualMedia, setPrecioMensualMedia] = useState(15000);
  const [interesDiarioPct, setInteresDiarioPct] = useState(1.5);

  // ── Mensuales ─────────────────────────────────────────────────────────
  const [mensuales, setMensuales] = useState<EstacionamientoMensual[]>([]);
  const [loadingMensuales, setLoadingMensuales] = useState(false);
  const [mesMensual, setMesMensual] = useState(new Date().getMonth() + 1);
  const [anioMensual, setAnioMensual] = useState(new Date().getFullYear());
  const [modalCobrarMensual, setModalCobrarMensual] = useState<EstacionamientoMensual | null>(null);
  const [generandoMes, setGenerandoMes] = useState(false);
  const [cobrandoMensual, setCobrandoMensual] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/conceptos?activos=true").then((r) => r.json()),
      fetch("/api/configuracion/general").then((r) => r.json()),
    ]).then(([c, cfg]) => {
      setConceptos(c);
      setTarifa(parseFloat(cfg.tarifa_estacionamiento_por_minuto) || 50);
      setPrecioHora(parseFloat(cfg.precio_hora) || 500);
      setPrecioDiaria(parseFloat(cfg.precio_diaria) || parseFloat(cfg.precio_estadia_completa) || 2000);
      setPrecioMediaDiaria(parseFloat(cfg.precio_media_diaria) || parseFloat(cfg.precio_media_estadia) || 1000);
      setPrecioMensualCompleta(parseFloat(cfg.precio_mensual_completa) || 25000);
      setPrecioMensualMedia(parseFloat(cfg.precio_mensual_media) || 15000);
      setInteresDiarioPct(parseFloat(cfg.interes_mensual_diario_pct) || 1.5);
    });
  }, []);

  const cargarMovimientos = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/movimientos?fecha=${fecha}`);
    const data = await res.json();
    setMovimientos(data);
    setLoading(false);
  }, [fecha]);

  useEffect(() => { cargarMovimientos(); }, [cargarMovimientos]);

  const cargarMensuales = useCallback(async () => {
    setLoadingMensuales(true);
    const res = await fetch(`/api/estacionamiento-mensual?mes=${mesMensual}&anio=${anioMensual}`);
    const data = await res.json();
    setMensuales(Array.isArray(data) ? data : []);
    setLoadingMensuales(false);
  }, [mesMensual, anioMensual]);

  useEffect(() => {
    if (tabActiva === "mensuales") cargarMensuales();
  }, [tabActiva, cargarMensuales]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const buscarCliente = async (pat: string) => {
    const res = await fetch(`/api/clientes/${pat}`);
    if (res.ok) { const c = await res.json(); return c; }
    return null;
  };

  const handleBuscarPatente = async () => {
    if (!busquedaPatente) return;
    const c = await buscarCliente(busquedaPatente.toUpperCase());
    setClienteBuscado(c);
  };

  const handleEstPatenteChange = async (v: string) => {
    const upper = v.toUpperCase();
    setEstPatente(upper);
    setEstCliente(null);
    setEstNuevoNombre(""); setEstNuevoApellido(""); setEstNuevoCelular(""); setEstNuevoTipoVehiculo("auto");
    if (upper.length >= 6) {
      const c = await buscarCliente(upper);
      setEstCliente(c);
    }
  };

  // Calcula el total al finalizar estacionamiento
  const calcularTotal = (mov: Movimiento, entrada: Date, salida: Date) => {
    const minutos = Math.ceil((salida.getTime() - entrada.getTime()) / 60000);
    const tipo = mov.descripcion ?? "";

    if (tipo === "diaria" || tipo === "completa") {
      return { total: precioDiaria, minutos, horas: null };
    }
    if (tipo === "media_diaria" || tipo === "media") {
      return { total: precioMediaDiaria, minutos, horas: null };
    }
    if (tipo === "hora") {
      const horasBase = Math.floor(minutos / 60);
      const minutosExtra = minutos - horasBase * 60;
      const horasCobradas = Math.max(1, horasBase + (minutosExtra > 10 ? 1 : 0));
      return { total: horasCobradas * precioHora, minutos, horas: horasCobradas };
    }
    // fraccion (legacy: por minuto)
    return { total: minutos * tarifa, minutos, horas: null };
  };

  // Calcula monto mensual con interés
  const calcularMontoMensual = (m: EstacionamientoMensual) => {
    const precioBase = m.tipo === "mensual_completa" ? precioMensualCompleta : precioMensualMedia;
    const hoy = new Date();
    const esMesActual = m.mes === hoy.getMonth() + 1 && m.anio === hoy.getFullYear();
    const diasVencidos = esMesActual ? Math.max(0, hoy.getDate() - 10) : 0;
    const interes = Math.round(precioBase * (interesDiarioPct / 100) * diasVencidos);
    return { precioBase, diasVencidos, interes, total: precioBase + interes };
  };

  // ── Handlers estacionamiento ──────────────────────────────────────────
  const handleGuardarEstacionamiento = async () => {
    if (!estPatente) { show("La patente es obligatoria", "error"); return; }
    setGuardandoEst(true);

    let clienteActivo = estCliente;
    if (!estCliente && estNuevoNombre && estNuevoApellido) {
      const resCliente = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patente: estPatente, nombre: estNuevoNombre, apellido: estNuevoApellido, celular: estNuevoCelular || null, tipo_vehiculo: estNuevoTipoVehiculo }),
      });
      if (resCliente.ok) clienteActivo = await resCliente.json();
    }

    const ahora = new Date();
    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "estacionamiento", patente: estPatente, monto: 0, descripcion: estTipoPrecio, horaEntrada: ahora.toISOString() }),
    });
    if (res.ok) {
      show("Estacionamiento iniciado", "success");
      setModalEstacionamiento(false);
      if (clienteActivo?.celular) {
        const msg =
          `🅿️ *¡Ingreso registrado!*\n\n` +
          `👋 Hola *${clienteActivo.nombre} ${clienteActivo.apellido}*\n` +
          `🚗 *Patente:* ${estPatente}\n` +
          `📅 *Fecha:* ${format(ahora, "dd/MM/yyyy")}\n` +
          `⏰ *Hora de entrada:* ${format(ahora, "HH:mm")}\n` +
          `💳 *Tarifa:* ${labelTipoEstacionamiento(estTipoPrecio)}\n\n` +
          `✅ Te avisamos cuando retires el vehículo. ¡Gracias!`;
        const numero = clienteActivo.celular.replace(/\D/g, "");
        setWhatsappPendiente({ url: `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, titulo: "Avisar ingreso al cliente" });
      }
      setEstPatente(""); setEstCliente(null); setEstTipoPrecio("hora");
      setEstNuevoNombre(""); setEstNuevoApellido(""); setEstNuevoCelular(""); setEstNuevoTipoVehiculo("auto");
      cargarMovimientos();
    } else {
      show("Error al registrar estacionamiento", "error");
    }
    setGuardandoEst(false);
  };

  const handleFinalizarEstacionamiento = async (mov: Movimiento) => {
    const entrada = new Date(mov.horaEntrada!);
    const salida = new Date();
    const { total, minutos, horas } = calcularTotal(mov, entrada, salida);
    const res = await fetch(`/api/movimientos/${mov.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horaSalida: salida.toISOString(), monto: total }),
    });
    if (res.ok) {
      show(`Estacionamiento finalizado: ${formatMonto(total)}`, "success");
      setModalFinalizar(null);
      if (mov.cliente?.celular) {
        const tipoLabel = labelTipoEstacionamiento(mov.descripcion ?? "");
        const msg =
          `🏁 *¡Egreso registrado!*\n\n` +
          `👋 Hola *${mov.cliente.nombre} ${mov.cliente.apellido}*\n` +
          `🚗 *Patente:* ${mov.patente}\n` +
          `💳 *Tarifa:* ${tipoLabel}\n` +
          `🟢 *Entrada:* ${format(entrada, "HH:mm")}\n` +
          `🔴 *Salida:* ${format(salida, "HH:mm")}\n` +
          (horas ? `🕐 *Horas cobradas:* ${horas}\n` : `⏱️ *Tiempo:* ${minutos} min\n`) +
          `💰 *Total cobrado:* ${formatMonto(total)}\n\n` +
          `🙏 ¡Gracias por elegirnos! Hasta la próxima 👋`;
        const numero = mov.cliente.celular.replace(/\D/g, "");
        setWhatsappPendiente({ url: `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, titulo: "Avisar egreso al cliente" });
      }
      cargarMovimientos();
    } else {
      show("Error al finalizar estacionamiento", "error");
    }
  };

  // ── Handlers movimiento manual ────────────────────────────────────────
  const abrirModalEditar = (m: Movimiento) => {
    setModalEditar(m);
    setEditMonto(parseFloat(m.monto).toString());
    setEditDesc(m.descripcion || "");
    setEditFecha(format(new Date(m.fecha), "yyyy-MM-dd"));
  };

  const handleGuardarEdicion = async () => {
    if (!modalEditar) return;
    setGuardandoEdit(true);
    const res = await fetch(`/api/movimientos/${modalEditar.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: parseFloat(editMonto), descripcion: editDesc, fecha: editFecha }),
    });
    if (res.ok) {
      show("Movimiento actualizado", "success");
      setModalEditar(null);
      cargarMovimientos();
    } else {
      show("Error al actualizar", "error");
    }
    setGuardandoEdit(false);
  };

  const handleEliminarMovimiento = async () => {
    if (!modalEliminar) return;
    const res = await fetch(`/api/movimientos/${modalEliminar.id}`, { method: "DELETE" });
    if (res.ok) {
      show("Movimiento eliminado", "success");
      setModalEliminar(null);
      cargarMovimientos();
    } else {
      show("Error al eliminar", "error");
    }
  };

  const handleGuardarMovimiento = async () => {
    setGuardandoMov(true);
    const concepto = conceptos.find((c) => c.id === parseInt(movConceptoId));
    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: concepto?.tipoConcepto || "ingreso", conceptoId: movConceptoId || null, monto: parseFloat(movMonto), descripcion: movDesc || null, fecha: movFecha }),
    });
    if (res.ok) {
      show("Movimiento registrado", "success");
      setModalMovimiento(false);
      setMovConceptoId(""); setMovMonto(""); setMovDesc("");
      cargarMovimientos();
    } else {
      show("Error al registrar movimiento", "error");
    }
    setGuardandoMov(false);
  };

  const handleCambiarEstadoTurno = async (turnoId: number, estado: string) => {
    setGuardandoTurno(true);
    const res = await fetch(`/api/turnos/${turnoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      show(`Turno marcado como ${estado}`, "success");
      setModalGestionarLavado(null);
      cargarMovimientos();
    } else {
      show("Error al cambiar estado", "error");
    }
    setGuardandoTurno(false);
  };

  // ── Handlers mensuales ────────────────────────────────────────────────
  const handleGenerarMes = async () => {
    setGenerandoMes(true);
    const res = await fetch("/api/estacionamiento-mensual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generar: true, mes: mesMensual, anio: anioMensual }),
    });
    if (res.ok) {
      const data = await res.json();
      show(`${data.total} estadía${data.total !== 1 ? "s" : ""} generada${data.total !== 1 ? "s" : ""} (${data.created} nueva${data.created !== 1 ? "s" : ""})`, "success");
      cargarMensuales();
    } else {
      show("Error al generar estadías", "error");
    }
    setGenerandoMes(false);
  };

  const handleCobrarMensual = async () => {
    if (!modalCobrarMensual) return;
    setCobrandoMensual(true);
    const { total } = calcularMontoMensual(modalCobrarMensual);
    const res = await fetch(`/api/estacionamiento-mensual/${modalCobrarMensual.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cobrar: true, monto: total }),
    });
    if (res.ok) {
      show("Estadía cobrada correctamente", "success");
      const m = modalCobrarMensual;
      setModalCobrarMensual(null);
      if (m.cliente?.celular) {
        const { precioBase, diasVencidos, interes } = calcularMontoMensual(m);
        const tipoLabel = m.tipo === "mensual_completa" ? "Estadía mensual completa" : "Mensual media estadía";
        const msg =
          `💳 *Pago registrado - Estacionamiento mensual*\n\n` +
          `👋 Hola *${m.cliente.nombre} ${m.cliente.apellido}*\n` +
          `🚗 *Patente:* ${m.patente}\n` +
          `📅 *Período:* ${MESES_LABEL[m.mes - 1]} ${m.anio}\n` +
          `🅿️ *Servicio:* ${tipoLabel}\n\n` +
          `💰 *Precio base:* ${formatMonto(precioBase)}\n` +
          (diasVencidos > 0 ? `📈 *Interés (${interesDiarioPct}% × ${diasVencidos} días):* ${formatMonto(interes)}\n` : "") +
          `✅ *Total cobrado:* ${formatMonto(total)}\n\n` +
          `🙏 ¡Gracias por elegirnos!`;
        const numero = m.cliente.celular.replace(/\D/g, "");
        setWhatsappPendiente({ url: `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, titulo: "Enviar recibo al cliente" });
      }
      cargarMensuales();
    } else {
      show("Error al cobrar", "error");
    }
    setCobrandoMensual(false);
  };

  // ── Totales ───────────────────────────────────────────────────────────
  const totalIngresos = movimientos
    .filter((m) => ["lavado", "ingreso"].includes(m.tipo) || (m.tipo === "estacionamiento" && m.horaSalida))
    .reduce((a, m) => a + parseFloat(m.monto), 0);

  const totalEgresos = movimientos
    .filter((m) => ["egreso", "gasto"].includes(m.tipo))
    .reduce((a, m) => a + parseFloat(m.monto), 0);

  const colorTipo: Record<string, string> = {
    lavado: "text-blue-600",
    estacionamiento: "text-green-600",
    ingreso: "text-emerald-600",
    egreso: "text-red-600",
    gasto: "text-orange-600",
  };

  const labelTipoMov: Record<string, string> = {
    lavado: "Lavado",
    estacionamiento: "Estacionamiento",
    ingreso: "Ingreso",
    egreso: "Egreso",
    gasto: "Gasto",
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            value={busquedaPatente}
            onChange={(e) => setBusquedaPatente(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleBuscarPatente()}
            placeholder="Buscar patente..."
            className="border rounded-xl px-4 py-2 font-mono uppercase flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleBuscarPatente} className="bg-gray-700 text-white rounded-xl px-4 py-2 text-sm">
            Buscar
          </button>
        </div>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => setModalEstacionamiento(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm font-medium">
          🅿️ Nuevo estacionamiento
        </button>
        <button onClick={() => setModalMovimiento(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium">
          + Nuevo movimiento
        </button>
      </div>

      {/* Info cliente buscado */}
      {clienteBuscado && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-mono font-bold text-blue-700 mr-3">{busquedaPatente}</span>
            <span className="font-medium">{clienteBuscado.nombre} {clienteBuscado.apellido}</span>
            <span className="text-gray-500 ml-2">{labelTipoVehiculo(clienteBuscado.tipo_vehiculo)}</span>
          </div>
          <button onClick={() => { setClienteBuscado(null); setBusquedaPatente(""); }} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {(["movimientos", "mensuales"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setTabActiva(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tabActiva === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "movimientos" ? "📋 Movimientos del día" : "📅 Estadías mensuales"}
          </button>
        ))}
      </div>

      {/* ══════════════════════ TAB MOVIMIENTOS ══════════════════════ */}
      {tabActiva === "movimientos" && (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Fecha/Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Patente</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Concepto/Detalle</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Monto</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="text-center py-10"><Spinner /></td></tr>
                )}
                {!loading && movimientos.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin movimientos en esta fecha</td></tr>
                )}
                {movimientos.map((m, i) => (
                  <tr key={m.id} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono whitespace-nowrap">
                      {m.id > 0 ? `#${m.id}` : `T${Math.abs(m.id)}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {format(new Date(m.fecha), "HH:mm")}
                    </td>
                    <td className={`px-4 py-3 font-medium ${colorTipo[m.tipo]}`}>{labelTipoMov[m.tipo]}</td>
                    <td className="px-4 py-3 font-mono font-bold">{m.patente || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {m.cliente ? `${m.cliente.nombre} ${m.cliente.apellido}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.concepto?.nombre || (m.tipo === "estacionamiento" ? labelTipoEstacionamiento(m.descripcion ?? "") : m.descripcion) || "—"}
                      {m.tipo === "estacionamiento" && m.horaEntrada && (
                        <div className="text-xs text-gray-400">
                          Entrada: {format(new Date(m.horaEntrada), "HH:mm")}
                          {m.horaSalida && ` · Salida: ${format(new Date(m.horaSalida), "HH:mm")}`}
                        </div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${["egreso", "gasto"].includes(m.tipo) ? "text-red-600" : "text-gray-900"}`}>
                      {m.tipo === "estacionamiento" && !m.horaSalida ? (
                        <span className="text-yellow-600 text-xs">En curso</span>
                      ) : (
                        formatMonto(parseFloat(m.monto))
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1 flex-wrap">
                        {m.tipo === "lavado" && m.turnoId && (
                          <button onClick={() => setModalGestionarLavado(m)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5">
                            Gestionar
                          </button>
                        )}
                        {m.tipo === "estacionamiento" && !m.horaSalida && (
                          <button onClick={() => setModalFinalizar(m)} className="text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5">
                            Finalizar
                          </button>
                        )}
                        {isAdmin && m.id > 0 && (
                          <>
                            <button onClick={() => abrirModalEditar(m)} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg px-2 py-1.5 font-medium">✏️</button>
                            <button onClick={() => setModalEliminar(m)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg px-2 py-1.5 font-medium">🗑️</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 font-semibold">
                  <td colSpan={6} className="px-4 py-3 text-right text-gray-600">Ingresos del día:</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatMonto(totalIngresos)}</td>
                  <td />
                </tr>
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={6} className="px-4 py-3 text-right text-gray-600">Egresos del día:</td>
                  <td className="px-4 py-3 text-right text-red-700">{formatMonto(totalEgresos)}</td>
                  <td />
                </tr>
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={6} className="px-4 py-3 text-right text-gray-800">Resultado del día:</td>
                  <td className={`px-4 py-3 text-right ${totalIngresos - totalEgresos >= 0 ? "text-green-800" : "text-red-800"}`}>
                    {formatMonto(totalIngresos - totalEgresos)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════ TAB MENSUALES ══════════════════════ */}
      {tabActiva === "mensuales" && (
        <div>
          {/* Controles */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
              <select
                value={mesMensual}
                onChange={(e) => setMesMensual(parseInt(e.target.value))}
                className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
              <input
                type="number"
                value={anioMensual}
                onChange={(e) => setAnioMensual(parseInt(e.target.value))}
                className="border rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleGenerarMes}
              disabled={generandoMes}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium"
            >
              {generandoMes ? <Spinner size="sm" /> : "⚡ Generar mes"}
            </button>
            <p className="text-xs text-gray-400 self-end">Genera estadías para todos los clientes marcados como mensuales</p>
          </div>

          {/* Tabla mensuales */}
          <div className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Patente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Servicio</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Alta</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Precio base</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Interés</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Total estimado</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMensuales && (
                    <tr><td colSpan={9} className="text-center py-10"><Spinner /></td></tr>
                  )}
                  {!loadingMensuales && mensuales.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400">
                        No hay estadías para {MESES_LABEL[mesMensual - 1]} {anioMensual}.<br />
                        <span className="text-xs">Usá &quot;Generar mes&quot; para crearlas automáticamente.</span>
                      </td>
                    </tr>
                  )}
                  {mensuales.map((m, i) => {
                    const { precioBase, diasVencidos, interes, total } = calcularMontoMensual(m);
                    return (
                      <tr key={m.id} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-purple-50 transition-colors`}>
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{m.patente}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {m.cliente ? `${m.cliente.nombre} ${m.cliente.apellido}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {m.tipo === "mensual_completa" ? "Estadía completa" : "Media estadía"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {format(new Date(m.fechaAlta), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatMonto(precioBase)}</td>
                        <td className="px-4 py-3 text-right">
                          {diasVencidos > 0 ? (
                            <span className="text-orange-600 font-medium">
                              +{formatMonto(interes)}
                              <div className="text-xs text-gray-400">{diasVencidos} días</div>
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">Sin interés</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {m.estado === "pagado"
                            ? formatMonto(parseFloat(m.montoPagado!))
                            : formatMonto(total)
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.estado === "pagado" ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              ✅ Pagado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              ⏳ Pendiente
                            </span>
                          )}
                          {m.estado === "pagado" && m.fechaPago && (
                            <div className="text-xs text-gray-400 mt-0.5">{format(new Date(m.fechaPago), "dd/MM")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {m.estado === "pendiente" && (
                            <button
                              onClick={() => setModalCobrarMensual(m)}
                              className="text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-1.5 font-medium"
                            >
                              Cobrar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {mensuales.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 font-semibold">
                      <td colSpan={6} className="px-4 py-3 text-right text-gray-600">
                        Total cobrado ({mensuales.filter(m => m.estado === "pagado").length} pagadas):
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {formatMonto(mensuales.filter(m => m.estado === "pagado").reduce((a, m) => a + parseFloat(m.montoPagado!), 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={6} className="px-4 py-3 text-right text-gray-600">
                        Total pendiente ({mensuales.filter(m => m.estado === "pendiente").length} pendientes):
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-700">
                        {formatMonto(mensuales.filter(m => m.estado === "pendiente").reduce((a, m) => a + calcularMontoMensual(m).total, 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODALES ══════════════════════ */}

      {/* Modal estacionamiento */}
      <Modal
        open={modalEstacionamiento}
        onClose={() => { setModalEstacionamiento(false); setEstPatente(""); setEstCliente(null); setEstNuevoNombre(""); setEstNuevoApellido(""); setEstNuevoCelular(""); setEstNuevoTipoVehiculo("auto"); }}
        title="Nuevo estacionamiento"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patente *</label>
            <input
              value={estPatente}
              onChange={(e) => handleEstPatenteChange(e.target.value)}
              placeholder="ABC123"
              className="w-full border rounded-xl px-4 py-3 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {estCliente && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm space-y-1">
              <div className="font-semibold text-green-800">{estCliente.nombre} {estCliente.apellido}</div>
              <div className="text-gray-600">{labelTipoVehiculo(estCliente.tipo_vehiculo)}</div>
              {estCliente.celular && <div className="text-gray-500">📱 {estCliente.celular}</div>}
            </div>
          )}
          {estPatente.length >= 6 && !estCliente && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-amber-700">Patente no registrada — ingresá los datos del cliente</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input value={estNuevoNombre} onChange={(e) => setEstNuevoNombre(e.target.value)} placeholder="Juan"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apellido *</label>
                  <input value={estNuevoApellido} onChange={(e) => setEstNuevoApellido(e.target.value)} placeholder="Pérez"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                <input value={estNuevoCelular} onChange={(e) => setEstNuevoCelular(e.target.value)} placeholder="3765000000" type="tel"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de vehículo *</label>
                <select value={estNuevoTipoVehiculo} onChange={(e) => setEstNuevoTipoVehiculo(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="auto">Auto</option>
                  <option value="camioneta">Camioneta</option>
                  <option value="suv">SUV</option>
                  <option value="moto">Moto</option>
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de tarifa *</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "hora" as const, label: "🕐 Por hora", sub: formatMonto(precioHora) + "/h" },
                { value: "diaria" as const, label: "🅿️ Estadía diaria", sub: formatMonto(precioDiaria) },
                { value: "media_diaria" as const, label: "½ Media estadía", sub: formatMonto(precioMediaDiaria) },
              ]).map((op) => (
                <button key={op.value} type="button" onClick={() => setEstTipoPrecio(op.value)}
                  className={`rounded-xl border-2 p-3 text-center transition-colors ${
                    estTipoPrecio === op.value ? "border-green-500 bg-green-50 text-green-800" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-xs font-semibold">{op.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{op.sub}</div>
                </button>
              ))}
            </div>
            {estTipoPrecio === "hora" && (
              <p className="text-xs text-gray-400 mt-2">⏱️ Se cobra por hora. Si supera 10 min de la hora, se redondea a la siguiente.</p>
            )}
          </div>
          <p className="text-sm text-gray-500">Se registra la hora de entrada automáticamente.</p>
          <button onClick={handleGuardarEstacionamiento} disabled={guardandoEst || !estPatente}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium">
            {guardandoEst ? <Spinner size="sm" /> : "🅿️ Registrar entrada"}
          </button>
        </div>
      </Modal>

      {/* Modal nuevo movimiento */}
      <Modal open={modalMovimiento} onClose={() => setModalMovimiento(false)} title="Nuevo movimiento">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
            <select value={movConceptoId} onChange={(e) => setMovConceptoId(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccioná un concepto</option>
              {conceptos.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.tipoConcepto})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <input value={movMonto} onChange={(e) => setMovMonto(e.target.value)} type="number" min="0" placeholder="0.00"
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <input value={movDesc} onChange={(e) => setMovDesc(e.target.value)} placeholder="Descripción del movimiento"
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={movFecha} onChange={(e) => setMovFecha(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleGuardarMovimiento} disabled={guardandoMov || !movConceptoId || !movMonto}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium">
            {guardandoMov ? <Spinner size="sm" /> : "Guardar movimiento"}
          </button>
        </div>
      </Modal>

      {/* Modal finalizar estacionamiento */}
      <Modal open={!!modalFinalizar} onClose={() => setModalFinalizar(null)} title="Finalizar estacionamiento">
        {modalFinalizar && (() => {
          const entrada = new Date(modalFinalizar.horaEntrada!);
          const salida = new Date();
          const { total, minutos, horas } = calcularTotal(modalFinalizar, entrada, salida);
          return (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 space-y-2 text-sm">
                {modalFinalizar.patente && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Patente</span>
                    <span className="font-mono font-bold">{modalFinalizar.patente}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Tarifa</span>
                  <span className="font-medium">{labelTipoEstacionamiento(modalFinalizar.descripcion ?? "")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Entrada</span>
                  <span>{format(entrada, "HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Salida</span>
                  <span>{format(salida, "HH:mm")}</span>
                </div>
                {horas ? (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Horas cobradas</span>
                    <span>{horas} h × {formatMonto(precioHora)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tiempo</span>
                    <span>{minutos} min</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-700">{formatMonto(total)}</span>
                </div>
              </div>
              <button onClick={() => handleFinalizarEstacionamiento(modalFinalizar)}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold">
                Confirmar cobro
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* Modal cobrar mensual */}
      <Modal open={!!modalCobrarMensual} onClose={() => setModalCobrarMensual(null)} title="Cobrar estadía mensual">
        {modalCobrarMensual && (() => {
          const { precioBase, diasVencidos, interes, total } = calcularMontoMensual(modalCobrarMensual);
          return (
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Patente</span>
                  <span className="font-mono font-bold">{modalCobrarMensual.patente}</span>
                </div>
                {modalCobrarMensual.cliente && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente</span>
                    <span>{modalCobrarMensual.cliente.nombre} {modalCobrarMensual.cliente.apellido}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Servicio</span>
                  <span>{modalCobrarMensual.tipo === "mensual_completa" ? "Estadía completa" : "Media estadía"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Período</span>
                  <span>{MESES_LABEL[modalCobrarMensual.mes - 1]} {modalCobrarMensual.anio}</span>
                </div>
                <div className="border-t pt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Precio base</span>
                    <span>{formatMonto(precioBase)}</span>
                  </div>
                  {diasVencidos > 0 ? (
                    <div className="flex justify-between text-orange-600">
                      <span>Interés ({interesDiarioPct}% × {diasVencidos} días)</span>
                      <span>+{formatMonto(interes)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-green-600 text-xs">
                      <span>Sin interés (dentro del período)</span>
                      <span>$0</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total a cobrar</span>
                    <span className="text-purple-700">{formatMonto(total)}</span>
                  </div>
                </div>
              </div>
              <button onClick={handleCobrarMensual} disabled={cobrandoMensual}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl py-3 font-semibold">
                {cobrandoMensual ? <Spinner size="sm" /> : `Confirmar cobro ${formatMonto(total)}`}
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* Modal editar movimiento (admin) */}
      <Modal open={!!modalEditar} onClose={() => setModalEditar(null)} title="Editar movimiento">
        {modalEditar && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
              <span className="font-medium">{labelTipoMov[modalEditar.tipo]}</span>
              {modalEditar.patente && <span className="ml-2 font-mono font-bold">{modalEditar.patente}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input type="number" value={editMonto} onChange={(e) => setEditMonto(e.target.value)} min="0"
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descripción del movimiento"
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={handleGuardarEdicion} disabled={guardandoEdit || !editMonto}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium">
              {guardandoEdit ? <Spinner size="sm" /> : "Guardar cambios"}
            </button>
          </div>
        )}
      </Modal>

      {/* Modal eliminar movimiento (admin) */}
      <Modal open={!!modalEliminar} onClose={() => setModalEliminar(null)} title="Eliminar movimiento">
        {modalEliminar && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700 space-y-1">
              <p className="font-semibold">¿Eliminar este movimiento?</p>
              <p>{labelTipoMov[modalEliminar.tipo]} — {formatMonto(parseFloat(modalEliminar.monto))}</p>
              {modalEliminar.patente && <p>Patente: <span className="font-mono font-bold">{modalEliminar.patente}</span></p>}
              <p className="text-xs text-red-400 mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalEliminar(null)} className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl py-3 font-medium">Cancelar</button>
              <button onClick={handleEliminarMovimiento} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-medium">Sí, eliminar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal gestionar lavado */}
      <Modal open={!!modalGestionarLavado} onClose={() => setModalGestionarLavado(null)} title="Gestionar lavado">
        {modalGestionarLavado && (() => {
          const estado = modalGestionarLavado.turno?.estado ?? (modalGestionarLavado.id < 0 ? "confirmado" : "completado");
          const estadoColor: Record<string, string> = {
            pendiente: "text-yellow-700 bg-yellow-50",
            confirmado: "text-green-700 bg-green-50",
            completado: "text-gray-700 bg-gray-100",
            cancelado: "text-red-700 bg-red-50",
          };
          const turnoRealId = modalGestionarLavado.turnoId!;
          return (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                {modalGestionarLavado.patente && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Patente</span>
                    <span className="font-mono font-bold">{modalGestionarLavado.patente}</span>
                  </div>
                )}
                {modalGestionarLavado.cliente && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente</span>
                    <span>{modalGestionarLavado.cliente.nombre} {modalGestionarLavado.cliente.apellido}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Vehículo</span>
                  <span>{labelTipoVehiculo(modalGestionarLavado.turno?.tipo_vehiculo || "auto")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monto</span>
                  <span className="font-semibold">{formatMonto(parseFloat(modalGestionarLavado.monto))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Estado</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${estadoColor[estado] || ""}`}>{estado}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {estado !== "completado" && (
                  <button onClick={() => handleCambiarEstadoTurno(turnoRealId, "completado")} disabled={guardandoTurno}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl py-2.5 font-medium">
                    ✅ Marcar como completado
                  </button>
                )}
                {estado !== "confirmado" && estado !== "cancelado" && (
                  <button onClick={() => handleCambiarEstadoTurno(turnoRealId, "confirmado")} disabled={guardandoTurno}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-2.5 font-medium">
                    🔄 Volver a confirmado
                  </button>
                )}
                {estado !== "cancelado" && (
                  <button onClick={() => handleCambiarEstadoTurno(turnoRealId, "cancelado")} disabled={guardandoTurno}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl py-2.5 font-medium">
                    ❌ Cancelar turno
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal WhatsApp (compatible iOS) */}
      <Modal open={!!whatsappPendiente} onClose={() => setWhatsappPendiente(null)} title="Enviar WhatsApp">
        {whatsappPendiente && (
          <div className="space-y-4 text-center">
            <p className="text-gray-600 text-sm">Tocá el botón para enviarle el mensaje al cliente.</p>
            <a href={whatsappPendiente.url} target="_blank" rel="noopener noreferrer"
              onClick={() => setWhatsappPendiente(null)}
              className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-semibold text-lg transition">
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
