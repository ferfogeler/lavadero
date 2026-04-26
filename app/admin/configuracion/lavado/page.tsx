"use client";
import { useState, useEffect } from "react";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { labelTipoVehiculo } from "@/lib/utils";

interface ConfigLavado {
  tipo_vehiculo: string;
  precio: number;
  duracion_minutos: number;
  activo: boolean;
}

export default function ConfiguracionLavadoPage() {
  const [configs, setConfigs] = useState<ConfigLavado[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    fetch("/api/configuracion/lavado").then((r) => r.json()).then((data) => {
      setConfigs(data.map((c: ConfigLavado) => ({ ...c, precio: Number(c.precio) })));
      setLoading(false);
    });
  }, []);

  const handleChange = (tipo: string, field: string, value: string | boolean) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.tipo_vehiculo === tipo ? { ...c, [field]: field === "activo" ? value : (field === "precio" || field === "duracion_minutos" ? Number(value) : value) } : c
      )
    );
  };

  const handleGuardar = async () => {
    setGuardando(true);
    const res = await fetch("/api/configuracion/lavado", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configs),
    });
    if (res.ok) show("Configuración guardada", "success");
    else show("Error al guardar", "error");
    setGuardando(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración de lavado</h1>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 font-medium"
        >
          {guardando ? <Spinner size="sm" /> : "Guardar cambios"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Tipo</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Precio ($)</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Duración (min)</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-600">Activo</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c, i) => (
              <tr key={c.tipo_vehiculo} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <td className="px-6 py-4 font-medium text-gray-800">{labelTipoVehiculo(c.tipo_vehiculo)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      value={c.precio}
                      onChange={(e) => handleChange(c.tipo_vehiculo, "precio", e.target.value)}
                      className="w-32 border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    value={c.duracion_minutos}
                    onChange={(e) => handleChange(c.tipo_vehiculo, "duracion_minutos", e.target.value)}
                    className="w-24 border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.activo}
                      onChange={(e) => handleChange(c.tipo_vehiculo, "activo", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
