import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/App';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Receipt, PlusCircle, CheckCircle2, AlertCircle, QrCode, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Profile } from '@/src/types';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function Waiter() {
  const { profile: waiterProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [dni, setDni] = useState('');
  const [amount, setAmount] = useState('');
  const [client, setClient] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    let dniParam = searchParams.get('dni');
    if (dniParam) {
      // Si el parámetro parece ser una URL completa (a veces pasa por redirección o copiado)
      if (dniParam.includes('dni=')) {
        dniParam = dniParam.split('dni=')[1].split('&')[0];
      }
      setDni(dniParam);
    }
    
    let scanner: any = null;
    if (showScanner) {
      setTimeout(() => {
        scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
        scanner.render((decodedText: string) => {
          let cleanDni = decodedText;
          if (cleanDni.includes('dni=')) {
            cleanDni = cleanDni.split('dni=')[1].split('&')[0];
          }
          setDni(cleanDni);
          setShowScanner(false);
          scanner.clear();
        }, (error: any) => {});
      }, 100);
    }
    return () => {
      if (scanner) {
        try { scanner.clear(); } catch(e) {}
      }
    };
  }, [showScanner, searchParams]);

  useEffect(() => {
    // Solo buscamos si el DNI tiene una longitud razonable
    if (dni && dni.length >= 4) {
      // Limpieza preventiva si el usuario pega la URL manualmente
      let finalDni = dni;
      if (finalDni.includes('dni=')) {
        finalDni = finalDni.split('dni=')[1].split('&')[0];
        setDni(finalDni);
        return;
      }
      searchClient();
    }
  }, [dni]);

  const searchClient = async () => {
    if (!dni || dni.includes('http')) return; // No buscamos si parece una URL incompleta todavía
    setSearching(true);
    setClient(null);
    setStatus(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`dni.eq.${dni},id.eq.${dni}`)
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
      const { error: txError } = await supabase.from('transactions').insert({
        client_id: client.id,
        waiter_id: waiterProfile.id,
        amount: amountNum,
        points_earned: pointsToAdd,
        description: `Consumo Resto - $${amountNum.toLocaleString('es-AR')}`
      });

      if (txError) throw txError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: client.points + pointsToAdd })
        .eq('id', client.id);

      if (updateError) throw updateError;

      setStatus({ 
        type: 'success', 
        message: `¡Éxito! +${pointsToAdd} pts para ${client.full_name}.` 
      });
      
      setClient(null);
      setDni('');
      setAmount('');
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Error procesando carga' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6 pt-4 px-2"
    >
      <div className="flex items-center justify-between mb-4 bg-ash p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 shadow-bento">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-love rounded-lg flex items-center justify-center font-bold text-lg md:text-xl uppercase shadow-lg shadow-love/30">M</div>
          <div>
            <h2 className="text-base md:text-lg font-bold tracking-tight uppercase leading-none">Carga <span className="text-love">Mozo</span></h2>
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-500 mt-1">Suma puntos a clientes</p>
          </div>
        </div>
        <button 
          onClick={() => setShowScanner(!showScanner)}
          className={cn(
            "p-2 md:p-3 rounded-xl md:rounded-2xl transition-all border flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest",
            showScanner ? "bg-love border-love text-white" : "bg-white/5 border-white/10 text-white/60 hover:text-white"
          )}
        >
          {showScanner ? <X size={16} /> : <QrCode size={16} />}
          <span className="hidden xs:inline">{showScanner ? 'Cerrar' : 'Escanear'}</span>
        </button>
      </div>

      <AnimatePresence>
        {showScanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black rounded-3xl overflow-hidden border-2 border-love shadow-2xl mb-6"
          >
            <div id="reader" className="w-full"></div>
            <div className="p-4 text-center text-[10px] uppercase font-bold text-love animate-pulse">Buscando código del cliente...</div>
          </motion.div>
        )}
      </AnimatePresence>

      {status && (
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            "p-5 rounded-2xl flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest mb-6",
            status.type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-love/10 text-love border border-love/20"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {status.message}
        </motion.div>
      )}

      <div className="bg-white rounded-[2.5rem] p-8 text-black shadow-2xl flex flex-col justify-between border-b-8 border-slate-200">
        <div className="mb-2">
          <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 mb-8 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-love"></div>
            Identificación de Cliente
          </h2>
          
          <div className="space-y-4 md:space-y-8">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  placeholder="DNI del cliente..."
                  className="w-full bg-slate-100 border-none rounded-xl md:rounded-2xl py-3 md:py-5 pl-11 md:pl-14 pr-4 text-xl md:text-2xl font-black outline-none focus:ring-2 focus:ring-love transition-all text-black placeholder:text-slate-200"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {client ? (
                <motion.form 
                  key="client-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onSubmit={handleSubmit}
                  className="space-y-8 pt-8 border-t-2 border-dashed border-slate-100"
                >
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-black text-xl uppercase">
                      {client.full_name[0]}
                    </div>
                    <div>
                      <p className="font-black text-base uppercase tracking-tight leading-none mb-1">{client.full_name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Saldo: <span className="text-love italic">{client.points} PTS</span></p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Monto consumo</label>
                    <div className="relative">
                      <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-xl md:text-2xl font-black text-slate-300">$</span>
                      <input
                        type="number"
                        placeholder="Monto ARS"
                        required
                        min="1000"
                        autoFocus
                        className="w-full bg-slate-100 border-none rounded-xl md:rounded-2xl py-4 md:py-8 pl-10 md:pl-12 pr-4 md:pr-6 text-3xl md:text-5xl font-black outline-none focus:ring-4 focus:ring-love/10 transition-all text-black text-center"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-love/5 rounded-[2rem] p-6 text-love border-2 border-love/10 flex justify-between items-center group">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Puntos hoy</p>
                      <p className="text-5xl font-black italic">
                        +{amount ? Math.floor(parseFloat(amount) / 1000) : 0}
                      </p>
                    </div>
                    <Receipt size={64} className="opacity-10 group-hover:scale-110 transition-transform" />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !amount}
                    className="w-full bg-love text-white rounded-[2rem] py-6 font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-love/20 active:scale-[0.98] transition-all disabled:opacity-20"
                  >
                    {loading ? 'Fidelizando...' : 'confirmar y Cargar'}
                  </button>
                </motion.form>
              ) : (
                !searching && !status && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <p className="text-[9px] uppercase font-black tracking-[0.4em] text-slate-200">Identifica un Cliente</p>
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
