import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/src/App';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, Award, TrendingUp, History, Users, 
  Gift, Calendar, ChevronRight, BarChart3, PieChart,
  Flag, Sparkles, Car, Trophy, ArrowLeft, ArrowRight, Star,
  Pencil, Check, Ticket, MapPin, Clock, Phone, Loader2
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { notifyClient, checkLevelUp } from '@/src/lib/notify';
import { Transaction, SystemSettings, Profile, Prize } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { useDesign } from '@/src/components/DesignEngine';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie 
} from 'recharts';

export function Dashboard() {
  const { profile, realProfile, refreshProfile, isSimulatingClient, simDevice } = useAuth();
  const { designConfig, saveDesignConfig, loading: designLoading } = useDesign();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Candado para que el retorno de pago de Mercado Pago se procese UNA sola vez
  // por carga de pagina, aunque el efecto se vuelva a disparar.
  const mpProcessingRef = useRef(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'canjes'>('all');
  const [editForm, setEditForm] = useState({ fullName: '', dni: '' });
  const [popularPrizes, setPopularPrizes] = useState<Prize[]>([]);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);

  // Visual points card styling setup
  const [isEditingPointsCard, setIsEditingPointsCard] = useState(false);
  const [cardBgForm, setCardBgForm] = useState('#ef4444');
  const [cardTextForm, setCardTextForm] = useState('#ffffff');
  const [buttonBgForm, setButtonBgForm] = useState('rgba(255,255,255,0.1)');
  const [buttonTextForm, setButtonTextForm] = useState('#ffffff');

  // Visual sections customization setups
  const [isEditingRecom, setIsEditingRecom] = useState(false);
  const [recomTitleForm, setRecomTitleForm] = useState('');
  const [recomSubtitleForm, setRecomSubtitleForm] = useState('');

  const [isEditingRuta, setIsEditingRuta] = useState(false);
  const [rutaTitleForm, setRutaTitleForm] = useState('');
  const [rutaSubtitleForm, setRutaSubtitleForm] = useState('');

  const [isEditingTx, setIsEditingTx] = useState(false);
  const [txTitleForm, setTxTitleForm] = useState('');
  const [txSubtitleForm, setTxSubtitleForm] = useState('');

  // Visual banner slide styling setup
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [editingBannerData, setEditingBannerData] = useState<{
    index: number;
    id: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl: string;
    bgColor: string;
    textColor: string;
    buttonText: string;
  } | null>(null);

  // Sliding banners like "Pedidos Ya (Argentina)"
  const defaultBanners = [
    {
      id: 'default-1',
      title: '¡Hora de Especialidad!',
      subtitle: 'Canjea tu café de especialidad con 100 puntos hoy mismo.',
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=1200&auto=format&fit=crop',
      linkUrl: '#/rewards',
      bgColor: '#1e293b',
      textColor: '#f8fafc',
      buttonText: 'Canjear Premio'
    },
    {
      id: 'default-2',
      title: 'Doble de Puntos los Jueves',
      subtitle: 'Todos los consumos de este jueves suman el doble en tu perfil.',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200&auto=format&fit=crop',
      linkUrl: '#/',
      bgColor: '#7f1d1d',
      textColor: '#fee2e2',
      buttonText: 'Ver Promociones'
    },
    {
      id: 'default-3',
      title: 'Hamburguesas Craft Pro',
      subtitle: 'Nivel Black accede a 20% de descuento directo toda la semana.',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200&auto=format&fit=crop',
      linkUrl: '#/rewards',
      bgColor: '#0f172a',
      textColor: '#e2e8f0',
      buttonText: 'Ver Carta'
    }
  ];

  const bannerList = (designConfig?.banners && designConfig.banners.length > 0)
    ? designConfig.banners
    : defaultBanners;

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (bannerList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerList]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerList.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + bannerList.length) % bannerList.length);
  };

  const getCombinedTransactions = () => {
    if (!profile) return [];
    // Solo la base es la fuente de verdad: evita duplicar usos y movimientos.
    return transactions;
  };

  const getCarPercentage = (pts: number) => {
    const activeTiers = designConfig?.loyaltyTiers || [
      { id: 'tier-fan', name: 'CRAFT FAN', minPoints: 1, maxPoints: 499, multiplier: 1.0, benefits: "Acceso a Club Craft. Sumas 1 punto base por cada peso consumido según la tasa." },
      { id: 'tier-gold', name: 'CRAFT GOLD', minPoints: 500, maxPoints: 999, multiplier: 1.5, benefits: "Multiplicador de puntos x1.5 de regalo en consumos. Premios especiales." },
      { id: 'tier-black', name: 'CRAFT BLACK', minPoints: 1000, maxPoints: 999999, multiplier: 2.0, benefits: "Multiplicador de puntos x2.0 en cada consumo. Invitaciones a eventos y degustaciones de autor." }
    ];
    const goldMin = activeTiers[1]?.minPoints || 500;
    const blackMin = activeTiers[2]?.minPoints || 1000;
    
    if (pts <= 0) return 15;
    if (pts >= blackMin) return 90;
    if (pts <= goldMin) {
      return 15 + (pts / goldMin) * 40;
    } else {
      return 55 + ((pts - goldMin) / (blackMin - goldMin)) * 35;
    }
  };

  // Dynamic Loyalty Tier calculation based on "puntos cargados" and inactivity
  const clientTxs = getCombinedTransactions();
  const totalPuntosCargados = clientTxs
    .filter(t => t.points_earned > 0)
    .reduce((sum, tx) => sum + tx.points_earned, 0);
  const rawPuntosCargados = Math.max(profile?.points || 0, totalPuntosCargados);

  // Inactivity calculation (60 days reset)
  const creditTxs = clientTxs.filter(t => t.points_earned > 0);
  let daysSinceLastCredit = 999;
  let lastCreditDate = null;
  if (creditTxs.length > 0) {
    const lastTx = creditTxs.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
    });
    lastCreditDate = new Date(lastTx.created_at);
    const diffTime = Math.abs(new Date().getTime() - lastCreditDate.getTime());
    daysSinceLastCredit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } else if (profile?.created_at) {
    const regDate = new Date(profile.created_at);
    const diffTime = Math.abs(new Date().getTime() - regDate.getTime());
    daysSinceLastCredit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  const inactivityLimit = designConfig?.categoryInactivityDays || 60;
  const isCategoryReset = daysSinceLastCredit > inactivityLimit;
  const categoryPoints = isCategoryReset ? 0 : rawPuntosCargados;

  const activeTiers = designConfig?.loyaltyTiers || [
    { id: 'tier-fan', name: 'CRAFT FAN', minPoints: 1, maxPoints: 499, multiplier: 1.0, benefits: "Acceso a Club Craft. Sumas 1 punto base por cada peso consumido según la tasa." },
    { id: 'tier-gold', name: 'CRAFT GOLD', minPoints: 500, maxPoints: 999, multiplier: 1.5, benefits: "Multiplicador de puntos x1.5 de regalo en consumos. Premios especiales." },
    { id: 'tier-black', name: 'CRAFT BLACK', minPoints: 1000, maxPoints: 999999, multiplier: 2.0, benefits: "Multiplicador de puntos x2.0 en cada consumo. Invitaciones a eventos y degustaciones de autor y regalos sorpresa." }
  ];

  const getDashboardCurrentTier = (pts: number) => {
    const sorted = [...activeTiers].sort((a, b) => b.minPoints - a.minPoints);
    for (const t of sorted) {
      if (pts >= t.minPoints) return t;
    }
    return activeTiers[0] || { id: 'tier-fan', name: 'CRAFT FAN', minPoints: 1, maxPoints: 499, multiplier: 1.0, benefits: "Acceso a Club Craft" };
  };

  const clientTier = getDashboardCurrentTier(categoryPoints);

  // Points expiration check (3 months)
  const expirationMonths = designConfig?.pointsExpirationMonths || 3;
  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() - expirationMonths);

  const oldEarned = clientTxs
    .filter(t => t.points_earned > 0 && new Date(t.created_at) < expirationDate)
    .reduce((sum, tx) => sum + tx.points_earned, 0);

  const totalSpent = Math.abs(
    clientTxs
      .filter(t => t.points_earned < 0)
      .reduce((sum, tx) => sum + tx.points_earned, 0)
  );

  const expiredEstimated = Math.max(0, oldEarned - totalSpent);
  const warningDate = new Date();
  warningDate.setMonth(warningDate.getMonth() - (expirationMonths - 1));

  const soonEarned = clientTxs
    .filter(t => t.points_earned > 0 && new Date(t.created_at) >= expirationDate && new Date(t.created_at) < warningDate)
    .reduce((sum, tx) => sum + tx.points_earned, 0);

  const soonToExpire = Math.max(0, Math.min(profile?.points || 0, soonEarned));

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

  // Combos, Checkout and QR states
  const [selectedComboForPurchase, setSelectedComboForPurchase] = useState<any | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [isCreatingPreference, setIsCreatingPreference] = useState(false);
  const [activeQRCodeCombo, setActiveQRCodeCombo] = useState<any | null>(null);
  const [comboRedeeming, setComboRedeeming] = useState<string | null>(null);

  // Admin Stats
  const [adminStats, setAdminStats] = useState<{
    totalClients: number;
    upcomingBirthdays: Profile[];
    weeklyRedemptions: number;
    leaderboard: Profile[];
    ageData: { range: string; count: number }[];
  } | null>(null);

  const fetchClientData = async () => {
    if (!profile) return;
    // Siempre desde la base. El cache solo se usa como respaldo si falla (catch).

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!error && data) {
      setTransactions(data);
      try {
        localStorage.setItem(`tx_cache_${profile.id}`, JSON.stringify(data));
      } catch (e) {
        console.warn("[LocalStorage] No se pudo guardar tx_cache por límite de cuota:", e);
      }
    } else if (error) {
      // Respaldo: si la base no responde, usamos el ultimo cache conocido.
      const cached = localStorage.getItem(`tx_cache_${profile.id}`);
      if (cached) {
        try { setTransactions(JSON.parse(cached)); } catch (e) {}
      }
    }
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
          app_url: window.location.origin
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText || "No se pudo iniciar el proceso de pago."}`);
      }

      const data = await response.json();
      if (data.init_point) {
        // Redirigir al cliente al Checkout de Mercado Pago
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
    await new Promise(r => setTimeout(r, 1800));

    try {
      const paymentId = 'card_sim_' + Math.random().toString(36).substr(2, 9);
      const fakePrice = selectedComboForPurchase.price;
      const fakeUses = selectedComboForPurchase.totalUses || 5;
      
      const conversionRate = settings?.points_conversion_rate || 1000;
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

      const updatedTxs = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false });
      if (updatedTxs.data) {
        setTransactions(updatedTxs.data);
      }

      setIsCheckoutModalOpen(false);
      setSelectedComboForPurchase(null);
      setCardForm({ number: '', name: '', expiry: '', cvc: '' });

      alert(`🎉 ¡Pago procesado con éxito! El combo "${selectedComboForPurchase.title}" ha sido adquirido. Recibiste +${bonusPoints} puntos.`);
    } catch (err: any) {
      console.error(err);
      alert("Error al procesar el pago simulado.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Procesar retorno de Mercado Pago de forma automática o simulador
  useEffect(() => {
    if (!profile) return;

    // Detectar retorno de Mercado Pago en la URL
    const hashPart = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(hashPart || window.location.search);
    
    const paymentStatus = params.get('payment_status') || params.get('collection_status') || params.get('status');
    const comboId = params.get('combo_id');
    const comboTitle = params.get('combo_title') || 'Abono Adquirido';
    const totalUses = parseInt(params.get('totalUses') || '0') || 5;
    const price = parseFloat(params.get('price') || '0') || 0;
    // ID de pago: usar el real de Mercado Pago. Si por algun motivo no llega,
    // NO inventamos uno con la hora (cambia cada milisegundo y causa duplicados):
    // usamos una clave estable por combo para que el anti-duplicado funcione.
    const paymentId = params.get('payment_id') || params.get('preference_id') || ('mp_' + comboId);

    if ((paymentStatus === 'success' || paymentStatus === 'approved') && comboId) {
      // Candado en memoria: si ya estamos procesando un retorno de pago en esta
      // carga de pagina, no lo hacemos de nuevo aunque el efecto se re-dispare.
      if (mpProcessingRef.current) return;

      const processedKey = `processed_mp_tx_${paymentId}_${comboId}`;
      const isAlreadyProcessed = localStorage.getItem(processedKey);

      if (!isAlreadyProcessed) {
        mpProcessingRef.current = true;
        localStorage.setItem(processedKey, 'true');
        
        const conversionRate = settings?.points_conversion_rate || 1000;
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
            // Red de seguridad: si ya hay una compra de este combo para este
            // cliente en los ultimos 10 minutos, no registrar de nuevo.
            const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const { data: recentDup } = await supabase
              .from('transactions')
              .select('id')
              .eq('client_id', profile.id)
              .gte('created_at', tenMinAgo)
              .ilike('description', `COMPRA_COMBO: ${comboId}\\_%`)
              .limit(1);

            if (recentDup && recentDup.length > 0) {
              // Ya estaba registrada; limpiamos la URL y salimos sin duplicar.
              const cleanHashDup = window.location.hash.split('?')[0];
              window.history.replaceState(null, '', window.location.pathname + cleanHashDup);
              return;
            }

            // Guardar en el cache local de transacciones
            const existingStr = localStorage.getItem(`local_txs_${profile.id}`);
            const existing = existingStr ? JSON.parse(existingStr) : [];
            existing.push(newPurchaseTx);
            localStorage.setItem(`local_txs_${profile.id}`, JSON.stringify(existing));

            // Insertar en base de datos Supabase
            await supabase.from('transactions').insert({
              client_id: profile.id,
              waiter_id: profile.id,
              amount: price,
              points_earned: bonusPoints,
              branch: 'VENTA MERCADO PAGO',
              invoice_number: newPurchaseTx.invoice_number,
              description: `COMPRA_COMBO: ${comboId}_${totalUses}|${comboTitle}`
            });

            // Actualizar puntos del perfil en Supabase
            await supabase
              .from('profiles')
              .update({ points: (profile.points || 0) + bonusPoints })
              .eq('id', profile.id);

            // Aviso automático al cliente (campanita + email)
            notifyClient({
              clientId: profile.id,
              clientEmail: (profile as any).email,
              title: '¡Compraste un combo en CRAFT!',
              message: `Tu compra de "${comboTitle}" se confirmó con éxito. Ya tenés ${totalUses} usos disponibles. ¡Además sumaste ${bonusPoints} puntos!`
            });

            // ¿Subió de categoría con los puntos de la compra?
            const oldP = profile.points || 0;
            const newP = oldP + bonusPoints;
            const tiersC = ((designConfig as any)?.loyaltyTiers || []).map((t: any) => ({ name: t.name, minPoints: t.minPoints }));
            const lvlCfg = (designConfig as any)?.autoNotif?.levelUp;
            checkLevelUp({
              client: { id: profile.id, full_name: profile.full_name, email: (profile as any).email, points: newP },
              oldPoints: oldP, newPoints: newP, tiers: tiersC, cfg: lvlCfg
            }).then(async (gift) => {
              if (gift > 0) {
                await supabase.from('profiles').update({ points: newP + gift }).eq('id', profile.id);
              }
            });

            // Refrescar el perfil de autenticación para actualizar puntos en la app
            if (refreshProfile) {
              await refreshProfile();
            }

            // Recargar datos frescos de transacciones
            fetchClientData();
            
            // Limpiar parámetros de la URL para que no se re-procese al recargar
            const cleanHash = window.location.hash.split('?')[0];
            window.history.replaceState(null, '', window.location.pathname + cleanHash);
            
            alert(`🎉 ¡Gracias por tu compra! El combo "${comboTitle}" ha sido acreditado en tu cuenta con éxito. Sumaste +${bonusPoints} puntos.`);
          } catch(err) {
            console.error("Error al procesar transaccion de Mercado Pago:", err);
          }
        };

        executeLogging();
      }
    }
  }, [profile, settings, refreshProfile]);

  useEffect(() => {
    if (profile) {
      setEditForm({ fullName: profile.full_name, dni: profile.dni || '' });
      
      let isMounted = true;
      
      fetchClientData();

      const fetchAdminStats = async () => {
        try {
          const today = new Date();
          const currentMonthNum = today.getMonth() + 1;
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(today.getDate() - 7);

          // 1. Cargar desde caché primero
          const cached = localStorage.getItem('admin_stats_cache');
          if (cached && isMounted) {
            try {
              setAdminStats(JSON.parse(cached));
              setLoading(false);
            } catch (e) {}
          }

          // 2. Fetch fresco en paralelo
          const results = await Promise.allSettled([
            supabase.from('profiles').select('*', { count: 'exact', head: true }).limit(1),
            supabase.from('profiles').select('*').order('points', { ascending: false }).limit(20),
            supabase.from('transactions').select('*', { count: 'exact', head: true }).ilike('description', '%CANJE%').gte('created_at', oneWeekAgo.toISOString()),
            supabase.from('profiles').select('id, full_name, birth_date, points, role')
          ]);

          const clientsCountRes = results[0].status === 'fulfilled' ? results[0].value : { count: 0, error: null };
          const leaderboardRes = results[1].status === 'fulfilled' ? results[1].value : { data: [], error: null };
          const redemptionsRes = results[2].status === 'fulfilled' ? results[2].value : { count: 0, error: null };
          const allClientsRes = results[3].status === 'fulfilled' ? (results[3].value as any) : { data: [], error: { message: 'Fetch failed' } };


          const redemptionsCount = redemptionsRes.count || 0;
          let allClients = allClientsRes.data || [];
          
          // Filter in JS to strictly count clients (non-admins/waiters)
          allClients = allClients.filter(p => p.role !== 'admin' && p.role !== 'waiter');
          const clientsCount = allClients.length;
          const leaderboard = allClients.sort((a, b) => b.points - a.points).slice(0, 5);

          // Procesar datos en JS
          const birthdays: Profile[] = [];
          const ageGroups: Record<string, number> = {
            '18-25': 0, '26-35': 0, '36-45': 0, '46-60': 0, '60+': 0
          };

          allClients.forEach(p => {
            if (!p.birth_date) return;
            const bDate = new Date(p.birth_date);
            if (!isNaN(bDate.getTime())) {
              if (bDate.getMonth() + 1 === currentMonthNum) birthdays.push(p as any);
              const age = today.getFullYear() - bDate.getFullYear();
              if (age < 26) ageGroups['18-25']++;
              else if (age < 36) ageGroups['26-35']++;
              else if (age < 46) ageGroups['36-45']++;
              else if (age < 61) ageGroups['46-60']++;
              else ageGroups['60+']++;
            }
          });

          birthdays.sort((a, b) => new Date(a.birth_date!).getDate() - new Date(b.birth_date!).getDate());
          const ageChartData = Object.entries(ageGroups).map(([range, count]) => ({ range, count }));

          const freshStats = {
            totalClients: clientsCount,
            upcomingBirthdays: birthdays.slice(0, 10),
            weeklyRedemptions: redemptionsCount,
            leaderboard: leaderboard,
            ageData: ageChartData
          };

          if (isMounted) {
            setAdminStats(freshStats);
            try {
              localStorage.setItem('admin_stats_cache', JSON.stringify(freshStats));
            } catch (e) {
              console.warn("[LocalStorage] No se pudo guardar admin_stats_cache por límite de cuota:", e);
            }
          }
        } catch (err) {
          console.error("Admin stats error:", err);
        }
      };

      const fetchSettings = async () => {
        try {
          const { data } = await supabase
            .from('settings')
            .select('*')
            .single();
          if (data && isMounted) setSettings(data);
        } catch (err) {
          console.error("Error fetching settings:", err);
        }
      };

      const fetchPopularPrizes = async () => {
        // Siempre desde la base; sin precarga de cache.
        try {
          const { data, error } = await supabase
            .from('catalogo_premios')
            .select('*')
            .eq('is_active', true)
            .order('points_cost', { ascending: true })
            .limit(3);
          
          if (isMounted && !error && data && data.length > 0) {
            setPopularPrizes(data);
          } else if (isMounted) {
            setPopularPrizes([]);
          }
        } catch (err) {
          console.error("Popular rewards fetch error:", err);
          if (isMounted) setPopularPrizes([]);
        }
      };

      if (profile.role === 'admin') {
        fetchAdminStats().finally(() => { if (isMounted) setLoading(false); });
      } else {
        const loadAllData = async () => {
          await Promise.allSettled([
            fetchClientData(),
            fetchPopularPrizes()
          ]);
          if (isMounted) setLoading(false);
        };
        loadAllData();
      }
      
      fetchSettings();
      return () => { isMounted = false; };
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

  const handleSavePointsCardDesign = async () => {
    try {
      const updatedConfig = {
        ...designConfig,
        pointsCardBg: cardBgForm,
        pointsCardText: cardTextForm,
        profileButtonBg: buttonBgForm,
        profileButtonText: buttonTextForm,
      };
      await saveDesignConfig(updatedConfig);
      setIsEditingPointsCard(false);
    } catch (e) {
      alert("Error al guardar diseño de tarjeta: " + (e as Error).message);
    }
  };

  const handleSaveBannerDesign = async () => {
    if (!editingBannerData) return;
    try {
      const currentBanners = [...bannerList];
      const targetIndex = editingBannerData.index;
      
      currentBanners[targetIndex] = {
        id: editingBannerData.id,
        title: editingBannerData.title,
        subtitle: editingBannerData.subtitle,
        imageUrl: editingBannerData.imageUrl,
        linkUrl: editingBannerData.linkUrl,
        bgColor: editingBannerData.bgColor,
        textColor: editingBannerData.textColor,
        buttonText: editingBannerData.buttonText,
      };

      const updatedConfig = {
        ...designConfig,
        banners: currentBanners
      };

      await saveDesignConfig(updatedConfig);
      setIsEditingBanner(false);
      setEditingBannerData(null);
    } catch (e) {
      alert("Error al guardar diseño de banner: " + (e as Error).message);
    }
  };

  const handleSaveRecomDesign = async () => {
    try {
      const updatedConfig = {
        ...designConfig,
        recomTitle: recomTitleForm,
        recomSubtitle: recomSubtitleForm,
      };
      await saveDesignConfig(updatedConfig);
      setIsEditingRecom(false);
    } catch (e) {
      alert("Error al guardar diseño de recomendación: " + (e as Error).message);
    }
  };

  const handleSaveRutaDesign = async () => {
    try {
      const updatedConfig = {
        ...designConfig,
        rutaTitle: rutaTitleForm,
        rutaSubtitle: rutaSubtitleForm,
      };
      await saveDesignConfig(updatedConfig);
      setIsEditingRuta(false);
    } catch (e) {
      alert("Error al guardar diseño de ruta: " + (e as Error).message);
    }
  };

  const handleSaveTxDesign = async () => {
    try {
      const updatedConfig = {
        ...designConfig,
        txTitle: txTitleForm,
        txSubtitle: txSubtitleForm,
      };
      await saveDesignConfig(updatedConfig);
      setIsEditingTx(false);
    } catch (e) {
      alert("Error al guardar diseño de transacciones: " + (e as Error).message);
    }
  };

  if (!profile || loading || designLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center min-h-[60vh]">
        <div className="relative w-24 h-28 mb-6 flex items-end justify-center">
          {/* Vapor */}
          <motion.div
            className="absolute -top-1 left-1/2 -translate-x-1/2 flex gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block w-1 h-5 rounded-full bg-love/30"
                animate={{ y: [4, -6, 4], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
              />
            ))}
          </motion.div>

          {/* Taza */}
          <div className="relative w-20 h-20">
            {/* Cuerpo de la taza con el café que se llena */}
            <div className="absolute inset-x-2 bottom-0 top-2 rounded-b-3xl rounded-t-lg border-[3px] border-ink overflow-hidden bg-white">
              {/* Café que sube */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#b91c1c] to-[#ef4444]"
                initial={{ height: "0%" }}
                animate={{ height: ["8%", "85%", "8%"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* CRAFT fijo y blanco, siempre visible por encima del café */}
              <span className="absolute inset-0 z-10 flex items-center justify-center text-white font-black text-[10px] tracking-tight uppercase select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">CRAFT</span>
            </div>
            {/* Asa */}
            <div className="absolute right-[-6px] top-5 w-4 h-7 border-[3px] border-ink rounded-r-full" />
            {/* Plato */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-2 rounded-full bg-ink/80" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter text-ink">
          {profile?.role === 'admin' ? 'Cargando Dashboard Administrativo' : 'Cargando tus puntos'}
        </h2>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-8">Espera un momento...</p>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-white hover:bg-slate-50 text-ink py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border border-slate-200 shadow-sm"
          >
            Reintentar Carga
          </button>
          
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full text-love/60 hover:text-love py-2 font-bold text-[10px] uppercase tracking-widest transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (profile.role === 'admin') {
    if (!adminStats) return null; // Safety fallthrough
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 pb-20"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <Users className="text-love" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Clientes</span>
            </div>
            <div>
              <p className="text-4xl font-black italic text-ink">{adminStats.totalClients}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Usuarios Registrados</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <Gift className="text-love" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canjes / Semana</span>
            </div>
            <div>
              <p className="text-4xl font-black italic text-ink">{adminStats.weeklyRedemptions}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Premios Retirados</p>
            </div>
          </div>

          <div className="bg-ink p-6 rounded-3xl shadow-xl shadow-slate-200/50 flex flex-col justify-between text-white md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="text-white/40" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Próximos Cumpleaños</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              {adminStats.upcomingBirthdays.length === 0 ? (
                <p className="text-xs text-white/30 italic font-medium">No hay cumpleaños este mes</p>
              ) : (
                adminStats.upcomingBirthdays.map(b => (
                  <div key={b.id} className="bg-white/10 p-3 rounded-2xl shrink-0 min-w-[120px] border border-white/5">
                    <p className="text-[10px] font-black uppercase truncate">{b.full_name}</p>
                    <p className="text-[9px] text-love font-bold mt-1 uppercase tracking-widest">
                       {new Date(b.birth_date!).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-ink flex items-center gap-2">
                <PieChart size={18} className="text-love" />
                Distribución por Edades
              </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminStats.ageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {adminStats.ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#ef4444' : '#0f172a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="md:col-span-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <h3 className="text-sm font-black uppercase tracking-widest text-ink mb-8 flex items-center gap-2">
              <TrendingUp size={18} className="text-love" />
              Top Clientes
            </h3>
            <div className="space-y-4">
              {adminStats.leaderboard.map((c, i) => (
                <div key={c.id} className="flex items-center gap-4 group">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-black italic text-xs",
                    i === 0 ? "bg-love text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase text-ink truncate tracking-tight">{c.full_name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{c.dni || 'S/D'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-love font-black italic text-sm">{c.points}</p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => window.location.href = '#/admin'}
              className="w-full mt-8 bg-slate-50 text-slate-400 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-slate-100 hover:text-ink transition-all border border-slate-100"
            >
              Ver Todos los Clientes
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const isMobileView = (profile?.role === 'client' || isSimulatingClient) && (window.innerWidth < 640 || (isSimulatingClient && simDevice === 'phone'));

  if (isMobileView && profile) {
    const nextTierPoints = clientTier.id.includes('black') 
      ? null 
      : (clientTier.id.includes('gold') ? (activeTiers[2]?.minPoints || 1000) : (activeTiers[1]?.minPoints || 500));
    const currentTierMin = clientTier.id.includes('black')
      ? (activeTiers[2]?.minPoints || 1000)
      : (clientTier.id.includes('gold') ? (activeTiers[1]?.minPoints || 500) : 0);
    const progressPercentage = nextTierPoints
      ? Math.min(100, Math.max(0, ((categoryPoints - currentTierMin) / (nextTierPoints - currentTierMin)) * 100))
      : 100;

    const avCombos = (designConfig as any)?.combos || [];
    const activeCombosForSale = avCombos.filter((c: any) => c.isActive);

    const branchesList = designConfig?.branches || [];

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-6 max-w-sm mx-auto pb-24 text-left"
      >
        {/* Header greeting */}
        <div className="flex justify-between items-center px-1">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight leading-none !text-slate-900" style={{ fontFamily: designConfig?.fontHeadings || 'inherit' }}>Hola, {profile.full_name?.split(' ')[0]} ⚡</h1>
          </div>
        </div>

        {/* 1. sliding promo banners */}
        <div className="relative w-full overflow-hidden rounded-[2rem] h-[160px] shadow-lg border border-slate-200/50 dark:border-slate-800 bg-slate-950">
          <div className="absolute inset-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex flex-col justify-end p-5 text-white"
                style={{
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.2) 100%), url(${bannerList[currentSlide]?.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="max-w-[85%] text-left">
                  <span className="text-[7px] font-black uppercase tracking-widest bg-love/90 text-white px-2 py-0.5 rounded-full inline-block mb-1.5 animate-pulse">
                    Novedad
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-tight line-clamp-1">{bannerList[currentSlide]?.title}</h3>
                  <p className="text-[9px] text-slate-300 line-clamp-1 mt-0.5">{bannerList[currentSlide]?.subtitle}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots banner controller */}
          {bannerList.length > 1 && (
            <div className="absolute bottom-3 right-4 flex gap-1 z-10">
              {bannerList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all border-none p-0 cursor-pointer",
                    currentSlide === idx ? "bg-love w-3" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* 2. Camino de fidelidad (Ruta de puntos as requested, photo match) */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-md">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1.5">
              <Trophy size={14} className="text-yellow-500 animate-bounce" />
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Camino de Fidelidad Craft</span>
            </div>
            <span className={cn(
              "text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase italic",
              clientTier.id.includes('black') ? "bg-slate-900 text-amber-400" : (clientTier.id.includes('gold') ? "bg-amber-400/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500")
            )}>
              {clientTier.name}
            </span>
          </div>

          {/* Road Track section adapted perfectly for mobile screen */}
          <div className="relative py-10 px-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-sky-950/20 mt-1 overflow-hidden">
            
            {/* ROAD TRACK: Asphalt road strip */}
            <div className="relative h-10 bg-slate-700 dark:bg-slate-800 rounded-xl border-t border-b border-dashed border-slate-500 dark:border-slate-600 flex items-center shadow-inner">
              <div className="absolute left-0 right-0 h-0.5 border-t border-dashed border-white/20" />

              {/* Active level progress trail */}
              <div 
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-yellow-500/25 via-love/20 to-love/35 rounded-l-lg transition-all duration-1000 ease-out" 
                style={{ width: `${getCarPercentage(categoryPoints)}%` }} 
              />

              {/* Milestones inside road track */}
              <div className="absolute inset-0 px-4 flex items-center justify-between pointer-events-none z-10">
                {[
                  { pts: 0, icon: <Gift size={10} className="text-white" />, pos: 15 },
                  { pts: activeTiers[1]?.minPoints || 500, icon: <Sparkles size={10} className="text-yellow-400" />, pos: 55 },
                  { pts: activeTiers[2]?.minPoints || 1000, icon: <Star size={10} className="text-purple-300 fill-purple-300" />, pos: 90 }
                ].map((m, idx) => {
                  const reached = categoryPoints >= m.pts;
                  return (
                    <div 
                      key={idx}
                      className="absolute -translate-x-1/2 flex flex-col items-center gap-1"
                      style={{ left: `${m.pos}%` }}
                    >
                      <div className={cn(
                        "w-5.5 h-5.5 rounded-full flex items-center justify-center border transition-all duration-700",
                        reached 
                          ? "bg-love border-white scale-110 text-white ring-2 ring-love/20" 
                          : "bg-slate-800 border-slate-600 text-slate-400"
                      )}>
                        {m.icon}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COFFEE CUP VEHICLE: Moves smoothly according to score */}
              <div 
                className="absolute transition-all duration-[1200ms] cubic-bezier(0.16, 1, 0.3, 1) -translate-x-1/2 z-30"
                style={{ left: `${getCarPercentage(categoryPoints)}%` }}
              >
                <div className="flex flex-col items-center">
                  {/* Little cup speech text */}
                  <div className="bg-slate-900 border border-love text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow mb-1.5 relative whitespace-nowrap">
                    <span>☕ {clientTier.name}</span>
                    <div className="absolute bottom-[2.5px] left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 border-r border-b border-love rotate-45" />
                  </div>

                  {/* Takeaway coffee cup layout */}
                  <div className="relative flex flex-col items-center filter drop-shadow-[0_2px_4px_rgba(230,57,70,0.35)]">
                    <div className="w-5.5 h-1 bg-slate-900 rounded-t-sm z-10" />
                    <div className="w-6.5 h-0.5 bg-slate-800 rounded-sm z-10 -mt-0.5" />
                    <div className="w-4.5 h-7 bg-white rounded-b-sm border border-slate-200 relative overflow-hidden flex items-center justify-center -mt-0.5" style={{ clipPath: 'polygon(3% 0%, 97% 0%, 82% 100%, 18% 100%)' }}>
                      <div className="text-[5px] font-black tracking-wider text-love select-none flex flex-col items-center justify-center leading-[1] mt-0.5 font-sans">
                        <span>C</span>
                        <span>R</span>
                        <span>A</span>
                        <span>F</span>
                        <span>T</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* LABELS BELOW ROAD */}
            <div className="relative mt-2.5 h-11">
              {[
                { pts: 0, label: activeTiers[0]?.name || 'CRAFT FAN', target: '0 PTS', pos: 15, benefit: 'Nivel Inicial' },
                { pts: activeTiers[1]?.minPoints || 500, label: activeTiers[1]?.name || 'CRAFT GOLD', target: `${(activeTiers[1]?.minPoints || 500).toLocaleString()} PTS`, pos: 55, benefit: `Bonus x${activeTiers[1]?.multiplier || 1.5}` },
                { pts: activeTiers[2]?.minPoints || 1000, label: activeTiers[2]?.name || 'CRAFT BLACK', target: `${(activeTiers[2]?.minPoints || 1000).toLocaleString()} PTS`, pos: 90, benefit: `Bonus x${activeTiers[2]?.multiplier || 2.0}` }
              ].map((m, idx) => {
                const reached = categoryPoints >= m.pts;
                return (
                  <div 
                    key={idx}
                    className="absolute -translate-x-1/2 text-center"
                    style={{ left: `${m.pos}%` }}
                  >
                    <p className={cn(
                      "text-[8px] font-black uppercase truncate max-w-[65px] leading-none",
                      reached ? "text-love" : "text-slate-400"
                    )}>
                      {m.label}
                    </p>
                    <p className="text-[7px] text-[#A06C00] font-black uppercase mt-0.5 tracking-tight leading-none">
                      {m.target}
                    </p>
                    <p className="text-[6px] font-semibold text-slate-400 uppercase tracking-tighter mt-0.5 leading-none font-sans">
                      {m.benefit}
                    </p>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Text helper info */}
          <div className="text-[9px] text-slate-400 font-extrabold uppercase mt-3.5 tracking-tight">
            {clientTier.id.includes('black') ? (
              <span>✨ ¡Felicidades! Estás en el nivel máximo <strong>{clientTier.name}</strong></span>
            ) : (
              <span>
                Cargaste {categoryPoints} pts. Te faltan {nextTierPoints && (nextTierPoints - categoryPoints)} pts de consumo para llegar a {activeTiers[clientTier.id.includes('gold') ? 2 : 1]?.name}.
              </span>
            )}
          </div>
        </div>

        {/* 3 & 4. Saldo actual de puntos and QR Code in an elegant split or stacked layout */}
        <div className="grid grid-cols-1 gap-4">
          {/* Points Display */}
          <div 
            style={{
              backgroundColor: designConfig?.pointsCardBg || undefined,
              color: designConfig?.pointsCardText || undefined,
            }}
            className={cn(
              "rounded-3xl p-5 flex flex-col justify-between border border-slate-900/5 relative overflow-hidden group/card shadow-lg",
              designConfig?.pointsCardBg ? "" : "bg-love text-white"
            )}
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative flex items-center justify-between gap-3">
              <div className="text-left flex-1 min-w-0">
                <h2 className="text-[9px] uppercase font-bold tracking-widest opacity-80 mb-1">Mi Saldo Disponible</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black italic">{profile.points.toLocaleString()}</span>
                  <span className="text-xs font-bold uppercase tracking-tighter">puntos</span>
                </div>
                <button
                  onClick={() => { window.location.hash = '#/my-account?seccion=movimientos'; }}
                  className="mt-3 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-all rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest cursor-pointer"
                >
                  <History size={11} /> Mis movimientos
                </button>
              </div>

              {/* QR chico a la derecha */}
              <div className="shrink-0 bg-white rounded-2xl p-2 shadow-md flex flex-col items-center">
                <QRCode
                  value={`${window.location.origin}/#/waiter?dni=${profile.dni || profile.id}`}
                  size={72}
                  style={{ height: "72px", width: "72px" }}
                  viewBox={`0 0 256 256`}
                />
                <p className="text-[6px] uppercase font-bold text-slate-400 mt-1">DNI {profile.dni || 's/d'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Comprá Combos Store feed */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1.5">
              <Ticket size={16} className="text-love" />
              <h3 className="text-sm font-black uppercase tracking-wider !text-slate-900" style={{ fontFamily: designConfig?.fontHeadings || 'inherit' }}>Comprá Combos</h3>
            </div>
            <span className="text-[8px] bg-love/15 text-love px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">Precios Promo</span>
          </div>

          {activeCombosForSale.length === 0 ? (
            <p className="text-[10px] text-slate-400 px-1 font-semibold uppercase">No hay combos disponibles a la venta hoy.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 px-0.5">
              {activeCombosForSale.map((combo: any) => (
                <div 
                  key={combo.id} 
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 shadow shadow-slate-100 dark:shadow-none shrink-0 w-[240px] text-left flex flex-col justify-between"
                >
                  <div>
                    {combo.imageUrl && (
                      <div className="w-full h-24 rounded-2xl overflow-hidden mb-3">
                        <img 
                          src={combo.imageUrl} 
                          alt={combo.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <h4 className="text-[11px] font-black uppercase tracking-tight text-ink dark:text-white line-clamp-1">{combo.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[22px]">{combo.description || 'Disfruta de nuestros menús premium precargados.'}</p>
                    
                    <div className="flex items-center justify-between mt-3 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-2xl border border-red-100/50 dark:border-red-900/10">
                      <span className="text-[8px] uppercase font-black tracking-widest text-[#92400E] dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full select-none">
                        🎫 {combo.totalUses} usos
                      </span>
                      <div className="text-right">
                        {combo.normalPrice && combo.normalPrice > combo.price && (
                          <span className="text-[9px] text-slate-400 font-bold line-through block leading-none select-none">
                            ${combo.normalPrice.toLocaleString('es-AR')}
                          </span>
                        )}
                        <span className="text-base font-black text-love tracking-tight leading-none block mt-0.5">
                          ${combo.price.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>

                    {combo.normalPrice && combo.normalPrice > combo.price && (
                      <p className="text-[8px] text-emerald-600 font-black uppercase tracking-wide mt-2">
                        Ahorrás ${(combo.normalPrice - combo.price).toLocaleString('es-AR')} con este combo
                      </p>
                    )}

                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wide mt-2 flex items-center gap-1">
                      <Clock size={9} className="text-love shrink-0" />
                      Tenés {combo.expirationDays || 30} días para consumirlo desde la compra
                    </p>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => handlePayWithMercadoPago(combo)}
                      disabled={isCreatingPreference}
                      className="w-full py-2.5 bg-[#009EE3] hover:bg-[#008cc8] text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-sm shadow-[#009ee3]/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
                    >
                      {isCreatingPreference ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs">⚡</span>
                          <span>Comprar con Mercado Pago</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Recomendados para canje */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1.5">
              <Gift size={16} className="text-love" />
              <h4 className="text-sm font-black uppercase tracking-wider !text-slate-900" style={{ fontFamily: designConfig?.fontHeadings || 'inherit' }}>Recomendados para canje</h4>
            </div>
            <span className="text-[8px] uppercase font-extrabold text-slate-400">Tus Premios</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {popularPrizes.slice(0, 2).map((prize) => {
              const worksCanje = profile.points >= prize.points_cost;
              return (
                <div key={prize.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-3.5 shadow-sm text-left flex flex-col justify-between">
                  <div>
                    {prize.image_url && (
                      <div className="w-full h-20 rounded-2xl overflow-hidden mb-2">
                        <img 
                          src={prize.image_url} 
                          alt={prize.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <h5 className="text-[10px] font-black uppercase text-ink dark:text-white line-clamp-1 leading-normal">{prize.title}</h5>
                    <p className="text-[8px] text-slate-400 font-extrabold tracking-widest uppercase mt-0.5">{prize.category || 'MENÚ'}</p>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-black italic text-love">{prize.points_cost} pts</span>
                    <span className={cn(
                      "text-[7px] uppercase font-black px-2 py-0.5 rounded-full",
                      worksCanje ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 text-slate-400 dark:bg-slate-850"
                    )}>
                      {worksCanje ? "CARGAR" : "FALTAN"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. Sucursales */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 px-1">
            <MapPin size={16} className="text-love" />
            <h4 className="text-sm font-black uppercase tracking-wider !text-slate-900" style={{ fontFamily: designConfig?.fontHeadings || 'inherit' }}>Sucursales</h4>
          </div>

          <div className="space-y-2.5">
            {branchesList.map((branch: any) => {
              const isExpanded = expandedBranchId === branch.id;
              const phoneClean = branch.phone ? branch.phone.replace(/\D/g, '') : '';
              const whatsappPhone = phoneClean ? (phoneClean.startsWith('54') ? phoneClean : '54' + phoneClean) : '';

              return (
                <div 
                  key={branch.id} 
                  onClick={() => setExpandedBranchId(isExpanded ? null : branch.id)}
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-3xl border p-4 shadow-sm text-left flex flex-col transition-all duration-300 cursor-pointer select-none hover:border-love/35",
                    isExpanded ? "border-love/40 ring-1 ring-love/5 bg-slate-50/20 dark:bg-slate-950/20" : "border-slate-100 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-love/10 text-love flex items-center justify-center shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div className="space-y-0.5 text-left flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2.5">
                        <h5 className="text-[11px] font-black uppercase !text-slate-900 tracking-tight">{branch.name || branch.address}</h5>
                        <span className="text-[7px] text-slate-400 font-extrabold uppercase shrink-0">
                          {isExpanded ? "Cerrar ▲" : "Ver Más ▼"}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold truncate uppercase">{branch.address} • {branch.city}</p>
                      <p className="text-[8px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} className="text-slate-400 shrink-0" />
                        <span>Todos los días: 08:00 a 01:00 hs</span>
                      </p>
                    </div>
                  </div>

                  {/* Expandable Action Buttons with smooth animation */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={branch.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(branch.address + ', ' + branch.city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-950 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-all outline-none no-underline shadow-sm active:scale-95 cursor-pointer"
                        >
                          <svg className="w-3 h-3 fill-current shrink-0 text-love" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          <span>Ver ubicación</span>
                        </a>
                        <a
                          href={whatsappPhone ? `https://wa.me/${whatsappPhone}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-xl text-[9px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-all outline-none no-underline shadow-sm active:scale-95 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.455L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.8 1.45 5.5 0 10-4.5 10-10s-4.5-10-10-10C6.9 1 2.4 5.5 2.4 11c0 2 .5 3.9 1.5 5.6L2.9 21.1l4.9-1.3c-.2.1-.2.1.2 0zm11.5-6.1c-.3-.2-1.7-1-2-.1.1-.1-.3-.2-.5-.3-.2-.1-.4-.2-.6 0l-.9.9c-.2.2-.4.2-.7.1-.3-.1-.7-.3-1.3-.8-.5-.4-.8-.9-.9-1.1-.1-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.2-.5 0-.2-.1-.5-.2-.7-.1-.3-.4-1-.6-1.4-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.2.2-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.4-.3-.7-.5z"/>
                          </svg>
                          <span>Contactar</span>
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Editar Perfil inside mobile view */}
        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/65 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl text-left"
              >
                <h3 className="text-lg font-black uppercase italic text-ink dark:text-white">Completar <span className="text-love">Mis Datos</span></h3>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1 mb-5">Ingresa tu identificación para el QR</p>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                    <input 
                      required
                      placeholder="Tu nombre" 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white" 
                      value={editForm.fullName} 
                      onChange={e => setEditForm({...editForm, fullName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">DNI (Para el QR)</label>
                    <input 
                      required
                      placeholder="Tu DNI" 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white" 
                      value={editForm.dni} 
                      onChange={e => setEditForm({...editForm, dni: e.target.value})} 
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-slate-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="flex-[2] bg-love text-white py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-love/20"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Pago Tarjeta Combinada inside Mobile View */}
        <AnimatePresence>
          {isCheckoutModalOpen && selectedComboForPurchase && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/75 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2.5rem] w-full max-w-sm shadow-2xl text-left relative"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black uppercase tracking-tight text-ink dark:text-white">Pago con Tarjeta</h3>
                  <button 
                    onClick={() => {
                      setIsCheckoutModalOpen(false);
                      setSelectedComboForPurchase(null);
                    }}
                    className="text-slate-400 hover:text-love transition-colors cursor-pointer p-1 bg-transparent border-none outline-none"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl mb-5 text-left border border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
                  {selectedComboForPurchase.imageUrl && (
                    <img 
                      src={selectedComboForPurchase.imageUrl} 
                      alt="" 
                      className="w-10 h-10 object-cover rounded-lg shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <h5 className="text-[10px] font-black uppercase text-ink dark:text-white">{selectedComboForPurchase.title}</h5>
                    <p className="text-[9px] text-[#92400E] dark:text-amber-400 font-bold uppercase mt-0.5">Monto total a abonar: ${selectedComboForPurchase.price}</p>
                  </div>
                </div>

                <form onSubmit={handlePayWithMockCard} className="space-y-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Cargar Número de Tarjeta</label>
                    <input 
                      required
                      placeholder="4540 8820 9931 5110" 
                      maxLength={19}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4.5 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-mono"
                      value={cardForm.number}
                      onChange={e => setCardForm({...cardForm, number: e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim()})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Nombre en Placa</label>
                    <input 
                      required
                      placeholder="JUAN PEREZ" 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4.5 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-mono uppercase"
                      value={cardForm.name}
                      onChange={e => setCardForm({...cardForm, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">Vencimiento</label>
                      <input 
                        required
                        placeholder="MM/AA" 
                        maxLength={5}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4.5 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-mono"
                        value={cardForm.expiry}
                        onChange={e => setCardForm({...cardForm, expiry: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-0.5">CVC / Clave</label>
                      <input 
                        required
                        type="password"
                        placeholder="•••" 
                        maxLength={4}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4.5 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-mono"
                        value={cardForm.cvc}
                        onChange={e => setCardForm({...cardForm, cvc: e.target.value})}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={paymentProcessing}
                    className="w-full mt-4 bg-love hover:bg-opacity-95 text-white py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 outline-none border-none cursor-pointer"
                  >
                    {paymentProcessing ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Procesando...
                      </>
                    ) : `PAGAR $${selectedComboForPurchase.price}`}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-12"
    >
      {/* Sliding Promotion Banners (Pedidos Ya Argentina Vibe) */}
      <div className="col-span-12 order-first mb-2">
        <div className="relative w-full overflow-hidden rounded-[2rem] h-[200px] md:h-[260px] shadow-xl border border-slate-200/50 bg-slate-900 group">
          {/* Admin edit visual button */}
          {(profile?.role === 'admin' || realProfile?.role === 'admin') && (
            <button
              onClick={() => {
                const b = bannerList[currentSlide];
                setEditingBannerData({
                  index: currentSlide,
                  id: b.id,
                  title: b.title || '',
                  subtitle: b.subtitle || '',
                  imageUrl: b.imageUrl || '',
                  linkUrl: b.linkUrl || '',
                  bgColor: b.bgColor || '#ef4444',
                  textColor: b.textColor || '#ffffff',
                  buttonText: b.buttonText || '',
                });
                setIsEditingBanner(true);
              }}
              className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-950 text-white p-2.5 rounded-full cursor-pointer transition-all z-30 flex items-center justify-center border border-white/20 shadow-lg active:scale-95"
              title="Editar banner actual"
            >
              <Pencil size={15} className="animate-pulse text-amber-300" />
            </button>
          )}

          {/* Active Banner Slide */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="absolute inset-0 w-full h-full"
            >
              <img 
                src={bannerList[currentSlide].imageUrl} 
                alt={bannerList[currentSlide].title || "Promoción"}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-[4000ms] ease-out"
              />
              {/* Subtle bottom shadow overlay to ensure button contrast regardless of the design, keeping the rest of the image fully bright */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 z-10 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    {bannerList[currentSlide].buttonText && (
                      <a 
                        href={bannerList[currentSlide].linkUrl || '#'}
                        style={{
                          backgroundColor: bannerList[currentSlide].bgColor || undefined,
                          color: bannerList[currentSlide].textColor || undefined,
                        }}
                        className="inline-block bg-love hover:bg-opacity-90 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 font-sans"
                      >
                        {bannerList[currentSlide].buttonText}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="bg-black/40 text-white/90 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-xs">
                      PROMO CRAFT
                    </span>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow border",
                      clientTier.id.includes('black') 
                        ? "bg-purple-600 border-purple-400 text-purple-100" 
                        : clientTier.id.includes('gold')
                        ? "bg-amber-500 border-amber-400 text-amber-950"
                        : "bg-love border-love/50 text-white"
                    )}>
                      {clientTier.name}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Side arrow controls */}
          <button 
            onClick={handlePrevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <button 
            onClick={handleNextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm"
          >
            <ArrowRight size={16} />
          </button>

          {/* Dots Indicator */}
          {bannerList.length > 1 && (
            <div className="absolute bottom-4 right-6 z-20 flex gap-1.5 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {bannerList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    idx === currentSlide ? "bg-love w-4" : "bg-white/40 hover:bg-white/70"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN PREMIOS RECOMENDADOS (Sugerido por el cliente) */}
      <div className="col-span-12 bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-2 relative group/recom">
        
        {(profile?.role === 'admin' || realProfile?.role === 'admin') && (
          <button
            onClick={() => {
              setRecomTitleForm(designConfig?.recomTitle || "Tus Próximos Premios");
              setRecomSubtitleForm(designConfig?.recomSubtitle || "Mira los premios preferidos de la comunidad y cuánto te falta para poder canjearlos.");
              setIsEditingRecom(true);
            }}
            className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-900 text-white p-2.5 rounded-full cursor-pointer transition-all z-20 flex items-center justify-center border border-white/20 shadow-lg active:scale-95"
            title="Editar título y subtítulo"
          >
            <Pencil size={15} className="animate-pulse text-amber-300" />
          </button>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Gift size={16} className="text-love animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-widest text-[#92400E] dark:text-amber-400">Recomendado para ti</span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
              {designConfig?.recomTitle || "Tus Próximos Premios"}
            </h3>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              {designConfig?.recomSubtitle || "Mira los premios preferidos de la comunidad y cuánto te falta para poder canjearlos."}
            </p>
          </div>

          <button 
            onClick={() => window.location.href = '#/rewards'}
            className="px-5 py-2.5 bg-slate-50 hover:bg-love/10 dark:bg-slate-950 text-love hover:text-love border border-slate-200/50 dark:border-slate-800 text-[10px] uppercase tracking-wider font-black rounded-xl transition-all self-start md:self-center"
          >
            Ver más premios 🎉
          </button>
        </div>

        {/* Grid List of 3 Recommended Prizes */}
        {popularPrizes.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Próximamente más premios disponibles</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Registra premios en el panel de administración para habilitar canjes rápidos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {popularPrizes.slice(0, 3).map((prize) => {
            const progress = Math.min((profile.points / prize.points_cost) * 150 - 50 < 0 ? 10 : (profile.points / prize.points_cost) * 100, 100);
            const needed = Math.max(prize.points_cost - profile.points, 0);
            const canRedeem = profile.points >= prize.points_cost;

            return (
              <div 
                key={prize.id}
                onClick={() => window.location.href = '#/rewards'}
                className="bg-slate-50/55 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-[1.5rem] overflow-hidden flex flex-col hover:border-love/30 dark:hover:border-love/35 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 group cursor-pointer shadow-xs"
              >
                {/* Prize Image */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-200/50 dark:bg-slate-800">
                  <img 
                    src={prize.image_url || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=400'} 
                    alt={prize.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Status Overlay Tag */}
                  <div className="absolute top-3 right-3 shrink-0">
                    {canRedeem ? (
                      <span className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-md animate-bounce flex items-center gap-1">
                        <Sparkles size={8} />  ¡Listo para Canje!
                      </span>
                    ) : (
                      <span className="bg-black/60 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg backdrop-blur-xs">
                        Te faltan {needed.toLocaleString()} pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Description */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <p className="text-xs font-black uppercase tracking-tight text-ink dark:text-white line-clamp-1 group-hover:text-love transition-colors">
                        {prize.title}
                      </p>
                      <p className="text-sm font-black text-love shrink-0">
                        {prize.points_cost} <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">pts</span>
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed mb-4 font-medium">
                      {prize.description || 'Sin descripción detallada.'}
                    </p>
                  </div>

                  <div>
                    {/* Real-time progress indicators */}
                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      <span>Progreso del canje</span>
                      <span>{Math.round(progress)}%</span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          canRedeem ? "bg-emerald-500 animate-pulse" : "bg-love"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Points Balance Card - Large Bento */}
      <div 
        style={{
          backgroundColor: designConfig?.pointsCardBg || undefined,
          color: designConfig?.pointsCardText || undefined,
        }}
        className={cn(
          "md:col-span-9 rounded-3xl p-8 flex flex-col justify-between border-4 border-slate-900/5 relative overflow-hidden group/card shadow-red order-1",
          designConfig?.pointsCardBg ? "" : "bg-love text-white"
        )}
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover/card:scale-110 transition-transform duration-700 pointer-events-none" />
        
        {(profile?.role === 'admin' || realProfile?.role === 'admin') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCardBgForm(designConfig?.pointsCardBg || '#ef4444');
              setCardTextForm(designConfig?.pointsCardText || '#ffffff');
              setButtonBgForm(designConfig?.profileButtonBg || 'rgba(255,255,255,0.1)');
              setButtonTextForm(designConfig?.profileButtonText || '#ffffff');
              setIsEditingPointsCard(true);
            }}
            className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-900 text-white p-2.5 rounded-full cursor-pointer transition-all z-20 flex items-center justify-center border border-white/25 shadow-lg active:scale-95"
            title="Editar diseño de tarjeta"
          >
            <Pencil size={15} className="animate-pulse text-amber-300" />
          </button>
        )}

        <div className="relative">
          <h2 className="text-xs md:text-sm uppercase font-bold tracking-widest opacity-80 mb-2">Saldo Actual Fidelidad</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl md:text-7xl font-black italic">{profile.points.toLocaleString()}</span>
            <span className="text-lg md:text-xl font-bold uppercase tracking-tighter">puntos</span>
          </div>
        </div>
        <div className="relative mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 justify-between items-center text-[10px] uppercase tracking-widest font-bold opacity-80">
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-2">
                <Award size={14} />
                {`Categoría: ${clientTier.name} (Multiplicador x${clientTier.multiplier})`}
              </span>
              <span className="text-white/40">| DNI: {profile.dni || 'No asignado'}</span>
              {soonToExpire > 0 && (
                <span className="bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-md text-[8px] font-black normal-case animate-pulse">
                  {soonToExpire} PTS vencen pronto
                </span>
              )}
            </div>
            {daysSinceLastCredit > 45 && !isCategoryReset && (
              <p className="text-rose-300 font-semibold normal-case text-[9px] tracking-normal mt-1 flex items-center gap-1">
                ⚠️ ¡Carga puntos antes de {inactivityLimit - daysSinceLastCredit} días para no descender de categoría!
              </p>
            )}
            {isCategoryReset && rawPuntosCargados > 0 && (
              <p className="text-slate-400 font-bold normal-case text-[9px] tracking-normal mt-1">
                ℹ️ Tu categoría se reinició por inactividad (+{inactivityLimit} días sin cargar). ¡Suma hoy para volver a subir!
              </p>
            )}
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            style={{
              backgroundColor: designConfig?.profileButtonBg || undefined,
              color: designConfig?.profileButtonText || undefined,
            }}
            className={cn(
              "px-4 py-2 rounded-xl transition-all border border-white/10 active:scale-95",
              designConfig?.profileButtonBg ? "" : "bg-white/10 hover:bg-white/20 text-white"
            )}
          >
            Editar Perfil
          </button>
        </div>

        {/* Modal Editar Perfil */}
        {/* Code resumes unaltered from here */}
        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white border border-slate-200 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-6 uppercase tracking-tight italic text-ink">Completar <span className="text-love">Mis Datos</span></h3>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                    <input 
                      required
                      placeholder="Tu nombre" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                      value={editForm.fullName} 
                      onChange={e => setEditForm({...editForm, fullName: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">DNI (Para el QR)</label>
                    <input 
                      required
                      placeholder="Tu DNI" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                      value={editForm.dni} 
                      onChange={e => setEditForm({...editForm, dni: e.target.value})} 
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200"
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

        {/* Modal Editar Diseño Tarjeta (Solo Admins) */}
        <AnimatePresence>
          {isEditingPointsCard && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/65 backdrop-blur-xs z-[110] flex items-center justify-center p-6 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative"
              >
                <div className="mb-6">
                  <span className="text-[9px] bg-amber-500/10 text-amber-600 font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Editor Visual de Tarjeta
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight text-ink dark:text-white mt-1">
                    Personalizar <span className="text-love">Mi Tarjeta de Puntos</span>
                  </h3>
                  <p className="text-slate-400 text-xs font-medium mt-1">Personaliza colores en tiempo real para todos los clientes.</p>
                </div>

                <div className="space-y-4">
                  {/* Card Background Color */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Color Fondo de Tarjeta</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent" 
                        value={cardBgForm} 
                        onChange={e => setCardBgForm(e.target.value)} 
                      />
                      <input 
                        placeholder="#ef4444" 
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-love text-ink dark:text-white font-mono" 
                        value={cardBgForm} 
                        onChange={e => setCardBgForm(e.target.value)} 
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#0f172a', '#7c2d12', '#1e293b'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCardBgForm(c)}
                          className="w-6 h-6 rounded-full border border-white hover:scale-110 transition-transform shadow-xs"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Card Text Color */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Color de Texto Tarjeta</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent" 
                        value={cardTextForm} 
                        onChange={e => setCardTextForm(e.target.value)} 
                      />
                      <input 
                        placeholder="#ffffff" 
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-love text-ink dark:text-white font-mono" 
                        value={cardTextForm} 
                        onChange={e => setCardTextForm(e.target.value)} 
                      />
                    </div>
                    <div className="flex gap-1.5 pt-1.5">
                      {['#ffffff', '#fecdd3', '#fed7aa', '#fef08a', '#e2e8f0', '#0f172a'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCardTextForm(c)}
                          className="px-2.5 py-1 text-[9px] uppercase font-bold rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                        >
                          {c === '#ffffff' ? 'Blanco' : c === '#0f172a' ? 'Oscuro' : c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button Background Color */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Color de Fondo - Botón "Editar Perfil"</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent" 
                        value={buttonBgForm.startsWith('rgba') ? '#ffffff' : buttonBgForm} 
                        onChange={e => setButtonBgForm(e.target.value)} 
                      />
                      <input 
                        placeholder="rgba(255,255,255,0.12)" 
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-love text-ink dark:text-white font-mono" 
                        value={buttonBgForm} 
                        onChange={e => setButtonBgForm(e.target.value)} 
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.25)', '#0f172a', '#ef4444', '#10b981', '#3b82f6', 'transparent'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setButtonBgForm(c)}
                          className="px-2 py-1 text-[9px] uppercase font-bold rounded-lg border border-slate-200/50 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                        >
                          {c === 'transparent' ? 'Transparente' : c.includes('rgba') ? 'Luminoso' : c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button Text Color */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Color de Texto - Botón "Editar Perfil"</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent" 
                        value={buttonTextForm} 
                        onChange={e => setButtonTextForm(e.target.value)} 
                      />
                      <input 
                        placeholder="#ffffff" 
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-love text-ink dark:text-white font-mono" 
                        value={buttonTextForm} 
                        onChange={e => setButtonTextForm(e.target.value)} 
                      />
                    </div>
                    <div className="flex gap-1.5 pt-1.5">
                      {['#ffffff', '#0f172a', '#ef4444', '#10b981', '#f59e0b'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setButtonTextForm(c)}
                          className="px-2.5 py-1 text-[9px] uppercase font-bold rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                        >
                          {c === '#ffffff' ? 'Blanco' : c === '#0f172a' ? 'Oscuro' : c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setIsEditingPointsCard(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSavePointsCardDesign}
                    className="flex-[2] bg-love text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-love/20 flex items-center justify-center gap-1.5"
                  >
                    <Check size={11} /> Guardar Cambios
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Editar Banner (Solo Admins) */}
        <AnimatePresence>
          {isEditingBanner && editingBannerData && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/65 backdrop-blur-xs z-[110] flex items-center justify-center p-6 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative my-8"
              >
                <div className="mb-6">
                  <span className="text-[9px] bg-love/10 text-love font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Editor de Slide / Banner {editingBannerData.index + 1}
                  </span>
                  <h3 className="text-xl font-black uppercase tracking-tight text-ink dark:text-white mt-1">
                    Personalizar <span className="text-love">Banner Promocional</span>
                  </h3>
                  <p className="text-slate-400 text-xs font-medium mt-1">Modifica la información, el botón y los colores de este slide.</p>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                  {/* Banner Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Título del Banner</label>
                    <input 
                      required
                      placeholder="Título promocional" 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold" 
                      value={editingBannerData.title} 
                      onChange={e => setEditingBannerData({...editingBannerData, title: e.target.value})} 
                    />
                  </div>

                  {/* Banner Subtitle */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subtítulo o Descripción</label>
                    <textarea 
                      required
                      rows={2}
                      placeholder="Detalle de la promoción..." 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-love text-ink dark:text-white" 
                      value={editingBannerData.subtitle} 
                      onChange={e => setEditingBannerData({...editingBannerData, subtitle: e.target.value})} 
                    />
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">URL de la Imagen</label>
                    <input 
                      required
                      placeholder="https://..." 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-mono text-[10px]" 
                      value={editingBannerData.imageUrl} 
                      onChange={e => setEditingBannerData({...editingBannerData, imageUrl: e.target.value})} 
                    />
                  </div>

                  {/* Link URL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Enlace del Botón (Link)</label>
                    <input 
                      placeholder="#/rewards o enlace externo..." 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-mono text-[10px]" 
                      value={editingBannerData.linkUrl} 
                      onChange={e => setEditingBannerData({...editingBannerData, linkUrl: e.target.value})} 
                    />
                  </div>

                  {/* Button Text */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Texto del Botón</label>
                    <input 
                      placeholder="Ej: Canjear Premio" 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold" 
                      value={editingBannerData.buttonText} 
                      onChange={e => setEditingBannerData({...editingBannerData, buttonText: e.target.value})} 
                    />
                  </div>

                  {/* Button Background Color (uses bgColor) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Color Fondo Botón Banner</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent" 
                        value={editingBannerData.bgColor} 
                        onChange={e => setEditingBannerData({...editingBannerData, bgColor: e.target.value})} 
                      />
                      <input 
                        placeholder="#ef4444" 
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-love text-ink dark:text-white font-mono" 
                        value={editingBannerData.bgColor} 
                        onChange={e => setEditingBannerData({...editingBannerData, bgColor: e.target.value})} 
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#0f172a', '#7c2d12', '#1e293b'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditingBannerData({...editingBannerData, bgColor: c})}
                          className="w-5 h-5 rounded-full border border-white hover:scale-110 transition-transform shadow-xs"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Button Text Color (uses textColor) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Color Texto Botón Banner</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent" 
                        value={editingBannerData.textColor} 
                        onChange={e => setEditingBannerData({...editingBannerData, textColor: e.target.value})} 
                      />
                      <input 
                        placeholder="#ffffff" 
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-love text-ink dark:text-white font-mono" 
                        value={editingBannerData.textColor} 
                        onChange={e => setEditingBannerData({...editingBannerData, textColor: e.target.value})} 
                      />
                    </div>
                    <div className="flex gap-1">
                      {['#ffffff', '#0f172a', '#fed7aa', '#f8fafc', '#ef4444'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditingBannerData({...editingBannerData, textColor: c})}
                          className="px-2.5 py-1 text-[8px] uppercase font-bold rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                        >
                          {c === '#ffffff' ? 'Blanco' : c === '#0f172a' ? 'Oscuro' : c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditingBanner(false);
                      setEditingBannerData(null);
                    }}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveBannerDesign}
                    className="flex-[2] bg-love text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-love/20 flex items-center justify-center gap-1.5"
                  >
                    <Check size={11} /> Guardar Cambios
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QR Code Card - Square Bento */}
      <div className="md:col-span-3 bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center text-center order-2 md:order-2">
        <div className="qr-container p-4 rounded-2xl mb-4 border-2 border-slate-50 shadow-sm flex items-center justify-center">
          <QRCode 
            value={`${window.location.origin}/#/waiter?dni=${profile.dni || profile.id}`} 
            size={120}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>
        <p className="text-[10px] uppercase font-bold text-love tracking-tighter">ID Cliente: {profile.dni || 'PENDIENTE'}</p>
        <p className="text-ink font-bold mt-1 text-sm">{profile.full_name}</p>
      </div>

      {/* prepaid combos section - Mis Pases y Tienda de abonos */}
      <div className="col-span-12 order-2 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {(() => {
          const combinedTxs = getCombinedTransactions();
          const avCombos = (designConfig as any).combos || [];
          const activeCombos = calculateComboBalances(combinedTxs, avCombos);
          const activeCombosForSale = avCombos.filter((c: any) => c.isActive);

          return (
            <>
              {/* Mis Combos/Pases Activos */}
              {activeCombos.length > 0 && (
                <div className="col-span-12 lg:col-span-6 bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
                      Mis Combos & Pases Activos
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Presenta el QR al mozo para descontar consumos</p>

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
                                <h5 className="text-[11px] font-black uppercase text-ink dark:text-white tracking-tight leading-none">{combo.title}</h5>
                                <span className="text-[9px] font-black text-emerald-500 bg-emerald-550/10 px-2 py-0.5 rounded-full">{combo.remaining} DISPONIBLES</span>
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
                              className="flex-1 py-2.5 bg-ink hover:bg-slate-950 text-white dark:bg-love rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none disabled:opacity-20 flex items-center justify-center gap-1.5"
                            >
                              📱 Usar Pase (QR)
                            </button>
                            {combo.remaining > 0 && (
                              <button
                                onClick={async () => {
                                  if (confirm(`¿Quieres canjear/descontar un consumo de tu "${combo.title}" de forma directa para probar?`)) {
                                    setComboRedeeming(combo.id);
                                    try {
                                      // Insert consumption transaction
                                      const newConsumeTx = {
                                        id: 'tx_local_' + Date.now(),
                                        client_id: profile.id,
                                        waiter_id: profile.id,
                                        amount: 0,
                                        points_earned: 0, // consumptions do not earn points
                                        branch: 'AUTOCANJE SMART',
                                        created_at: new Date().toISOString(),
                                        description: `CONSUMO_COMBO: ${combo.id}_1|${combo.title}`
                                      };

                                      // Save to local transactions cache so it displays instantly
                                      const existingStr = localStorage.getItem(`local_txs_${profile.id}`);
                                      const existing = existingStr ? JSON.parse(existingStr) : [];
                                      existing.push(newConsumeTx);
                                      localStorage.setItem(`local_txs_${profile.id}`, JSON.stringify(existing));

                                      // Try to push to Supabase as well
                                      await supabase.from('transactions').insert({
                                        client_id: profile.id,
                                        waiter_id: profile.id,
                                        amount: 0,
                                        points_earned: 0,
                                        branch: 'AUTOCANJE SMART',
                                        description: `CONSUMO_COMBO: ${combo.id}_1|${combo.title}`
                                      });

                                      // Force reload client stats dynamically
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
                                className="py-2.5 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-650 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none"
                              >
                                {comboRedeeming === combo.id ? 'Canjeando...' : 'Descontar 1 (Demo)'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tienda de Combos / Pases Prepago */}
              {activeCombosForSale.length > 0 && (
                <div className={cn(
                  "col-span-12 bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6",
                  activeCombos.length > 0 ? "lg:col-span-6" : ""
                )}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-love animate-ping" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
                      Ofertas de Combos & Pases Prepago
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Compra abonos con descuento garantizado y ahorra</p>

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
                            <h5 className="text-[11px] font-black uppercase text-ink dark:text-white tracking-tight leading-none mt-1">{combo.title}</h5>
                            <p className="text-[9px] text-slate-400 font-semibold line-clamp-1 max-w-xs">{combo.description}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-love">${combo.price.toLocaleString('es-AR')}</p>
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
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Dynamic Points Road Timeline with Animated Car (As requested) */}
      <div className="col-span-12 order-3 bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col gap-6 relative overflow-hidden group/ruta">
        
        {(profile?.role === 'admin' || realProfile?.role === 'admin') && (
          <button
            onClick={() => {
              setRutaTitleForm(designConfig?.rutaTitle || "Ruta de Puntos & Beneficios");
              setRutaSubtitleForm(designConfig?.rutaSubtitle || "Camino de Fidelidad Craft");
              setIsEditingRuta(true);
            }}
            className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-900 text-white p-2.5 rounded-full cursor-pointer transition-all z-20 flex items-center justify-center border border-white/20 shadow-lg active:scale-95"
            title="Editar título y subtítulo"
          >
            <Pencil size={15} className="animate-pulse text-amber-300" />
          </button>
        )}

        <div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-love mb-1 flex items-center gap-1.5">
                <Trophy size={11} className="text-yellow-500 animate-bounce" /> {designConfig?.rutaSubtitle || "Camino de Fidelidad Craft"}
              </span>
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
                {designConfig?.rutaTitle || "Ruta de Puntos & Beneficios"}
              </h3>
            </div>
            {/* Real-time exchange rate badge telling the client exactly what pesos each point is worth */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 font-black text-[10px] uppercase tracking-wider flex items-center gap-2 self-start md:self-auto shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Suma de Puntos: 1 Punto = ${ (settings?.points_conversion_rate || 1000).toLocaleString('es-AR') } Consumidos</span>
            </div>
          </div>
        </div>

        {/* The Asphalt Road Strip with the coffee cup */}
        <div className="relative py-12 md:py-16 px-4 md:px-8 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-sky-950/20 mt-2 overflow-hidden">
          
          {/* ROAD TRACK: Looks like a real asphalt road */}
          <div className="relative h-14 bg-slate-700 dark:bg-slate-800 rounded-2xl border-t-4 border-b-4 border-dashed border-slate-500 dark:border-slate-600 flex items-center shadow-inner">
            {/* Dashed center lane line (argentine/classic road styling) */}
            <div className="absolute left-0 right-0 h-0.5 border-t border-dashed border-white/20" />

            {/* Active completed path track (glows red/yellow) */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-yellow-500/25 via-love/20 to-love/35 rounded-l-xl transition-all duration-1000 ease-out" 
              style={{ width: `${getCarPercentage(categoryPoints)}%` }} 
            />

            {/* ROAD MILESTONES: visually placed on the road */}
            <div className="absolute inset-0 px-4 md:px-8 flex items-center justify-between pointer-events-none z-10">
              {[
                { 
                  pts: 0, 
                  label: activeTiers[0]?.name || 'CRAFT FAN', 
                  target: '0 PTS', 
                  pos: 15, 
                  icon: <Gift size={12} className="text-white" /> 
                },
                { 
                  pts: activeTiers[1]?.minPoints || 500, 
                  label: activeTiers[1]?.name || 'CRAFT GOLD', 
                  target: `${activeTiers[1]?.minPoints || 500} PTS`, 
                  pos: 55, 
                  icon: <Sparkles size={12} className="text-yellow-400" /> 
                },
                { 
                  pts: activeTiers[2]?.minPoints || 1000, 
                  label: activeTiers[2]?.name || 'CRAFT BLACK', 
                  target: `${activeTiers[2]?.minPoints || 1000} PTS`, 
                  pos: 90, 
                  icon: <Star size={12} className="text-purple-300 fill-purple-300" /> 
                }
              ].map((m, idx) => {
                const reached = categoryPoints >= m.pts;
                return (
                  <div 
                    key={idx}
                    className="absolute -translate-x-1/2 flex flex-col items-center gap-1"
                    style={{ left: `${m.pos}%` }}
                  >
                    {/* Road Pin Marker */}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md transition-all duration-700",
                      reached 
                        ? "bg-love border-white scale-110 text-white ring-4 ring-love/20" 
                        : "bg-slate-800 border-slate-600 text-slate-400"
                    )}>
                      {m.icon}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ANIMATED COFFEE CUP: Moves smoothly based on points */}
            <div 
              className="absolute transition-all duration-[1200ms] cubic-bezier(0.16, 1, 0.3, 1) -translate-x-1/2 z-30"
              style={{ left: `${getCarPercentage(categoryPoints)}%` }}
            >
              <div className="flex flex-col items-center">
                {/* Visual Speech Bubble above the coffee cup */}
                <div className="bg-slate-900 border border-love text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg mb-2.5 relative animate-bounce whitespace-nowrap">
                  <span>☕ {clientTier.name}</span>
                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-love rotate-45" />
                </div>
                
                {/* Stylized takeaway coffee cup */}
                <div className="relative group cursor-help flex flex-col items-center">
                  {/* Steam Effect */}
                  <div className="flex gap-1 mb-1 absolute -top-4 opacity-75">
                    <span className="w-0.5 h-2 bg-love rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-0.5 h-3 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-2 bg-love rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>

                  {/* Coffee Cup body */}
                  <div className="relative flex flex-col items-center filter drop-shadow-[0_4px_6px_rgba(230,57,70,0.4)]">
                    {/* Lid top */}
                    <div className="w-8 h-1.5 bg-slate-900 rounded-t-sm z-10" />
                    {/* Lid rim */}
                    <div className="w-9 h-1 bg-slate-800 rounded-sm z-10 -mt-0.5" />
                    {/* Cup container */}
                    <div className="w-7 h-11 bg-white rounded-b-md border border-slate-200 relative overflow-hidden flex items-center justify-center -mt-0.5" style={{ clipPath: 'polygon(3% 0%, 97% 0%, 82% 100%, 18% 100%)' }}>
                      {/* Vertical CRAFT text */}
                      <div className="text-[7.5px] font-black tracking-wider text-love select-none flex flex-col items-center justify-center leading-[1.05] mt-0.5 font-sans">
                        <span className="scale-y-110 font-black">C</span>
                        <span className="scale-y-110 font-black">R</span>
                        <span className="scale-y-110 font-black">A</span>
                        <span className="scale-y-110 font-black">F</span>
                        <span className="scale-y-110 font-black">T</span>
                      </div>
                    </div>
                  </div>

                  {/* Pulse Indicator at bottom */}
                  <span className="absolute -bottom-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-love opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-love"></span>
                  </span>
                </div>
              </div>
            </div>
            
          </div>

          {/* LABELS BELOW ROAD */}
          <div className="relative mt-4 h-16">
            {[
              { 
                pts: 0, 
                label: activeTiers[0]?.name || 'CRAFT FAN', 
                target: '0 PTS', 
                pos: 15, 
                benefit: 'Nivel Inicial' 
              },
              { 
                pts: activeTiers[1]?.minPoints || 500, 
                label: activeTiers[1]?.name || 'CRAFT GOLD', 
                target: `${(activeTiers[1]?.minPoints || 500).toLocaleString()} PTS`, 
                pos: 55, 
                benefit: `Bonus x${activeTiers[1]?.multiplier || 1.5}` 
              },
              { 
                pts: activeTiers[2]?.minPoints || 1000, 
                label: activeTiers[2]?.name || 'CRAFT BLACK', 
                target: `${(activeTiers[2]?.minPoints || 1000).toLocaleString()} PTS`, 
                pos: 90, 
                benefit: `Bonus x${activeTiers[2]?.multiplier || 2.0}`
              }
            ].map((m, idx) => {
              const reached = categoryPoints >= m.pts;
              return (
                <div 
                  key={idx}
                  className="absolute -translate-x-1/2 text-center"
                  style={{ left: `${m.pos}%` }}
                >
                  <p className={cn(
                    "text-[10px] md:text-xs font-black uppercase truncate max-w-[80px] md:max-w-[120px]",
                    reached ? "text-love" : "text-slate-400"
                  )}>
                    {m.label}
                  </p>
                  <p className="text-[8px] md:text-[9px] text-[#A06C00] font-black uppercase mt-0.5 tracking-tight">
                    {m.target}
                  </p>
                  <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1 max-w-[70px] md:max-w-[100px] leading-tight font-sans">
                    {m.benefit}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

        {/* CONTEXTUAL HOVER TIP OR SUCCESS MESSAGE */}
        <div className="bg-love/5 dark:bg-love/5 border border-love/15 p-4 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Sparkles className="text-love animate-pulse shrink-0" size={18} />
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-normal text-left">
              <span><strong>Tus Puntos de Categoría: {categoryPoints.toLocaleString()}</strong> (acumulados Historial de cargas: {rawPuntosCargados.toLocaleString()} PTS). Tu categoría se calcula en base a tus puntos cargados totales (sin descontar canjes realizados). {isCategoryReset && '⚠️ Por inactividad de más de ' + inactivityLimit + ' días sin cargar puntos, tu categoría se ha restablecido temporalmente a 0.'}</span>
            </p>
          </div>
          
          <div className="pl-7 text-left text-[10px] text-slate-500 space-y-1 leading-relaxed">
            <p className="font-semibold">• 📅 <strong>Vencimiento para canjes:</strong> Tus puntos tienen una vigencia inicial de {expirationMonths} meses para ser canjeados por premios.</p>
            <p className="font-semibold">• ⚡ <strong>Inactividad de Categoría:</strong> Con una inactividad de {inactivityLimit} días sin registrar cargas de puntos, tu categoría de beneficios descenderá a 0 (CRAFT FAN).</p>
            <p className="font-semibold">• {clientTier.id.includes('black') ? (
              <span>✨ ¡Felicidades! Estás en el nivel máximo <strong>{clientTier.name}</strong> obteniendo {clientTier.benefits}</span>
            ) : (
              <span>📈 Nivel actual: <strong>{clientTier.name}</strong> ({clientTier.benefits}). Próximo nivel requiere {activeTiers[clientTier.id.includes('gold') ? 2 : 1]?.minPoints} puntos.</span>
            )}</p>
          </div>
        </div>

      </div>
      {/* Redesigned & Beautiful Full-Width "Cargas y Canjes" Panel (As requested) */}
      <div className="col-span-12 bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none order-4 relative group/tx">
        
        {(profile?.role === 'admin' || realProfile?.role === 'admin') && (
          <button
            onClick={() => {
              setTxTitleForm(designConfig?.txTitle || "Cargas & Canjes Realizados");
              setTxSubtitleForm(designConfig?.txSubtitle || "Visualiza el historial detallado de tus transacciones y canjes de premios en CRAFT.");
              setIsEditingTx(true);
            }}
            className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-900 text-white p-2.5 rounded-full cursor-pointer transition-all z-20 flex items-center justify-center border border-white/20 shadow-lg active:scale-95"
            title="Editar título y subtítulo"
          >
            <Pencil size={15} className="animate-pulse text-amber-300" />
          </button>
        )}

        {/* Header with Switch Tabs and Icon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <History size={16} className="text-love animate-pulse" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-900 dark:text-slate-100 bg-slate-100/60 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg">
                Mis Movimientos
              </span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
              {designConfig?.txTitle || "Cargas & Canjes Realizados"}
            </h3>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              {designConfig?.txSubtitle || "Visualiza el historial detallado de tus transacciones y canjes de premios en CRAFT."}
            </p>
          </div>

          {/* Elegant Pill Switch Tabs */}
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 self-start md:self-center">
            <button 
              onClick={() => setActiveHistoryTab('all')}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                activeHistoryTab === 'all' 
                  ? "bg-white dark:bg-slate-800 text-love shadow-sm font-black" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              📈 Puntos Cargados
            </button>
            <button 
              onClick={() => setActiveHistoryTab('canjes')}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                activeHistoryTab === 'canjes' 
                  ? "bg-white dark:bg-slate-800 text-love shadow-sm font-black" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              🎁 Premios Canjeados
            </button>
          </div>
        </div>

        {/* Micro-Metrics Grid to enrich user insight and make it friendly */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-2xl border border-emerald-100/40 dark:border-emerald-950/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Total Acumulado</p>
              <p className="text-base font-black italic text-emerald-600 dark:text-emerald-400">
                {transactions.filter(t => t.points_earned > 0).reduce((sum, tx) => sum + tx.points_earned, 0).toLocaleString()} PTS
              </p>
            </div>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/10 p-4 rounded-2xl border border-rose-100/40 dark:border-rose-950/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-love shrink-0">
              <Gift size={16} />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Puntos Canjeados</p>
              <p className="text-base font-black italic text-love">
                {Math.abs(transactions.filter(t => t.points_earned < 0).reduce((sum, tx) => sum + tx.points_earned, 0)).toLocaleString()} PTS
              </p>
            </div>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-100/40 dark:border-blue-950/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Award size={16} />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Estatus del Perfil</p>
              <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                {clientTier.name} (x{clientTier.multiplier})
              </p>
            </div>
          </div>
        </div>

        {/* Beautiful Grid List of Transactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-12 text-center py-12 text-slate-300 dark:text-slate-700 animate-pulse uppercase tracking-[0.2em] text-xs font-black">
              Cargando historial...
            </div>
          ) : (() => {
            const filteredTx = transactions.filter(tx => 
              activeHistoryTab === 'all' 
                ? (tx.points_earned > 0 || (tx.description && tx.description.includes('COMPRA_COMBO:'))) 
                : (tx.points_earned < 0 || (tx.description && tx.description.includes('CONSUMO_COMBO:')))
            );
            
            if (filteredTx.length === 0) {
              return (
                <div className="col-span-12 text-center text-slate-400 dark:text-slate-500 text-xs font-bold uppercase py-16 italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                  Sin {activeHistoryTab === 'all' ? 'cargas de puntos registradas' : 'premios canjeados aún'}
                </div>
              );
            }

            return filteredTx.map((tx) => (
              <div 
                key={tx.id}
                className="bg-slate-50/50 dark:bg-slate-950/45 p-5 rounded-2xl flex flex-col justify-between border border-slate-100 dark:border-slate-800/80 group hover:border-love/30 dark:hover:border-love/40 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-xs duration-350"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                      tx.points_earned > 0 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                        : "bg-love/10 text-love border-love/30"
                    )}>
                      {tx.points_earned > 0 ? '📈 Carga' : '🎁 Canje'}
                    </span>
                    <span className="text-[9px] text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-2xs border border-slate-200/10">
                      <Calendar size={10} className="text-slate-500 dark:text-slate-450" />
                      {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <p className="text-xs font-black uppercase text-ink dark:text-white line-clamp-2 tracking-tight leading-snug mb-1">
                    {tx.description}
                  </p>
                  
                  <p className="text-[10px] text-slate-605 dark:text-slate-350 font-semibold flex items-center gap-1 mb-3">
                    📍 {tx.branch || 'Sucursal Principal'}
                  </p>
                </div>

                <div className="border-t border-slate-100/80 dark:border-slate-800/80 pt-3 flex items-center justify-between mt-2">
                  <div className="space-y-1">
                    {tx.redemption_code && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400">Código:</span>
                        <span className="bg-ink dark:bg-slate-800 text-white dark:text-slate-200 px-2 py-0.5 rounded-md font-mono text-[9px] font-black italic tracking-widest">
                          {tx.redemption_code}
                        </span>
                      </div>
                    )}
                    {tx.invoice_number && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black uppercase text-slate-500 dark:text-slate-400">Factura:</span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono text-[9px] font-bold tracking-tight border border-slate-250/10">
                          {tx.invoice_number}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className={cn(
                      "font-black italic text-lg leading-none",
                      tx.points_earned > 0 ? "text-emerald-500" : "text-love"
                    )}>
                      {tx.points_earned > 0 ? '+' : ''}{tx.points_earned.toLocaleString()}
                      <span className="text-[9px] uppercase font-bold tracking-tighter not-italic ml-0.5">pts</span>
                    </p>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
        
        {transactions.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800/80 mt-8 pt-4 flex justify-end">
            <button 
              className="px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-love transition-colors flex items-center gap-1.5"
              onClick={() => window.location.href = '#/rewards'}
            >
              Ir a la Tienda de Premios <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Modal Editar Recomendados (Solo Admins) */}
      <AnimatePresence>
        {isEditingRecom && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/65 backdrop-blur-xs z-[120] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative"
            >
              <div className="mb-6">
                <span className="text-[9px] bg-love/10 text-love font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  Editor de Sección
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-ink dark:text-white mt-1">
                  Personalizar <span className="text-love">Premios Recomendados</span>
                </h3>
                <p className="text-slate-400 text-xs font-medium mt-1">Personaliza títulos y descripciones del bloque.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 ml-1">Título de la sección</label>
                  <input 
                    required
                    placeholder="Tus Próximos Premios" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold" 
                    value={recomTitleForm} 
                    onChange={e => setRecomTitleForm(e.target.value)} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 ml-1">Subtítulo / Descripción</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Mira los premios preferidos..." 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-love text-ink dark:text-white" 
                    value={recomSubtitleForm} 
                    onChange={e => setRecomSubtitleForm(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsEditingRecom(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-705"
                >
                  Cerrar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveRecomDesign}
                  className="flex-[2] bg-love text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-love/20 flex items-center justify-center gap-1.5"
                >
                  <Check size={11} /> Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Ruta (Solo Admins) */}
      <AnimatePresence>
        {isEditingRuta && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/65 backdrop-blur-xs z-[120] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative"
            >
              <div className="mb-6">
                <span className="text-[9px] bg-love/10 text-love font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  Editor de Sección
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-ink dark:text-white mt-1">
                  Personalizar <span className="text-love">Ruta de Puntos</span>
                </h3>
                <p className="text-slate-400 text-xs font-medium mt-1">Personaliza el título y texto superior del camino del cliente.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 ml-1">Título de la sección</label>
                  <input 
                    required
                    placeholder="Ruta de Puntos & Beneficios" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold" 
                    value={rutaTitleForm} 
                    onChange={e => setRutaTitleForm(e.target.value)} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-455 ml-1">Subtítulo / Slogan de etiqueta</label>
                  <input 
                    required
                    placeholder="Camino de Fidelidad Craft" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold" 
                    value={rutaSubtitleForm} 
                    onChange={e => setRutaSubtitleForm(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsEditingRuta(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-705"
                >
                  Cerrar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveRutaDesign}
                  className="flex-[2] bg-love text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-love/20 flex items-center justify-center gap-1.5"
                >
                  <Check size={11} /> Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Historial (Solo Admins) */}
      <AnimatePresence>
        {isEditingTx && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/65 backdrop-blur-xs z-[120] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative"
            >
              <div className="mb-6">
                <span className="text-[9px] bg-love/10 text-love font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  Editor de Sección
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-ink dark:text-white mt-1">
                  Personalizar <span className="text-love">Historial de Movimientos</span>
                </h3>
                <p className="text-slate-400 text-xs font-medium mt-1">Personaliza títulos y descripciones del historial.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 ml-1">Título de la sección</label>
                  <input 
                    required
                    placeholder="Cargas & Canjes Realizados" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold" 
                    value={txTitleForm} 
                    onChange={e => setTxTitleForm(e.target.value)} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 ml-1">Subtítulo / Descripción</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="Visualiza el historial detallado..." 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-love text-ink dark:text-white" 
                    value={txSubtitleForm} 
                    onChange={e => setTxSubtitleForm(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsEditingTx(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-705"
                >
                  Cerrar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveTxDesign}
                  className="flex-[2] bg-love text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-love/20 flex items-center justify-center gap-1.5"
                >
                  <Check size={11} /> Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal QR de Combo/Pase Activo */}
      <AnimatePresence>
        {activeQRCodeCombo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/75 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
            onClick={() => setActiveQRCodeCombo(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl text-center relative space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-1">
                <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                  🎫 Pase Activo
                </span>
                <h4 className="text-base font-black uppercase text-ink dark:text-white mt-1 leading-snug">{activeQRCodeCombo.title}</h4>
                <p className="text-xs text-slate-400 font-semibold">{activeQRCodeCombo.remaining} consumos disponibles de {activeQRCodeCombo.totalPurchased}</p>
              </div>

              {/* QR Container */}
              <div className="qr-container p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-850 shadow-inner flex flex-col items-center justify-center mx-auto w-48 h-48">
                <QRCode 
                  value={`COMBO_USE:${activeQRCodeCombo.id}|client_id:${profile.id}`} 
                  size={144}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-slate-405 font-bold uppercase leading-relaxed px-4">
                  Muestra este código QR al mozo para registrar el consumo en la sucursal.
                </p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-[10px] font-semibold text-amber-600 dark:text-amber-400 leading-normal text-left">
                  <strong>💡 Probar como Mozo (Demo):</strong> Si estás testeando, puedes usar el botón de abajo para simular que un mozo escanea y canjea tu pase en tiempo real.
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setActiveQRCodeCombo(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer border-none hover:bg-slate-200"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setActiveQRCodeCombo(null);
                    setComboRedeeming(activeQRCodeCombo.id);
                    try {
                      const newConsumeTx = {
                        id: 'tx_local_' + Date.now(),
                        client_id: profile.id,
                        waiter_id: profile.id,
                        amount: 0,
                        points_earned: 0,
                        branch: 'AUTOCANJE SMART',
                        created_at: new Date().toISOString(),
                        description: `CONSUMO_COMBO: ${activeQRCodeCombo.id}_1|${activeQRCodeCombo.title}`
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
                        description: `CONSUMO_COMBO: ${activeQRCodeCombo.id}_1|${activeQRCodeCombo.title}`
                      });

                      fetchClientData();
                      alert(`¡Canje procesado correctamente! Se descontó 1 uso de tu "${activeQRCodeCombo.title}".`);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setComboRedeeming(null);
                    }
                  }}
                  className="flex-1 bg-emerald-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest cursor-pointer border-none shadow-md shadow-emerald-500/10"
                >
                  Confirmar Uso
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Pasarela de Pago (Prueba de Sandbox integrada con Mercado Pago / Tarjeta) */}
      <AnimatePresence>
        {isCheckoutModalOpen && selectedComboForPurchase && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/75 backdrop-blur-sm z-[150] flex items-center justify-center p-6 overflow-y-auto"
            onClick={() => setIsCheckoutModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative space-y-6"
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
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">A pagar</p>
                  <p className="text-lg font-black text-love">${selectedComboForPurchase.price.toLocaleString('es-AR')}</p>
                </div>
              </div>

              {/* Order summary card */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                {selectedComboForPurchase.imageUrl ? (
                  <img src={selectedComboForPurchase.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center font-bold text-xs text-slate-450">Pack</div>
                )}
                <div className="text-left space-y-0.5">
                  <h6 className="text-[11px] font-black uppercase text-ink dark:text-white">{selectedComboForPurchase.title}</h6>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Incluye {selectedComboForPurchase.totalUses} pases libres para consumir</p>
                </div>
              </div>

              {/* Mercado Pago Real/Configurable Payment Channel */}
              <div className="space-y-3.5 pt-2">
                <button
                  type="button"
                  disabled={isCreatingPreference}
                  onClick={() => handlePayWithMercadoPago(selectedComboForPurchase)}
                  className="w-full bg-[#009ee3] hover:bg-[#008ac6] active:scale-[0.99] text-white font-black py-4 px-6 rounded-2xl text-xs uppercase tracking-widest cursor-pointer border-none shadow-lg shadow-[#009ee3]/20 flex items-center justify-center gap-2.5 transition-all"
                >
                  {isCreatingPreference ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generando Link de Pago...
                    </>
                  ) : (
                    <>
                      <span className="text-sm">⚡</span> Pagar con Mercado Pago
                    </>
                  )}
                </button>

                <button 
                  type="button" 
                  onClick={() => setIsCheckoutModalOpen(false)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
