import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/App';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { User, Key, History, Check, Loader2, Sparkles, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Transaction } from '@/src/types';
import { cn } from '@/src/lib/utils';

export function MyAccount() {
  const { profile, refreshProfile } = useAuth();
  
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
    try {
      const localStr = localStorage.getItem(`local_txs_${profile.id}`);
      if (localStr) {
        const localTxs = JSON.parse(localStr);
        const combined = [...localTxs, ...transactions];
        return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      }
    } catch(e) {}
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
        <h2 className="text-xl font-bold mb-2 uppercase tracking-tighter text-ink dark:text-white">
          Sincronizando Cuenta
        </h2>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest">Espera un momento...</p>
      </div>
    );
  }

  const combinedTxs = getCombinedTransactions();

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-10">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-love rounded-2xl flex items-center justify-center text-white shadow-lg shadow-love/35">
          <User size={20} />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase text-black dark:text-white leading-none tracking-tight">Mi Cuenta</h2>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">Gestiona tus datos de acceso, credenciales e historial</p>
        </div>
      </div>

      {/* Account Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5 text-left">
        <div className="flex items-center gap-2">
          <User size={16} className="text-love" />
          <h3 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Datos Personales</h3>
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
          <h3 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Cambiar Contraseña</h3>
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
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 px-3.5 py-2.5 rounded-xl text-[10px] font-bold">
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
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-love" />
            <h3 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">Mis Movimientos</h3>
          </div>
          <button 
            onClick={fetchTransactions}
            className="p-1 px-2 border-none bg-transparent hover:bg-slate-100 rounded-xl cursor-pointer text-slate-400 transition-colors flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider"
          >
            <RefreshCw size={10} /> Actualizar
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-slate-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : combinedTxs.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <History size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Aún no registras movimientos</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Cualquier punto que cargues o premio que canjees aparecerá listado aquí.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
            {combinedTxs.map((tx) => {
              const worksAsLoad = tx.points_earned > 0;
              return (
                <div key={tx.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-left">
                  <div className="space-y-0.5">
                    <span className={cn(
                      "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                      worksAsLoad ? "bg-emerald-500/10 text-emerald-500" : "bg-love/10 text-love"
                    )}>
                      {worksAsLoad ? "CARGA" : "CANJE"}
                    </span>
                    <h5 className="text-[10px] font-black uppercase text-black dark:text-white tracking-tight leading-normal mt-1 max-w-[200px] truncate">
                      {tx.description || (worksAsLoad ? `Carga de Puntos` : `Canje de Premio`)}
                    </h5>
                    <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">
                      {new Date(tx.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}  • {tx.branch || 'Sucursal principal'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn(
                      "text-xs font-black italic",
                      worksAsLoad ? "text-emerald-500" : "text-love"
                    )}>
                      {worksAsLoad ? `+${tx.points_earned}` : `-${tx.points_spent || 0}`}
                    </span>
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">puntos</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
