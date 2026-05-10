import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/App';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Receipt, PlusCircle, CheckCircle2, AlertCircle, QrCode, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Profile, SystemSettings } from '@/src/types';
import { BRANCHES } from '@/src/constants';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function Waiter() {
  const { profile: waiterProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [dni, setDni] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0]);
  const [client, setClient] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
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
    // Solo buscamos automáticamente si el DNI tiene una longitud razonable (ej. 7 o más para DNI argentino)
    // No disparamos si tiene espacios o caracteres no válidos
    if (dni && dni.length >= 7 && /^\d+$/.test(dni)) {
      const timer = setTimeout(() => {
        searchClient();
      }, 700); // 700ms de debounce
      return () => clearTimeout(timer);
    }
  }, [dni]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // Fallback or default
        setSettings({ id: 'default', points_conversion_rate: 1000, updated_at: '' });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const searchClient = async (dniToSearch?: string) => {
    const searchDni = (dniToSearch || dni).trim();
    if (!searchDni || searchDni.length < 3) return; 
    
    setSearching(true);
    setClient(null);
    setStatus(null);
    
    // Safety timeout to prevent UI hanging
    const safetyTimeout = setTimeout(() => {
      setSearching(false);
      setStatus({ type: 'error', message: 'Tiempo de espera agotado. Reintenta.' });
    }, 10000);
    
    try {
      // 1. Buscamos por DNI exacto
      console.log("Searching by DNI:", searchDni);
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('dni', searchDni)
        .maybeSingle();
      
      clearTimeout(safetyTimeout);
      if (error) throw error;

      // 2. Si no hay por DNI, probamos por ID (por si escanea el ID de Supabase)
      if (!data) {
        console.log("Not found by DNI, trying by ID...");
        const { data: dataById, error: errorById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', searchDni)
          .maybeSingle();
        
        if (errorById) throw errorById;
        data = dataById;
      }
      
      if (data) {
        setClient(data);
        setStatus(null);
      } else {
        setClient(null);
        setStatus({ type: 'error', message: 'Cliente no registrado en la base' });
      }
    } catch (err: any) {
      console.error("Critical Search Error:", err);
      setClient(null);
      setStatus({ 
        type: 'error', 
        message: err.message || 'Error de conexión con el servidor.'
      });
    } finally {
      clearTimeout(safetyTimeout);
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !amount || !waiterProfile) return;
    
    setLoading(true);
    setStatus(null);

    const conversionRate = settings?.points_conversion_rate || 1000;
    const amountNum = parseFloat(amount);
    const pointsToAdd = Math.floor(amountNum / conversionRate);

    if (pointsToAdd <= 0) {
      setStatus({ type: 'error', message: `El monto debe ser al menos $${conversionRate.toLocaleString('es-AR')}` });
      setLoading(false);
      return;
    }

    try {
      console.log("Starting transaction for client:", client.id, "by waiter:", waiterProfile.id);
      
      const { error: txError } = await supabase.from('transactions').insert({
        client_id: client.id,
        waiter_id: waiterProfile.id,
        amount: amountNum,
        points_earned: pointsToAdd,
        branch: selectedBranch,
        description: `Consumo ${selectedBranch} - $${amountNum.toLocaleString('es-AR')}`
      });

      if (txError) {
        console.error("DEBUG - Transaction Error:", txError);
        // Manejo específico de RLS
        if (txError.code === '42501') {
          throw new Error('Permiso Denegado (RLS): El sistema no permite que este Mozo guarde transacciones en la base de datos.');
        }
        throw new Error(`Error en transacción: ${txError.message || txError.code}`);
      }

      console.log("Transaction saved, now updating profile points...");

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: (client.points || 0) + pointsToAdd })
        .eq('id', client.id);

      if (updateError) {
        console.error("DEBUG - Profile Update Error:", updateError);
        // Manejo específico de RLS
        if (updateError.code === '42501' || updateError.message?.includes('RLS')) {
          throw new Error('Permiso Denegado (RLS): Los mozos no tienen permiso para actualizar el saldo directo de los clientes. Revisa las políticas de Supabase.');
        }
        throw new Error(`Error actualizando saldo: ${updateError.message || updateError.code}`);
      }

      console.log("Points updated successfully!");

      setStatus({ 
        type: 'success', 
        message: `¡Éxito! +${pointsToAdd} pts para ${client.full_name}.` 
      });
      
      setClient(null);
      setDni('');
      setAmount('');
    } catch (err: any) {
      console.error("DEBUG - Full Submit Error Trace:", err);
      setStatus({ 
        type: 'error', 
        message: err.message || 'Error desconocido al procesar la carga.' 
      });
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
      <div className="flex items-center justify-between mb-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-love rounded-lg flex items-center justify-center font-bold text-lg md:text-xl uppercase shadow-lg shadow-love/30 text-white">M</div>
          <div>
            <h2 className="text-base md:text-lg font-black tracking-tighter uppercase leading-none text-ink">Carga <span className="text-love">Mozo</span></h2>
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">Suma puntos a clientes</p>
          </div>
        </div>
        <button 
          onClick={() => setShowScanner(!showScanner)}
          className={cn(
            "p-2 md:p-3 rounded-xl md:rounded-2xl transition-all border flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest",
            showScanner ? "bg-love border-love text-white" : "bg-slate-100 border-slate-200 text-slate-400 hover:text-ink hover:bg-slate-200 shadow-sm"
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
            "p-4 rounded-xl flex items-center gap-3 text-[9px] font-black uppercase tracking-widest mb-4",
            status.type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-love/10 text-love border border-love/20"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {status.message}
        </motion.div>
      )}

      <div className="bg-white rounded-[2rem] p-6 md:p-8 text-ink shadow-xl shadow-slate-200/50 flex flex-col justify-between border-slate-100 border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-love/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="mb-2 relative">
          <h2 className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 md:mb-8 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-love"></div>
            Identificación de Cliente
          </h2>
          
          <div className="space-y-4 md:space-y-8">
            <div className="space-y-2">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="Escribir DNI..."
                    className="w-full bg-slate-100 border-none rounded-xl md:rounded-2xl py-3 md:py-5 pl-11 md:pl-14 pr-4 text-xl md:text-2xl font-black outline-none focus:ring-2 focus:ring-love transition-all text-black placeholder:text-slate-200"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchClient(dni);
                      }
                    }}
                  />
                  {searching && (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-love border-t-transparent rounded-full"
                    />
                  )}
                </div>
                <button 
                  onClick={() => searchClient(dni)}
                  disabled={searching || !dni}
                  className="bg-love text-white px-4 md:px-6 rounded-xl md:rounded-2xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  Buscar
                </button>
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
                  {/* ... client info ... */}
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-black text-xl uppercase">
                      {client.full_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-base uppercase tracking-tight leading-none mb-1">{client.full_name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest text-wrap">DNI: {client.dni}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Saldo: <span className="text-love italic">{client.points.toLocaleString()} PTS</span></p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => { setClient(null); setDni(''); setStatus(null); }}
                      className="p-2 text-slate-300 hover:text-love transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4 pt-4 border-t-2 border-dashed border-slate-100">
                    <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Sucursal de Carga</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {BRANCHES.map(branch => (
                        <button
                          key={branch}
                          type="button"
                          onClick={() => setSelectedBranch(branch)}
                          className={cn(
                            "py-3 px-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border-2",
                            selectedBranch === branch 
                              ? "bg-love border-love text-white shadow-lg shadow-love/20" 
                              : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          {branch}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Monto consumo</label>
                    <div className="relative">
                      <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-xl md:text-2xl font-black text-slate-300">$</span>
                      <input
                        type="number"
                        placeholder="Importe Consumido (Ej. 15000)"
                        required
                        min="100"
                        autoFocus
                        className="w-full bg-slate-100 border-none rounded-xl md:rounded-2xl py-4 md:py-8 pl-10 md:pl-12 pr-4 md:pr-6 text-3xl md:text-5xl font-black outline-none focus:ring-4 focus:ring-love/10 transition-all text-black text-center"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-love/5 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 text-love border-2 border-love/5 flex justify-between items-center group">
                    <div>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Puntos a Asignar</p>
                      <p className="text-4xl md:text-5xl font-black italic">
                        +{amount ? Math.floor(parseFloat(amount) / (settings?.points_conversion_rate || 1000)) : 0}
                      </p>
                    </div>
                    <Receipt size={48} className="opacity-10 group-hover:scale-110 transition-transform md:size-16" />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !amount}
                    className="w-full bg-love text-white rounded-[1.5rem] md:rounded-[2rem] py-4 md:py-6 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-red active:scale-[0.98] transition-all disabled:opacity-20"
                  >
                    {loading ? 'Procesando Carga...' : 'Cargar Puntos al Cliente'}
                  </button>
                </motion.form>
              ) : (
                <div className="flex flex-col items-center">
                  <motion.div 
                    key="no-client"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 md:py-16"
                  >
                    <p className="text-[9px] uppercase font-black tracking-[0.4em] text-slate-200">
                      {searching ? 'Buscando Cliente...' : (status ? status.message : 'Identifica un Cliente')}
                    </p>
                  </motion.div>
                  {!searching && !client && (
                     <button
                      onClick={() => {
                        if (waiterProfile) {
                          setDni(waiterProfile.dni || waiterProfile.id);
                          searchClient(waiterProfile.dni || waiterProfile.id);
                        }
                      }}
                      className="text-[8px] font-black uppercase tracking-widest text-slate-300 hover:text-love transition-colors"
                    >
                      Autocargar (Probar con mi perfil)
                    </button>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
