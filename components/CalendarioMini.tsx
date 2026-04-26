"use client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface CalendarioMiniProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
  disablePast?: boolean;
}

export function CalendarioMini({ selected, onSelect, disablePast = true }: CalendarioMiniProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const start = startOfMonth(viewDate);
  const end = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start, end });
  const firstDow = start.getDay();
  const blanks = Array.from({ length: firstDow });
  const today = startOfDay(new Date());

  return (
    <div className="bg-white rounded-xl border p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          ‹
        </button>
        <span className="font-medium text-gray-800 capitalize">
          {format(viewDate, "MMMM yyyy", { locale: es })}
        </span>
        <button
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-gray-500 mb-1">
        {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"].map((d) => (
          <div key={d} className="py-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map((day) => {
          const past = disablePast && isBefore(startOfDay(day), today);
          const sel = selected && isSameDay(day, selected);
          const tod = isToday(day);
          return (
            <button
              key={day.toISOString()}
              disabled={past}
              onClick={() => onSelect(day)}
              className={`
                rounded-lg py-1.5 text-sm transition-colors
                ${past ? "text-gray-300 cursor-not-allowed" : "hover:bg-blue-50 cursor-pointer"}
                ${sel ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                ${tod && !sel ? "font-bold text-blue-600" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
