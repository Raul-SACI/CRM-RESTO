/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
import { Profile } from '@/src/types';
import { Auth } from '@/src/pages/Auth';
import { Dashboard } from '@/src/pages/Dashboard';
import { Waiter } from '@/src/pages/Waiter';
import { Rewards } from '@/src/pages/Rewards';
import { Layout } from '@/src/components/Layout';
import { motion, AnimatePresence } from 'motion/react';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificación de configuración
  const isConfigured = !!(import.meta as any).env.VITE_SUPABASE_URL && !!(import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error) {
        setProfile(data);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
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
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route 
              path="/auth" 
              element={!user ? <Auth /> : <Navigate to="/" />} 
            />
            
            <Route 
              path="/" 
              element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/auth" />} 
            />
            
            <Route 
              path="/rewards" 
              element={user ? <Layout><Rewards /></Layout> : <Navigate to="/auth" />} 
            />
            
            <Route 
              path="/waiter" 
              element={user && profile?.role === 'waiter' ? <Layout><Waiter /></Layout> : <Navigate to="/" />} 
            />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
