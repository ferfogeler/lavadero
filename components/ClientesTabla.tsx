"use client";
import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/Modal";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { labelTipoVehiculo } from "@/lib/utils";

interface Cliente {
  patente: string;
  nombre: string;
  apellido: string;
  celular: string;
  tipo_vehiculo: string;
  createdAt: string;
}

const TIPOS = [
  { value: "auto", label: "Auto" },
  { value: "camioneta", label: "Camioneta" },
  { value: "suv", label: "SUV" },
  { value: "moto", label: "Moto" },
];

const FORM_VACIO = { patente: "", nombre: "", apellido: "", celular: "", tipo_vehiculo: "auto" };

export function ClientesTabla() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalForm, setModalForm] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<Cliente | null>(null);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const { toast, show, hide } = useToast();

  const cargar = useCallback(async (q = "") => {
    setLoading(true);
    const res = await fetch(`/api/clientes?q=${q}&take=100`);
    const data = await res.json();
    setClientes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleBuscar = (v: string) => {
    setBusqueda(v);
    cargar(v.toUpperCase());
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setModalForm(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    setForm({ patente: c.patente, nombre: c.nombre, apellido: c.apellido, celular: c.celular, tipo_vehiculo: c.tipo_vehiculo });
    setModalForm(true);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      let res: Response;
      if (editando) {
        res = await fetch(`/api/clientes/${editando.patente}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: form.nombre, apellido: form.apellido, celular: form.celular, tipo_vehiculo: form.tipo_vehiculo }),
        });
      } else {
        res = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, patente: form.patente.toUpperCase() }),
        });
      }
      if (res.ok) {
        show(editando ? "Cliente actualizado" : "Cliente creado", "success");
        setModalForm(false);
        cargar(busqueda);
      } else {
        const e = await res.json();
        show(e.error || "Error al guardar", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (!modalEliminar) return;
    const res = await fetch(`/api/clientes/${modalEliminar.patente}`, { method: "DELETE" });
    if (res.ok) {
      show("Cliente eliminado", "success");
      setModalEliminar(null);
      cargar(busqueda);
    } else {
      show("Error al eliminar", "error");
    }
  };

  const clientesFiltrados = clientes.filter((c) =>
    busqueda === "" ||
    c.patente.includes(busqueda.toUpperCase()) ||
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.apellido.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">👥 Clientes</h1>
        <div className="flex gap-2 flex-1 max-w-md">
          <input
            value={busqueda}
            onChange={(e) => handleBuscar(e.target.value)}
            placeholder="Buscar por patente, nombre o apellido..."
            className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={abrirNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium"
        >
          + Nuevo cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Patente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Apellido</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Celular</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Vehículo</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="text-center py-10"><Spinner /></td></tr>
              )}
              {!loading && clientesFiltrados.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Sin clientes registrados</td></tr>
              )}
              {clientesFiltrados.map((c, i) => (
                <tr key={c.patente} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{c.patente}</td>
                  <td className="px-4 py-3">{c.nombre}</td>
                  <td className="px-4 py-3">{c.apellido}</td>
                  <td className="px-4 py-3 text-gray-600">{c.celular}</td>
                  <td className="px-4 py-3 text-gray-600">{labelTipoVehiculo(c.tipo_vehiculo)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg px-3 py-1.5 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setModalEliminar(c)}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg px-3 py-1.5 font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t">
                <td colSpan={6} className="px-4 py-2 text-sm text-gray-500">
                  {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal alta/edición */}
      <Modal
        open={modalForm}
        onClose={() => setModalForm(false)}
        title={editando ? "Editar cliente" : "Nuevo cliente"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patente *</label>
            <input
              value={form.patente}
              onChange={(e) => setForm({ ...form, patente: e.target.value.toUpperCase() })}
              placeholder="ABC123"
              disabled={!!editando}
              className="w-full border rounded-xl px-4 py-3 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
              <input
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celular *</label>
            <input
              value={form.celular}
              onChange={(e) => setForm({ ...form, celular: e.target.value })}
              placeholder="3761000000"
              type="tel"
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de vehículo *</label>
            <select
              value={form.tipo_vehiculo}
              onChange={(e) => setForm({ ...form, tipo_vehiculo: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGuardar}
            disabled={guardando || !form.patente || !form.nombre || !form.apellido || !form.celular}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium"
          >
            {guardando ? <Spinner size="sm" /> : editando ? "Guardar cambios" : "Crear cliente"}
          </button>
        </div>
      </Modal>

      {/* Modal confirmar eliminación */}
      <Modal open={!!modalEliminar} onClose={() => setModalEliminar(null)} title="Eliminar cliente">
        {modalEliminar && (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">¿Eliminar a {modalEliminar.nombre} {modalEliminar.apellido}?</p>
              <p>Patente: <span className="font-mono font-bold">{modalEliminar.patente}</span></p>
              <p className="mt-2 text-red-500 text-xs">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminar(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl py-3 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-medium"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
