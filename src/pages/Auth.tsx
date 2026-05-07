import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'motion/react';
import { User, Mail, Lock, CreditCard, Calendar } from 'lucide-react';
import { cn } from '@/src/lib/utils';

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
        });
        
        if (signUpError) throw signUpError;
        if (user) {
          // Create profile
          const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            dni: formData.dni,
            full_name: formData.fullName,
            email: formData.email,
            birth_date: formData.birthDate,
            role: 'client',
          });
          if (profileError) throw profileError;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bar-black flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_30%,#C41E3A33_0%,transparent_60%)]">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-love rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-bento"
          >
            <div className="font-bold text-3xl text-ivory">R</div>
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 tracking-tighter uppercase">CRM <span className="text-love">RESTO</span></h1>
          <p className="text-ivory/40 text-[10px] uppercase tracking-[0.3em] font-bold">Premium Experience</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-ash border border-white/10 p-8 rounded-[2rem] shadow-bento backdrop-blur-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/20" size={18} />
                  <input
                    placeholder="DNI"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all placeholder:text-ivory/20"
                    value={formData.dni}
                    onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/20" size={18} />
                  <input
                    placeholder="Nombre Completo"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all placeholder:text-ivory/20"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/20" size={18} />
                  <input
                    type="date"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all text-ivory/40"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>
              </>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/20" size={18} />
              <input
                type="email"
                placeholder="E-mail"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all placeholder:text-ivory/20"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/20" size={18} />
              <input
                type="password"
                placeholder="Contraseña"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-love outline-none transition-all placeholder:text-ivory/20"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {error && (
              <p className="text-love text-[10px] text-center font-bold uppercase tracking-widest mt-2 bg-love/10 py-2 rounded-lg border border-love/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-love text-ivory rounded-xl py-4 font-bold text-xs uppercase tracking-widest hover:bg-love/90 shadow-lg shadow-love/20 transition-all disabled:opacity-50 mt-4 active:scale-[0.98]"
            >
              {loading ? 'Procesando...' : isLogin ? 'Ingresar a la Experiencia' : 'Crear mi Perfil'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-ivory/40 text-[10px] uppercase font-bold tracking-widest hover:text-love transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Registro' : '¿Ya tienes cuenta? Login'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
