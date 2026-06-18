import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, FileText, ChevronRight, Search, ShieldCheck, Scale, Award, Trash2, Clock, CheckCircle } from 'lucide-react';
import { useDesign } from '@/src/components/DesignEngine';
import { cn } from '@/src/lib/utils';

export function Help() {
  const { designConfig } = useDesign();
  const [activeTab, setActiveTab] = useState<'faq' | 'terms'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "¿Qué es Club CRAFT?",
      a: "Es nuestro exclusivo club de lealtad digital. Registrándote de manera 100% gratuita, acumulas puntos en cada consumo y luego puedes canjearlos por cafés, panadería, cócteles o cenas especiales de nuestro catálogo.",
      category: "General"
    },
    {
      q: "¿Cómo sumo puntos con mis visitas?",
      a: "¡Es muy fácil! Por cada $1000 argentinos que consumas en nuestras sucursales, sumas automáticamente 1 punto base. Solo debes indicarle tu DNI registrado al camarero o cajero antes de solicitar la cuenta final.",
      category: "Puntos"
    },
    {
      q: "¿Cuáles son los niveles de puntos y sus beneficios?",
      a: "El programa cuenta con tres niveles dinámicos según tus puntos acumulados:\n\n• Miembro Club (0 a 999 puntos): Sumas 1 punto por cada $1000.\n\n• Miembro PREMIUM (1000 a 1999 puntos): ¡Tu identificador del vasito de café de especialidad se vuelve dorado! A partir de aquí, tus consumos sumarán 1.5 puntos por cada $1000 (un 50% extra de regalo automático).\n\n• Miembro BLACK (2000+ puntos): ¡Duplicas puntos constantemente! Sumas 2 puntos por cada $1000 consumidos y accedes a convocatorias de catas de café selectas.",
      category: "Niveles & Estatus"
    },
    {
      q: "¿Cómo canjeo mis puntos por premios?",
      a: "Entra a la pestaña 'Premios', elige la recompensa que más te guste y confirma el canje. Se descontarán tus puntos de tu saldo actual y se te brindará un cupón visual con barra. Muéstrale este código en el celular al camarero antes de pagar.",
      category: "Canjes"
    },
    {
      q: "¿Qué vigencia tienen mis puntos y cupones?",
      a: "Tus puntos acumulados no vencen mientras registres al menos una compra anual en cualquiera de las sucursales. Sin embargo, los cupones generados para premios tienen validez exclusiva únicamente por el día de la fecha de su emisión (vencen a las 23:59 hs).",
      category: "Vencimiento"
    },
    {
      q: "¿Tiene algún costo participar?",
      a: "Absolutamente ninguno. El registro, la permanencia y el acceso a los niveles del Club es completamente gratuito. Todo el valor se devuelve en forma de productos y experiencias exclusivas.",
      category: "General"
    }
  ];

  const filteredFaqs = faqs.filter(
    item => 
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 md:space-y-8 pb-12"
    >
      {/* Dynamic Styled Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle size={18} className="text-love animate-pulse shrink-0" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#92400E] dark:text-amber-400">Canal de Soporte</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
              Centro de Ayuda
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm mt-1.5 font-medium max-w-xl">
              Aquí puedes resolver tus dudas sobre el funcionamiento del Club CRAFT, conocer nuestros términos y condiciones legales y enterarte cómo exprimir tu membresía.
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shrink-0 self-start md:self-center">
            <button 
              onClick={() => setActiveTab('faq')}
              className={cn(
                "px-5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
                activeTab === 'faq' 
                  ? "bg-white dark:bg-slate-800 text-love shadow-sm font-black" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <HelpCircle size={12} />
              Preguntas Frecuentes
            </button>
            <button 
              onClick={() => {
                setActiveTab('terms');
                setActiveFaqIndex(null);
              }}
              className={cn(
                "px-5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
                activeTab === 'terms' 
                  ? "bg-white dark:bg-slate-800 text-love shadow-sm font-black" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <FileText size={12} />
              Bases y condiciones
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'faq' ? (
          <motion.div 
            key="faq-section"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Search Input Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar respuestas, niveles, puntos o canjes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl pl-12 pr-4 py-3 text-xs outline-none focus:border-love/50 text-ink dark:text-white font-semibold placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Accordion List */}
            <div className="space-y-3">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((item, index) => {
                  const isOpen = activeFaqIndex === index;
                  return (
                    <motion.div 
                      key={index} 
                      layout
                      className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900 duration-300"
                    >
                      <button
                        onClick={() => setActiveFaqIndex(isOpen ? null : index)}
                        className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-xs md:text-sm uppercase tracking-tight text-ink dark:text-white cursor-pointer bg-transparent border-0 outline-none"
                      >
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <span className="text-[8px] font-black uppercase text-love tracking-widest bg-love/5 dark:bg-love/15 px-2 py-0.5 rounded-lg self-start">
                            {item.category}
                          </span>
                          <span className="truncate pr-4">{item.q}</span>
                        </div>
                        <ChevronRight 
                          size={18} 
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
                            <p className="p-5 pt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold whitespace-pre-line border-t border-slate-100/50 dark:border-slate-800/50">
                              {item.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-slate-400 dark:text-slate-500 text-xs font-bold uppercase py-16 italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                  No encontramos preguntas que coincidan con tu búsqueda.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="terms-section"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Bento T&C Item 1 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-love/10 rounded-xl flex items-center justify-center text-love mb-4">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#B45309] dark:text-amber-400 mb-2">1. Marco General y Registro</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  El programa de beneficios "Club CRAFT" es operado exclusivamente por la administración de la marca CRAFT. Al registrarse en la plataforma, el usuario declara haber leído, comprendido e implicado su pleno consentimiento sobre cada cláusula de este reglamento de uso activo.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-150/10 text-[9px] uppercase font-black text-slate-400 flex items-center gap-1">
                <CheckCircle size={10} className="text-emerald-500" /> Registro Libre y Gratuito
              </div>
            </div>

            {/* Bento T&C Item 2 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-love/10 rounded-xl flex items-center justify-center text-love mb-4">
                  <Award size={20} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#B45309] dark:text-amber-400 mb-2">2. Personalidad de Puntos</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Los puntos son individuales, estrictamente intransferibles y no son intercambiables por dinero físico. El usuario está obligado a corroborar su identidad mediante DNI original ante el personal de sucursal para validar cualquier carga o canje de puntos dentro del local.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-150/10 text-[9px] uppercase font-black text-slate-400 flex items-center gap-1">
                <CheckCircle size={10} className="text-emerald-500" /> Validez Asociada al DNI
              </div>
            </div>

            {/* Bento T&C Item 3 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-love/10 rounded-xl flex items-center justify-center text-love mb-4">
                  <Clock size={20} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#B45309] dark:text-amber-400 mb-2">3. Expiración de Puntos y Cupones</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Los puntos acumulados no vencen siempre y cuando se asocie al menos 1 visita o consumo en el término de 12 meses. Sin embargo, los cupones redimidos de premios solo tienen validez estricta para el día natural de su fecha de emisión (vencen a las 23:59 hs). Pasado ese límite, el premio se extingue sin derecho a reintegro de puntos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-150/10 text-[9px] uppercase font-black text-slate-400 flex items-center gap-1">
                <CheckCircle size={10} className="text-emerald-500" /> Cupones caducan a medianoche
              </div>
            </div>

            {/* Bento T&C Item 4 */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/30 dark:shadow-none flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-love/10 rounded-xl flex items-center justify-center text-love mb-4">
                  <Scale size={20} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#B45309] dark:text-amber-400 mb-2">4. Derechos de Modificación</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  CRAFT se guarda el derecho soberano e incontrastable de dar por finalizado el programa, alterar la tasa de equivalencia de puntos ($1000 = 1 PTS) o remover premios de la tienda informando con al menos 15 días corridos de antelación en sus canales públicos.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-150/10 text-[9px] uppercase font-black text-slate-400 flex items-center gap-1">
                <CheckCircle size={10} className="text-emerald-500" /> Facultad de Ajuste del Catálogo
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
