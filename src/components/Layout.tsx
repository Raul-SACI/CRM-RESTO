import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Gift, User, ShieldCheck, Moon, Sun, HelpCircle, FileText, ChevronRight, X, ArrowLeft, ArrowRight, Palette, Check, MapPin, Ticket } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth, useTheme } from '@/src/App';
import { useDesign } from '@/src/components/DesignEngine';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { hasPermission } from '@/src/lib/permissions';
import { NotificationBell } from '@/src/components/NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, realProfile, signOut, isSimulatingClient, setIsSimulatingClient, simDevice, setSimDevice } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { designConfig, saveDesignConfig } = useDesign();
  const navigate = useNavigate();
  const location = useLocation();
  // En la pantalla de Admin ocultamos la barra superior: la navegación
  // se hace por el menú lateral. No aplica cuando se está simulando cliente.
  const isAdminPage = location.pathname.startsWith('/admin') && !isSimulatingClient;

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
        <div className="w-full bg-slate-900 border-b border-love text-white text-[10px] md:text-xs py-2.5 px-4 md:px-6 flex flex-wrap gap-3 items-center justify-between font-black uppercase tracking-wider z-[100] sticky top-0 transition-all shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-love animate-ping" />
            <span className="flex items-center gap-1">
              <User size={14} className="text-love" />
              Vista Cliente Activa: Estás viendo la app como un usuario normal
            </span>
          </div>

          {/* Selector de Dispositivos (Device Simulation Selector) */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700/60 shadow-inner">
            <button
              onClick={() => setSimDevice('pc')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer border-none flex items-center gap-1",
                simDevice === 'pc' 
                  ? "bg-love text-white shadow-md font-black" 
                  : "bg-transparent text-slate-400 hover:text-white"
              )}
            >
              💻 PC
            </button>
            <button
              onClick={() => setSimDevice('tablet')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer border-none flex items-center gap-1",
                simDevice === 'tablet' 
                  ? "bg-love text-white shadow-md font-black" 
                  : "bg-transparent text-slate-400 hover:text-white"
              )}
            >
              📟 Tablet
            </button>
            <button
              onClick={() => setSimDevice('phone')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black transition-all cursor-pointer border-none flex items-center gap-1",
                simDevice === 'phone' 
                  ? "bg-love text-white shadow-md font-black" 
                  : "bg-transparent text-slate-400 hover:text-white"
              )}
            >
              📱 Celular
            </button>
          </div>

          <button
            onClick={() => {
              setIsSimulatingClient(false);
              navigate('/admin');
            }}
            className="px-4 py-1.5 bg-love hover:bg-love/90 text-white rounded-xl transition-all font-black shadow-lg shadow-love/20 active:scale-95 cursor-pointer text-[10px] border-none"
          >
            Volver a Admin
          </button>
        </div>
      )}
      
      <div className={cn(
        "w-full flex-1 flex flex-col transition-all duration-300",
        isSimulatingClient && simDevice !== 'pc' && "bg-slate-100 dark:bg-slate-950/40 p-4 md:p-8 justify-center items-center"
      )}>
        <div 
          className={cn(
            "w-full flex-1 flex flex-col transition-all duration-300",
            (isSimulatingClient && simDevice === 'tablet') && "w-[768px] max-w-full h-[1024px] max-h-[85vh] bg-white dark:bg-slate-900 border-[14px] border-slate-950 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-y-auto scrollbar-none relative p-4",
            (isSimulatingClient && simDevice === 'phone') && "w-[375px] max-w-full h-[812px] max-h-[80vh] bg-white dark:bg-slate-900 border-[14px] border-slate-950 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-y-auto scrollbar-none relative p-4"
          )}
        >
          <div className={cn(
            "w-full mx-auto flex-1 flex flex-col",
            !(isSimulatingClient && simDevice !== 'pc') && "max-w-[1800px] px-4 md:px-8"
          )}>
            {!isAdminPage && (
            <header className={cn(
              "mt-2 md:mt-6 bg-white dark:bg-slate-900 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex justify-between items-center sticky z-50",
              (isSimulatingClient && simDevice === 'pc') ? "top-14" : "top-2 md:top-6"
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
            <div className="bg-love rounded-xl px-4 py-2 flex items-center justify-center font-black text-xs md:text-sm uppercase shadow-lg shadow-love/20 text-white tracking-widest whitespace-nowrap">
              {designConfig.logoText || 'CLUB CRAFT'}
            </div>
          )}
          {designConfig.logoUrl && (
            <div className="hidden xs:block">
              <h1 className="text-sm md:text-lg font-black tracking-tighter leading-none uppercase text-ink logo-title">
                {designConfig.logoText || 'CLUB CRAFT'}
              </h1>
              <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 mt-1">
                {designConfig.logoSubtitle || 'Management & Loyalty'}
              </p>
            </div>
          )}
        </div>
        
        <nav className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar">
          {profile?.role === 'client' && profile?.id && (
            <NotificationBell clientId={profile.id} />
          )}
          {/* Main page navigation links - Hidden on small screen sizes and phone simulation */}
          <div className={cn(
            "flex items-center gap-1 md:gap-4",
            "hidden sm:flex",
            (isSimulatingClient && simDevice === 'phone') && "!hidden"
          )}>
            {realProfile?.role !== 'waiter' && resolvedOrder.map((route, idx) => {
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
                      isActive ? "" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:scale-[1.02]"
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


            {(hasPermission(profile?.role, 'cargar_puntos') || hasPermission(realProfile?.role, 'cargar_puntos')) && (
              <NavLink to="/waiter" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                Carga de Puntos
              </NavLink>
            )}

            {(hasPermission(profile?.role, 'ver_admin') || hasPermission(realProfile?.role, 'ver_admin')) && (
              <NavLink to="/admin" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}>
                Admin
              </NavLink>
            )}
          </div>

          {/* Inline compact links for other roles like Admin when in phone mode */}
          {((isSimulatingClient && simDevice === 'phone') || window.innerWidth < 640) && (hasPermission(profile?.role, 'ver_admin') || hasPermission(realProfile?.role, 'ver_admin')) ? (
            <div className="flex items-center gap-1 sm:hidden">
              <NavLink to="/admin" className={({ isActive }) => cn(
                "px-2.5 py-1.5 rounded-lg transition-all shrink-0 font-black text-[9px] border-none",
                isActive ? "bg-love text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}>
                ADMIN
              </NavLink>
            </div>
          ) : null}

          {/* Floating Theme Selector and Actions */}
          {(profile?.role === 'admin' && !isSimulatingClient) && (
            <button 
              onClick={toggleTheme} 
              className="ml-1 p-2 text-slate-400 hover:text-love transition-all hover:bg-love/10 rounded-lg shrink-0 cursor-pointer bg-transparent border-none" 
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          )}

          {!(profile?.role === 'client' || isSimulatingClient) && (
            <button onClick={handleLogout} className="ml-1 p-2 text-slate-400 hover:text-love transition-all hover:bg-love/10 rounded-lg shrink-0 cursor-pointer bg-transparent border-none" title="Cerrar Sesión">
              <LogOut size={20} />
            </button>
          )}
        </nav>
        </header>
            )}
        
        <main className={cn(
          "flex-1 w-full py-4 md:py-6",
          isAdminPage ? "mt-2 md:mt-4 lg:mt-0" : "mt-2 md:mt-4"
        )}>
          {children}
        </main>

        {/* Bottom Floating Navigation Dock - Renders on actual Mobile and Simulated Phone */}
        {realProfile?.role !== 'waiter' && (
          <div className={cn(
            "z-[90] transition-all duration-300",
            (isSimulatingClient && simDevice === 'phone') 
              ? "sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2.5 flex justify-around shrink-0 -mx-4 -mb-4 rounded-b-[1.7rem] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]" 
              : "fixed bottom-0 left-0 right-0 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/60 dark:border-slate-800 px-2 py-2 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] flex items-center justify-around z-[90]"
          )}>
            {[
              { label: 'Inicio', to: '/', icon: <Home size={19} /> },
              { label: 'Premios', to: '/rewards', icon: <Gift size={19} /> },
              { label: 'Mis combos', to: '/my-combos', icon: <Ticket size={19} /> },
              { label: 'Mi Cuenta', to: '/my-account', icon: <User size={19} /> },
              { label: 'Ayuda', to: '/help', icon: <HelpCircle size={19} /> }
            ].map((item) => (
              <NavLink 
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all cursor-pointer border-none text-center bg-transparent shrink-0",
                  isActive 
                    ? "scale-105" 
                    : "hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "transition-transform duration-200",
                      isActive ? "scale-110 text-love" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {item.icon}
                    </div>
                    <span className={cn(
                      "text-[7px] uppercase tracking-wider font-extrabold transition-colors duration-200",
                      isActive ? "text-love font-black" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}

            {/* mobile logout button at the very end */}
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-2xl transition-all cursor-pointer border-none text-center bg-transparent shrink-0 group"
            >
              <div className="transition-transform duration-200 text-slate-600 dark:text-slate-400 group-hover:text-love group-hover:scale-110">
                <LogOut size={19} />
              </div>
              <span className="text-[7px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 group-hover:text-love transition-colors duration-200">
                Salir
              </span>
            </button>
          </div>
        )}

          </div>
        </div>
      </div>

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
                  <h3 className="text-xl font-black uppercase tracking-tighter text-black dark:text-white">Preguntas <span className="text-love">Frecuentes</span></h3>
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
                        className="w-full text-left p-4 flex items-center justify-between gap-4 font-extrabold text-xs uppercase tracking-tight text-black dark:text-white cursor-pointer bg-transparent border-0 outline-none"
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
                  <h3 className="text-xl font-black uppercase tracking-tighter text-black dark:text-white">Bases y <span className="text-love">Condiciones</span></h3>
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
