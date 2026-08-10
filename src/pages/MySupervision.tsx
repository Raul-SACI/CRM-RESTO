import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/App';
import { useDesign } from '@/src/components/DesignEngine';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { ShieldCheck, Star, Send, CheckCircle2, Clock, Loader2, MapPin } from 'lucide-react';
import { MysteryReport } from '@/src/types';
import { BRANCHES } from '@/src/constants';
import { cn } from '@/src/lib/utils';

// Selector de estrellas reutilizable (1 a 5).
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 bg-transparent border-none cursor-pointer transition-transform hover:scale-110"
          aria-label={`${star} estrellas`}
        >
          <Star
            size={26}
            className={cn(
              (hover || value) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
            )}
          />
        </button>
      ))}
    </div>
  );
}

const CATEGORIES: { key: keyof RatingsState; label: string; hint: string }[] = [
  { key: 'cleanliness', label: 'Limpieza e higiene', hint: 'Mesas, baños, pisos y presentación del local' },
  { key: 'service', label: 'Atención del personal', hint: 'Amabilidad, predisposición y trato recibido' },
  { key: 'speed', label: 'Tiempos de espera', hint: 'Demora en tomar el pedido y en entregarlo' },
  { key: 'food', label: 'Calidad del producto', hint: 'Sabor, temperatura y presentación del plato' },
];

interface RatingsState {
  cleanliness: number;
  service: number;
  speed: number;
  food: number;
}

export function MySupervision() {
  const { profile, realProfile } = useAuth();
  const { designConfig } = useDesign();
  const navigate = useNavigate();

  const activeProfile = realProfile || profile;

  const branchNames: string[] =
    (designConfig?.branches || []).map((b) => b.name).filter(Boolean).length > 0
      ? (designConfig!.branches as any[]).map((b) => b.name)
      : [...BRANCHES];

  const [branch, setBranch] = useState('');
  const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [ratings, setRatings] = useState<RatingsState>({ cleanliness: 0, service: 0, speed: 0, food: 0 });
  const [overall, setOverall] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const [reports, setReports] = useState<MysteryReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const isMystery = !!activeProfile?.is_mystery_shopper;

  const fetchReports = async () => {
    if (!activeProfile?.id) return;
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('mystery_reports')
        .select('*')
        .eq('client_id', activeProfile.id)
        .order('created_at', { ascending: false });
      if (!error && data) setReports(data as MysteryReport[]);
    } catch (e) {
      console.warn('No se pudieron cargar las supervisiones:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (isMystery) fetchReports();
    else setLoadingReports(false);
  }, [activeProfile?.id, isMystery]);

  const resetForm = () => {
    setBranch('');
    setVisitDate(new Date().toISOString().split('T')[0]);
    setRatings({ cleanliness: 0, service: 0, speed: 0, food: 0 });
    setOverall(0);
    setComment('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile?.id) return;
    if (!branch) { alert('Elegí la sucursal que supervisaste.'); return; }
    if (!overall) { alert('Poné una calificación general (1 a 5 estrellas).'); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from('mystery_reports').insert({
        client_id: activeProfile.id,
        branch,
        visit_date: visitDate || null,
        rating_cleanliness: ratings.cleanliness || null,
        rating_service: ratings.service || null,
        rating_speed: ratings.speed || null,
        rating_food: ratings.food || null,
        rating_overall: overall,
        comment: comment.trim() || null,
        status: 'pendiente',
      });
      if (error) throw error;

      setJustSent(true);
      resetForm();
      await fetchReports();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setJustSent(false), 4000);
    } catch (err: any) {
      alert('No se pudo enviar el reporte: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Si el cliente no está designado como oculto, no debe ver esta pantalla.
  if (!isMystery) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center px-6">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
          <ShieldCheck size={30} />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tighter text-ink">Sección no disponible</h1>
        <p className="text-sm text-slate-400 mt-2">Esta sección es exclusiva para clientes designados por el administrador.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-5 py-2.5 bg-ink text-white rounded-full text-[11px] font-black uppercase tracking-widest cursor-pointer border-none"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Encabezado */}
      <div className="bg-ink text-white rounded-[2rem] p-7 md:p-9 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 opacity-10">
          <ShieldCheck size={140} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-love">Programa Confidencial</p>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic mt-1">Mi Supervisión</h1>
        <p className="text-xs text-white/60 mt-3 max-w-md leading-relaxed">
          Sos parte de nuestro equipo de clientes ocultos. Después de cada visita, contanos cómo estuvo la experiencia.
          Solo vos y el administrador pueden ver estos reportes.
        </p>
      </div>

      {justSent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 flex items-center gap-3"
        >
          <CheckCircle2 size={20} />
          <p className="text-sm font-bold">¡Gracias! Tu reporte fue enviado. El administrador lo revisará pronto.</p>
        </motion.div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-2">
              <MapPin size={12} className="text-love" /> Sucursal supervisada
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love"
            >
              <option value="">Elegí una sucursal…</option>
              {branchNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Fecha de la visita</label>
            <input
              type="date"
              value={visitDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love"
            />
          </div>
        </div>

        {/* Categorías con estrellas */}
        <div className="space-y-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-extrabold text-ink">{cat.label}</p>
                <p className="text-[11px] text-slate-400">{cat.hint}</p>
              </div>
              <StarRating value={ratings[cat.key]} onChange={(v) => setRatings((prev) => ({ ...prev, [cat.key]: v }))} />
            </div>
          ))}
        </div>

        {/* Calificación general */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-love/5 border border-love/20">
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-love">Calificación general</p>
            <p className="text-[11px] text-slate-400">Tu valoración global de la visita</p>
          </div>
          <StarRating value={overall} onChange={setOverall} />
        </div>

        {/* Comentario */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Observaciones (qué viste, qué mejorarías)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Contanos con detalle cómo fue la experiencia…"
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-love text-white rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50 hover:bg-love/90 transition-all shadow-lg shadow-love/20"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : <><Send size={16} /> Enviar reporte de supervisión</>}
        </button>
      </form>

      {/* Historial de reportes */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-widest text-ink mb-4">Mis reportes enviados</h3>
        {loadingReports ? (
          <div className="py-8 flex justify-center text-slate-300"><Loader2 size={22} className="animate-spin" /></div>
        ) : reports.length === 0 ? (
          <p className="py-8 text-center text-[11px] uppercase font-black tracking-widest text-slate-300">Todavía no enviaste reportes.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-ink">{r.branch || 'Sucursal'}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={12} className={cn((r.rating_overall || 0) >= s ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200')} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {r.visit_date ? new Date(r.visit_date + 'T00:00:00').toLocaleDateString('es-AR') : new Date(r.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {r.status === 'revisado' ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={11} /> Revisado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                      <Clock size={11} /> Pendiente
                    </span>
                  )}
                  {!!r.points_awarded && r.points_awarded > 0 && (
                    <p className="text-[11px] font-black text-love mt-1">+{r.points_awarded} pts</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
