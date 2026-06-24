import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { notifyClient, checkLevelUp } from '@/src/lib/notify';
import { useAuth } from '@/src/App';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Receipt, PlusCircle, CheckCircle2, AlertCircle, QrCode, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Profile, SystemSettings } from '@/src/types';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useDesign } from '@/src/components/DesignEngine';

import { numberToWords } from '@/src/lib/numberToWords';

export function Waiter() {
  const { profile: waiterProfile } = useAuth();
  const { designConfig } = useDesign();

  // La vista del cajero siempre va en tono claro (nunca oscuro).
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    // Por si algún efecto global lo vuelve a poner, lo vigilamos brevemente.
    const obs = new MutationObserver(() => {
      if (root.classList.contains('dark')) root.classList.remove('dark');
    });
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  const [searchParams] = useSearchParams();
  const [dni, setDni] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [client, setClient] = useState<Profile | null>(null);
  const [clientTransactions, setClientTransactions] = useState<any[]>([]);
  const [deductingComboId, setDeductingComboId] = useState<string | null>(null);
  const [scannedComboId, setScannedComboId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Vista del cajero: 'carga' (cargar puntos) o 'movimientos' (lista con buscador)
  const [cashierView, setCashierView] = useState<'carga' | 'movimientos'>('carga');
  const [allMovements, setAllMovements] = useState<any[]>([]);
  const [movSearch, setMovSearch] = useState('');
  const [movLoading, setMovLoading] = useState(false);

  // Sucursales reales (del panel), solo las activas. active undefined = activa.
  const activeBranches = (designConfig.branches || []).filter(b => b.active !== false);

  // Cuando cargan las sucursales, preseleccionar la primera activa si no hay ninguna elegida.
  useEffect(() => {
    if (!selectedBranch && activeBranches.length > 0) {
      setSelectedBranch(activeBranches[0].name);
    }
  }, [activeBranches, selectedBranch]);

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
        scanner.render(async (decodedText: string) => {
          if (decodedText.startsWith('COMBO_USE:')) {
            const parts = decodedText.replace('COMBO_USE:', '').split('|client_id:');
            const comboId = parts[0];
            const clientId = parts[1];
            
            setShowScanner(false);
            scanner.clear();
            
            setDni(clientId);
            setScannedComboId(comboId);
            searchClient(clientId);
            return;
          }

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
        fetchClientTransactions(data.id);
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

  const fetchClientTransactions = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setClientTransactions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getClientCombos = () => {
    const avCombos = (designConfig as any)?.combos || [];
    const balances: Record<string, { title: string; totalPurchased: number; totalUsed: number; imageUrl?: string }> = {};

    clientTransactions.forEach((tx) => {
      if (tx.description && tx.description.startsWith('COMPRA_COMBO:')) {
        const parts = tx.description.replace('COMPRA_COMBO:', '').trim().split('|');
        const comboPart = parts[0]; 
        const title = parts[1] || 'Combo';
        const lastUnderscore = comboPart.lastIndexOf('_');
        if (lastUnderscore !== -1) {
          const id = comboPart.slice(0, lastUnderscore);
          const uses = parseInt(comboPart.slice(lastUnderscore + 1)) || 0;
          
          if (!balances[id]) {
            const matchedMeta = avCombos.find((c: any) => c.id === id);
            balances[id] = { title, totalPurchased: 0, totalUsed: 0, imageUrl: matchedMeta?.imageUrl };
          }
          balances[id].totalPurchased += uses;
        }
      } else if (tx.description && tx.description.startsWith('CONSUMO_COMBO:')) {
        const parts = tx.description.replace('CONSUMO_COMBO:', '').trim().split('|');
        const comboPart = parts[0]; 
        const title = parts[1] || 'Combo';
        const lastUnderscore = comboPart.lastIndexOf('_');
        if (lastUnderscore !== -1) {
          const id = comboPart.slice(0, lastUnderscore);
          const uses = parseInt(comboPart.slice(lastUnderscore + 1)) || 0;
          
          if (!balances[id]) {
            const matchedMeta = avCombos.find((c: any) => c.id === id);
            balances[id] = { title, totalPurchased: 0, totalUsed: 0, imageUrl: matchedMeta?.imageUrl };
          }
          balances[id].totalUsed += uses;
        }
      }
    });

    return Object.entries(balances)
      .map(([id, item]) => ({
        id,
        title: item.title,
        totalPurchased: item.totalPurchased,
        totalUsed: item.totalUsed,
        imageUrl: item.imageUrl,
        remaining: Math.max(0, item.totalPurchased - item.totalUsed),
      }))
      .filter(b => b.totalPurchased > 0);
  };

  const getClientActiveTier = (clientObj: Profile, txsList: any[]) => {
    // Calc total historical points ever loaded
    const totalPuntosCargados = txsList
      .filter(t => t.points_earned > 0)
      .reduce((sum, tx) => sum + tx.points_earned, 0);
    const rawPuntosCargados = Math.max(clientObj.points || 0, totalPuntosCargados);

    // Calc inactivity
    const creditTxs = txsList.filter(t => t.points_earned > 0);
    let daysSinceLastCredit = 999;
    if (creditTxs.length > 0) {
      const lastTx = creditTxs.reduce((latest: any, current: any) => {
        return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
      });
      const lastDate = new Date(lastTx.created_at);
      const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
      daysSinceLastCredit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } else if (clientObj.created_at) {
      const regDate = new Date(clientObj.created_at);
      const diffTime = Math.abs(new Date().getTime() - regDate.getTime());
      daysSinceLastCredit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    const inactivityLimit = designConfig?.categoryInactivityDays || 60;
    const isCategoryReset = daysSinceLastCredit > inactivityLimit;
    const categoryPoints = isCategoryReset ? 0 : rawPuntosCargados;

    const tiers = designConfig?.loyaltyTiers || [
      { id: 'tier-fan', name: 'CRAFT FAN', minPoints: 1, maxPoints: 499, multiplier: 1.0, benefits: "Acceso a Club Craft." },
      { id: 'tier-gold', name: 'CRAFT GOLD', minPoints: 500, maxPoints: 999, multiplier: 1.5, benefits: "Multiplicador de puntos x1.5" },
      { id: 'tier-black', name: 'CRAFT BLACK', minPoints: 1000, maxPoints: 999999, multiplier: 2.0, benefits: "Multiplicador de puntos x2.0" }
    ];

    let multiplier = 1.0;
    let name = 'CRAFT FAN';
    const sortedTiers = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
    for (const tier of sortedTiers) {
      if (categoryPoints >= tier.minPoints) {
        multiplier = tier.multiplier;
        name = tier.name;
        break;
      }
    }

    return { multiplier, name, categoryPoints, daysSinceLastCredit, isCategoryReset };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !amount || !waiterProfile) return;
    
    if (!invoiceNumber.trim()) {
      setStatus({ type: 'error', message: 'El número de factura es obligatorio.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    const conversionRate = settings?.points_conversion_rate || 1000;
    const amountNum = parseFloat(amount);
    
    if (amountNum < conversionRate) {
      setStatus({ type: 'error', message: `El monto debe ser al menos $${conversionRate.toLocaleString('es-AR')}` });
      setLoading(false);
      return;
    }

    const activeTier = getClientActiveTier(client, clientTransactions);
    const pointsToAdd = Math.floor((amountNum / conversionRate) * activeTier.multiplier);
    const label = `${activeTier.name} (x${activeTier.multiplier})`;

    try {
      console.log("Starting transaction for client:", client.id, "by waiter:", waiterProfile.id);
      
      const { data: txData, error: txError } = await supabase.from('transactions').insert({
        client_id: client.id,
        waiter_id: waiterProfile.id,
        amount: amountNum,
        points_earned: pointsToAdd,
        branch: selectedBranch,
        invoice_number: invoiceNumber || null,
        description: `Consumo ${selectedBranch} - $${amountNum.toLocaleString('es-AR')}${invoiceNumber ? ` (Fact: ${invoiceNumber})` : ''}${label ? ` - Cat: ${label}` : ''}`
      }).select().single();

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

      // Aviso automático al cliente (campanita + email)
      notifyClient({
        clientId: client.id,
        clientEmail: (client as any).email,
        title: '¡Sumaste puntos en CRAFT!',
        message: `Acabás de sumar ${pointsToAdd} puntos por tu consumo de $${amountNum.toLocaleString('es-AR')} en ${selectedBranch}. ¡Gracias por elegirnos!`
      });

      // ¿Subió de categoría con esta carga?
      const oldPts = client.points || 0;
      const newPts = oldPts + pointsToAdd;
      const tiers = (designConfig?.loyaltyTiers || []).map((t: any) => ({ name: t.name, minPoints: t.minPoints }));
      const levelCfg = (designConfig as any)?.autoNotif?.levelUp;
      checkLevelUp({
        client: { id: client.id, full_name: client.full_name, email: (client as any).email, points: newPts },
        oldPoints: oldPts,
        newPoints: newPts,
        tiers,
        cfg: levelCfg
      }).then(async (gift) => {
        if (gift > 0) {
          // Sumamos el regalo al saldo (la transacción ya quedó registrada)
          await supabase.from('profiles').update({ points: newPts + gift }).eq('id', client.id);
        }
      });

      setStatus({ 
        type: 'success', 
        message: `¡Éxito! +${pointsToAdd} pts para ${client.full_name}.` 
      });
      
      setClient(null);
      setDni('');
      setAmount('');
      setInvoiceNumber('');
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

  // Carga los movimientos (transacciones) junto con datos del cliente,
  // para que el cajero pueda buscarlos por nombre, DNI o email.
  const fetchAllMovements = async () => {
    setMovLoading(true);
    try {
      const { data: txs, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, dni, email');
      const profById: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profById[p.id] = p; });

      const enriched = (txs || []).map((tx: any) => ({
        ...tx,
        _client: profById[tx.client_id] || null
      }));
      setAllMovements(enriched);
    } catch (e) {
      console.warn('Error cargando movimientos:', e);
    } finally {
      setMovLoading(false);
    }
  };

  useEffect(() => {
    if (cashierView === 'movimientos' && allMovements.length === 0) {
      fetchAllMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashierView]);

  const filteredMovements = allMovements.filter((m) => {
    const q = movSearch.toLowerCase().trim();
    if (!q) return true;
    const c = m._client;
    if (!c) return false;
    return (c.full_name || '').toLowerCase().includes(q) ||
      (c.dni || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q);
  });

  const movType = (desc: string, pts: number) => {
    const d = (desc || '').toUpperCase();
    if (d.startsWith('CANJE:')) return { label: 'Canje', color: 'text-red-500' };
    if (d.startsWith('COMPRA_COMBO:')) return { label: 'Compra', color: 'text-amber-600' };
    if (d.startsWith('CONSUMO_COMBO:')) return { label: 'Uso de Pase', color: 'text-slate-500' };
    if (pts > 0) return { label: 'Carga', color: 'text-emerald-600' };
    return { label: 'Movimiento', color: 'text-slate-500' };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6 pt-4 px-2"
    >
      <div className="flex items-center justify-between mb-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-love rounded-lg flex items-center justify-center font-bold text-lg md:text-xl uppercase shadow-lg shadow-love/30 text-white">C</div>
          <div>
            <h2 className="text-base md:text-lg font-black tracking-tighter uppercase leading-none text-ink">Caja <span className="text-love">CRAFT</span></h2>
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 mt-1 font-bold">{cashierView === 'carga' ? 'Suma puntos a clientes' : 'Historial de movimientos'}</p>
          </div>
        </div>
        {cashierView === 'carga' && (
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
        )}
      </div>

      {/* Pestañas: Cargar puntos / Movimientos */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => setCashierView('carga')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none",
            cashierView === 'carga' ? "bg-love text-white shadow-md shadow-love/25" : "bg-transparent text-slate-400 hover:text-ink"
          )}
        >
          Cargar Puntos
        </button>
        <button
          onClick={() => setCashierView('movimientos')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none",
            cashierView === 'movimientos' ? "bg-love text-white shadow-md shadow-love/25" : "bg-transparent text-slate-400 hover:text-ink"
          )}
        >
          Movimientos
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

      {cashierView === 'carga' && (<>
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
                      {(() => {
                        const tierName = getClientActiveTier(client, clientTransactions).name;
                        const styles: Record<string, string> = {
                          'CRAFT FAN': 'bg-slate-200 text-slate-600',
                          'CRAFT GOLD': 'bg-amber-100 text-amber-700',
                          'CRAFT BLACK': 'bg-black text-white'
                        };
                        return (
                          <span className={cn(
                            "inline-block mt-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            styles[tierName] || 'bg-slate-200 text-slate-600'
                          )}>
                            {tierName}
                          </span>
                        );
                      })()}
                    </div>
                    <button 
                      type="button"
                      onClick={() => { setClient(null); setDni(''); setStatus(null); }}
                      className="p-2 text-slate-300 hover:text-love transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Combos/Abonos Prepago del Cliente */}
                  {(() => {
                    const clientCombos = getClientCombos();
                    if (clientCombos.length === 0) return null;
                    return (
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                        <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 pl-1">
                          🎁 Combos & Pases Prepago del Cliente
                        </h4>
                        <div className="space-y-3">
                          {clientCombos.map((combo) => (
                            <div key={combo.id} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs">
                              <div className="flex items-center gap-3">
                                {combo.imageUrl ? (
                                  <img src={combo.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-150 dark:bg-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-350 text-xs">Abo</div>
                                )}
                                <div className="space-y-0.5 text-left">
                                  <p className="text-[11px] font-black uppercase text-ink dark:text-white leading-tight">{combo.title}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Quedan {combo.remaining} consumos de {combo.totalPurchased}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={combo.remaining <= 0 || deductingComboId === combo.id}
                                onClick={async () => {
                                  if (confirm(`¿Confirmas descontar 1 uso de "${combo.title}" del saldo del cliente?`)) {
                                    setDeductingComboId(combo.id);
                                    try {
                                      const { error } = await supabase.from('transactions').insert({
                                        client_id: client.id,
                                        waiter_id: waiterProfile?.id || client.id,
                                        amount: 0,
                                        points_earned: 0,
                                        branch: selectedBranch || 'Sucursal Principal',
                                        description: `CONSUMO_COMBO: ${combo.id}_1|${combo.title}`
                                      });

                                      if (!error) {
                                        setStatus({ type: 'success', message: `¡Consumo validado! Descontando 1 uso de "${combo.title}" con éxito.` });
                                        notifyClient({
                                          clientId: client.id,
                                          clientEmail: (client as any).email,
                                          title: 'Usaste un consumo de tu combo',
                                          message: `Se descontó 1 uso de "${combo.title}". Te quedan ${Math.max(0, (combo.remaining || 1) - 1)} consumos disponibles.`
                                        });
                                        fetchClientTransactions(client.id);
                                      } else {
                                        alert("Error al descontar consumo: " + error.message);
                                      }
                                    } catch (err: any) {
                                      console.error(err);
                                    } finally {
                                      setDeductingComboId(null);
                                    }
                                  }
                                }}
                                className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-20 transition-all cursor-pointer border-none shadow-sm flex items-center gap-1.5"
                              >
                                {deductingComboId === combo.id ? 'Procesando...' : 'Descontar 1'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-4 pt-4 border-t-2 border-dashed border-slate-100">
                    <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Sucursal de Carga</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {activeBranches.length === 0 ? (
                        <p className="col-span-full text-[9px] text-slate-400 font-bold uppercase tracking-widest">No hay sucursales activas. Configurá una en el panel de administración.</p>
                      ) : activeBranches.map(branch => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => setSelectedBranch(branch.name)}
                          className={cn(
                            "py-3 px-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border-2",
                            selectedBranch === branch.name 
                              ? "bg-love border-love text-white shadow-lg shadow-love/20" 
                              : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          {branch.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center pl-2">
                      <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto consumo</label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-xl md:text-2xl font-black text-slate-300">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        required
                        autoFocus
                        className="w-full bg-slate-100 border-none rounded-xl md:rounded-2xl py-4 md:py-8 pl-10 md:pl-12 pr-4 md:pr-6 text-3xl md:text-5xl font-black outline-none focus:ring-4 focus:ring-love/10 transition-all text-black text-center"
                        value={amount ? parseFloat(amount).toLocaleString('es-AR') : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setAmount(val);
                        }}
                      />
                    </div>
                    {amount && !isNaN(parseFloat(amount)) && (
                      <div className="mt-2 text-center animate-in fade-in slide-in-from-top-1 duration-300">
                        <p className="text-[11px] md:text-sm font-black text-ink uppercase italic">
                          ${parseFloat(amount).toLocaleString('es-AR')}
                          <span className="text-love ml-2 font-bold tracking-tight">
                            ({numberToWords(Math.floor(parseFloat(amount)))})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Número de Factura <span className="text-love">*</span></label>
                    <input
                      required
                      placeholder="Ej: 0001-00004567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink font-bold transition-all"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                  </div>

                  <div className="bg-love/5 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 text-love border-2 border-love/5 flex justify-between items-center group">
                    <div>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Puntos a Asignar</p>
                      {(() => {
                        const activeTier = getClientActiveTier(client, clientTransactions);
                        const calculated = amount ? Math.floor((parseFloat(amount) / (settings?.points_conversion_rate || 1000)) * activeTier.multiplier) : 0;
                        return (
                          <>
                            <p className="text-4 shadow-sm font-black italic text-4xl md:text-5xl">
                              +{calculated}
                            </p>
                            {activeTier.multiplier > 1 && (
                              <p className="text-[8px] md:text-[9px] font-extrabold uppercase bg-love text-white px-2 py-0.5 rounded-full inline-block mt-1 tracking-wider">
                                Multiplicador {activeTier.name} (x{activeTier.multiplier})
                              </p>
                            )}
                          </>
                        );
                      })()}
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
      </>)}

      {/* Vista de Movimientos con buscador */}
      {cashierView === 'movimientos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, DNI o email..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs outline-none focus:border-love text-ink font-bold"
                value={movSearch}
                onChange={(e) => setMovSearch(e.target.value)}
              />
            </div>
          </div>

          {movLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-love border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-4">Cargando movimientos...</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                {movSearch ? 'No se encontraron movimientos para esa búsqueda' : 'No hay movimientos'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {filteredMovements.slice(0, 100).map((m) => {
                const t = movType(m.description, m.points_earned || 0);
                const d = new Date(m.created_at);
                return (
                  <div key={m.id} className="px-4 py-3 border-b border-slate-50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-ink truncate">{m._client?.full_name || 'Cliente'}</p>
                      <p className="text-[9px] text-slate-400 font-bold">
                        DNI {m._client?.dni || 's/d'} · {d.toLocaleDateString('es-AR')} {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {m.branch && <p className="text-[8px] uppercase tracking-widest text-slate-300 font-bold mt-0.5">{m.branch}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("text-[8px] uppercase font-black tracking-widest", t.color)}>{t.label}</span>
                      <p className={cn("text-sm font-black font-mono", (m.points_earned || 0) < 0 ? "text-red-500" : "text-emerald-600")}>
                        {(m.points_earned || 0) > 0 ? '+' : ''}{(m.points_earned || 0).toLocaleString('es-AR')} pts
                      </p>
                    </div>
                  </div>
                );
              })}
              {filteredMovements.length > 100 && (
                <p className="text-center py-3 text-[9px] uppercase tracking-widest text-slate-400 font-bold">Mostrando primeros 100 resultados</p>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
