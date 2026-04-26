"use client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Spinner } from "@/components/Spinner";
import { formatMonto } from "@/lib/utils";

interface Movimiento {
  id: number;
  fecha: string;
  tipo: string;
  patente: string | null;
  monto: string;
  descripcion: string | null;
  horaEntrada: string | null;
  horaSalida: string | null;
  cliente?: { nombre: string; apellido: string } | null;
  concepto?: { nombre: string } | null;
}

interface Arqueo {
  movimientos: Movimiento[];
  resumen: { ingresos: number; egresos: number; neto: number; porTipo: Record<string, number> };
  porDia: Record<string, { ingresos: number; egresos: number }>;
}

const labelTipo: Record<string, string> = {
  lavado: "Lavado",
  estacionamiento: "Estacionamiento",
  ingreso: "Ingreso",
  egreso: "Egreso",
  gasto: "Gasto",
};
const colorTipo: Record<string, string> = {
  lavado: "text-blue-600",
  estacionamiento: "text-green-600",
  ingreso: "text-emerald-600",
  egreso: "text-red-600",
  gasto: "text-orange-600",
};

export default function ArqueoPage() {
  const [modo, setModo] = useState<"dia" | "mes">("dia");
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));
  const [data, setData] = useState<Arqueo | null>(null);
  const [loading, setLoading] = useState(false);

  const buscar = async () => {
    setLoading(true);
    let desde: string, hasta: string;
    if (modo === "dia") {
      desde = hasta = fecha;
    } else {
      const d = new Date(mes + "-01");
      desde = format(startOfMonth(d), "yyyy-MM-dd");
      hasta = format(endOfMonth(d), "yyyy-MM-dd");
    }
    const res = await fetch(`/api/reportes/arqueo?desde=${desde}&hasta=${hasta}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  const diasGrafico = data ? Object.entries(data.porDia).sort(([a], [b]) => a.localeCompare(b)) : [];
  const maxGrafico = diasGrafico.length > 0
    ? Math.max(...diasGrafico.flatMap(([, v]) => [v.ingresos, v.egresos]))
    : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">📊 Arqueo de caja</h1>

      {/* Selectores */}
      <div className="bg-white rounded-xl shadow border p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex rounded-lg border overflow-hidden">
          {(["dia", "mes"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`px-4 py-2 text-sm ${modo === m ? "bg-blue-600 text-white" : "hover:bg-gray-50"}`}
            >
              {m === "dia" ? "Por día" : "Por mes"}
            </button>
          ))}
        </div>
        {modo === "dia" ? (
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <button
          onClick={buscar}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-6 py-2.5 font-medium"
        >
          {loading ? <Spinner size="sm" /> : "Ver arqueo"}
        </button>
      </div>

      {data && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <p className="text-sm text-green-600 font-medium">Ingresos</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{formatMonto(data.resumen.ingresos)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
              <p className="text-sm text-red-600 font-medium">Egresos</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{formatMonto(data.resumen.egresos)}</p>
            </div>
            <div className={`${data.resumen.neto >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"} border rounded-xl p-5 text-center`}>
              <p className="text-sm font-medium text-gray-600">Resultado neto</p>
              <p className={`text-2xl font-bold mt-1 ${data.resumen.neto >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {formatMonto(data.resumen.neto)}
              </p>
            </div>
          </div>

          {/* Desglose por tipo */}
          <div className="bg-white rounded-xl shadow border p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Desglose por tipo</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(data.resumen.porTipo).map(([tipo, monto]) => (
                <div key={tipo} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className={`text-xs font-medium ${colorTipo[tipo]}`}>{labelTipo[tipo]}</p>
                  <p className="font-bold text-gray-800 mt-1 text-sm">{formatMonto(monto)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de barras (CSS) */}
          {diasGrafico.length > 1 && (
            <div className="bg-white rounded-xl shadow border p-4 mb-6 print:break-before-page">
              <h3 className="font-semibold text-gray-800 mb-4">Ingresos vs Egresos por día</h3>
              <div className="flex items-end gap-2 h-40 overflow-x-auto pb-2">
                {diasGrafico.map(([dia, vals]) => (
                  <div key={dia} className="flex flex-col items-center gap-1 min-w-[40px]">
                    <div className="flex items-end gap-0.5 h-32">
                      <div
                        className="w-4 bg-green-500 rounded-t"
                        style={{ height: `${(vals.ingresos / maxGrafico) * 100}%`, minHeight: 2 }}
                        title={`Ingresos: ${formatMonto(vals.ingresos)}`}
                      />
                      <div
                        className="w-4 bg-red-400 rounded-t"
                        style={{ height: `${(vals.egresos / maxGrafico) * 100}%`, minHeight: 2 }}
                        title={`Egresos: ${formatMonto(vals.egresos)}`}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{dia.slice(8)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded inline-block" /> Ingresos</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded inline-block" /> Egresos</span>
              </div>
            </div>
          )}

          {/* Tabla de movimientos */}
          <div className="bg-white rounded-xl shadow border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Movimientos del período ({data.movimientos.length})</h3>
              <button onClick={() => window.print()} className="text-sm text-blue-600 hover:underline print:hidden">
                🖨️ Imprimir
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Fecha/Hora</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Tipo</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Patente</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Concepto/Detalle</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.map((m, i) => (
                    <tr key={m.id} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {format(new Date(m.fecha), "dd/MM HH:mm")}
                      </td>
                      <td className={`px-4 py-2 font-medium ${colorTipo[m.tipo]}`}>{labelTipo[m.tipo]}</td>
                      <td className="px-4 py-2 font-mono">{m.patente || "—"}</td>
                      <td className="px-4 py-2 text-gray-600">{m.concepto?.nombre || m.descripcion || "—"}</td>
                      <td className={`px-4 py-2 text-right font-medium ${["egreso", "gasto"].includes(m.tipo) ? "text-red-600" : "text-gray-900"}`}>
                        {formatMonto(parseFloat(m.monto))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
