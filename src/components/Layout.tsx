import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, Gift, User, ShieldCheck, Moon, Sun } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth, useTheme } from '@/src/App';
import { useDesign } from '@/src/components/DesignEngine';
import { cn } from '@/src/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isSimulatingClient, setIsSimulatingClient } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { designConfig } = useDesign();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans overflow-x-hidden">
      {isSimulatingClient && (
        <div className="w-full bg-slate-900 border-b border-love text-white text-[10px] md:text-xs py-3 px-6 flex items-center justify-between font-black uppercase tracking-wider z-[100] sticky top-0 transition-all shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-love animate-ping" />
            <span className="flex items-center gap-1">
              <User size={14} className="text-love" />
              Vista Cliente Activa: Estás viendo la app como un usuario normal
            </span>
          </div>
          <button
            onClick={() => {
              setIsSimulatingClient(false);
              navigate('/admin');
            }}
            className="px-4 py-1.5 bg-love hover:bg-love/90 text-white rounded-xl transition-all font-black shadow-lg shadow-love/20 active:scale-95 cursor-pointer text-[10px]"
          >
            Volver a Admin
          </button>
        </div>
      )}
      <header className={cn(
        "mx-2 md:mx-6 mt-2 md:mt-6 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 flex justify-between items-center sticky z-50",
        isSimulatingClient ? "top-14" : "top-2 md:top-6"
      )}>
        <div className="flex items-center gap-2 md:gap-3">
          {designConfig.logoUrl ? (
            <img 
              referrerPolicy="no-referrer"
              src={designConfig.logoUrl} 
              alt="Logo" 
              className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-lg" 
              onError={(e) => {
                // fallback if loading fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : null}
          {(!designConfig.logoUrl) && (
            <div className="w-8 h-8 md:w-10 md:h-10 bg-love rounded-lg flex items-center justify-center font-bold text-lg md:text-xl uppercase shadow-lg shadow-love/20 text-white">
              {(designConfig.logoText || 'CLUB CRAFT').charAt(0)}
            </div>
          )}
          <div className="hidden xs:block">
            <h1 className="text-sm md:text-lg font-black tracking-tighter leading-none uppercase text-ink logo-title">
              {designConfig.logoText || 'CLUB CRAFT'}
            </h1>
            <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 mt-1">
              {designConfig.logoSubtitle || 'Management & Loyalty'}
            </p>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar">
          <NavLink to="/" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Inicio
          </NavLink>
          
          <NavLink to="/rewards" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Premios
          </NavLink>

          {(profile?.role === 'waiter' || profile?.role === 'admin') && (
            <NavLink to="/waiter" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              Carga de Puntos
            </NavLink>
          )}

      {profile?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              Admin
            </NavLink>
          )}
          
          <button 
            onClick={toggleTheme} 
            className="ml-1 md:ml-4 p-2 text-slate-400 hover:text-love transition-all hover:bg-love/10 rounded-lg shrink-0" 
            title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <button onClick={handleLogout} className="ml-1 md:ml-2 p-2 text-slate-400 hover:text-love transition-all hover:bg-love/10 rounded-lg shrink-0" title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </nav>
      </header>
      
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 mt-2 md:mt-4">
        {children}
      </main>

      <footer className="mt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 px-8 py-6 border-t border-slate-200">
        <div className="flex gap-6 mb-4 sm:mb-0 uppercase tracking-tight">
          <span>STACK: VITE, SUPABASE, TAILWIND</span>
          <span className="hidden sm:inline">AUTH: RLS ENABLED</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1 uppercase tracking-tight"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div> DB Connected</span>
          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">v1.0.4-prod</span>
        </div>
      </footer>
    </div>
  );
}
