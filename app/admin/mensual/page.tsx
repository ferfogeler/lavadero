"use client";
import { useState } from "react";
import { format } from "date-fns";
import { Spinner } from "@/components/Spinner";
import { formatMonto, labelTipoVehiculo } from "@/lib/utils";

interface InformeMensual {
  mes: number;
  anio: number;
  lavadasPorTipo: Record<string, number>;
  totalLavados: number;
  ingresosLavado: number;
  ingresosEstacionamiento: number;
  otrosIngresos: number;
  totalIngresos: number;
  gastos: number;
  egresos: number;
  totalEgresos: number;
  neto: number;
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function InformeMensualPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [data, setData] = useState<InformeMensual | null>(null);
  const [loading, setLoading] = useState(false);

  const buscar = async () => {
    setLoading(true);
    const res = await fetch(`/api/reportes/mensual?mes=${mes}&anio=${anio}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 print:hidden">📋 Informe mensual</h1>
      <div className="bg-white rounded-xl shadow border p-4 mb-6 flex flex-wrap items-end gap-4 print:hidden">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value))}
            className="border rounded-xl px-4 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={buscar}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 font-medium"
        >
          {loading ? <Spinner size="sm" /> : "Ver informe"}
        </button>
        {data && (
          <button onClick={() => window.print()} className="text-blue-600 hover:underline text-sm">
            🖨️ Imprimir
          </button>
        )}
      </div>

      {data && (
        <div className="space-y-6">
          <div className="text-center print:block">
            <h2 className="text-xl font-bold text-gray-900">{MESES[data.mes - 1]} {data.anio}</h2>
          </div>

          {/* Lavados */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">🚗 Lavados</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {Object.entries(data.lavadasPorTipo).map(([tipo, cant]) => (
                <div key={tipo} className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-blue-600 font-medium">{labelTipoVehiculo(tipo)}</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{cant}</p>
                  <p className="text-xs text-gray-500">lavados</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-gray-600 font-medium">Total lavados</span>
              <span className="font-bold text-gray-900">{data.totalLavados}</span>
            </div>
          </div>

          {/* Ingresos */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">💰 Ingresos</h3>
            <div className="space-y-3">
              {[
                { label: "Lavados", value: data.ingresosLavado, color: "text-blue-600" },
                { label: "Estacionamiento", value: data.ingresosEstacionamiento, color: "text-green-600" },
                { label: "Otros ingresos", value: data.otrosIngresos, color: "text-emerald-600" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${row.color}`}>{row.label}</span>
                  <span className="font-semibold text-gray-800">{formatMonto(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-2 font-bold">
                <span className="text-gray-800">Total ingresos</span>
                <span className="text-green-700">{formatMonto(data.totalIngresos)}</span>
              </div>
            </div>
          </div>

          {/* Egresos */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">💸 Egresos y gastos</h3>
            <div className="space-y-3">
              {[
                { label: "Gastos operativos", value: data.gastos, color: "text-orange-600" },
                { label: "Egresos", value: data.egresos, color: "text-red-600" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${row.color}`}>{row.label}</span>
                  <span className="font-semibold text-gray-800">{formatMonto(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-2 font-bold">
                <span className="text-gray-800">Total egresos</span>
                <span className="text-red-700">{formatMonto(data.totalEgresos)}</span>
              </div>
            </div>
          </div>

          {/* Resultado neto */}
          <div className={`rounded-xl border-2 p-6 text-center ${data.neto >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
            <p className="text-sm font-medium text-gray-600 mb-1">Resultado neto del mes</p>
            <p className={`text-4xl font-bold ${data.neto >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatMonto(data.neto)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
