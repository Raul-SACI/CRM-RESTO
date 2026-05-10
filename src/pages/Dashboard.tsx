import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/App';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, Award, TrendingUp, History, Users, 
  Gift, Calendar, ChevronRight, BarChart3, PieChart
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { Transaction, SystemSettings, Profile } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie 
} from 'recharts';

export function Dashboard() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', dni: '' });

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
              Cliente Preferred
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
        <div className="bg-white p-4 rounded-2xl mb-4 border-2 border-slate-50 shadow-sm flex items-center justify-center">
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

      {/* Recent Activity Card - Side Bento */}
      <div className="md:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 order-3">
        <div className="flex items-center justify-between mb-6">
          <h3 className="uppercase tracking-widest text-[10px] font-bold text-slate-400">Actividad</h3>
          <History size={14} className="text-slate-500" />
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-200 animate-pulse uppercase tracking-[0.2em] text-[10px] font-black">Cargando...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-slate-400 text-[10px] font-bold uppercase py-4">Sin movimientos</div>
          ) : (
            transactions.map((tx) => (
              <div 
                key={tx.id}
                className="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-100"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase text-ink truncate opacity-90 tracking-tight">{tx.description}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <p className="text-love font-black italic text-sm">+{tx.points_earned}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Card - Square Bento */}
      <div className="md:col-span-8 bg-white rounded-3xl p-6 border border-slate-100 relative overflow-hidden group shadow-xl shadow-slate-200/50 order-4">
        <div className="flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado del Sistema</h2>
            </div>
            <p className="text-ink text-sm font-bold mb-1">Tu perfil está verificado y activo.</p>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              Sumas 1 punto por cada ${ (settings?.points_conversion_rate || 1000).toLocaleString('es-AR') } consumidos. Los puntos de cumpleaños (500 pts) se cargan automáticamente al iniciar sesión en tu fecha especial.
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
