import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/App';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Award, TrendingUp, History } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Transaction } from '@/src/types';

export function Dashboard() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', dni: '' });

  useEffect(() => {
    if (profile) {
      setEditForm({ fullName: profile.full_name, dni: profile.dni });
      
      const fetchTransactions = async () => {
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
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: editForm.fullName, 
        dni: editForm.dni 
      })
      .eq('id', profile.id);
    
    if (error) {
      alert("Error al actualizar: " + error.message);
      setLoading(false);
    } else {
      setIsEditing(false);
      window.location.reload(); 
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-love border-t-transparent rounded-full mb-6"
        />
        <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter">Sincronizando Perfil</h2>
        <p className="text-ivory/40 text-[10px] uppercase tracking-widest">Espera un momento...</p>
      </div>
    );
  }

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
          <h2 className="text-xs md:text-sm uppercase font-bold tracking-widest opacity-80 mb-2">Saldo Actual Fidelidad</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl md:text-7xl font-black italic">{profile.points.toLocaleString()}</span>
            <span className="text-lg md:text-xl font-bold uppercase tracking-tighter">puntos</span>
          </div>
        </div>
        <div className="relative mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold opacity-80">
          <span className="flex items-center gap-2">
            <Award size={14} />
            Cliente Preferred
          </span>
          <span>DNI: {profile.dni}</span>
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors"
          >
            Editar Perfil
          </button>
        </div>

        {/* Modal Editar Perfil */}
        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-ash border border-white/10 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-6 uppercase tracking-tight italic">Completar <span className="text-love">Mis Datos</span></h3>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre Completo</label>
                    <input 
                      required
                      placeholder="Tu nombre" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-love" 
                      value={editForm.fullName} 
                      onChange={e => setEditForm({...editForm, fullName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">DNI (Para el QR)</label>
                    <input 
                      required
                      placeholder="Tu DNI" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-love" 
                      value={editForm.dni} 
                      onChange={e => setEditForm({...editForm, dni: e.target.value})} 
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-white/5 text-white/40 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-[2] bg-love text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-love/20"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
