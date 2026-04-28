"use client";
import { useState, useEffect, useRef } from "react";
import { Toast, useToast } from "@/components/Toast";
import { Spinner } from "@/components/Spinner";

const SECCIONES = [
  {
    titulo: "🏪 Datos del negocio",
    campos: [
      { clave: "nombre_negocio", label: "Nombre del negocio", placeholder: "GarageUno", type: "text" },
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
    titulo: "📅 Mensual completa — tarifas por vehículo",
    campos: [
      { clave: "precio_mensual_moto", label: "Mensual completa Moto ($)", placeholder: "8000", type: "number" },
      { clave: "precio_mensual_auto", label: "Mensual completa Auto ($)", placeholder: "15000", type: "number" },
      { clave: "precio_mensual_suv",  label: "Mensual completa SUV/Camioneta ($)", placeholder: "20000", type: "number" },
      { clave: "interes_mensual_diario_pct", label: "Interés diario a partir del día 11 (%)", placeholder: "1.5", type: "number" },
    ],
  },
  {
    titulo: "📅 Mensual ½ estadía — tarifas por vehículo",
    campos: [
      { clave: "precio_mensual_media_moto", label: "Mensual ½ estadía Moto ($)", placeholder: "5000", type: "number" },
      { clave: "precio_mensual_media_auto", label: "Mensual ½ estadía Auto ($)", placeholder: "9000", type: "number" },
      { clave: "precio_mensual_media_suv",  label: "Mensual ½ estadía SUV/Camioneta ($)", placeholder: "12000", type: "number" },
    ],
  },
  {
    titulo: "½ Estadía — tarifas por vehículo",
    campos: [
      { clave: "precio_media_moto", label: "½ Estadía Moto ($)", placeholder: "600", type: "number" },
      { clave: "precio_media_auto", label: "½ Estadía Auto ($)", placeholder: "1200", type: "number" },
      { clave: "precio_media_suv",  label: "½ Estadía SUV/Camioneta ($)", placeholder: "1800", type: "number" },
    ],
  },
  {
    titulo: "🅿️ Diario — tarifas por vehículo",
    campos: [
      { clave: "precio_diaria_moto", label: "Diario Moto ($)", placeholder: "1000", type: "number" },
      { clave: "precio_diaria_auto", label: "Diario Auto ($)", placeholder: "2000", type: "number" },
      { clave: "precio_diaria_suv",  label: "Diario SUV/Camioneta ($)", placeholder: "3000", type: "number" },
    ],
  },
  {
    titulo: "🕐 Tarifa por hora",
    campos: [
      { clave: "precio_hora", label: "Por hora ($)", placeholder: "500", type: "number" },
    ],
  },
];

export default function ConfiguracionGeneralPage() {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      show("El logo no debe superar 500 KB", "error");
      return;
    }
    setSubiendoLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      setValores((v) => ({ ...v, logo_base64: reader.result as string }));
      setSubiendoLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleQuitarLogo = () => {
    setValores((v) => ({ ...v, logo_base64: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const colorInicio = valores.color_fondo_inicio || "#2563EB";
  const colorFin    = valores.color_fondo_fin    || "#4338CA";

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

        {/* ── Apariencia ── */}
        <div className="bg-white rounded-xl shadow border p-6 space-y-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">🎨 Apariencia de la página de inicio</h2>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo del negocio</label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div
                className="w-28 h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: `linear-gradient(to bottom right, ${colorInicio}, ${colorFin})` }}
              >
                {valores.logo_base64 ? (
                  <img src={valores.logo_base64} alt="logo" className="max-h-16 max-w-full object-contain p-1" />
                ) : (
                  <span className="text-4xl">🏎️</span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-xs text-gray-400">PNG, JPG, WebP o SVG · máx. 500 KB · se guarda con "Guardar cambios"</p>
                {valores.logo_base64 && (
                  <button onClick={handleQuitarLogo} className="text-xs text-red-500 hover:text-red-700 font-medium">
                    × Quitar logo (usar emoji)
                  </button>
                )}
                {subiendoLogo && <Spinner size="sm" />}
              </div>
            </div>
          </div>

          {/* Colores */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Colores del fondo (gradiente)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Color inicio</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorInicio}
                    onChange={(e) => setValores((v) => ({ ...v, color_fondo_inicio: e.target.value }))}
                    className="w-10 h-10 rounded-lg border cursor-pointer p-0.5"
                  />
                  <span className="text-xs font-mono text-gray-500">{colorInicio}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Color fin</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorFin}
                    onChange={(e) => setValores((v) => ({ ...v, color_fondo_fin: e.target.value }))}
                    className="w-10 h-10 rounded-lg border cursor-pointer p-0.5"
                  />
                  <span className="text-xs font-mono text-gray-500">{colorFin}</span>
                </div>
              </div>
            </div>

            {/* Preview gradiente */}
            <div
              className="mt-3 h-8 rounded-xl w-full"
              style={{ background: `linear-gradient(to right, ${colorInicio}, ${colorFin})` }}
            />
          </div>
        </div>

        {/* ── Resto de secciones ── */}
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
