import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, Gift, User, ShieldCheck, Moon, Sun, HelpCircle, FileText, ChevronRight, X, ArrowLeft, ArrowRight, Palette, Check } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth, useTheme } from '@/src/App';
import { useDesign } from '@/src/components/DesignEngine';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, realProfile, signOut, isSimulatingClient, setIsSimulatingClient } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { designConfig, saveDesignConfig } = useDesign();
  const navigate = useNavigate();

  const [showFAQ, setShowFAQ] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  // Live visual button customization design modes
  const [isVisualDesignMode, setIsVisualDesignMode] = useState(false);
  const [activePickerRoute, setActivePickerRoute] = useState<string | null>(null);

  const defaultOrder = ['/', '/rewards', '/help', '/branches'];
  const buttonOrder = designConfig?.navButtonOrder || defaultOrder;
  
  // Resolve unified routing order matching our standard routes
  const resolvedOrder = [...new Set([...buttonOrder, ...defaultOrder])].filter(
    route => defaultOrder.includes(route)
  );

  const routesMap: Record<string, { label: string; to: string }> = {
    '/': { label: 'Inicio', to: '/' },
    '/rewards': { label: 'Premios', to: '/rewards' },
    '/help': { label: 'Ayuda', to: '/help' },
    '/branches': { label: 'Sucursales', to: '/branches' }
  };

  const handleMoveButton = async (route: string, direction: 'left' | 'right') => {
    const index = resolvedOrder.indexOf(route);
    if (index === -1) return;
    
    const newOrder = [...resolvedOrder];
    if (direction === 'left' && index > 0) {
      newOrder[index] = newOrder[index - 1];
      newOrder[index - 1] = route;
    } else if (direction === 'right' && index < newOrder.length - 1) {
      newOrder[index] = newOrder[index + 1];
      newOrder[index + 1] = route;
    }

    const updated = {
      ...designConfig,
      navButtonOrder: newOrder
    };
    await saveDesignConfig(updated);
  };

  const handleSetButtonColor = async (route: string, hexColor: string) => {
    const currentColors = designConfig?.navButtonColors || {};
    const updated = {
      ...designConfig,
      navButtonColors: {
        ...currentColors,
        [route]: hexColor
      }
    };
    await saveDesignConfig(updated);
  };

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
          {resolvedOrder.map((route, idx) => {
            const data = routesMap[route];
            if (!data) return null;

            const customColor = designConfig?.navButtonColors?.[route] || designConfig?.primaryColor || '#ef4444';
            const isActiveColor = customColor;

            return (
              <div key={route} className="relative flex items-center shrink-0">
                <NavLink 
                  to={data.to} 
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? isActiveColor : undefined,
                    color: isActive ? '#ffffff' : undefined,
                    boxShadow: isActive ? `0 10px 15px -3px ${isActiveColor}40` : undefined
                  })}
                  className={({ isActive }) => cn(
                    "px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0",
                    isActive ? "" : "bg-slate-100 text-slate-600 hover:bg-slate-250 dark:bg-slate-800 dark:text-slate-405 hover:scale-[1.02]"
                  )}
                >
                  {data.label}
                </NavLink>

                {/* Overlaid design mode control bar */}
                {isVisualDesignMode && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900 border border-slate-700 text-white p-1.5 rounded-full shadow-2xl z-[110] scale-90 md:scale-100">
                    {/* Move Left */}
                    <button
                      onClick={() => handleMoveButton(route, 'left')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors bg-transparent border-none outline-none cursor-pointer"
                      title="Mover Izquierda"
                    >
                      <ArrowLeft size={10} />
                    </button>

                    {/* Color picker circle */}
                    <button
                      onClick={() => setActivePickerRoute(activePickerRoute === route ? null : route)}
                      className="w-3.5 h-3.5 rounded-full border border-white hover:scale-110 transition-transform cursor-pointer"
                      style={{ backgroundColor: customColor }}
                      title="Cambiar Color"
                    />

                    {/* Move Right */}
                    <button
                      onClick={() => handleMoveButton(route, 'right')}
                      disabled={idx === resolvedOrder.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors bg-transparent border-none outline-none cursor-pointer"
                      title="Mover Derecha"
                    >
                      <ArrowRight size={10} />
                    </button>

                    {/* Active inline mini color popup */}
                    {activePickerRoute === route && (
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[120] bg-slate-900 border border-slate-700 p-2.5 rounded-2xl flex flex-col gap-2 shadow-2xl w-32">
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Color</span>
                          <button onClick={() => setActivePickerRoute(null)} className="text-amber-400 hover:text-amber-305 font-bold p-0.5 text-[8px] bg-transparent border-none cursor-pointer">OK</button>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'].map(presetColor => (
                            <button
                              key={presetColor}
                              onClick={() => handleSetButtonColor(route, presetColor)}
                              className={cn(
                                "w-4 h-4 rounded-full border border-white/20 relative flex items-center justify-center cursor-pointer",
                                customColor === presetColor && "scale-110 shadow"
                              )}
                              style={{ backgroundColor: presetColor }}
                            >
                              {customColor === presetColor && <Check size={8} className="text-white" />}
                            </button>
                          ))}
                        </div>
                        {/* Hex custom design selector */}
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => handleSetButtonColor(route, e.target.value)}
                          className="w-full bg-slate-800 text-[9px] text-white font-mono uppercase px-1.5 py-0.5 rounded border border-slate-705 text-center outline-none focus:border-amber-500"
                          placeholder="#HEX"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {(profile?.role === 'waiter' || profile?.role === 'admin' || realProfile?.role === 'admin') && (
            <NavLink to="/waiter" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
              Carga de Puntos
            </NavLink>
          )}

          {(profile?.role === 'admin' || realProfile?.role === 'admin') && (
            <NavLink to="/admin" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
              Admin
            </NavLink>
          )}

          {/* Floating Admin Brush Button */}
          {(profile?.role === 'admin' || realProfile?.role === 'admin') && (
            <button 
              onClick={() => setIsVisualDesignMode(!isVisualDesignMode)}
              className={cn(
                "p-1.5 md:p-2 text-[9px] uppercase font-black tracking-widest rounded-full flex items-center gap-1 transition-all outline-none shrink-0 pointer border-none cursor-pointer",
                isVisualDesignMode 
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              )}
              title="Personalizar Botones"
            >
              <Palette size={14} className={isVisualDesignMode ? "animate-spin" : ""} />
              <span className="hidden md:inline">{isVisualDesignMode ? "Salir" : "Diseño Botones"}</span>
            </button>
          )}
          
          <button 
            onClick={toggleTheme} 
            className="ml-1 p-2 text-slate-400 hover:text-love transition-all hover:bg-love/10 rounded-lg shrink-0 cursor-pointer bg-transparent border-none" 
            title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <button onClick={handleLogout} className="ml-1 p-2 text-slate-400 hover:text-love transition-all hover:bg-love/10 rounded-lg shrink-0 cursor-pointer bg-transparent border-none" title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </nav>
      </header>
      
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 mt-2 md:mt-4">
        {children}
      </main>

      <footer className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] sm:text-[11px] font-mono text-slate-400 px-8 py-6 border-t border-slate-200">
        <div className="flex flex-wrap gap-4 md:gap-6 justify-center md:justify-start uppercase tracking-tight font-black">
          <button 
            onClick={() => {
              setActiveFaqIndex(null);
              setShowFAQ(true);
            }}
            className="hover:text-love transition-all uppercase cursor-pointer bg-transparent border-0 outline-none"
          >
            Preguntas Frecuentes
          </button>
          <span className="text-slate-200 hidden sm:inline">|</span>
          <button 
            onClick={() => setShowTerms(true)}
            className="hover:text-love transition-all uppercase cursor-pointer bg-transparent border-0 outline-none"
          >
            Bases y Condiciones
          </button>
        </div>
        <div className="flex gap-4 items-center font-bold">
          <span className="flex items-center gap-1 uppercase tracking-tight"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div> DB Connected</span>
          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">v1.0.4-prod</span>
        </div>
      </footer>

      {/* Interactive FAQ Sliding Drawer / Overlay Modal */}
      <AnimatePresence>
        {showFAQ && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
            >
              <button 
                onClick={() => setShowFAQ(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-love transition-colors cursor-pointer bg-transparent border-0 outline-none"
              >
                <X size={22} />
              </button>

              <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="w-10 h-10 bg-love/10 rounded-xl flex items-center justify-center text-love">
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-ink dark:text-white">Preguntas <span className="text-love">Frecuentes</span></h3>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">Todo sobre nuestro Club CRAFT</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-3 pb-4">
                {(designConfig?.faqs || []).map((item, index) => {
                  const isOpen = activeFaqIndex === index;
                  return (
                    <div 
                      key={index} 
                      className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/40 transition-all hover:bg-slate-100/50"
                    >
                      <button
                        onClick={() => setActiveFaqIndex(isOpen ? null : index)}
                        className="w-full text-left p-4 flex items-center justify-between gap-4 font-extrabold text-xs uppercase tracking-tight text-ink dark:text-white cursor-pointer bg-transparent border-0 outline-none"
                      >
                        <span>{item.q}</span>
                        <ChevronRight 
                          size={16} 
                          className={cn("text-slate-400 transition-transform duration-250 shrink-0", isOpen && "rotate-90 text-love")} 
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="p-4 pt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold whitespace-pre-line border-t border-slate-100/50 dark:border-slate-800/50">
                              {item.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Terms & Conditions Overlay Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
            >
              <button 
                onClick={() => setShowTerms(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-love transition-colors cursor-pointer bg-transparent border-0 outline-none"
              >
                <X size={22} />
              </button>

              <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="w-10 h-10 bg-love/10 rounded-xl flex items-center justify-center text-love">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-ink dark:text-white">Bases y <span className="text-love">Condiciones</span></h3>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">Letra chica del programa Club CRAFT</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-4 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                {designConfig?.terms || ""}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
