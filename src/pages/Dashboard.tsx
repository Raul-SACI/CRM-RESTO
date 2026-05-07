import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/App';
import QRCode from 'react-qr-code';
import { motion } from 'motion/react';
import { CreditCard, Award, TrendingUp, History } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Transaction } from '@/src/types';

export function Dashboard() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!profile) return;
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error) setTransactions(data);
      setLoading(false);
    };

    fetchTransactions();
  }, [profile]);

  if (!profile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-12"
    >
      {/* Points Balance Card - Large Bento */}
      <div className="md:col-span-9 bg-love rounded-3xl p-8 flex flex-col justify-between border-4 border-black/20 relative overflow-hidden group shadow-bento order-1">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
        <div className="relative">
          <h2 className="text-sm uppercase font-bold tracking-widest opacity-80 mb-2">Saldo Actual Fidelidad</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-7xl font-black italic">{profile.points.toLocaleString()}</span>
            <span className="text-xl font-bold uppercase tracking-tighter">puntos</span>
          </div>
        </div>
        <div className="relative mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold opacity-80">
          <span className="flex items-center gap-2">
            <Award size={14} />
            Cliente Preferred
          </span>
          <span>DNI: {profile.dni}</span>
        </div>
      </div>

      {/* QR Code Card - Square Bento */}
      <div className="md:col-span-3 bg-white rounded-3xl p-6 shadow-bento flex flex-col items-center justify-center text-center order-2 md:order-2">
        <div className="bg-white p-4 rounded-2xl mb-4 border-2 border-slate-100 shadow-sm flex items-center justify-center">
          <QRCode 
            value={`${window.location.origin}/#/waiter?dni=${profile.dni || profile.id}`} 
            size={120}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>
        <p className="text-[10px] uppercase font-bold text-love tracking-tighter">ID Cliente: {profile.dni || 'PENDIENTE'}</p>
        <p className="text-black font-bold mt-1 text-sm">{profile.full_name}</p>
      </div>

      {/* Recent Activity Card - Side Bento */}
      <div className="md:col-span-4 bg-ash rounded-3xl p-6 border border-white/5 shadow-bento order-3">
        <div className="flex items-center justify-between mb-6">
          <h3 className="uppercase tracking-widest text-[10px] font-bold text-slate-400">Actividad</h3>
          <History size={14} className="text-slate-500" />
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-ivory/10 animate-pulse">Cargando...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-ivory/20 text-xs italic py-4">Sin movimientos</div>
          ) : (
            transactions.map((tx) => (
              <div 
                key={tx.id}
                className="bg-black/20 p-3 rounded-xl flex justify-between items-center border border-white/5"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium truncate opacity-90">{tx.description}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-tighter mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <p className="text-love font-bold italic text-sm">+{tx.points_earned}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Card - Square Bento */}
      <div className="md:col-span-8 bg-ash rounded-3xl p-6 border border-white/5 relative overflow-hidden group shadow-bento order-4">
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado del Sistema</h2>
            </div>
            <p className="text-ivory/80 text-sm font-medium mb-1">Tu perfil está verificado y activo.</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Sumas 1 punto por cada $1.000 consumidos. Los puntos de cumpleaños (500 pts) se cargan automáticamente al iniciar sesión en tu fecha especial.
            </p>
          </div>
          <div className="mt-6 flex gap-3 text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-love/20 text-love px-3 py-1.5 rounded-lg border border-love/20">Programa Premium</span>
            <span className="bg-white/5 text-white/40 px-3 py-1.5 rounded-lg border border-white/5">Válido en sucursal</span>
          </div>
        </div>
        <div className="absolute top-1/2 -right-12 -translate-y-1/2 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <Award size={200} />
        </div>
      </div>
    </motion.div>
  );
}
