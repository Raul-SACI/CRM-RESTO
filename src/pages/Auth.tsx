import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { User, Mail, Lock, CreditCard, Calendar, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getCustomUsers } from '@/src/lib/permissions';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    dni: '',
    fullName: '',
    birthDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Look in custom users first
        const customUsers = getCustomUsers();
        const matchedUser = customUsers.find(
          u => u.email.toLowerCase().trim() === formData.email.toLowerCase().trim() && 
          u.password === formData.password
        );

        if (matchedUser) {
          // Store custom session
          const customSession = {
            user: {
              id: matchedUser.id,
              email: matchedUser.email,
              user_metadata: {
                full_name: matchedUser.full_name,
                dni: matchedUser.dni
              }
            },
            profile: {
              id: matchedUser.id,
              full_name: matchedUser.full_name,
              email: matchedUser.email,
              dni: matchedUser.dni,
              birth_date: matchedUser.birth_date || '',
              role: matchedUser.role,
              points: 0,
              created_at: matchedUser.created_at
            }
          };
          localStorage.setItem('custom_user_session', JSON.stringify(customSession));
          window.location.reload();
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
      } else {
        // Sign up
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              dni: formData.dni,
              birth_date: formData.birthDate || null
            }
          }
        });
        
        if (signUpError) throw signUpError;
        if (user) {
          // Wait a bit for the trigger to definitely finish
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Update or Create profile (Upsert to handle trigger race condition)
          const profileData = {
            id: user.id,
            dni: formData.dni,
            full_name: formData.fullName,
            email: formData.email,
            role: 'client',
          };
          
          // Only include birth_date if provided to avoid overwriting with null if it was already set by trigger correctly
          if (formData.birthDate) {
            (profileData as any).birth_date = formData.birthDate;
          }

          const { error: profileError } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
          
          if (profileError) {
            console.error("Manual profile upsert error:", profileError);
            // If it failed, try a simple update
            await supabase.from('profiles').update({ birth_date: formData.birthDate || null }).eq('id', user.id);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Escribí tu email arriba y volvé a tocar "¿Olvidaste tu contraseña?"');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: window.location.origin + '/my-account',
      });
      if (error) throw error;
      alert('Te enviamos un email a ' + formData.email + ' con un enlace para ingresar. Al abrirlo, entrarás a la app y desde "Mi Cuenta" podrás cambiar tu contraseña. Revisá tu bandeja de entrada (y la carpeta de spam).');
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar el email de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginClick = () => {
    executeGoogleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#3d3436] bg-[radial-gradient(circle_at_50%_25%,#D9001533_0%,transparent_55%)]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            referrerPolicy="no-referrer"
            src="https://jxmhizoomsxbqhoghwth.supabase.co/storage/v1/object/public/branding%20logo/logoinicialapp.png"
            alt="CRAFT club"
            className="w-52 md:w-60 mx-auto object-contain mb-2"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 backdrop-blur-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="DNI (sin puntos)"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all placeholder:text-slate-300 text-ink"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="Nombre Completo"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all placeholder:text-slate-300 text-ink"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-3 block">Fecha de Nacimiento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="date"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all text-slate-400"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="email"
                placeholder="E-mail"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all placeholder:text-slate-300 text-ink"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="password"
                placeholder="Contraseña"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all placeholder:text-slate-300 text-ink"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {error && (
              <p className="text-love text-[10px] text-center font-bold uppercase tracking-widest mt-2 bg-love/5 py-2 rounded-lg border border-love/10">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-love text-white rounded-xl py-4 font-bold text-xs uppercase tracking-widest shadow-red transition-all disabled:opacity-50 mt-4 active:scale-[0.98]"
            >
              {loading ? 'Procesando...' : isLogin ? 'Ingresar a la Experiencia' : 'Crear mi Perfil'}
            </button>
          </form>

          {isLogin && (
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-love transition-colors bg-transparent border-none cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <span className="relative bg-white px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">o ingresa con</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLoginClick}
            disabled={loading}
            className="w-full flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl py-3.5 px-4 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.55 1.25 7.37l3.86 3C6.1 7.31 8.84 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.49z" />
              <path fill="#FBBC05" d="M5.11 10.37c-.24-.72-.37-1.49-.37-2.37s.13-1.65.37-2.37L1.25 2.63C.45 4.24 0 6.07 0 8s.45 3.76 1.25 5.37l3.86-3z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.5 1.18-4.3 1.18-3.16 0-5.9-2.27-6.89-5.33L1.25 16.1C3.37 19.92 7.35 22.5 12 23z" />
            </svg>
            Ingresar con Google
          </button>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] hover:text-love transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Registro' : '¿Ya tienes cuenta? Login'}
            </button>
          </div>
        </motion.div>
      </div>

      {showGoogleGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 max-w-md w-full shadow-2xl space-y-5 text-left text-ink dark:text-white"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 text-amber-500">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Ingreso con Google
                </h3>
                <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest">
                  Requiere Configuración en Supabase
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <p>
                Por motivos de seguridad, la autenticación de Google se gestiona de forma directa a través de tu proyecto de base de datos en <strong>Supabase</strong>.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cómo configurar Google en 3 pasos:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <li>Inicia sesión en tu consola de <strong>Supabase</strong>.</li>
                  <li>Ve a <strong className="text-love">Authentication</strong> &gt; <strong className="text-love">Providers</strong> &gt; <strong>Google</strong> y activa el interruptor.</li>
                  <li>Escribe tu <strong>Client ID</strong> y <strong>Client Secret</strong> provistos por Google Cloud Console.</li>
                </ol>
              </div>

              <p className="text-[10px] font-semibold text-slate-400 italic">
                Si tú eres el administrador y ya agregaste las credenciales de Google OAuth en el panel de Supabase, puedes proceder a continuación.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowGoogleGuide(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-none text-center"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  setShowGoogleGuide(false);
                  executeGoogleLogin();
                }}
                className="flex-1 py-3 bg-love text-white hover:bg-opacity-90 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-red transition-all cursor-pointer border-none text-center flex items-center justify-center gap-1.5"
              >
                Continuar <ExternalLink size={12} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
