/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { Profile } from '@/src/types';
import { Auth } from '@/src/pages/Auth';
import { Dashboard } from '@/src/pages/Dashboard';
import { Waiter } from '@/src/pages/Waiter';
import { Admin } from '@/src/pages/Admin';
import { Rewards } from '@/src/pages/Rewards';
import { Layout } from '@/src/components/Layout';
import { motion, AnimatePresence } from 'motion/react';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-bar-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-love border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const stateFrom = (location.state as any)?.from;
  const from = stateFrom ? (stateFrom.pathname + (stateFrom.search || "")) : "/";

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route 
          path="/auth" 
          element={!user ? <Auth /> : <Navigate to={from} replace />} 
        />
        
        <Route 
          path="/" 
          element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/auth" state={{ from: location }} replace />} 
        />
        
        <Route 
          path="/rewards" 
          element={user ? <Layout><Rewards /></Layout> : <Navigate to="/auth" state={{ from: location }} replace />} 
        />
        
        <Route 
          path="/waiter" 
          element={
            user ? (
              profile?.role === 'waiter' || profile?.role === 'admin' 
                ? <Layout><Waiter /></Layout> 
                : <Navigate to="/" replace />
            ) : (
              <Navigate to="/auth" state={{ from: location }} replace />
            )
          } 
        />

        <Route 
          path="/admin" 
          element={
            user ? (
              profile?.role === 'admin' 
                ? <Layout><Admin /></Layout> 
                : <Navigate to="/" replace />
            ) : (
              <Navigate to="/auth" state={{ from: location }} replace />
            )
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificación de configuración
  const isConfigured = !!(import.meta as any).env.VITE_SUPABASE_URL && !!(import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  const fetchProfile = async (userId: string, userEmail?: string) => {
    const email = userEmail?.toLowerCase().trim();
    const isAdminEmail = email === 'administrador@organizacionysistemasr.com';
    
    // Fail-safe inmediato para no dejar la pantalla bloqueada
    const emergencyProfile: Profile = {
      id: userId,
      full_name: userEmail?.split('@')[0] || 'Usuario',
      email: userEmail || '',
      dni: isAdminEmail ? 'ADMIN' : '',
      birth_date: '',
      role: isAdminEmail ? 'admin' : 'client',
      points: 0,
      created_at: new Date().toISOString()
    };

    // 1. Intentar cargar desde caché local para velocidad instantánea
    const cached = localStorage.getItem(`profile_${userId}`);
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch (e) {
        setProfile(emergencyProfile);
      }
    } else {
      setProfile(prev => prev || emergencyProfile);
    }
    
    setLoading(false);

    try {
      // 1. Try exact ID match
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );

      const result: any = await Promise.race([profilePromise, timeoutPromise]);
      let { data, error } = result;
      
      if (error) {
        console.warn("Supabase fetch warning (retrying later):", error);
        return;
      }
      
      // 2. If no data by ID, try matching by email to link imported accounts
      if (!data && userEmail) {
        // Use the RPC to link the profile safely on the server side
        await supabase.rpc('vincular_perfil_por_email', { 
          p_user_id: userId, 
          p_email: userEmail.toLowerCase().trim() 
        });

        // Re-attempt fetch after linking
        const { data: linkedData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (linkedData) {
          data = linkedData;
          console.log("Successfully linked existing email profile via RPC");
        }
      }

      const finalProfile = data ? { ...data, role: isAdminEmail ? 'admin' : data.role } : emergencyProfile;
      setProfile(finalProfile);
      
      // Guardar en caché para la próxima vez
      localStorage.setItem(`profile_${userId}`, JSON.stringify(finalProfile));
      
      if (!data) {
        // Si no existe, intentar crear en segundo plano
        supabase.from('profiles').insert(emergencyProfile).then(({ error: insErr }) => {
          if (insErr) console.error("Error creating new profile:", insErr);
        });
      }
    } catch (e: any) {
      if (e.message === 'Timeout') {
        console.warn("Profile fetch timed out, using fallback data.");
      } else {
        console.error("Profile fetch error definitive:", e);
      }
    }
  };

  // Escuchar cambios en la autenticación
  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initializeAuth = async () => {
      // Forzar desbloqueo de la interfaz después de 5 segundos
      const forceUnlock = setTimeout(() => {
        setLoading(false);
      }, 5000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) {
          clearTimeout(forceUnlock);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const email = session.user.email?.toLowerCase().trim();
          const isAdminEmail = email === 'administrador@organizacionysistemasr.com';
          
          const emergencyProfile: Profile = {
            id: session.user.id,
            full_name: session.user.email?.split('@')[0] || 'Usuario',
            email: session.user.email || '',
            dni: isAdminEmail ? 'ADMIN' : '',
            birth_date: '',
            role: isAdminEmail ? 'admin' : 'client',
            points: 0,
            created_at: new Date().toISOString()
          };
          
          setProfile(emergencyProfile);
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        clearTimeout(forceUnlock);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user.email);
  };

  const signOut = async () => {
    try {
      // Optimismo: Cerramos sesión localmente primero para feedback instantáneo
      setUser(null);
      setProfile(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // En segundo plano cerramos en Supabase
      await supabase.auth.signOut();
    } catch (e) {
      console.error("SignOut error:", e);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-bar-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-love rounded-2xl flex items-center justify-center mb-6 shadow-bento">
          <span className="font-bold text-3xl">!</span>
        </div>
        <h1 className="text-2xl font-bold mb-4 uppercase tracking-tighter">Configuración Pendiente</h1>
        <p className="text-ivory/40 text-sm max-w-xs mb-8">
          Faltan las variables de entorno de Supabase. Debes agregarlas en los ajustes de Vercel (Environment Variables).
        </p>
        <div className="bg-ash p-4 rounded-xl border border-white/5 text-left w-full max-w-md font-mono text-[10px] space-y-2">
          <p className="text-love">VITE_SUPABASE_URL</p>
          <p className="text-love">VITE_SUPABASE_ANON_KEY</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bar-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-love border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthContext.Provider>
  );
}
