import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Prize } from '@/src/types';
import { Gift, Sparkles, ChevronRight, Star, X } from 'lucide-react';
import { useAuth } from '@/src/App';
import { cn } from '@/src/lib/utils';

export function Rewards() {
  const { profile, refreshProfile } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);

  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPrize, setLastPrize] = useState<Prize | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [redemptionTime, setRedemptionTime] = useState<Date | null>(null);

  // States for Program Feedback Rating
  const [showRating, setShowRating] = useState(false);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    const fetchPrizes = async () => {
      // 1. Cargar desde caché para velocidad instantánea
      const cached = localStorage.getItem('rewards_cache');
      if (cached) {
        try {
          setPrizes(JSON.parse(cached));
          setLoading(false);
        } catch (e) {
          console.error("Rewards cache error:", e);
        }
      }

      // Timeout de seguridad de 6s
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 6000);

      try {
        const { data, error } = await supabase
          .from('catalogo_premios')
          .select('*')
          .eq('is_active', true)
          .order('points_cost', { ascending: true });
        
        if (!error && data) {
          setPrizes(data);
          try {
            localStorage.setItem('rewards_cache', JSON.stringify(data));
          } catch (e) {
            console.warn("[LocalStorage] No se pudo guardar rewards_cache por límite de cuota:", e);
          }
        }
      } catch (err) {
        console.error("Rewards fetch error:", err);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    fetchPrizes();
  }, []);

  const handleRedeem = async (prize: Prize) => {
    if (!profile) return;
    if (profile.points < prize.points_cost) {
      alert("No tienes puntos suficientes");
      return;
    }

    if (!confirm(`¿Canjear ${prize.title} por ${prize.points_cost} puntos?`)) return;

    setRedeeming(prize.id);
    setStatus(null);
    
    const redemptionCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    try {
      // 1. Registrar la transacción de canje
      const { error: txError } = await supabase.from('transactions').insert({
        client_id: profile.id,
        waiter_id: profile.id, // En canje personal, el 'waiter' es el mismo usuario o sistema
        amount: 0,
        points_earned: -prize.points_cost,
        description: `CANJE: ${prize.title}`,
        branch: 'Canje Online',
        redemption_code: redemptionCode
      });

      if (txError) throw txError;

      // 2. Descontar puntos del perfil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: profile.points - prize.points_cost })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setLastPrize(prize);
      setGeneratedCode(redemptionCode);
      setRedemptionTime(new Date());
      setShowSuccess(true);
      setStatus({ type: 'success', message: `¡Canje exitoso! Canjeaste ${prize.title}` });
      
      // Forzar recarga de perfil
      await refreshProfile();
      
      // Scroll to top to see status
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Redemption error:", err);
      setStatus({ type: 'error', message: 'Error procesando canje: ' + (err.message || 'Intenta nuevamente') });
    } finally {
      setRedeeming(null);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmittingRating(true);

    const feedbackData = {
      client_id: profile.id,
      client_name: profile.full_name || 'Cliente de Club CRAFT',
      rating: ratingScore,
      comment: ratingComment,
      prize_title: lastPrize?.title || 'General',
      created_at: new Date().toISOString()
    };

    try {
      // Intentar insertar en Supabase
      const { error } = await supabase.from('program_feedback').insert(feedbackData);
      if (error) {
        console.warn("Table program_feedback might not exist, saving to local cache:", error);
      }
    } catch (err: any) {
      console.warn("Error calling Supabase insert for rating. Fallback to localStorage:", err);
    }

    // Always append/save to localStorage so it persists locally
    try {
      const existingStr = localStorage.getItem('local_program_feedback');
      let existingFeedbacks: any[] = [];
      if (existingStr) {
        existingFeedbacks = JSON.parse(existingStr);
      }
      existingFeedbacks.unshift({
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        ...feedbackData
      });
      localStorage.setItem('local_program_feedback', JSON.stringify(existingFeedbacks));
    } catch (err) {
      console.error("Local storage save error for feedback:", err);
    }

    setIsSubmittingRating(false);
    setRatingSubmitted(true);
    setTimeout(() => {
      setShowRating(false);
      setRatingSubmitted(false);
      setRatingComment('');
      setRatingScore(5);
    }, 2000);
  };

  // Mock data if database is empty for demo purposes
  const displayPrizes = prizes.length > 0 ? prizes : [
    { id: '1', title: 'Cóctel de Bienvenida', description: 'Cualquier cóctel de nuestra carta de autor.', points_cost: 500, image_url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&q=80&w=400', is_active: true },
    { id: '2', title: 'Tabla de Quesos Selectos', description: 'Selección de quesos regionales con miel de higos.', points_cost: 1500, image_url: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&q=80&w=400', is_active: true },
    { id: '3', title: 'Cena para Dos', description: 'Menú de 3 pasos con maridaje incluido.', points_cost: 5000, image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=400', is_active: true },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <div className="flex items-center gap-3 mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-love rounded-lg flex items-center justify-center font-bold text-xl uppercase shadow-lg shadow-love/30 text-white">P</div>
          <div>
            <h2 className="text-lg font-black tracking-tighter uppercase leading-none text-ink">Premios <span className="text-love">& Regalos</span></h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Canjea tus puntos acumulados</p>
          </div>
        </div>
        {profile?.role !== 'admin' && (
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400 mb-0.5">Saldo</p>
            <p className="text-xl font-black italic text-love">{(profile?.points ?? 0).toLocaleString()} <span className="text-[10px] font-bold not-italic text-slate-400">PTS</span></p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSuccess && lastPrize && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-love via-pink-400 to-love" />
              <div className="w-20 h-20 bg-love/10 rounded-full flex items-center justify-center mx-auto mb-6 text-love">
                <Sparkles size={40} />
              </div>
              
              <h3 className="text-2xl font-black mb-2 uppercase tracking-tight italic text-ink">¡Felicidades!</h3>
              <p className="text-slate-500 text-xs font-medium mb-6 px-4">
                Canjeaste <span className="text-love font-black italic">{lastPrize.points_cost} puntos</span> por <br/>
                <span className="text-ink font-black uppercase text-sm">"{lastPrize.title}"</span>
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Código de Canje</p>
                <p className="text-xl font-mono font-black text-ink">{generatedCode}</p>
                <p className="text-[9px] font-bold text-love mt-2 uppercase">Muestra esta pantalla al personal</p>
                
                {redemptionTime && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Realizado el:</p>
                    <p className="text-[10px] font-bold text-ink mb-2">
                      {redemptionTime.toLocaleDateString('es-AR')} - {redemptionTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                    </p>
                    <div className="bg-love/5 p-2 rounded-lg border border-love/10">
                      <p className="text-[8px] font-black text-love uppercase leading-tight">
                        Vence hoy a las 23:59 hs.<br/>
                        SOLO VÁLIDO PARA EL DÍA DE LA FECHA.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  setShowSuccess(false);
                  setShowRating(true);
                }}
                className="w-full bg-ink text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-ink/20 active:scale-95 transition-all"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Points Program Feedback Star-Rating Overlay */}
      <AnimatePresence>
        {showRating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden text-center"
            >
              <button 
                onClick={() => setShowRating(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-love transition-colors"
                type="button"
              >
                <X size={20} />
              </button>

              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-love to-yellow-500" />
              
              <div className="w-16 h-16 bg-love/10 rounded-full flex items-center justify-center mx-auto mb-4 text-love">
                <Star size={32} className="fill-love" />
              </div>

              {ratingSubmitted ? (
                <div className="py-6 animate-pulse">
                  <h3 className="text-2xl font-black text-ink dark:text-white uppercase italic">¡Muchas Gracias!</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Tus opiniones nos ayudan a mejorar el sistema.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitRating} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-ink dark:text-white">Puntúa el Club CRAFT</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold mt-1.5 leading-normal">
                      ¿Qué te pareció el canje de <span className="font-extrabold text-love">"{lastPrize?.title}"</span> y tu experiencia con el sistema de puntos?
                    </p>
                  </div>

                  {/* Star selections */}
                  <div className="flex items-center justify-center gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingScore(star)}
                        className="p-1 transition-transform active:scale-90"
                      >
                        <Star 
                          size={32} 
                          className={cn(
                            "transition-all duration-200",
                            star <= ratingScore 
                              ? "fill-yellow-400 text-yellow-400 scale-110" 
                              : "text-slate-200 dark:text-slate-700 hover:text-yellow-400/50"
                          )} 
                        />
                      </button>
                    ))}
                  </div>
                  
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#A06C00]">
                    {ratingScore === 5 && '¡Excelente, me encanta! 🤩'}
                    {ratingScore === 4 && '¡Muy bueno! 😀'}
                    {ratingScore === 3 && 'Bueno / Conforme 🙂'}
                    {ratingScore === 2 && 'Podría mejorar 😐'}
                    {ratingScore === 1 && 'No me gustó en absoluto 😞'}
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 pl-1">Tu Comentario (Opcional)</label>
                    <textarea
                      placeholder="Déjanos un comentario o sugerencia para seguir mejorando..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs outline-none focus:border-love text-ink dark:text-white h-20 resize-none transition-all font-semibold"
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRating}
                    className="w-full bg-love text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-love/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmittingRating ? 'Enviando...' : 'Enviar Calificación'}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status && !showSuccess && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "p-6 rounded-3xl mb-8 border transition-all text-center",
              status.type === 'success' ? "bg-green-500/10 border-green-500 text-green-500" : "bg-love/10 border-love text-love"
            )}
          >
            <p className="font-black uppercase tracking-widest text-[10px]">{status.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-200 animate-pulse uppercase tracking-[0.2em] text-[10px] font-black italic">Explorando posibilidades...</div>
        ) : (
          displayPrizes.map((prize, index) => (
            <motion.div
              key={prize.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-slate-100 rounded-3xl overflow-hidden group hover:border-love/30 transition-all flex flex-col shadow-xl shadow-slate-200/50"
            >
              <div className="relative h-40 shrink-0">
                <img 
                  src={prize.image_url} 
                  alt={prize.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent opacity-60" />
                <div className="absolute top-4 right-4">
                  <div className="bg-white/90 backdrop-blur-md text-love text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-lg border border-slate-100 shadow-xl shadow-love/10">
                    {prize.points_cost} Puntos
                  </div>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tighter mb-2 leading-none text-ink">{prize.title}</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2">
                    {prize.description}
                  </p>
                </div>
                
                <div className="mt-6">
                  <button 
                    disabled={!profile || profile.points < prize.points_cost || redeeming === prize.id}
                    onClick={() => handleRedeem(prize)}
                    className={cn(
                      "w-full py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                      profile && profile.points >= prize.points_cost 
                        ? "bg-love text-white shadow-red hover:opacity-90" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    )}
                  >
                    {redeeming === prize.id ? 'Procesando...' : (profile && profile.points >= prize.points_cost ? 'Canjear Ahora' : 'Faltan Puntos')}
                    {redeeming !== prize.id && <ChevronRight size={14} className={cn(profile && profile.points >= prize.points_cost ? "text-white" : "text-slate-300")} />}
                  </button>
                  
                  {profile && profile.points < prize.points_cost && (
                    <div className="w-full bg-slate-50 h-1 md:h-1.5 mt-4 rounded-full overflow-hidden border border-slate-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(profile.points / prize.points_cost) * 100}%` }}
                        className="bg-love h-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
