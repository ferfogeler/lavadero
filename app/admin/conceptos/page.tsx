"use client";
import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";

interface Concepto {
  id: number;
  nombre: string;
  tipoConcepto: string;
  activo: boolean;
}

const TIPOS = ["ingreso", "egreso", "gasto"] as const;
const colorTipo: Record<string, string> = {
  ingreso: "bg-green-100 text-green-700",
  egreso: "bg-red-100 text-red-700",
  gasto: "bg-orange-100 text-orange-700",
};

export default function ConceptosPage() {
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<"ingreso" | "egreso" | "gasto">("ingreso");
  const [guardando, setGuardando] = useState(false);
  const { toast, show, hide } = useToast();

  const cargar = async () => {
    const data = await fetch("/api/conceptos").then((r) => r.json());
    setConceptos(data);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const handleToggleActivo = async (c: Concepto) => {
    await fetch(`/api/conceptos/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !c.activo }),
    });
    cargar();
  };

  const handleCrear = async () => {
    if (!nuevoNombre) return;
    setGuardando(true);
    const res = await fetch("/api/conceptos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre, tipoConcepto: nuevoTipo }),
    });
    if (res.ok) {
      show("Concepto creado", "success");
      setModalNuevo(false);
      setNuevoNombre(""); setNuevoTipo("ingreso");
      cargar();
    } else {
      show("Error al crear concepto", "error");
    }
    setGuardando(false);
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Eliminar este concepto?")) return;
    await fetch(`/api/conceptos/${id}`, { method: "DELETE" });
    show("Concepto eliminado", "info");
    cargar();
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🏷️ Conceptos de caja</h1>
        <button
          onClick={() => setModalNuevo(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 font-medium"
        >
          + Nuevo concepto
        </button>
      </div>
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Nombre</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Tipo</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-600">Activo</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {conceptos.map((c, i) => (
              <tr key={c.id} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <td className="px-6 py-4 font-medium text-gray-800">{c.nombre}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorTipo[c.tipoConcepto]}`}>
                    {c.tipoConcepto}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={c.activo} onChange={() => handleToggleActivo(c)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleEliminar(c.id)}
                    className="text-red-500 hover:text-red-700 text-xs px-3 py-1 rounded-lg hover:bg-red-50 transition"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo concepto">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Producto de limpieza"
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as any)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            onClick={handleCrear}
            disabled={guardando || !nuevoNombre}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium"
          >
            {guardando ? <Spinner size="sm" /> : "Crear concepto"}
          </button>
        </div>
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
