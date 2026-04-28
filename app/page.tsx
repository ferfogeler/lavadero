"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [config, setConfig] = useState<Record<string, string>>(() => {
    // Inicializar desde cache para evitar flash de valores por defecto
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("cfg_general");
        if (cached) return JSON.parse(cached);
      } catch { /* noop */ }
    }
    return {};
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion/general")
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        try { localStorage.setItem("cfg_general", JSON.stringify(data)); } catch { /* noop */ }
      });
  }, []);

  const colorInicio    = config.color_fondo_inicio  || "#2563EB";
  const colorFin       = config.color_fondo_fin     || "#4338CA";
  const logo           = config.logo_base64;
  const nombreNegocio  = config.nombre_negocio      || "GarageUno";
  const leyenda        = config.leyenda_inicio       || "";
  const mapsUrl        = config.ubicacion_maps_url  || "";
  const whatsapp       = config.whatsapp_lavadero   || "";

  const waUrl = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : "";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: `linear-gradient(to bottom right, ${colorInicio}, ${colorFin})` }}
    >
      {/* ── Dropdown panel top-right ── */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-4 py-2 text-sm font-medium backdrop-blur-sm flex items-center gap-2 transition"
        >
          <span>☰</span>
          <span>Panel</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden min-w-[220px] z-20 border border-gray-100">
              <Link
                href="/empleado"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
              >
                <span className="text-lg">👷</span> Panel recepción
              </Link>
              <div className="border-t border-gray-100" />
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
              >
                <span className="text-lg">⚙️</span> Panel administrador
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ── Contenido central ── */}
      <div className="text-center text-white max-w-md w-full">

        {/* Logo */}
        <div className="mb-6 flex justify-center">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={nombreNegocio}
              className="h-48 w-auto object-contain drop-shadow-lg"
            />
          ) : (
            <span className="text-9xl">🏎️</span>
          )}
        </div>

        <h1 className="text-4xl font-bold mb-2">{nombreNegocio}</h1>
        <p className="text-white/70 mb-2 text-lg">Sistema de gestión de lavado y estacionamiento</p>

        {/* Leyenda opcional */}
        {leyenda && (
          <p className="text-white/90 text-sm mb-6 bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
            {leyenda}
          </p>
        )}

        <div className={`flex flex-col gap-3 ${leyenda ? "" : "mt-8"}`}>
          {/* Reservar */}
          <Link
            href="/reserva"
            className="block bg-white text-blue-700 hover:bg-blue-50 rounded-2xl py-4 font-semibold text-lg transition shadow-lg"
          >
            🚗 Reservar turno de lavado
          </Link>

          {/* Como llegar */}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-2xl py-3.5 font-semibold text-base transition shadow-md border border-white/30"
            >
              📍 Cómo llegar
            </a>
          )}

        </div>
      </div>

      {/* ── Botón flotante WhatsApp ── */}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 bg-green-500 hover:bg-green-400 active:scale-95 text-white rounded-full pl-4 pr-5 py-3 font-semibold text-sm shadow-xl transition-all"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 32 32" fill="currentColor">
            <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.664 4.824 1.822 6.837L2 30l7.352-1.793A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Zm0 25.6a11.56 11.56 0 0 1-5.89-1.605l-.422-.252-4.362 1.063 1.1-4.237-.275-.435A11.56 11.56 0 0 1 4.4 16C4.4 9.594 9.594 4.4 16 4.4S27.6 9.594 27.6 16 22.406 27.6 16 27.6Zm6.34-8.606c-.347-.174-2.055-1.013-2.374-1.129-.318-.116-.55-.174-.78.174-.232.347-.896 1.129-1.098 1.36-.202.232-.405.26-.752.087-.347-.174-1.463-.539-2.787-1.718-1.03-.918-1.725-2.052-1.927-2.399-.202-.347-.022-.534.152-.707.156-.155.347-.405.52-.608.174-.202.232-.347.347-.578.116-.232.058-.434-.029-.608-.087-.174-.78-1.882-1.069-2.578-.282-.678-.568-.586-.78-.597l-.664-.011c-.232 0-.608.087-.927.434-.318.347-1.215 1.187-1.215 2.894s1.244 3.357 1.417 3.588c.174.232 2.45 3.74 5.937 5.245.83.358 1.477.572 1.982.732.833.265 1.592.228 2.19.138.668-.1 2.055-.84 2.346-1.65.29-.811.29-1.507.202-1.65-.086-.145-.317-.232-.664-.405Z"/>
          </svg>
          WhatsApp
        </a>
      )}
    </div>
  );
}
