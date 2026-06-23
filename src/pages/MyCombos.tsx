import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/App';
import { useDesign } from '@/src/components/DesignEngine';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Check, ArrowRight, Sparkles, X, QrCode, Ticket, ArrowLeft, Loader2, DollarSign, ShoppingCart } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Transaction } from '@/src/types';
import { cn } from '@/src/lib/utils';

export function MyCombos() {
  const { profile, refreshProfile, isSimulatingClient } = useAuth();
  const { designConfig, loading: designLoading } = useDesign();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Combos, Checkout and QR states
  const [selectedComboForPurchase, setSelectedComboForPurchase] = useState<any | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);
  const [activeQRCodeCombo, setActiveQRCodeCombo] = useState<any | null>(null);
  const [comboRedeeming, setComboRedeeming] = useState<string | null>(null);

  const fetchClientData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setTransactions(data);
        setLoading(false);
      } else if (error) {
        // Error de la base: no afirmamos "no hay combos"; reintentamos en breve.
        console.warn("Error al cargar combos, reintentando:", error);
        setTimeout(fetchClientData, 2000);
      }
    } catch (e) {
      console.warn("Error de red al cargar combos, reintentando:", e);
      setTimeout(fetchClientData, 2000);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchClientData();
    }
  }, [profile]);

  const getCombinedTransactions = () => {
    if (!profile) return [];
    // Solo la base es la fuente de verdad: evita duplicar usos de combos.
    return transactions;
  };

  // Devuelve true si una compra (fecha) ya pasó su plazo de días.
  // Usa fechas locales a nivel de día para no correrse por zona horaria.
  const isPurchaseExpired = (purchaseDate: string, days: number): boolean => {
    const d = new Date(purchaseDate);
    if (isNaN(d.getTime())) return false;
    const limit = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today > limit;
  };

  const calculateComboBalances = (txList: Transaction[], availableCombos: any[]) => {
    const balances: Record<string, { title: string; totalPurchased: number; totalUsed: number; imageUrl?: string; price: number }> = {};

    txList.forEach((tx) => {
      if (tx.description && tx.description.startsWith('COMPRA_COMBO:')) {
        const parts = tx.description.replace('COMPRA_COMBO:', '').trim().split('|');
        const comboPart = parts[0]; 
        const title = parts[1] || 'Combo';
        const lastUnderscore = comboPart.lastIndexOf('_');
        if (lastUnderscore !== -1) {
          const id = comboPart.slice(0, lastUnderscore);
          const uses = parseInt(comboPart.slice(lastUnderscore + 1)) || 0;

          // Vencimiento: si la compra ya venció, sus usos no cuentan.
          const matchedMeta = availableCombos.find(c => c.id === id);
          const expDays = (matchedMeta && (matchedMeta as any).expirationDays) || 30;
          if (tx.created_at && isPurchaseExpired(tx.created_at, expDays)) {
            return; // compra vencida: no suma usos
          }

          if (!balances[id]) {
            balances[id] = { 
              title, 
              totalPurchased: 0, 
              totalUsed: 0, 
              imageUrl: matchedMeta?.imageUrl,
              price: matchedMeta?.price || 0 
            };
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
            const matchedMeta = availableCombos.find(c => c.id === id);
            balances[id] = { 
              title, 
              totalPurchased: 0, 
              totalUsed: 0, 
              imageUrl: matchedMeta?.imageUrl,
              price: matchedMeta?.price || 0 
            };
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
        price: item.price,
        remaining: Math.max(0, item.totalPurchased - item.totalUsed),
      }))
      .filter(b => b.totalPurchased > 0);
  };

  const handlePayWithMercadoPago = async (combo: any) => {
    if (!profile) return;
    setIsCreatingPreference(true);
    try {
      const response = await fetch("/api/mercadopago/preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          combo,
          client_id: profile.id,
          app_url: window.location.origin + "/#/my-combos"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText || "No se pudo iniciar el proceso de pago."}`);
      }

      const data = await response.json();
      if (data.init_point) {
        if (data.isSandboxDemo) {
          console.log("Modo Demo Sandbox activo - Redirigiendo a pasarela simulada");
        }
        window.location.href = data.init_point;
      } else {
        alert("Ocurrio un error: No se generó el punto de inicio de Mercado Pago.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error al conectar con Mercado Pago: " + e.message);
    } finally {
      setIsCreatingPreference(false);
    }
  };

  const handlePayWithMockCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedComboForPurchase) return;
    
    setPaymentProcessing(true);
    
    // Simulate payment delays
    await new Promise(r => setTimeout(r, 2005));

    try {
      const paymentId = 'card_sim_' + Math.random().toString(36).substr(2, 9);
      const fakePrice = selectedComboForPurchase.price;
      const fakeUses = selectedComboForPurchase.totalUses || 5;
      
      const conversionRate = (designConfig as any)?.points_conversion_rate || 1000;
      const bonusPoints = Math.floor(fakePrice / conversionRate);

      const newPurchaseTx = {
        id: 'tx_mp_' + paymentId,
        client_id: profile.id,
        waiter_id: profile.id,
        amount: fakePrice,
        points_earned: bonusPoints,
        branch: 'TARJETA ONLINE',
        invoice_number: 'PAGO_CC_' + paymentId.slice(-4).toUpperCase(),
        created_at: new Date().toISOString(),
        description: `COMPRA_COMBO: ${selectedComboForPurchase.id}_${fakeUses}|${selectedComboForPurchase.title}`
      };

      // Cache locally
      const existingStr = localStorage.getItem(`local_txs_${profile.id}`);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      existing.push(newPurchaseTx);
      localStorage.setItem(`local_txs_${profile.id}`, JSON.stringify(existing));

      // Push to Supabase
      await supabase.from('transactions').insert({
        client_id: profile.id,
        waiter_id: profile.id,
        amount: fakePrice,
        points_earned: bonusPoints,
        branch: 'VENTA TARJETA',
        invoice_number: newPurchaseTx.invoice_number,
        description: `COMPRA_COMBO: ${selectedComboForPurchase.id}_${fakeUses}|${selectedComboForPurchase.title}`
      });

      // Update points
      await supabase
        .from('profiles')
        .update({ points: (profile.points || 0) + bonusPoints })
        .eq('id', profile.id);

      if (refreshProfile) {
        await refreshProfile();
      }

      await fetchClientData();
      setIsCheckoutModalOpen(false);
      setSelectedComboForPurchase(null);
      setCardForm({ number: '', name: '', expiry: '', cvc: '' });

      alert(`🎉 ¡Pago procesado con éxito! El combo "${selectedComboForPurchase.title}" ya fue acreditado. Sumaste +${bonusPoints} puntos.`);
    } catch (err: any) {
      console.error(err);
      alert("Error al procesar el pago ficticio.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Process MP return
  useEffect(() => {
    if (!profile) return;

    const hashPart = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(hashPart || window.location.search);
    
    const paymentStatus = params.get('payment_status') || params.get('collection_status') || params.get('status');
    const comboId = params.get('combo_id');
    const comboTitle = params.get('combo_title') || 'Abono Adquirido';
    const totalUses = parseInt(params.get('totalUses') || '0') || 5;
    const price = parseFloat(params.get('price') || '0') || 0;
    const paymentId = params.get('payment_id') || params.get('preference_id') || ('sim_' + Date.now());

    if ((paymentStatus === 'success' || paymentStatus === 'approved') && comboId) {
      const processedKey = `processed_mp_tx_${paymentId}_${comboId}`;
      const isAlreadyProcessed = localStorage.getItem(processedKey);

      if (!isAlreadyProcessed) {
        localStorage.setItem(processedKey, 'true');
        
        const conversionRate = (designConfig as any)?.points_conversion_rate || 1000;
        const bonusPoints = Math.floor(price / conversionRate);
        
        const newPurchaseTx = {
          id: 'tx_mp_' + paymentId,
          client_id: profile.id,
          waiter_id: profile.id,
          amount: price,
          points_earned: bonusPoints,
          branch: 'MP ONLINE',
          invoice_number: 'PAGO_MP_' + paymentId.slice(-6),
          created_at: new Date().toISOString(),
          description: `COMPRA_COMBO: ${comboId}_${totalUses}|${comboTitle}`
        };

        const executeLogging = async () => {
          try {
            const existingStr = localStorage.getItem(`local_txs_${profile.id}`);
            const existing = existingStr ? JSON.parse(existingStr) : [];
            existing.push(newPurchaseTx);
            localStorage.setItem(`local_txs_${profile.id}`, JSON.stringify(existing));

            await supabase.from('transactions').insert({
              client_id: profile.id,
              waiter_id: profile.id,
              amount: price,
              points_earned: bonusPoints,
              branch: 'VENTA MERCADO PAGO',
              invoice_number: newPurchaseTx.invoice_number,
              description: `COMPRA_COMBO: ${comboId}_${totalUses}|${comboTitle}`
            });

            await supabase
              .from('profiles')
              .update({ points: (profile.points || 0) + bonusPoints })
              .eq('id', profile.id);

            if (refreshProfile) {
              await refreshProfile();
            }

            fetchClientData();
            
            const cleanHash = window.location.hash.split('?')[0];
            window.history.replaceState(null, '', window.location.pathname + cleanHash);
            
            alert(`🎉 ¡Gracias por tu compra! El combo "${comboTitle}" ha sido acreditado en tu cuenta con éxito. Sumaste +${bonusPoints} puntos.`);
          } catch(err) {
            console.error(err);
          }
        };

        executeLogging();
      }
    }
  }, [profile, transactions]);

  if (!profile || loading || designLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center min-h-[60vh]">
        <div className="relative w-28 h-20 mb-6 flex items-end justify-center">
          {/* Productos cayendo dentro del carrito */}
          {[0, 1].map((i) => (
            <motion.span
              key={i}
              className="absolute w-2.5 h-2.5 rounded-sm bg-love"
              style={{ left: `${42 + i * 12}%` }}
              animate={{ y: [-18, 6], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeIn", delay: i * 0.7 }}
            />
          ))}
          {/* Carrito que se desliza */}
          <motion.div
            animate={{ x: [-10, 10, -10] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ShoppingCart size={56} className="text-love" strokeWidth={2.5} />
          </motion.div>
        </div>
        <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter !text-slate-900">
          Cargando Combos
        </h2>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest">Espera un momento...</p>
      </div>
    );
  }

  const combinedTxs = getCombinedTransactions();
  const avCombos = (designConfig as any).combos || [];
  const activeCombos = calculateComboBalances(combinedTxs, avCombos);
  const activeCombosForSale = avCombos.filter((c: any) => c.isActive);

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-love rounded-2xl flex items-center justify-center text-white shadow-lg shadow-love/35">
          <Ticket size={20} />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase !text-slate-900 leading-none tracking-tight">Mis Combos</h2>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">Productos comprados, usos y Tienda CRAFT</p>
        </div>
      </div>

      {/* Mis Combos/Pases Activos */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider !text-slate-900">
            Productos Adquiridos
          </h3>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center text-slate-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : activeCombos.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <Ticket size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Aún no tienes combos activos</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Explora nuestras ofertas semanales abajo para ahorrar en comida y bebida.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCombos.map((combo) => {
              const perc = (combo.remaining / combo.totalPurchased) * 100;
              return (
                <div key={combo.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-4 group/pass">
                  <div className="flex gap-4">
                    {combo.imageUrl ? (
                      <img src={combo.imageUrl} alt={combo.title} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">Pase</div>
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h5 className="text-[11px] font-black uppercase text-black dark:text-white tracking-tight leading-none">{combo.title}</h5>
                        <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{combo.remaining} DISPONIBLES</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Abonados: {combo.totalPurchased} usos</p>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                          <span>Uso Consumido</span>
                          <span>{combo.totalPurchased - combo.remaining} de {combo.totalPurchased}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${perc}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveQRCodeCombo(combo)}
                      disabled={combo.remaining <= 0}
                      className="flex-1 py-2.5 bg-ink hover:bg-slate-950 text-white dark:bg-love rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none disabled:opacity-20 flex items-center justify-center gap-1.5 shadow-md shadow-slate-950/20"
                    >
                      📱 Usar Pase (QR)
                    </button>
                    {combo.remaining > 0 && (
                      <button
                        onClick={async () => {
                          if (confirm(`¿Quieres canjear/descontar un consumo de tu "${combo.title}" de forma directa para probar?`)) {
                            setComboRedeeming(combo.id);
                            try {
                              const newConsumeTx = {
                                id: 'tx_local_' + Date.now(),
                                client_id: profile.id,
                                waiter_id: profile.id,
                                amount: 0,
                                points_earned: 0,
                                branch: 'AUTOCANJE SMART',
                                created_at: new Date().toISOString(),
                                description: `CONSUMO_COMBO: ${combo.id}_1|${combo.title}`
                              };

                              const existingStr = localStorage.getItem(`local_txs_${profile.id}`);
                              const existing = existingStr ? JSON.parse(existingStr) : [];
                              existing.push(newConsumeTx);
                              localStorage.setItem(`local_txs_${profile.id}`, JSON.stringify(existing));

                              await supabase.from('transactions').insert({
                                client_id: profile.id,
                                waiter_id: profile.id,
                                amount: 0,
                                points_earned: 0,
                                branch: 'AUTOCANJE SMART',
                                description: `CONSUMO_COMBO: ${combo.id}_1|${combo.title}`
                              });

                              fetchClientData();
                              alert(`Consumo registrado correctamente. ¡Te quedan ${combo.remaining - 1} almuerzos!`);
                            } catch (err: any) {
                              console.error(err);
                            } finally {
                              setComboRedeeming(null);
                            }
                          }
                        }}
                        disabled={comboRedeeming === combo.id}
                        className="py-2.5 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none"
                      >
                        {comboRedeeming === combo.id ? 'Canjeando...' : 'Descontar 1 (Demo)'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ofertas de Combos / Pases Prepago */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-love animate-ping" />
          <h3 className="text-xs font-black uppercase tracking-wider !text-slate-900">
            Tienda CRAFT
          </h3>
        </div>

        {activeCombosForSale.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-400 font-bold uppercase tracking-widest">No hay ofertas publicadas para comprar por el momento.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeCombosForSale.map((combo: any) => (
              <div key={combo.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 group/item">
                <div className="flex items-center gap-4">
                  {combo.imageUrl ? (
                    <img src={combo.imageUrl} alt={combo.title} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">Abono</div>
                  )}
                  <div className="space-y-1 text-left">
                    <span className="text-[8px] bg-love/10 text-love px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{combo.totalUses} Abonos</span>
                    <h5 className="text-[11px] font-black uppercase text-black dark:text-white tracking-tight leading-none mt-1">{combo.title}</h5>
                    <p className="text-[9px] text-slate-400 font-semibold line-clamp-1 max-w-[150px]">{combo.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {(combo as any).normalPrice && (combo as any).normalPrice > combo.price && (
                    <p className="text-[9px] text-slate-400 font-bold line-through leading-none">${(combo as any).normalPrice.toLocaleString('es-AR')}</p>
                  )}
                  <p className="text-sm font-black text-love leading-none mt-0.5">${combo.price.toLocaleString('es-AR')}</p>
                  {(combo as any).normalPrice && (combo as any).normalPrice > combo.price && (
                    <p className="text-[7px] text-emerald-600 font-black uppercase tracking-wide mt-0.5">Ahorrás ${((combo as any).normalPrice - combo.price).toLocaleString('es-AR')}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedComboForPurchase(combo);
                      setIsCheckoutModalOpen(true);
                    }}
                    className="mt-2 py-2 px-3 bg-love text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-md shadow-love/10 active:scale-95 hover:bg-opacity-95"
                  >
                    💰 Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Combo Usage Modal */}
      <AnimatePresence>
        {activeQRCodeCombo && (
          <div 
            className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
            onClick={() => setActiveQRCodeCombo(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] w-full max-w-xs shadow-2xl relative flex flex-col items-center justify-center text-center"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveQRCodeCombo(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-ink dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 p-2 rounded-full cursor-pointer border-none"
              >
                <X size={14} />
              </button>
              
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                <Ticket size={24} />
              </div>
              
              <h4 className="text-sm font-black uppercase text-ink dark:text-white mt-1 leading-snug">{activeQRCodeCombo.title}</h4>
              <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{activeQRCodeCombo.remaining} consumos libres</p>
              
              <div className="qr-container p-4 bg-white rounded-2xl my-5 border-2 border-slate-50 shadow-inner flex items-center justify-center">
                <QRCode 
                  value={`COMBO_USE:${activeQRCodeCombo.id}|client_id:${profile.id}`} 
                  size={140}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>

              <span className="text-[8px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full font-black uppercase tracking-widest mb-4">
                ID Pase: {activeQRCodeCombo.id.toUpperCase()}
              </span>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed max-w-[190px]">
                Presenta este QR al personal para registrar tu consumo al instante.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout modal */}
      <AnimatePresence>
        {isCheckoutModalOpen && selectedComboForPurchase && (
          <div 
            className="fixed inset-0 bg-ink/75 backdrop-blur-sm z-[150] flex items-center justify-center p-6 overflow-y-auto"
            onClick={() => {
              setIsCheckoutModalOpen(false);
              setSelectedComboForPurchase(null);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[9px] bg-love/10 text-love font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Pasarela Segura (Sandbox)
                  </span>
                  <h4 className="text-base font-black uppercase text-ink dark:text-white mt-1">Comprar {selectedComboForPurchase.title}</h4>
                  <p className="text-[11px] text-slate-400 font-semibold">Ahorra con packs de productos premium</p>
                </div>
                <div className="text-right">
                  {(selectedComboForPurchase as any).normalPrice && (selectedComboForPurchase as any).normalPrice > selectedComboForPurchase.price && (
                    <span className="text-[11px] text-slate-400 font-bold line-through block leading-none">${(selectedComboForPurchase as any).normalPrice.toLocaleString('es-AR')}</span>
                  )}
                  <span className="text-lg font-black text-love">${selectedComboForPurchase.price.toLocaleString('es-AR')}</span>
                  <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">{selectedComboForPurchase.totalUses || 5} pases de abono</p>
                </div>
              </div>

              {/* Botón oficial de Mercado Pago */}
              <div className="mt-6 space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handlePayWithMercadoPago(selectedComboForPurchase)}
                  disabled={isCreatingPreference}
                  className="w-full bg-[#009ee3] hover:bg-[#008cc8] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-[#009ee3]/20 flex items-center justify-center gap-2.5 cursor-pointer border-none disabled:opacity-50 active:scale-[0.98]"
                >
                  {isCreatingPreference ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generando Enlace...
                    </>
                  ) : (
                    <>
                      <span className="text-sm">⚡</span> Pagar con Mercado Pago
                    </>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setIsCheckoutModalOpen(false);
                    setSelectedComboForPurchase(null);
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest cursor-pointer border-none transition-colors"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-450 justify-center pt-2">
                  <span>🔒 Transacción Encriptada SSL</span>
                  <span>•</span>
                  <span>Mercado Pago Oficial</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
