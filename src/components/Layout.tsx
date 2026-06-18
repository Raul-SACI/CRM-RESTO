import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, Gift, User, ShieldCheck, Moon, Sun, HelpCircle, FileText, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuth, useTheme } from '@/src/App';
import { useDesign } from '@/src/components/DesignEngine';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut, isSimulatingClient, setIsSimulatingClient } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { designConfig } = useDesign();
  const navigate = useNavigate();

  const [showFAQ, setShowFAQ] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

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

          <NavLink to="/help" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Ayuda
          </NavLink>

          <NavLink to="/branches" className={({ isActive }) => `px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-tighter transition-all shrink-0 ${isActive ? 'bg-love text-white shadow-lg shadow-love/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Sucursales
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
                {[
                  {
                    q: "¿Qué es Club CRAFT?",
                    a: "Es nuestro exclusivo club de lealtad digital. Registrándote de manera 100% gratuita, acumulas puntos en cada consumo y luego puedes canjearlos por cafés, panadería, cócteles o cenas especiales de nuestro catálogo."
                  },
                  {
                    q: "¿Cómo sumo puntos con mis visitas?",
                    a: "¡Es muy fácil! Por cada $1000 argentinos que consumas en nuestras sucursales, sumas automáticamente 1 punto base. Solo debes indicarle tu DNI registrado al camarero o cajero antes de solicitar la cuenta final."
                  },
                  {
                    q: "¿Cuáles son los niveles de puntos y sus beneficios?",
                    a: "El programa cuenta con tres niveles dinámicos según tus puntos acumulados:\n\n• Miembro Club (0 a 999 puntos): Sumas 1 punto por cada $1000.\n\n• Miembro PREMIUM (1000 a 1999 puntos): ¡Tu identificador del vasito de café de especialidad de la marca CRAFT en el timeline se vuelve dorado! A partir de aquí, tus consumos sumarán 1.5 puntos por cada $1000 (un 50% extra de regalo automático).\n\n• Miembro BLACK (2000+ puntos): ¡Duplicas puntos constantemente! Sumas 2 puntos por cada $1000 consumidos y accedes a convocatorias y catas de café preferenciales."
                  },
                  {
                    q: "¿Cómo canjeo mis puntos por premios?",
                    a: "Entra a la pestaña 'Premios', elige la recompensa que más te guste y confirma el canje. Se descontarán tus puntos y se te brindará un cupón visual con barra. Muéstrale este código en el celular al camarero de la fecha."
                  },
                  {
                    q: "¿Qué vigencia tienen mis puntos y cupones?",
                    a: "Tus puntos acumulados no vencen mientras registres al menos una compra anual. Sin embargo, los cupones generados para premios tienen validez exclusiva únicamente por el día de la fecha de su emisión (vencen a las 23:59 hs)."
                  }
                ].map((item, index) => {
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

              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4 pb-4 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                <div>
                  <h5 className="font-extrabold uppercase tracking-widest text-[9px] text-ink dark:text-white mb-1.5 pl-0.5 text-love">1. Aspectos Generales</h5>
                  <p className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    El programa de fidelización denominado "Club CRAFT" es operado exclusivamente por la administración de la marca CRAFT. Al registrarse, el usuario declara comprender y consentir todas las pautas del presente reglamento de uso.
                  </p>
                </div>

                <div>
                  <h5 className="font-extrabold uppercase tracking-widest text-[9px] text-ink dark:text-white mb-1.5 pl-0.5 text-love">2. Generación y Traspaso de Puntos</h5>
                  <p className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    Los puntos son personales, intransferibles, no convertibles a dinero fiduciario bajo ningún concepto y están asociados estrictamente al DNI de la cuenta. Quien reclame la carga de puntos deberá respaldar su identidad con DNI físico al personal en sucursal.
                  </p>
                </div>

                <div>
                  <h5 className="font-extrabold uppercase tracking-widest text-[9px] text-ink dark:text-white mb-1.5 pl-0.5 text-love">3. Tasa de Conversión y Niveles</h5>
                  <p className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    La tasa base es de 1 punto por cada $1000 argentinos consumidos, sujeta a modificaciones de la administración. Se asigna una bonificación a miembros PREMIUM (1.5 puntos por cada $1000 a partir de los 1000 puntos acumulados) y a miembros BLACK (2 puntos por cada $1000 a partir de los 2000 puntos acumulados).
                  </p>
                </div>

                <div>
                  <h5 className="font-extrabold uppercase tracking-widest text-[9px] text-ink dark:text-white mb-1.5 pl-0.5 text-love">4. Redención de Cupones Premios</h5>
                  <p className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    Una vez emitido el canje del premio en la interfaz de la cuenta personal, el cupón visual generado es válido estrictamente durante el día de la fecha de su canje hasta las 23:59 hs. Pasado este período, el cupón caducará de manera irreversible y no se reintegrarán los puntos descontados del saldo bajo ninguna causa o justificación.
                  </p>
                </div>

                <div>
                  <h5 className="font-extrabold uppercase tracking-widest text-[9px] text-ink dark:text-white mb-1.5 pl-0.5 text-love">5. Modificación del Programa</h5>
                  <p className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    CRAFT se reserva el pleno derecho de modificar el catálogo de premios, cambiar la vigencia o costo en puntos de cualquier recompensa, recalcular el saldo o dar por terminado el programa Club CRAFT general avisando al menos con 15 días de anticipación de forma pública.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
