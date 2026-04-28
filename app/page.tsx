"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion/general").then((r) => r.json()).then(setConfig);
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
      {/* ── Dropdown panel top-left ── */}
      <div className="absolute top-4 left-4 z-20">
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
            <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden min-w-[220px] z-20 border border-gray-100">
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

          {/* WhatsApp */}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white rounded-2xl py-3.5 font-semibold text-base transition shadow-md"
            >
              💬 Contactar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
