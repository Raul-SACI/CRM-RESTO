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
