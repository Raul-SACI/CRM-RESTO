import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, Gift, User, ShieldCheck } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/App';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-bar-black flex flex-col font-sans">
      <header className="mx-6 mt-6 bg-ash p-4 rounded-2xl border border-white/10 shadow-bento flex justify-between items-center sticky top-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-love rounded-lg flex items-center justify-center font-bold text-xl uppercase shadow-lg shadow-love/20">R</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none uppercase">CRM <span className="text-love">RESTO</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Management & Loyalty System</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-2 md:gap-4">
          <NavLink to="/" className={({ isActive }) => `px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all ${isActive ? 'bg-love text-ivory' : 'bg-black/30 border border-white/10 text-ivory/60 hover:text-ivory'}`}>
            <span className="md:inline">Inicio</span>
          </NavLink>
          
          <NavLink to="/rewards" className={({ isActive }) => `px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all ${isActive ? 'bg-love text-ivory' : 'bg-black/30 border border-white/10 text-ivory/60 hover:text-ivory'}`}>
            <span className="md:inline">Premios</span>
          </NavLink>

          {(profile?.role === 'waiter' || profile?.role === 'admin') && (
            <NavLink to="/waiter" className={({ isActive }) => `px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all ${isActive ? 'bg-love text-ivory' : 'bg-black/30 border border-white/10 text-ivory/60 hover:text-ivory'}`}>
              <span className="md:inline">Atención</span>
            </NavLink>
          )}

          {profile?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all ${isActive ? 'bg-love text-ivory' : 'bg-black/30 border border-white/10 text-ivory/60 hover:text-ivory'}`}>
              <span className="md:inline">Panel Admin</span>
            </NavLink>
          )}
          
          <button onClick={handleLogout} className="ml-2 text-ivory/40 hover:text-love transition-colors">
            <LogOut size={18} />
          </button>
        </nav>
      </header>
      
      <main className="flex-1 w-full max-w-4xl mx-auto p-6 mt-4">
        {children}
      </main>

      <footer className="mt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 px-8 py-6 border-t border-white/5">
        <div className="flex gap-6 mb-4 sm:mb-0 uppercase tracking-tight">
          <span>STACK: VITE, SUPABASE, TAILWIND</span>
          <span className="hidden sm:inline">AUTH: RLS ENABLED</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1 uppercase tracking-tight"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div> DB Connected</span>
          <span className="bg-ash text-slate-300 px-2 py-0.5 rounded border border-white/10">v1.0.4-prod</span>
        </div>
      </footer>
    </div>
  );
}
