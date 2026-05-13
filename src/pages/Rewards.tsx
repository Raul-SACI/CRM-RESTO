import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Prize } from '@/src/types';
import { Gift, Sparkles, ChevronRight } from 'lucide-react';
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
          localStorage.setItem('rewards_cache', JSON.stringify(data));
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
              </div>

              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full bg-ink text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-ink/20 active:scale-95 transition-all"
              >
                Entendido
              </button>
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
