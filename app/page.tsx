"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion/general").then((r) => r.json()).then(setConfig);
  }, []);

  const colorInicio   = config.color_fondo_inicio || "#2563EB";
  const colorFin      = config.color_fondo_fin    || "#4338CA";
  const logo          = config.logo_base64;
  const nombreNegocio = config.nombre_negocio     || "GarageUno";

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
            {/* Overlay para cerrar al hacer clic afuera */}
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
      <div className="text-center text-white max-w-md">
        <div className="mb-6 flex justify-center">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={nombreNegocio} className="h-28 w-auto object-contain drop-shadow-lg" />
          ) : (
            <span className="text-8xl">🏎️</span>
          )}
        </div>

        <h1 className="text-4xl font-bold mb-3">{nombreNegocio}</h1>
        <p className="text-white/70 mb-10 text-lg">Sistema de gestión de lavado y estacionamiento</p>

        <Link
          href="/reserva"
          className="block bg-white text-blue-700 hover:bg-blue-50 rounded-2xl py-4 font-semibold text-lg transition shadow-lg"
        >
          🚗 Reservar turno de lavado
        </Link>
      </div>
    </div>
  );
}
