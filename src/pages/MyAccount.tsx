import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/App';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { User, Key, History, Check, Loader2, Sparkles, RefreshCw, Eye, EyeOff, AlertCircle, HelpCircle, ChevronRight } from 'lucide-react';
import { Transaction } from '@/src/types';
import { cn } from '@/src/lib/utils';

export function MyAccount() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Profile fields editing
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setDni(profile.dni || '');
      fetchTransactions();
    }
  }, [profile]);

  // Si se llega con #/my-account?seccion=movimientos (o el hash incluye
  // 'movimientos'), hacemos scroll a la seccion de movimientos.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash.includes('movimientos')) {
      const t = setTimeout(() => {
        document.getElementById('mis-movimientos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const fetchTransactions = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getCombinedTransactions = () => {
    if (!profile) return [];
    // Solo la base es la fuente de verdad: evita duplicar usos/movimientos.
    return transactions;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProfileLoading(true);
    setProfileSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          dni: dni
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      if (refreshProfile) {
        await refreshProfile();
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert("Error al actualizar perfil: " + err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword.length < 6) {
      setPassError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Las contraseñas no coinciden.');
      return;
    }

    setPassLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPassSuccess('¡Contraseña cambiada con éxito!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Error al intentar actualizar la contraseña.');
    } finally {
      setPassLoading(false);
    }
  };

  if (!profile || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center min-h-[60vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-love border-t-transparent rounded-full mb-6"
        />
        <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter !text-slate-900">
          Sincronizando Cuenta
        </h2>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest">Espera un momento...</p>
      </div>
    );
  }

  const combinedTxs = getCombinedTransactions();

  // Filtros de movimientos
  const [filterType, setFilterType] = useState<'TODOS' | 'CARGA' | 'CANJE' | 'COMPRA' | 'USO'>('TODOS');
  const [filterDate, setFilterDate] = useState<string>('');

  const getTxTipo = (desc: string) => {
    if (desc.startsWith('CANJE')) return 'CANJE';
    if (desc.startsWith('COMPRA_COMBO')) return 'COMPRA';
    if (desc.startsWith('CONSUMO_COMBO')) return 'USO';
    return 'CARGA';
  };

  const filteredTxs = combinedTxs.filter((tx) => {
    const desc = tx.description || '';
    if (filterType !== 'TODOS' && getTxTipo(desc) !== filterType) return false;
    if (filterDate) {
      // Comparar por fecha local (YYYY-MM-DD)
      const d = new Date(tx.created_at);
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (localDate !== filterDate) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-lg sm:max-w-2xl lg:max-w-4xl mx-auto pb-10">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-love rounded-2xl flex items-center justify-center text-white shadow-lg shadow-love/35">
          <User size={20} />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase !text-slate-900 leading-none tracking-tight">Mi Cuenta</h2>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">Gestiona tus datos de acceso, credenciales e historial</p>
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5 text-left">
        <div className="flex items-center gap-2">
          <User size={16} className="text-love" />
          <h3 className="text-xs font-black uppercase tracking-wider !text-slate-900">Datos Personales</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email / Usuario</label>
              <input 
                disabled
                className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-500 outline-none"
                value={profile.email || ''}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">DNI / Documento</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white"
                value={dni}
                onChange={e => setDni(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {profileSuccess && (
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                  <Check size={12} /> ¡Datos actualizados!
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={profileLoading}
              className="py-2.5 px-6 bg-love text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-md shadow-love/15 hover:bg-opacity-95 flex items-center gap-2"
            >
              {profileLoading ? <Loader2 size={12} className="animate-spin" /> : 'Guardar Datos'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5 text-left">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-love" />
          <h3 className="text-xs font-black uppercase tracking-wider !text-slate-900">Cambiar Contraseña</h3>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1 relative">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                <label>Nueva Contraseña</label>
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  className="bg-transparent border-none text-slate-400 hover:text-love cursor-pointer p-0"
                >
                  {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <input 
                required
                type={showPass ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar Nueva Contraseña</label>
              <input 
                required
                type={showPass ? 'text' : 'password'}
                placeholder="Repite la contraseña"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {passError && (
            <div className="flex items-center gap-2 text-love bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 px-3.5 py-2.5 rounded-xl text-[10px] font-bold">
              <AlertCircle size={14} />
              <span>{passError}</span>
            </div>
          )}

          {passSuccess && (
            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 px-3.5 py-2.5 rounded-xl text-[10px] font-bold">
              <Check size={14} />
              <span>{passSuccess}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passLoading}
              className="py-2.5 px-6 bg-slate-900 hover:bg-slate-950 dark:bg-love text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none shadow-md"
            >
              {passLoading ? <Loader2 size={12} className="animate-spin" /> : 'Actualizar Contraseña'}
            </button>
          </div>
        </form>
      </div>

      {/* Transaction History Movements Card */}
      <div id="mis-movimientos" className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5 text-left scroll-mt-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-love" />
            <h3 className="text-xs font-black uppercase tracking-wider !text-slate-900">Mis Movimientos</h3>
          </div>
          <button 
            onClick={fetchTransactions}
            className="p-1 px-2 border-none bg-transparent hover:bg-slate-100 rounded-xl cursor-pointer text-slate-400 transition-colors flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider"
          >
            <RefreshCw size={10} /> Actualizar
          </button>
        </div>

        {/* Filtros rápidos */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(['TODOS', 'CARGA', 'CANJE', 'COMPRA', 'USO'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none",
                  filterType === t ? "bg-love text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {t === 'TODOS' ? 'Todos' : t === 'CARGA' ? 'Cargas' : t === 'CANJE' ? 'Canjes' : t === 'COMPRA' ? 'Compras' : 'Usos'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 outline-none focus:border-love/40"
            />
            {(filterType !== 'TODOS' || filterDate) && (
              <button
                onClick={() => { setFilterType('TODOS'); setFilterDate(''); }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest cursor-pointer border-none transition-all"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-slate-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <History size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            {combinedTxs.length === 0 ? (
              <>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Aún no registras movimientos</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Cualquier punto que cargues o premio que canjees aparecerá listado aquí.</p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sin resultados para este filtro</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Probá con otro tipo de movimiento u otra fecha.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
            {filteredTxs.map((tx) => {
              const desc = tx.description || '';
              const isCanje = desc.startsWith('CANJE');
              const isCompra = desc.startsWith('COMPRA_COMBO');
              const isUso = desc.startsWith('CONSUMO_COMBO');
              const tipo = isCanje ? 'CANJE' : isCompra ? 'COMPRA' : isUso ? 'USO' : 'CARGA';

              // Colores por tipo
              const tipoClass = isCanje
                ? "bg-love/10 text-love"
                : isCompra
                  ? "bg-amber-500/10 text-amber-600"
                  : isUso
                    ? "bg-slate-500/10 text-slate-500"
                    : "bg-emerald-500/10 text-emerald-500";

              // Texto principal legible segun tipo
              let titulo = desc;
              if (isCanje) titulo = desc.replace('CANJE:', '').trim() || 'Canje de premio';
              else if (isCompra) titulo = desc.replace('COMPRA_COMBO:', '').split('|')[1]?.trim() || 'Compra de combo';
              else if (isUso) titulo = desc.replace('CONSUMO_COMBO:', '').split('|')[1]?.trim() || 'Uso de pase';
              else titulo = desc || 'Carga de puntos';

              // Monto de puntos: canje resta, carga/compra suman lo que tengan
              const puntos = tx.points_earned || 0;
              const montoTexto = puntos >= 0 ? `+${puntos}` : `${puntos}`;
              const montoClass = puntos >= 0 ? "text-emerald-500" : "text-love";

              return (
                <div key={tx.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-left">
                  <div className="space-y-0.5">
                    <span className={cn(
                      "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                      tipoClass
                    )}>
                      {tipo}
                    </span>
                    <h5 className="text-[10px] font-black uppercase !text-slate-900 tracking-tight leading-normal mt-1 max-w-[200px] truncate">
                      {titulo}
                    </h5>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">
                      {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}  • {tx.branch || 'Sucursal principal'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "text-xs font-black italic",
                      montoClass
                    )}>
                      {montoTexto}
                    </span>
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">puntos</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Acceso a Ayuda */}
      <button
        onClick={() => navigate('/help')}
        className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex items-center gap-3 text-left hover:border-love/35 transition-all cursor-pointer"
      >
        <div className="w-10 h-10 rounded-xl bg-love/10 text-love flex items-center justify-center shrink-0">
          <HelpCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase !text-slate-900 dark:!text-white tracking-tight">Ayuda y Soporte</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase">Preguntas frecuentes y bases y condiciones</p>
        </div>
        <ChevronRight size={18} className="text-slate-300 shrink-0" />
      </button>
    </div>
  );
}
