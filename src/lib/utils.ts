import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Normaliza un DNI a SOLO dígitos (saca puntos, espacios, prefijos como "DNI:").
// Se usa en todos los puntos de alta para que el mismo número no entre dos veces
// escrito de formas distintas y la restricción de unicidad funcione de verdad.
export function normalizeDni(dni?: string | null): string {
  return String(dni || '').replace(/\D/g, '');
}

// ¿El premio está activo HOY? Considera el switch manual (is_active) y el
// rango de vigencia opcional (active_from / active_until, inclusivos).
export function isPrizeActiveNow(prize: { is_active?: boolean; active_from?: string | null; active_until?: string | null }): boolean {
  if (prize.is_active === false) return false;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (prize.active_from && today < prize.active_from) return false;
  if (prize.active_until && today > prize.active_until) return false;
  return true;
}

// Promoción de puntos (ej. "Día de la Madre x2"). Un boost tiene fecha desde
// (date), fecha hasta opcional (dateEnd) y un multiplicador (>1).
export interface PointsBoost {
  id: string;
  label: string;
  date: string;
  dateEnd?: string;
  multiplier: number;
}

// Devuelve la promo de puntos activa HOY (la de mayor multiplicador), o null.
export function getActivePointsBoost(boosts?: any[]): { label: string; multiplier: number } | null {
  if (!Array.isArray(boosts) || boosts.length === 0) return null;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let best: { label: string; multiplier: number } | null = null;
  for (const b of boosts) {
    const from = b?.date;
    const to = b?.dateEnd || b?.date;
    const mult = Number(b?.multiplier) || 1;
    if (from && today >= from && today <= to && mult > 1) {
      if (!best || mult > best.multiplier) best = { label: b.label || 'Puntos promo', multiplier: mult };
    }
  }
  return best;
}
