"use client";
import { useState, useEffect } from "react";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";
import { labelTipoVehiculo, labelServicio, formatMonto } from "@/lib/utils";

interface ConfigServicio {
  id: number;
  tipo_vehiculo: string;
  servicio: string;
  precio: number;
  duracion_minutos: number;
  activo: boolean;
}

const TIPOS = ["auto", "camioneta", "suv", "moto"];
const SERVICIOS = ["completo", "externo", "aspirado"];

const ICONOS: Record<string, string> = {
  completo: "🚿",
  externo: "💧",
  aspirado: "🌀",
};

export default function ConfiguracionLavadoPage() {
  const [configs, setConfigs] = useState<ConfigServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    fetch("/api/configuracion/lavado")
      .then((r) => r.json())
      .then((data) => {
        setConfigs(data.map((c: ConfigServicio) => ({ ...c, precio: Number(c.precio) })));
        setLoading(false);
      });
  }, []);

  const handleChange = (tipo: string, servicio: string, field: string, value: string | boolean) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.tipo_vehiculo === tipo && c.servicio === servicio
          ? { ...c, [field]: field === "activo" ? value : Number(value) }
          : c
      )
    );
  };

  const get = (tipo: string, servicio: string) =>
    configs.find((c) => c.tipo_vehiculo === tipo && c.servicio === servicio);

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
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Precios de lavado</h1>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 font-medium"
        >
          {guardando ? <Spinner size="sm" /> : "Guardar cambios"}
        </button>
      </div>

      <div className="space-y-6">
        {TIPOS.map((tipo) => (
          <div key={tipo} className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="bg-gray-50 border-b px-6 py-3">
              <h2 className="font-semibold text-gray-800 text-base">{labelTipoVehiculo(tipo)}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500 text-xs uppercase">
                  <th className="px-6 py-2 text-left font-medium">Servicio</th>
                  <th className="px-6 py-2 text-left font-medium">Precio ($)</th>
                  <th className="px-6 py-2 text-left font-medium">Duración (min)</th>
                  <th className="px-6 py-2 text-center font-medium">Activo</th>
                </tr>
              </thead>
              <tbody>
                {SERVICIOS.map((servicio, i) => {
                  const c = get(tipo, servicio);
                  if (!c) return null;
                  return (
                    <tr key={servicio} className={`border-b last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-6 py-3 font-medium text-gray-800">
                        {ICONOS[servicio]} {labelServicio(servicio)}
                        {c.activo && (
                          <span className="ml-2 text-xs text-gray-400">{formatMonto(c.precio)}</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            value={c.precio}
                            onChange={(e) => handleChange(tipo, servicio, "precio", e.target.value)}
                            className="w-full max-w-[8rem] border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          value={c.duracion_minutos}
                          onChange={(e) => handleChange(tipo, servicio, "duracion_minutos", e.target.value)}
                          className="w-full max-w-[6rem] border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={c.activo}
                            onChange={(e) => handleChange(tipo, servicio, "activo", e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
