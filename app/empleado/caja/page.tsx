"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { formatMonto, labelTipoVehiculo } from "@/lib/utils";

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

export default function CajaPage() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = (session?.user as { role?: string })?.role === "admin" && pathname.startsWith("/admin");

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

  // Estado estacionamiento
  const [estPatente, setEstPatente] = useState("");
  const [estCliente, setEstCliente] = useState<{ nombre: string; apellido: string; celular: string; tipo_vehiculo: string } | null>(null);
  const [estNuevoNombre, setEstNuevoNombre] = useState("");
  const [estNuevoApellido, setEstNuevoApellido] = useState("");
  const [estNuevoCelular, setEstNuevoCelular] = useState("");
  const [estNuevoTipoVehiculo, setEstNuevoTipoVehiculo] = useState("auto");
  const [estTipoPrecio, setEstTipoPrecio] = useState<"fraccion" | "completa" | "media">("fraccion");
  const [guardandoEst, setGuardandoEst] = useState(false);

  // Estado movimiento
  const [movConceptoId, setMovConceptoId] = useState("");
  const [movMonto, setMovMonto] = useState("");
  const [movDesc, setMovDesc] = useState("");
  const [movFecha, setMovFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [tarifa, setTarifa] = useState(50);
  const [precioCompleta, setPrecioCompleta] = useState(2000);
  const [precioMedia, setPrecioMedia] = useState(1000);

  useEffect(() => {
    Promise.all([
      fetch("/api/conceptos?activos=true").then((r) => r.json()),
      fetch("/api/configuracion/general").then((r) => r.json()),
    ]).then(([c, cfg]) => {
      setConceptos(c);
      setTarifa(parseFloat(cfg.tarifa_estacionamiento_por_minuto) || 50);
      setPrecioCompleta(parseFloat(cfg.precio_estadia_completa) || 2000);
      setPrecioMedia(parseFloat(cfg.precio_media_estadia) || 1000);
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

  const handleGuardarEstacionamiento = async () => {
    if (!estPatente) { show("La patente es obligatoria", "error"); return; }
    setGuardandoEst(true);

    // Si no hay cliente registrado y se ingresaron datos, crear el cliente
    let clienteActivo = estCliente;
    if (!estCliente && estNuevoNombre && estNuevoApellido) {
      const resCliente = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patente: estPatente,
          nombre: estNuevoNombre,
          apellido: estNuevoApellido,
          celular: estNuevoCelular || null,
          tipo_vehiculo: estNuevoTipoVehiculo,
        }),
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
        const labelTarifa: Record<string, string> = { fraccion: "⏱️ Por minuto", completa: "🅿️ Estadía completa", media: "½ Media estadía" };
        const msg =
          `🅿️ *¡Ingreso registrado!*\n\n` +
          `👋 Hola *${clienteActivo.nombre} ${clienteActivo.apellido}*\n` +
          `🚗 *Patente:* ${estPatente}\n` +
          `📅 *Fecha:* ${format(ahora, "dd/MM/yyyy")}\n` +
          `⏰ *Hora de entrada:* ${format(ahora, "HH:mm")}\n` +
          `💳 *Tarifa:* ${labelTarifa[estTipoPrecio]}\n\n` +
          `✅ Te avisamos cuando retires el vehículo. ¡Gracias!`;
        const numero = clienteActivo.celular.replace(/\D/g, "");
        setWhatsappPendiente({ url: `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, titulo: "Avisar ingreso al cliente" });
      }
      setEstPatente(""); setEstCliente(null); setEstTipoPrecio("fraccion");
      setEstNuevoNombre(""); setEstNuevoApellido(""); setEstNuevoCelular(""); setEstNuevoTipoVehiculo("auto");
      cargarMovimientos();
    } else {
      show("Error al registrar estacionamiento", "error");
    }
    setGuardandoEst(false);
  };

  const calcularTotal = (mov: Movimiento, entrada: Date, salida: Date) => {
    const minutos = Math.ceil((salida.getTime() - entrada.getTime()) / 60000);
    const tipo = mov.descripcion;
    if (tipo === "completa") return { total: precioCompleta, minutos };
    if (tipo === "media") return { total: precioMedia, minutos };
    return { total: minutos * tarifa, minutos };
  };

  const handleFinalizarEstacionamiento = async (mov: Movimiento) => {
    const entrada = new Date(mov.horaEntrada!);
    const salida = new Date();
    const { total, minutos } = calcularTotal(mov, entrada, salida);
    const res = await fetch(`/api/movimientos/${mov.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horaSalida: salida.toISOString(), monto: total }),
    });
    if (res.ok) {
      show(`Estacionamiento finalizado: ${formatMonto(total)}`, "success");
      setModalFinalizar(null);
      if (mov.cliente?.celular) {
        const labelTarifa: Record<string, string> = { fraccion: "⏱️ Por minuto", completa: "🅿️ Estadía completa", media: "½ Media estadía" };
        const msg =
          `🏁 *¡Egreso registrado!*\n\n` +
          `👋 Hola *${mov.cliente.nombre} ${mov.cliente.apellido}*\n` +
          `🚗 *Patente:* ${mov.patente}\n` +
          `💳 *Tarifa:* ${labelTarifa[mov.descripcion || "fraccion"] || "⏱️ Por minuto"}\n` +
          `🟢 *Entrada:* ${format(entrada, "HH:mm")}\n` +
          `🔴 *Salida:* ${format(salida, "HH:mm")}\n` +
          `⏱️ *Tiempo:* ${minutos} min\n` +
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

  const handleGuardarMovimiento = async () => {
    setGuardandoMov(true);
    const concepto = conceptos.find((c) => c.id === parseInt(movConceptoId));
    const res = await fetch("/api/movimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: concepto?.tipoConcepto || "ingreso",
        conceptoId: movConceptoId || null,
        monto: parseFloat(movMonto),
        descripcion: movDesc || null,
        fecha: movFecha,
      }),
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

  const totalIngresos = movimientos
    .filter((m) => ["lavado", "estacionamiento", "ingreso"].includes(m.tipo) && m.horaSalida !== null || !["estacionamiento"].includes(m.tipo))
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

  const labelTipo: Record<string, string> = {
    lavado: "Lavado",
    estacionamiento: "Estacionamiento",
    ingreso: "Ingreso",
    egreso: "Egreso",
    gasto: "Gasto",
  };

  return (
    <div>
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
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
        <button
          onClick={() => setModalEstacionamiento(true)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm font-medium"
        >
          🅿️ Nuevo estacionamiento
        </button>
        <button
          onClick={() => setModalMovimiento(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium"
        >
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

      {/* Tabla de movimientos */}
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
                  <td className={`px-4 py-3 font-medium ${colorTipo[m.tipo]}`}>{labelTipo[m.tipo]}</td>
                  <td className="px-4 py-3 font-mono font-bold">{m.patente || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {m.cliente ? `${m.cliente.nombre} ${m.cliente.apellido}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.concepto?.nombre || m.descripcion || "—"}
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
                        <button
                          onClick={() => setModalGestionarLavado(m)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5"
                        >
                          Gestionar
                        </button>
                      )}
                      {m.tipo === "estacionamiento" && !m.horaSalida && (
                        <button
                          onClick={() => setModalFinalizar(m)}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5"
                        >
                          Finalizar
                        </button>
                      )}
                      {isAdmin && m.id > 0 && (
                        <>
                          <button
                            onClick={() => abrirModalEditar(m)}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg px-2 py-1.5 font-medium"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setModalEliminar(m)}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg px-2 py-1.5 font-medium"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Pie con totales */}
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

      {/* Modal estacionamiento */}
      <Modal open={modalEstacionamiento} onClose={() => { setModalEstacionamiento(false); setEstPatente(""); setEstCliente(null); setEstNuevoNombre(""); setEstNuevoApellido(""); setEstNuevoCelular(""); setEstNuevoTipoVehiculo("auto"); }} title="Nuevo estacionamiento">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patente *</label>
            <input
              value={estPatente}
              onChange={(e) => handleEstPatenteChange(e.target.value)}
              placeholder="ABC123"
              required
              className="w-full border rounded-xl px-4 py-3 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {estCliente && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm space-y-1">
              <div className="font-semibold text-green-800">{estCliente.nombre} {estCliente.apellido}</div>
              <div className="text-gray-600">{labelTipoVehiculo(estCliente.tipo_vehiculo)}</div>
              {estCliente.celular && (
                <div className="text-gray-500">📱 {estCliente.celular}</div>
              )}
            </div>
          )}
          {estPatente.length >= 6 && !estCliente && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-amber-700">Patente no registrada — ingresá los datos del cliente</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input
                    value={estNuevoNombre}
                    onChange={(e) => setEstNuevoNombre(e.target.value)}
                    placeholder="Juan"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Apellido *</label>
                  <input
                    value={estNuevoApellido}
                    onChange={(e) => setEstNuevoApellido(e.target.value)}
                    placeholder="Pérez"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                <input
                  value={estNuevoCelular}
                  onChange={(e) => setEstNuevoCelular(e.target.value)}
                  placeholder="3765000000"
                  type="tel"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de vehículo *</label>
                <select
                  value={estNuevoTipoVehiculo}
                  onChange={(e) => setEstNuevoTipoVehiculo(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
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
                { value: "fraccion", label: "⏱️ Por minuto", sub: `$${tarifa}/min` },
                { value: "completa", label: "🅿️ Estadía completa", sub: formatMonto(precioCompleta) },
                { value: "media", label: "½ Media estadía", sub: formatMonto(precioMedia) },
              ] as const).map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setEstTipoPrecio(op.value)}
                  className={`rounded-xl border-2 p-3 text-center transition-colors ${
                    estTipoPrecio === op.value
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-xs font-semibold">{op.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{op.sub}</div>
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500">Se registra la hora de entrada automáticamente.</p>
          <button
            onClick={handleGuardarEstacionamiento}
            disabled={guardandoEst || !estPatente}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium"
          >
            {guardandoEst ? <Spinner size="sm" /> : "🅿️ Registrar entrada"}
          </button>
        </div>
      </Modal>

      {/* Modal nuevo movimiento */}
      <Modal open={modalMovimiento} onClose={() => setModalMovimiento(false)} title="Nuevo movimiento">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
            <select
              value={movConceptoId}
              onChange={(e) => setMovConceptoId(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccioná un concepto</option>
              {conceptos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.tipoConcepto})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
            <input
              value={movMonto}
              onChange={(e) => setMovMonto(e.target.value)}
              type="number"
              min="0"
              placeholder="0.00"
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <input
              value={movDesc}
              onChange={(e) => setMovDesc(e.target.value)}
              placeholder="Descripción del movimiento"
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={movFecha}
              onChange={(e) => setMovFecha(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleGuardarMovimiento}
            disabled={guardandoMov || !movConceptoId || !movMonto}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium"
          >
            {guardandoMov ? <Spinner size="sm" /> : "Guardar movimiento"}
          </button>
        </div>
      </Modal>

      {/* Modal finalizar estacionamiento */}
      <Modal open={!!modalFinalizar} onClose={() => setModalFinalizar(null)} title="Finalizar estacionamiento">
        {modalFinalizar && (() => {
          const entrada = new Date(modalFinalizar.horaEntrada!);
          const salida = new Date();
          const { total, minutos } = calcularTotal(modalFinalizar, entrada, salida);
          const labelTipo: Record<string, string> = { fraccion: "Por minuto", completa: "Estadía completa", media: "Media estadía" };
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
                  <span className="font-medium">{labelTipo[modalFinalizar.descripcion || "fraccion"] || "Por minuto"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Entrada</span>
                  <span>{format(entrada, "HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Salida</span>
                  <span>{format(salida, "HH:mm")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tiempo</span>
                  <span>{minutos} min</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-700">{formatMonto(total)}</span>
                </div>
              </div>
              <button
                onClick={() => handleFinalizarEstacionamiento(modalFinalizar)}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold"
              >
                Confirmar cobro
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
              <span className="font-medium">{labelTipo[modalEditar.tipo]}</span>
              {modalEditar.patente && <span className="ml-2 font-mono font-bold">{modalEditar.patente}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                type="number"
                value={editMonto}
                onChange={(e) => setEditMonto(e.target.value)}
                min="0"
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Descripción del movimiento"
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={editFecha}
                onChange={(e) => setEditFecha(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleGuardarEdicion}
              disabled={guardandoEdit || !editMonto}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium"
            >
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
              <p>{labelTipo[modalEliminar.tipo]} — {formatMonto(parseFloat(modalEliminar.monto))}</p>
              {modalEliminar.patente && <p>Patente: <span className="font-mono font-bold">{modalEliminar.patente}</span></p>}
              <p className="text-xs text-red-400 mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminar(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl py-3 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarMovimiento}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-medium"
              >
                Sí, eliminar
              </button>
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
                  <button
                    onClick={() => handleCambiarEstadoTurno(turnoRealId, "completado")}
                    disabled={guardandoTurno}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl py-2.5 font-medium"
                  >
                    ✅ Marcar como completado
                  </button>
                )}
                {estado !== "confirmado" && estado !== "cancelado" && (
                  <button
                    onClick={() => handleCambiarEstadoTurno(turnoRealId, "confirmado")}
                    disabled={guardandoTurno}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-2.5 font-medium"
                  >
                    🔄 Volver a confirmado
                  </button>
                )}
                {estado !== "cancelado" && (
                  <button
                    onClick={() => handleCambiarEstadoTurno(turnoRealId, "cancelado")}
                    disabled={guardandoTurno}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl py-2.5 font-medium"
                  >
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
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
