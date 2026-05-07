import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { Prize } from '@/src/types';
import { Gift, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/src/App';
import { cn } from '@/src/lib/utils';

export function Rewards() {
  const { profile } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrizes = async () => {
      const { data, error } = await supabase
        .from('catalogo_premios')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });
      
      if (!error) setPrizes(data);
      setLoading(false);
    };

    fetchPrizes();
  }, []);

  // Mock data if database is empty for demo purposes
  const displayPrizes = prizes.length > 0 ? prizes : [
    { id: '1', title: 'Cóctel de Bienvenida', description: 'Cualquier cóctel de nuestra carta de autor.', points_cost: 500, image_url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&q=80&w=400' },
    { id: '2', title: 'Tabla de Quesos Selectos', description: 'Selección de quesos regionales con miel de higos.', points_cost: 1500, image_url: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&q=80&w=400' },
    { id: '3', title: 'Cena para Dos', description: 'Menú de 3 pasos con maridaje incluido.', points_cost: 5000, image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=400' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <div className="flex items-center gap-3 mb-8 bg-ash p-6 rounded-3xl border border-white/5 shadow-bento justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-love rounded-lg flex items-center justify-center font-bold text-xl uppercase shadow-lg shadow-love/30">P</div>
          <div>
            <h2 className="text-lg font-bold tracking-tight uppercase leading-none">Premios <span className="text-love">& Regalos</span></h2>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Canjea tus puntos acumulados</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-0.5">Saldo</p>
          <p className="text-xl font-black italic text-love">{profile?.points.toLocaleString()} <span className="text-[10px] font-bold not-italic text-ivory/40">PTS</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-ivory/10 animate-pulse uppercase tracking-widest text-xs font-bold">Explorando posibilidades...</div>
        ) : (
          displayPrizes.map((prize, index) => (
            <motion.div
              key={prize.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-ash border border-white/5 rounded-3xl overflow-hidden group hover:border-love/30 transition-all flex flex-col shadow-bento"
            >
              <div className="relative h-40 shrink-0">
                <img 
                  src={prize.image_url} 
                  alt={prize.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ash via-transparent to-transparent opacity-80" />
                <div className="absolute top-4 right-4">
                  <div className="bg-black/80 backdrop-blur-md text-ivory text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-lg border border-white/10 shadow-xl">
                    {prize.points_cost} Puntos
                  </div>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-tight mb-2 leading-none">{prize.title}</h3>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed line-clamp-2">
                    {prize.description}
                  </p>
                </div>
                
                <div className="mt-6">
                  <button 
                    disabled={!profile || profile.points < prize.points_cost}
                    className={cn(
                      "w-full py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                      profile && profile.points >= prize.points_cost 
                        ? "bg-love text-ivory shadow-lg shadow-love/20 hover:opacity-90" 
                        : "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                    )}
                  >
                    {profile && profile.points >= prize.points_cost ? 'Canjear Ahora' : 'Faltan Puntos'}
                    <ChevronRight size={14} className={cn(profile && profile.points >= prize.points_cost ? "text-ivory" : "text-slate-700")} />
                  </button>
                  
                  {profile && profile.points < prize.points_cost && (
                    <div className="w-full bg-white/5 h-1 md:h-1.5 mt-4 rounded-full overflow-hidden border border-white/5">
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
