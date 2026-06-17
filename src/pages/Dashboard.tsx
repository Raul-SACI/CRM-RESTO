import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/App';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, Award, TrendingUp, History, Users, 
  Gift, Calendar, ChevronRight, BarChart3, PieChart,
  Flag, Sparkles, Car, Trophy, ArrowLeft, ArrowRight, Star
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Transaction, SystemSettings, Profile } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { useDesign } from '@/src/components/DesignEngine';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie 
} from 'recharts';

export function Dashboard() {
  const { profile } = useAuth();
  const { designConfig } = useDesign();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'canjes'>('all');
  const [editForm, setEditForm] = useState({ fullName: '', dni: '' });

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

  const getCarPercentage = (pts: number) => {
    if (pts <= 0) return 10;
    if (pts >= 2000) return 90;
    if (pts <= 500) {
      return 10 + (pts / 500) * 25;
    } else if (pts <= 1000) {
      return 35 + ((pts - 500) / 500) * 30;
    } else {
      return 65 + ((pts - 1000) / 1000) * 25;
    }
  };

  // Admin Stats
  const [adminStats, setAdminStats] = useState<{
    totalClients: number;
    upcomingBirthdays: Profile[];
    weeklyRedemptions: number;
    leaderboard: Profile[];
    ageData: { range: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    if (profile) {
      setEditForm({ fullName: profile.full_name, dni: profile.dni || '' });
      
      let isMounted = true;
      
      const fetchClientData = async () => {
        const cached = localStorage.getItem(`tx_cache_${profile.id}`);
        if (cached && isMounted) {
          try {
            setTransactions(JSON.parse(cached));
          } catch (e) {
            console.error("TX cache error:", e);
          }
        }

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('client_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (isMounted && !error && data) {
          setTransactions(data);
          localStorage.setItem(`tx_cache_${profile.id}`, JSON.stringify(data));
        }
      };

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
            localStorage.setItem('admin_stats_cache', JSON.stringify(freshStats));
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

      if (profile.role === 'admin') {
        fetchAdminStats().finally(() => { if (isMounted) setLoading(false); });
      } else {
        fetchClientData();
        setLoading(false);
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

  if (!profile || (loading && !adminStats && profile.role === 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center min-h-[60vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-love border-t-transparent rounded-full mb-6"
        />
        <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter text-ink">
          {profile?.role === 'admin' ? 'Cargando Dashboard Administrativo' : 'Sincronizando Perfil'}
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-12"
    >
      {/* Sliding Promotion Banners (Pedidos Ya Argentina Vibe) */}
      <div className="col-span-12 order-first mb-2">
        <div className="relative w-full overflow-hidden rounded-[2rem] h-[200px] md:h-[260px] shadow-xl border border-slate-200/50 bg-slate-900 group">
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
                alt={bannerList[currentSlide].title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[4000ms] ease-out opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/85 to-transparent" />
              
              <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8 z-10 max-w-2xl">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-love text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg shadow-love/30 flex items-center gap-1">
                      <Sparkles size={8} className="animate-spin" /> PROMO CRAFT
                    </span>
                    {profile.points >= 2000 ? (
                      <span className="bg-purple-600 text-purple-100 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                        CLUB BLACK ACTIVO
                      </span>
                    ) : profile.points >= 1000 ? (
                      <span className="bg-amber-500 text-amber-950 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                        CLUB PREMIUM ACTIVO
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-xl md:text-3.5xl font-black text-white leading-tight uppercase tracking-tighter" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
                    {bannerList[currentSlide].title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 mt-2 font-medium leading-relaxed max-w-md line-clamp-2">
                    {bannerList[currentSlide].subtitle}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {bannerList[currentSlide].buttonText && (
                    <a 
                      href={bannerList[currentSlide].linkUrl || '#'}
                      className="bg-love hover:bg-love/90 text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-love/30 active:scale-95 font-sans"
                    >
                      {bannerList[currentSlide].buttonText}
                    </a>
                  )}
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

      {/* Points Balance Card - Large Bento */}
      <div className="md:col-span-9 bg-love rounded-3xl p-8 flex flex-col justify-between border-4 border-slate-900/5 relative overflow-hidden group shadow-red order-1 text-white">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
        <div className="relative">
          <h2 className="text-xs md:text-sm uppercase font-bold tracking-widest opacity-80 mb-2">Saldo Actual Fidelidad</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl md:text-7xl font-black italic">{profile.points.toLocaleString()}</span>
            <span className="text-lg md:text-xl font-bold uppercase tracking-tighter">puntos</span>
          </div>
        </div>
        <div className="relative mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 justify-between items-center text-[10px] uppercase tracking-widest font-bold opacity-80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <Award size={14} />
              {profile.points >= 2000 ? 'Cliente BLACK (Multiplicador x2.0)' : profile.points >= 1000 ? 'Cliente PREMIUM (Multiplicador x1.5)' : 'Cliente Preferred'}
            </span>
            <span className="text-white/40">DNI: {profile.dni || 'No asignado'}</span>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all border border-white/10 active:scale-95"
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

      {/* Dynamic Points Road Timeline with Animated Car (As requested) */}
      <div className="col-span-12 order-3 bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col gap-6 relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-love mb-1 flex items-center gap-1.5">
                <Trophy size={11} className="text-yellow-500 animate-bounce" /> Camino de Fidelidad Craft
              </span>
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
                Ruta de Puntos & Beneficios
              </h3>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-700 font-bold text-xs flex items-center gap-2 text-ink dark:text-slate-300">
              <span>Tu Saldo:</span>
              <span className="text-love font-black italic">{profile.points.toLocaleString()} PTS</span>
            </div>
          </div>
          
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-2xl font-medium">
            ¡Suma puntos con tus consumos y haz avanzar tu vasito de café CRAFT! Al llegar a <span className="font-bold text-love">1.000 pts</span> te conviertes en miembro <span className="font-bold text-love">PREMIUM (obteniendo x1.5 en tus consumos)</span> y a los <span className="font-bold text-love">2.000 pts</span> desbloqueas miembro <span className="font-bold text-love">BLACK (duplicas puntos x2.0 + máximos beneficios)</span>.
          </p>
        </div>

        {/* The Asphalt Road Strip with the coffee cup */}
        <div className="relative py-12 md:py-16 px-4 md:px-8 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-sky-950/20 mt-2 overflow-hidden">
          
          {/* ROAD TRACK: Looks like a real asphalt road */}
          <div className="relative h-14 bg-slate-700 dark:bg-slate-800 rounded-2xl border-t-4 border-b-4 border-dashed border-slate-500 dark:border-slate-600 flex items-center shadow-inner">
            {/* Dashed center lane line (argentine/classic road styling) */}
            <div className="absolute left-0 right-0 h-0.5 border-t border-dashed border-yellow-400 opacity-60 z-10" />
            
            {/* Active completed path track (glows red/yellow) */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-yellow-500/25 via-love/20 to-love/35 rounded-l-xl transition-all duration-1000 ease-out" 
              style={{ width: `${getCarPercentage(profile.points)}%` }} 
            />

            {/* ROAD MILESTONES: visually placed on the road */}
            <div className="absolute inset-0 px-4 md:px-8 flex items-center justify-between pointer-events-none z-10">
              {[
                { pts: 0, label: 'Inicio', target: '0 pts', pos: 10, icon: <Flag size={12} className="text-white" /> },
                { pts: 500, label: 'Coffee Lover', target: '500 pts', pos: 35, icon: <Gift size={12} className="text-white" /> },
                { pts: 1000, label: 'PREMIUM (x1.5)', target: '1K pts', pos: 65, icon: <Sparkles size={12} className="text-yellow-400" /> },
                { pts: 2000, label: 'BLACK (x2.0)', target: '2K pts', pos: 90, icon: <Star size={12} className="text-purple-300 fill-purple-300" /> }
              ].map((m, idx) => {
                const reached = profile.points >= m.pts;
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
              style={{ left: `${getCarPercentage(profile.points)}%` }}
            >
              <div className="flex flex-col items-center">
                {/* Visual Speech Bubble above the coffee cup */}
                <div className="bg-slate-900 border border-love text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg mb-2.5 relative animate-bounce whitespace-nowrap">
                  <span>☕ CRAFT LOVER</span>
                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-love rotate-45" />
                </div>
                
                {/* Stylized premium takeaway coffee cup */}
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
              { pts: 0, label: 'Inicio', target: '0 pts', pos: 10, benefit: 'Pref. Club' },
              { pts: 500, label: 'Coffee', target: '500 pts', pos: 35, benefit: 'Premio Especial' },
              { pts: 1000, label: 'Premium', target: '1.000 pts', pos: 65, benefit: 'Multiplicador x1.5' },
              { pts: 2000, label: 'Black Tier', target: '2.000 pts', pos: 90, benefit: 'Multiplicador x2.0' }
            ].map((m, idx) => {
              const reached = profile.points >= m.pts;
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
        <div className="bg-love/5 dark:bg-love/5 border border-love/15 p-4 rounded-2xl flex items-center gap-3">
          <Sparkles className="text-love animate-pulse shrink-0" size={18} />
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-normal">
            {profile.points >= 2000 ? (
              <span><strong>¡Felicidades, eres CLUB BLACK!</strong> Accedes a todos los beneficios premium, tienes prioridad en eventos y tus consumos de mozos duplican puntos (x2.0 puntos).</span>
            ) : profile.points >= 1000 ? (
              <span><strong>¡Estás en CLUB PREMIUM!</strong> Tus sumas rinden más con un multiplicador de x1.5 puntos. Te faltan <strong>{(2000 - profile.points).toLocaleString()} puntos</strong> para llegar al nivel <strong>CLUB BLACK (Doble Puntos)</strong>. Let\'s go!</span>
            ) : (
              <span>Te faltan <strong>{(1000 - profile.points).toLocaleString()} puntos</strong> para alcanzar el estatus de <strong>CLUB PREMIUM (Desbloquear multiplicador x1.5 en todos tus consumos)</strong>. ¡Ven a visitarnos y suma más puntos hoy!</span>
            )}
          </p>
        </div>
      </div>

      {/* Recent Activity Card - Side Bento */}
      <div className="md:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 order-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveHistoryTab('all')}
              className={cn(
                "uppercase tracking-widest text-[10px] font-black transition-all",
                activeHistoryTab === 'all' ? "text-ink border-b-2 border-love pb-1" : "text-slate-400"
              )}
            >
              Cargas
            </button>
            <button 
              onClick={() => setActiveHistoryTab('canjes')}
              className={cn(
                "uppercase tracking-widest text-[10px] font-black transition-all",
                activeHistoryTab === 'canjes' ? "text-ink border-b-2 border-love pb-1" : "text-slate-400"
              )}
            >
              Canjes
            </button>
          </div>
          <History size={14} className="text-slate-500" />
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-200 animate-pulse uppercase tracking-[0.2em] text-[10px] font-black">Cargando...</div>
          ) : (() => {
            const filteredTx = transactions.filter(tx => 
              activeHistoryTab === 'all' ? tx.points_earned > 0 : tx.points_earned < 0
            );
            
            if (filteredTx.length === 0) {
              return <div className="text-center text-slate-400 text-[10px] font-bold uppercase py-12 italic border-2 border-dashed border-slate-50 rounded-2xl">Sin {activeHistoryTab === 'all' ? 'cargas' : 'canjes'}</div>;
            }

            return filteredTx.map((tx) => (
              <div 
                key={tx.id}
                className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 group hover:border-love/20 transition-all font-sans"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase text-ink truncate tracking-tight">{tx.description}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1 font-mono">
                    {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} • {tx.branch}
                  </p>
                  {tx.redemption_code && (
                    <div className="mt-2 flex items-center gap-2">
                       <span className="text-[8px] font-black uppercase text-slate-300">Código:</span>
                       <span className="bg-ink text-white px-2 py-0.5 rounded-md font-mono text-[9px] font-black italic tracking-widest">
                         {tx.redemption_code}
                       </span>
                    </div>
                  )}
                  {tx.invoice_number && (
                    <div className="mt-2 flex items-center gap-2">
                       <span className="text-[8px] font-black uppercase text-slate-300">Factura:</span>
                       <span className="bg-slate-200 text-ink px-2 py-0.5 rounded-md font-mono text-[9px] font-black tracking-widest">
                         {tx.invoice_number}
                       </span>
                    </div>
                  )}
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className={cn(
                    "font-black italic text-base",
                    tx.points_earned > 0 ? "text-green-500" : "text-love"
                  )}>
                    {tx.points_earned > 0 ? '+' : ''}{tx.points_earned}
                  </p>
                </div>
              </div>
            ));
          })()}
        </div>
        
        {transactions.length > 0 && (
          <button 
            className="w-full mt-6 py-3 text-[9px] font-black uppercase tracking-[0.2rem] text-slate-400 border-t border-slate-50 hover:text-love transition-colors"
            onClick={() => window.location.href = '#/rewards'}
          >
            Ir a Premios <ChevronRight size={10} className="inline ml-1" />
          </button>
        )}
      </div>

      {/* Info Card - Square Bento */}
      <div className="md:col-span-8 bg-white rounded-3xl p-6 border border-slate-100 relative overflow-hidden group shadow-xl shadow-slate-200/50 order-5">
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado del Sistema</h2>
            </div>
            <p className="text-ink text-sm font-bold mb-1">Tu perfil está verificado y activo.</p>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              Sumas 1 punto por cada $ { (settings?.points_conversion_rate || 1000).toLocaleString('es-AR') } consumidos. Si eres <span className="font-bold text-love">CLUB PREMIUM (1.000+ pts)</span> multiplicas tus puntos ganados por <span className="font-bold text-love">1.5x</span>, y si eres <span className="font-bold text-love">CLUB BLACK (2.000+ pts)</span> los <span className="font-bold text-love">duplicas (2x)</span> automáticamente.
            </p>
          </div>
          <div className="mt-6 flex gap-3 text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-love/10 text-love px-3 py-1.5 rounded-lg border border-love/20">Programa Premium</span>
            <span className="bg-slate-100 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200">Válido en sucursal</span>
          </div>
        </div>
        <div className="absolute top-1/2 -right-12 -translate-y-1/2 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000 text-ink">
           <Award size={200} />
        </div>
      </div>
    </motion.div>
  );
}
