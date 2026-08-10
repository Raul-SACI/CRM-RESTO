import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/App';
import { useDesign } from '@/src/components/DesignEngine';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { ShieldCheck, Star, Send, CheckCircle2, Clock, Loader2, MapPin, Camera, X } from 'lucide-react';
import { MysteryReport } from '@/src/types';
import { BRANCHES } from '@/src/constants';
import { resolveSupervisionConfig } from '@/src/lib/supervision';
import { cn } from '@/src/lib/utils';

// Selector de estrellas (1 a 5).
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
          <Star size={26} className={cn((hover || value) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  );
}

// Grupo de opciones (botones tipo "segmented").
function OptionGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight border transition-all cursor-pointer',
            value === opt
              ? 'bg-love text-white border-love shadow-md shadow-love/20'
              : 'bg-white text-slate-500 border-slate-200 hover:border-love/40'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// Fila con etiqueta + control (estrellas u opciones).
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
      <div>
        <p className="text-sm font-extrabold text-ink leading-tight">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-love pt-2">{children}</h3>
  );
}

interface RatingsState {
  cleanlinessVenue: number;
  cleanlinessBathroom: number;
  disposition: number;
  aesthetics: number;
  foodQuality: number;
  overall: number;
}

export function MySupervision() {
  const { profile, realProfile } = useAuth();
  const { designConfig } = useDesign();
  const navigate = useNavigate();

  const activeProfile = realProfile || profile;

  // Textos y opciones editables por el admin (con fallback a los por defecto).
  const cfg = resolveSupervisionConfig(designConfig?.supervision);
  const F = cfg.fields;

  const branchNames: string[] =
    (designConfig?.branches || []).map((b) => b.name).filter(Boolean).length > 0
      ? (designConfig!.branches as any[]).map((b) => b.name)
      : [...BRANCHES];

  // Datos de la visita
  const [branch, setBranch] = useState('');
  const [visitDate, setVisitDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState('');

  // Estrellas
  const [ratings, setRatings] = useState<RatingsState>({
    cleanlinessVenue: 0, cleanlinessBathroom: 0, disposition: 0, aesthetics: 0, foodQuality: 0, overall: 0,
  });
  const setR = (k: keyof RatingsState, v: number) => setRatings((p) => ({ ...p, [k]: v }));

  // Textos y tiempos
  const [waiterName, setWaiterName] = useState('');
  const [waitGreeting, setWaitGreeting] = useState('');
  const [waitOrderTaken, setWaitOrderTaken] = useState('');
  const [orderType, setOrderType] = useState<'' | 'bebida' | 'bebida_comida'>('');
  const [waitOrderDelivered, setWaitOrderDelivered] = useState('');
  const [waitBill, setWaitBill] = useState('');
  const [comment, setComment] = useState('');

  // Foto
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Respuestas a las preguntas personalizadas (por id)
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const setCustom = (id: string, v: any) => setCustomAnswers((p) => ({ ...p, [id]: v }));

  // Campos fijos que el admin ocultó
  const disabled = new Set(cfg.disabledFields || []);
  const show = (k: string) => !disabled.has(k);

  const [saving, setSaving] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const [reports, setReports] = useState<MysteryReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const isMystery = !!activeProfile?.is_mystery_shopper;

  // Al cambiar qué pidió, se resetea el tiempo de entrega (las opciones cambian).
  useEffect(() => { setWaitOrderDelivered(''); }, [orderType]);

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

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProfile?.id) return;
    if (!file.type.startsWith('image/')) { alert('El archivo debe ser una imagen.'); return; }
    setUploadingPhoto(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${activeProfile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('supervision-fotos')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('supervision-fotos').getPublicUrl(fileName);
      if (!pub?.publicUrl) throw new Error('No se pudo obtener el link de la foto');
      setPhotoUrl(pub.publicUrl);
    } catch (err: any) {
      alert('No se pudo subir la foto: ' + (err?.message || err) + '\n\nVerificá que el bucket "supervision-fotos" exista en Supabase.');
    } finally {
      setUploadingPhoto(false);
      (e.target as HTMLInputElement).value = '';
    }
  };

  const resetForm = () => {
    setBranch(''); setVisitDate(new Date().toISOString().split('T')[0]); setVisitTime('');
    setRatings({ cleanlinessVenue: 0, cleanlinessBathroom: 0, disposition: 0, aesthetics: 0, foodQuality: 0, overall: 0 });
    setWaiterName(''); setWaitGreeting(''); setWaitOrderTaken(''); setOrderType(''); setWaitOrderDelivered('');
    setWaitBill(''); setComment(''); setPhotoUrl(''); setCustomAnswers({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile?.id) return;
    if (!branch) { alert('Elegí la sucursal que supervisaste.'); return; }
    if (!ratings.overall) { alert('Poné la calificación general (1 a 5 estrellas).'); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from('mystery_reports').insert({
        client_id: activeProfile.id,
        branch,
        visit_date: visitDate || null,
        visit_time: visitTime || null,
        rating_cleanliness: ratings.cleanlinessVenue || null,
        rating_cleanliness_bathroom: ratings.cleanlinessBathroom || null,
        rating_service: ratings.disposition || null,
        rating_aesthetics: ratings.aesthetics || null,
        rating_food: ratings.foodQuality || null,
        rating_overall: ratings.overall,
        waiter_name: waiterName.trim() || null,
        wait_greeting: waitGreeting || null,
        wait_order_taken: waitOrderTaken || null,
        order_type: orderType || null,
        wait_order_delivered: waitOrderDelivered || null,
        wait_bill: waitBill || null,
        photo_url: photoUrl || null,
        comment: comment.trim() || null,
        custom_answers: Object.keys(customAnswers).length ? customAnswers : null,
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

  const deliverOptions = orderType === 'bebida' ? cfg.deliverDrinkOptions : orderType === 'bebida_comida' ? cfg.deliverFoodOptions : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Encabezado */}
      <div className="bg-ink text-white rounded-[2rem] p-7 md:p-9 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 opacity-10"><ShieldCheck size={140} /></div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-love">Programa Confidencial</p>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic mt-1">Mi Supervisión</h1>
        <p className="text-xs text-white/60 mt-3 max-w-md leading-relaxed">
          Sos parte de nuestro equipo de clientes ocultos. Después de cada visita, contanos con detalle cómo estuvo la experiencia.
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
      <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
        <SectionTitle>Datos de la visita</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-2">
              <MapPin size={12} className="text-love" /> Sucursal
            </label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love">
              <option value="">Elegí…</option>
              {branchNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Fecha</label>
            <input type="date" value={visitDate} max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Horario</label>
            <input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love" />
          </div>
        </div>

        {(show('cleanlinessVenue') || show('cleanlinessBathroom')) && <SectionTitle>Limpieza e higiene</SectionTitle>}
        {show('cleanlinessVenue') && (
          <Field label={F.cleanlinessVenue.label} hint={F.cleanlinessVenue.hint}>
            <StarRating value={ratings.cleanlinessVenue} onChange={(v) => setR('cleanlinessVenue', v)} />
          </Field>
        )}
        {show('cleanlinessBathroom') && (
          <Field label={F.cleanlinessBathroom.label} hint={F.cleanlinessBathroom.hint}>
            <StarRating value={ratings.cleanlinessBathroom} onChange={(v) => setR('cleanlinessBathroom', v)} />
          </Field>
        )}

        {(show('disposition') || show('waiterName') || show('waitGreeting') || show('waitOrderTaken')) && <SectionTitle>Atención</SectionTitle>}
        {show('disposition') && (
          <Field label={F.disposition.label} hint={F.disposition.hint}>
            <StarRating value={ratings.disposition} onChange={(v) => setR('disposition', v)} />
          </Field>
        )}
        {show('waiterName') && (
          <Field label={F.waiterName.label} hint={F.waiterName.hint}>
            <input type="text" value={waiterName} onChange={(e) => setWaiterName(e.target.value)}
              placeholder="Ej. Sofía"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love" />
          </Field>
        )}
        {show('waitGreeting') && (
          <Field label={F.waitGreeting.label} hint={F.waitGreeting.hint}>
            <OptionGroup options={cfg.waitGreetingOptions} value={waitGreeting} onChange={setWaitGreeting} />
          </Field>
        )}
        {show('waitOrderTaken') && (
          <Field label={F.waitOrderTaken.label} hint={F.waitOrderTaken.hint}>
            <OptionGroup options={cfg.waitOrderTakenOptions} value={waitOrderTaken} onChange={setWaitOrderTaken} />
          </Field>
        )}

        {(show('orderType') || show('waitOrderDelivered')) && <SectionTitle>El pedido</SectionTitle>}
        {show('orderType') && (
          <Field label={F.orderType.label} hint={F.orderType.hint}>
            <OptionGroup
              options={[cfg.orderTypeDrinkLabel, cfg.orderTypeFoodLabel]}
              value={orderType === 'bebida' ? cfg.orderTypeDrinkLabel : orderType === 'bebida_comida' ? cfg.orderTypeFoodLabel : ''}
              onChange={(v) => setOrderType(v === cfg.orderTypeDrinkLabel ? 'bebida' : 'bebida_comida')}
            />
          </Field>
        )}
        {show('waitOrderDelivered') && orderType && (
          <Field label={F.waitOrderDelivered.label} hint={F.waitOrderDelivered.hint}>
            <OptionGroup options={deliverOptions} value={waitOrderDelivered} onChange={setWaitOrderDelivered} />
          </Field>
        )}

        {(show('photo') || show('aesthetics') || show('foodQuality')) && <SectionTitle>El plato / bebida</SectionTitle>}
        {show('photo') && (
          <Field label={F.photo.label} hint={F.photo.hint}>
            {photoUrl ? (
              <div className="relative inline-block">
                <img src={photoUrl} alt="Foto del plato" className="w-32 h-32 object-cover rounded-xl border border-slate-200" />
                <button type="button" onClick={() => setPhotoUrl('')}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-love text-white flex items-center justify-center border-none cursor-pointer shadow">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className={cn(
                'inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-500 cursor-pointer hover:border-love hover:text-love transition-all',
                uploadingPhoto && 'opacity-60 pointer-events-none'
              )}>
                {uploadingPhoto ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                {uploadingPhoto ? 'Subiendo…' : 'Tomar / subir foto'}
                <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
              </label>
            )}
          </Field>
        )}
        {show('aesthetics') && (
          <Field label={F.aesthetics.label} hint={F.aesthetics.hint}>
            <StarRating value={ratings.aesthetics} onChange={(v) => setR('aesthetics', v)} />
          </Field>
        )}
        {show('foodQuality') && (
          <Field label={F.foodQuality.label} hint={F.foodQuality.hint}>
            <StarRating value={ratings.foodQuality} onChange={(v) => setR('foodQuality', v)} />
          </Field>
        )}

        <SectionTitle>Cierre</SectionTitle>
        {show('waitBill') && (
          <Field label={F.waitBill.label} hint={F.waitBill.hint}>
            <OptionGroup options={cfg.waitBillOptions} value={waitBill} onChange={setWaitBill} />
          </Field>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-love/5 border border-love/20">
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-love">{F.overall.label}</p>
            {F.overall.hint && <p className="text-[11px] text-slate-400">{F.overall.hint}</p>}
          </div>
          <StarRating value={ratings.overall} onChange={(v) => setR('overall', v)} />
        </div>
        {show('comment') && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{F.comment.label}</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
              placeholder="Contanos con detalle cualquier cosa que quieras destacar o mejorar…"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love resize-none" />
          </div>
        )}

        {/* Preguntas personalizadas agregadas por el admin */}
        {cfg.customQuestions.length > 0 && (
          <>
            <SectionTitle>Preguntas adicionales</SectionTitle>
            {cfg.customQuestions.map((q) => {
              let control: React.ReactNode = null;
              if (q.type === 'stars') {
                control = <StarRating value={Number(customAnswers[q.id]) || 0} onChange={(v) => setCustom(q.id, v)} />;
              } else if (q.type === 'options') {
                control = <OptionGroup options={q.options || []} value={customAnswers[q.id] || ''} onChange={(v) => setCustom(q.id, v)} />;
              } else {
                control = (
                  <input type="text" value={customAnswers[q.id] || ''} onChange={(e) => setCustom(q.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-ink outline-none focus:border-love" />
                );
              }
              return (
                <React.Fragment key={q.id}>
                  <Field label={q.label} hint={q.hint || undefined}>{control}</Field>
                </React.Fragment>
              );
            })}
          </>
        )}

        <button type="submit" disabled={saving || uploadingPhoto}
          className="w-full py-3.5 bg-love text-white rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50 hover:bg-love/90 transition-all shadow-lg shadow-love/20">
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
                    {r.visit_time ? ` · ${r.visit_time} hs` : ''}
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
