import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/App';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Receipt, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Profile } from '@/src/types';

export function Waiter() {
  const { profile: waiterProfile } = useAuth();
  const [dni, setDni] = useState('');
  const [amount, setAmount] = useState('');
  const [client, setClient] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const searchClient = async () => {
    if (!dni) return;
    setSearching(true);
    setClient(null);
    setStatus(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('dni', dni)
        .eq('role', 'client')
        .single();
      
      if (error) throw new Error('Cliente no encontrado');
      setClient(data);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !amount || !waiterProfile) return;
    
    setLoading(true);
    setStatus(null);

    const amountNum = parseFloat(amount);
    const pointsToAdd = Math.floor(amountNum / 1000);

    if (pointsToAdd <= 0) {
      setStatus({ type: 'error', message: 'El monto debe ser al menos $1.000' });
      setLoading(false);
      return;
    }

    try {
      // 1. Insert Transaction
      const { error: txError } = await supabase.from('transactions').insert({
        client_id: client.id,
        waiter_id: waiterProfile.id,
        amount: amountNum,
        points_earned: pointsToAdd,
        description: `Consumo en salón - $${amountNum.toLocaleString('es-AR')}`
      });

      if (txError) throw txError;

      // 2. Update Client Points
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: client.points + pointsToAdd })
        .eq('id', client.id);

      if (updateError) throw updateError;

      setStatus({ 
        type: 'success', 
        message: `¡Éxito! Se cargaron ${pointsToAdd} puntos a ${client.full_name.split(' ')[0]}.` 
      });
      
      // Reset form
      setClient(null);
      setDni('');
      setAmount('');
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Error al procesar la carga' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto space-y-6 pt-4"
    >
      <div className="flex items-center gap-3 mb-8 bg-ash p-4 rounded-2xl border border-white/10">
        <div className="w-10 h-10 bg-love rounded-lg flex items-center justify-center font-bold text-xl uppercase">W</div>
        <div>
          <h2 className="text-lg font-bold tracking-tight uppercase leading-none">Waiter <span className="text-love">Terminal</span></h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Carga de puntos autorizada</p>
        </div>
      </div>

      {status && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={cn(
            "p-4 rounded-xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest",
            status.type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-love/10 text-love border border-love/20"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {status.message}
        </motion.div>
      )}

      <div className="bg-white rounded-[2rem] p-8 text-black shadow-bento flex flex-col justify-between border border-slate-200">
        <div className="mb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            Nueva Carga de Puntos
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">DNI Cliente</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="DNI del cliente..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-lg font-medium outline-none focus:border-love transition-all text-black placeholder:text-slate-300"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchClient()}
                  />
                </div>
                <button 
                  onClick={searchClient}
                  disabled={searching || !dni}
                  className="bg-black text-white px-6 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-30"
                >
                  {searching ? '...' : 'Buscar'}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {client ? (
                <motion.form 
                  key="client-found"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit}
                  className="space-y-6 pt-6 border-t border-slate-100"
                >
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-bold text-xl uppercase">
                      {client.full_name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{client.full_name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Saldo actual: {client.points} pts</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Monto ARS</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        placeholder="Ej: 15500"
                        required
                        min="1000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-8 pr-4 text-3xl font-black outline-none focus:border-love transition-all text-black"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-love/5 rounded-2xl p-4 border border-love/10 flex justify-between items-center text-love">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tighter opacity-70">Puntos a generar</p>
                      <p className="text-3xl font-black italic">
                        +{amount ? Math.floor(parseFloat(amount) / 1000) : 0}
                      </p>
                    </div>
                    <Receipt size={32} className="opacity-20" />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !amount}
                    className="w-full bg-love text-white rounded-2xl py-5 font-bold text-sm uppercase tracking-widest hover:bg-love/90 shadow-lg shadow-love/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                  >
                    {loading ? 'Fidelizando...' : (
                      <>
                        Procesar Carga
                        <PlusCircle size={20} className="group-hover:rotate-90 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                !searching && !status && (
                  <motion.div 
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 text-slate-200"
                  >
                    <Search size={64} className="mx-auto mb-4 opacity-30 stroke-[1]" />
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Listo para escanear DNI</p>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
