import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface GuideStep {
  icon: string;
  title: string;
  body: string;
}

interface WelcomeGuideProps {
  steps: GuideStep[];
  storageKey: string;   // clave por dispositivo para "no volver a mostrar"
  enabled?: boolean;    // si es false, nunca se muestra
}

// Guía de bienvenida paso a paso. Se muestra la primera vez (por dispositivo) y
// el usuario puede marcar "No volver a mostrar". Es solo una preferencia de la
// interfaz (no son datos del negocio), por eso se guarda por dispositivo.
export function WelcomeGuide({ steps, storageKey, enabled = true }: WelcomeGuideProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    if (!enabled || steps.length === 0) return;
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === '1';
    } catch (e) { /* si no hay acceso, mostramos igual */ }
    if (!seen) setOpen(true);
  }, [enabled, storageKey, steps.length]);

  const close = () => {
    if (dontShowAgain) {
      try { localStorage.setItem(storageKey, '1'); } catch (e) { /* noop */ }
    }
    setOpen(false);
  };

  if (!open || steps.length === 0) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Encabezado rojo */}
          <div className="bg-love px-6 py-5 relative">
            <button
              type="button"
              onClick={close}
              className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white bg-transparent border-none cursor-pointer"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
            <div className="text-4xl mb-1">{current.icon}</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Paso {step + 1} de {steps.length}</p>
          </div>

          {/* Cuerpo */}
          <div className="px-6 py-6">
            <h2 className="text-xl font-black tracking-tight !text-slate-900 mb-2">{current.title}</h2>
            <p className="text-sm !text-slate-600 leading-relaxed">{current.body}</p>

            {/* Puntitos de progreso */}
            <div className="flex items-center justify-center gap-1.5 mt-6">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={
                    'h-1.5 rounded-full transition-all ' +
                    (i === step ? 'w-5 bg-love' : 'w-1.5 bg-slate-200')
                  }
                />
              ))}
            </div>
          </div>

          {/* Pie: navegación */}
          <div className="px-6 pb-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest !text-slate-400 disabled:opacity-30 bg-transparent border-none cursor-pointer"
            >
              <ChevronLeft size={14} /> Atrás
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={close}
                className="px-6 py-3 bg-love text-white rounded-xl text-[11px] font-black uppercase tracking-widest border-none cursor-pointer shadow-red"
              >
                ¡Listo!
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
                className="flex items-center gap-1 px-6 py-3 bg-love text-white rounded-xl text-[11px] font-black uppercase tracking-widest border-none cursor-pointer shadow-red"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* No volver a mostrar */}
          <div className="px-6 pb-5 border-t border-slate-100 pt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-love cursor-pointer"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <span className="text-[10px] font-bold uppercase tracking-widest !text-slate-400">No volver a mostrar</span>
            </label>
            <button
              type="button"
              onClick={close}
              className="text-[10px] font-black uppercase tracking-widest !text-slate-400 hover:!text-slate-600 bg-transparent border-none cursor-pointer"
            >
              Saltar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Pasos para CLIENTES
export const CLIENT_GUIDE_STEPS: GuideStep[] = [
  {
    icon: '🎉',
    title: '¡Bienvenido a CRAFT club!',
    body: 'Este es tu club de beneficios: sumás puntos con cada consumo y los canjeás por premios. Te mostramos cómo funciona en unos pasos.'
  },
  {
    icon: '🧾',
    title: 'Sumá puntos',
    body: 'Cuando pagás en CRAFT, decile tu DNI al cajero antes de abonar. Tus puntos se acreditan solos en tu cuenta.'
  },
  {
    icon: '🎁',
    title: 'Canjeá premios',
    body: 'Entrá a la sección Premios y usá tus puntos para canjear beneficios y regalos exclusivos del club.'
  },
  {
    icon: '🏆',
    title: 'Subí de categoría',
    body: 'Cuanto más sumás, más avanzás en tu camino de fidelidad (FAN → GOLD → BLACK) y desbloqueás más beneficios. ¡A disfrutar!'
  }
];

// Pasos para CAJEROS
export const CASHIER_GUIDE_STEPS: GuideStep[] = [
  {
    icon: '👋',
    title: 'Bienvenido a la caja CRAFT',
    body: 'Desde acá cargás puntos a los clientes y confirmás sus pases. Te mostramos lo básico en unos pasos.'
  },
  {
    icon: '🔎',
    title: 'Identificá al cliente',
    body: 'En la pestaña "Cargar Puntos", escribí el DNI del cliente y tocá Buscar. Van a aparecer su nombre, saldo y categoría.'
  },
  {
    icon: '💵',
    title: 'Cargá los puntos',
    body: 'Elegí la sucursal, poné el monto consumido y el número de factura (obligatorio), y confirmá. Los puntos se calculan solos.'
  },
  {
    icon: '🎟️',
    title: 'Confirmá los pases',
    body: 'En la pestaña "Registro de Usos" confirmás los códigos de pases que te muestran los clientes. Un pase se usa una sola vez.'
  }
];
