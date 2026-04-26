import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="text-center text-white max-w-md">
        <div className="text-8xl mb-6">🚿</div>
        <h1 className="text-4xl font-bold mb-3">Lavadero Express</h1>
        <p className="text-blue-200 mb-10 text-lg">Sistema de gestión de lavado y estacionamiento</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/reserva"
            className="bg-white text-blue-700 hover:bg-blue-50 rounded-2xl py-4 font-semibold text-lg transition shadow-lg"
          >
            🚗 Reservar turno de lavado
          </Link>
          <Link
            href="/empleado"
            className="bg-blue-500 hover:bg-blue-400 text-white rounded-2xl py-4 font-semibold text-lg transition shadow-lg"
          >
            👷 Panel recepción
          </Link>
          <Link
            href="/admin"
            className="bg-indigo-900 hover:bg-indigo-800 text-white rounded-2xl py-4 font-semibold text-lg transition shadow-lg"
          >
            ⚙️ Panel administrador
          </Link>
        </div>
      </div>
    </div>
  );
}
