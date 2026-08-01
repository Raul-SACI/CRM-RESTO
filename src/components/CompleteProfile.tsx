import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Cake, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Profile } from '@/src/types';

interface CompleteProfileProps {
  profile: Profile;
  refreshProfile: () => Promise<void>;
}

// Paso obligatorio para completar el cumpleaños de clientes que se registraron
// con Google (Google no comparte la fecha de nacimiento). Sin esta fecha no se
// pueden gestionar los regalos de cumpleaños.
export function CompleteProfile({ profile, refreshProfile }: CompleteProfileProps) {
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fecha máxima = hoy (con componentes locales, nunca toISOString para el día)
  const now = new Date();
  const maxDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const firstName = (profile.full_name || '').trim().split(' ')[0] || '';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!birthDate) {
      setError('Por favor ingresá tu fecha de nacimiento.');
      return;
    }

    // Validación con componentes locales (sin conversión de zona horaria)
    const [y, m, d] = birthDate.split('-').map(Number);
    if (!y || !m || !d || y < 1900) {
      setError('Ingresá una fecha válida.');
      return;
    }
    const bd = new Date(y, m - 1, d);
    if (bd > now) {
      setError('La fecha no puede ser en el futuro.');
      return;
    }

    setSaving(true);
    try {
      // Guardamos el string 'YYYY-MM-DD' tal cual (día local, sin toISOString)
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ birth_date: birthDate })
        .eq('id', profile.id);

      if (upErr) throw upErr;

      await refreshProfile();
      // Al refrescar el perfil, la app deja de mostrar este paso y entra normal.
    } catch (err: any) {
      setError('No se pudo guardar, intentá de nuevo. ' + (err?.message || ''));
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) { /* noop */ }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-love flex items-center justify-center mb-4 shadow-red">
            <Cake size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight !text-slate-900">
            {firstName ? `¡Hola, ${firstName}!` : '¡Un último paso!'}
          </h1>
          <p className="text-sm !text-slate-600 mt-2 leading-relaxed">
            Para completar tu perfil necesitamos tu <span className="font-bold !text-slate-900">fecha de nacimiento</span>.
            Así podemos saludarte y <span className="font-bold text-love">regalarte puntos en tu cumpleaños</span> 🎂
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-1.5">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={birthDate}
              max={maxDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-love !text-slate-900 font-semibold"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-love font-semibold text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-love text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer border-none shadow-red disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer"
        >
          Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
}
