import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Cake } from 'lucide-react';

interface Cli { full_name?: string; birth_date?: string | null; dni?: string; }
interface BirthdayCalendarProps { clients: Cli[]; }

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Calendario mensual de cumpleaños de clientes para el Dashboard del admin.
// Las fechas se leen por componentes (string 'YYYY-MM-DD'), nunca con toISOString,
// para no correrse de día por zona horaria.
export function BirthdayCalendar({ clients }: BirthdayCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  // Mapa día (1-31) -> clientes que cumplen ese día en el mes visible
  const byDay: Record<number, Cli[]> = {};
  clients.forEach((c) => {
    if (!c.birth_date) return;
    const parts = String(c.birth_date).split('T')[0].split('-');
    if (parts.length < 3) return;
    const m = parseInt(parts[1], 10); // 1-12
    const d = parseInt(parts[2], 10); // 1-31
    if (!m || !d) return;
    if (m - 1 === viewMonth) {
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(c);
    }
  });

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDate = today.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const daysWithBday = Object.keys(byDay).map((d) => parseInt(d, 10)).sort((a, b) => a - b);
  const totalMonth = daysWithBday.reduce((acc, d) => acc + byDay[d].length, 0);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 !text-slate-900">
          <Cake size={16} className="text-love" /> Cumpleaños de clientes
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={prev} className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 !text-slate-600 border-none cursor-pointer">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] font-black uppercase tracking-wider !text-slate-900 w-28 text-center">{MONTHS[viewMonth]} {viewYear}</span>
          <button type="button" onClick={next} className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 !text-slate-600 border-none cursor-pointer">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Grilla del mes */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[9px] font-black uppercase tracking-widest !text-slate-400 py-1">{w}</div>
        ))}
        {cells.map((d, i) => {
          const has = d != null && !!byDay[d];
          const isToday = isCurrentMonth && d === todayDate;
          return (
            <div
              key={i}
              title={has ? byDay[d as number].map((c) => c.full_name).join(', ') : ''}
              className={
                'aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-bold ' +
                (d == null
                  ? ''
                  : has
                    ? 'bg-love text-white cursor-default'
                    : isToday
                      ? 'bg-slate-900 text-white'
                      : '!text-slate-600 bg-slate-50')
              }
            >
              {d != null && <span>{d}</span>}
              {has && <span className="text-[7px] font-black leading-none">🎂 {byDay[d as number].length}</span>}
            </div>
          );
        })}
      </div>

      {/* Lista del mes */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[9px] font-black uppercase tracking-widest !text-slate-400 mb-2">
          {totalMonth > 0 ? `${totalMonth} cumpleaños en ${MONTHS[viewMonth]}` : `Sin cumpleaños en ${MONTHS[viewMonth]}`}
        </p>
        <div className="space-y-0.5 max-h-44 overflow-y-auto">
          {daysWithBday.map((d) => (
            byDay[d].map((c, idx) => (
              <div key={`${d}-${idx}`} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-50 last:border-0">
                <span className="font-bold !text-slate-800 truncate mr-2">{c.full_name || 'Cliente'}</span>
                <span className="font-black text-love shrink-0">{String(d).padStart(2, '0')}/{String(viewMonth + 1).padStart(2, '0')}</span>
              </div>
            ))
          ))}
        </div>
      </div>
    </div>
  );
}
