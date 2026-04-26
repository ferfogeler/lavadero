"use client";
import { useState, useEffect } from "react";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";

const CAMPOS = [
  { clave: "nombre_negocio", label: "Nombre del negocio", placeholder: "Lavadero Express", type: "text" },
  { clave: "whatsapp_lavadero", label: "WhatsApp del lavadero", placeholder: "3765061400", type: "text" },
  { clave: "horario_apertura", label: "Horario de apertura", placeholder: "08:00", type: "time" },
  { clave: "horario_cierre", label: "Horario de cierre", placeholder: "20:00", type: "time" },
  { clave: "tarifa_estacionamiento_por_minuto", label: "Tarifa estacionamiento ($ por minuto)", placeholder: "50", type: "number" },
  { clave: "url_base", label: "URL base del sistema", placeholder: "https://milavadero.easypanel.host", type: "url" },
];

export default function ConfiguracionGeneralPage() {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const { toast, show, hide } = useToast();

  useEffect(() => {
    fetch("/api/configuracion/general").then((r) => r.json()).then((data) => {
      setValores(data);
      setLoading(false);
    });
  }, []);

  const handleGuardar = async () => {
    setGuardando(true);
    const res = await fetch("/api/configuracion/general", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    if (res.ok) show("Configuración guardada", "success");
    else show("Error al guardar", "error");
    setGuardando(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔧 Configuración general</h1>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 font-medium"
        >
          {guardando ? <Spinner size="sm" /> : "Guardar cambios"}
        </button>
      </div>
      <div className="bg-white rounded-xl shadow border p-6 max-w-2xl">
        <div className="space-y-5">
          {CAMPOS.map((c) => (
            <div key={c.clave}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{c.label}</label>
              <input
                type={c.type}
                value={valores[c.clave] || ""}
                onChange={(e) => setValores((v) => ({ ...v, [c.clave]: e.target.value }))}
                placeholder={c.placeholder}
                className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
