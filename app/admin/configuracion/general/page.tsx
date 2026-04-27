"use client";
import { useState, useEffect } from "react";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";

const SECCIONES = [
  {
    titulo: "🏪 Datos del negocio",
    campos: [
      { clave: "nombre_negocio", label: "Nombre del negocio", placeholder: "Lavadero Express", type: "text" },
      { clave: "whatsapp_lavadero", label: "WhatsApp del lavadero", placeholder: "3765061400", type: "text" },
      { clave: "url_base", label: "URL base del sistema", placeholder: "https://milavadero.easypanel.host", type: "url" },
    ],
  },
  {
    titulo: "🚿 Horarios de lavado",
    campos: [
      { clave: "horario_apertura_lavado", label: "Apertura", placeholder: "08:00", type: "time" },
      { clave: "horario_cierre_lavado", label: "Cierre", placeholder: "18:00", type: "time" },
    ],
  },
  {
    titulo: "🅿️ Horarios de estacionamiento",
    campos: [
      { clave: "horario_apertura_estacionamiento", label: "Apertura", placeholder: "08:00", type: "time" },
      { clave: "horario_cierre_estacionamiento", label: "Cierre", placeholder: "20:00", type: "time" },
    ],
  },
  {
    titulo: "💰 Tarifas de estacionamiento diario",
    campos: [
      { clave: "precio_hora", label: "Por hora ($)", placeholder: "500", type: "number" },
      { clave: "precio_diaria", label: "Estadía diaria ($)", placeholder: "2000", type: "number" },
      { clave: "precio_media_diaria", label: "Media estadía diaria ($)", placeholder: "1000", type: "number" },
    ],
  },
  {
    titulo: "📅 Tarifas de estacionamiento mensual",
    campos: [
      { clave: "precio_mensual_completa", label: "Mensual estadía completa ($)", placeholder: "25000", type: "number" },
      { clave: "precio_mensual_media", label: "Mensual media estadía ($)", placeholder: "15000", type: "number" },
      { clave: "interes_mensual_diario_pct", label: "Interés diario después del día 10 (%)", placeholder: "1.5", type: "number" },
    ],
  },
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

      <div className="space-y-6 max-w-2xl">
        {SECCIONES.map((seccion) => (
          <div key={seccion.titulo} className="bg-white rounded-xl shadow border p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{seccion.titulo}</h2>
            <div className="space-y-4">
              {seccion.campos.map((c) => (
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
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hide} />}
    </div>
  );
}
