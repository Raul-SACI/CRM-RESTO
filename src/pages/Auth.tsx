import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { User, Mail, Lock, CreditCard, Calendar } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getCustomUsers } from '@/src/lib/permissions';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_30%,#ef444411_0%,transparent_60%)]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-love rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-red"
          >
            <div className="font-bold text-3xl text-white">C</div>
          </motion.div>
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase text-ink">CLUB <span className="text-love">CRAFT</span></h1>
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] font-black">Premium Experience</p>
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
    </div>
  );
}
