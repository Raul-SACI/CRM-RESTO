import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, Phone, Wifi, Coffee, Sparkles, Map, Compass, Navigation, Globe, Check } from 'lucide-react';
import { useDesign } from '@/src/components/DesignEngine';
import { cn } from '@/src/lib/utils';

interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  hoursWeekday: string;
  hoursWeekend: string;
  specialty: string;
  features: string[];
  coordinates: string;
  imageUrl: string;
  googleMapsUrl: string;
}

export function Branches() {
  const { designConfig, loading } = useDesign();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const branches = (designConfig?.branches || []).filter(b => b.active !== false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 md:space-y-8 pb-12"
    >
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-love animate-pulse shrink-0" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#92400E] dark:text-amber-400">Nuestras Sucursales</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Epilogue'}", sans-serif` }}>
              Nuestras Sucursales
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm mt-1.5 font-medium max-w-xl">
              Encuentra la sucursal de Club CRAFT más cercana a ti, conoce sus cómodos horarios y acécate a sumar puntos con tus amigos o familia.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 font-mono text-[10px] text-slate-400 font-extrabold uppercase shrink-0">
            📍 {loading ? '···' : `${branches.length} ${branches.length === 1 ? 'Local' : 'Locales'}`}
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {loading ? (
          <>
            <div className="craft-skeleton h-80 w-full rounded-[2rem]" />
            <div className="craft-skeleton h-80 w-full rounded-[2rem]" />
          </>
        ) : branches.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-400 font-bold uppercase text-xs tracking-widest">
            No hay sucursales cargadas por el momento.
          </div>
        ) : branches.map((branch) => {
          const isSelected = selectedBranchId === branch.id;
          const phoneClean = branch.phone ? branch.phone.replace(/\D/g, '') : '';
          // Formato WhatsApp Argentina: 549 + código de área + número (sin 0 ni 15)
          let whatsappPhone = phoneClean;
          if (phoneClean) {
            if (phoneClean.startsWith('549')) {
              whatsappPhone = phoneClean;
            } else if (phoneClean.startsWith('54')) {
              whatsappPhone = '549' + phoneClean.slice(2);
            } else {
              whatsappPhone = '549' + phoneClean;
            }
          }

          return (
            <div 
              key={branch.id}
              onClick={() => setSelectedBranchId(isSelected ? null : branch.id)}
              className={cn(
                "bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border shadow-xl shadow-slate-200/45 dark:shadow-none flex flex-col group transition-all duration-300 cursor-pointer select-none",
                isSelected ? "border-love ring-2 ring-love/15 scale-[1.01]" : "border-slate-105 dark:border-slate-800 hover:border-love/30"
              )}
            >
              {/* Branch Image Hero banner with Overlay details */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-200 dark:bg-slate-850">
                <img 
                  src={branch.imageUrl} 
                  alt={branch.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Address tag */}
                <div className="absolute top-4 left-4">
                  <span className="bg-black/70 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center gap-1">
                    <Compass size={10} className="text-love" /> {branch.address}
                  </span>
                </div>
              </div>

              {/* Branch Body details */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-ink dark:text-white transition-colors group-hover:text-love">
                        {branch.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-slate-400" /> {branch.address}
                      </p>
                    </div>
                  </div>

                  {/* Features Tag Grid */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {branch.features.map((feature, idx) => (
                      <span 
                        key={idx}
                        className="bg-slate-50/70 dark:bg-slate-950/20 text-slate-450 dark:text-slate-550 border border-slate-100 dark:border-slate-800 text-[8px] font-bold uppercase py-1 px-2 rounded-lg"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Schedule & Phone lists */}
                  <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-5 text-xs font-semibold text-slate-550 dark:text-slate-350">
                    <div className="flex items-start gap-2.5">
                      <Clock size={14} className="text-love mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Horarios de Atención</p>
                        <p className="leading-none text-slate-500">Lun a Vie: <span className="font-bold !text-slate-900">{branch.hoursWeekday || 'Consultar'}</span></p>
                        <p className="leading-none mt-1 text-slate-500">Sáb, Dom y Fer: <span className="font-bold !text-slate-900">{branch.hoursWeekend || 'Consultar'}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pt-1">
                      <Phone size={14} className="text-love shrink-0" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Llamar / Reservar / WhatsApp</p>
                        <a 
                          href={phoneClean ? `https://wa.me/${whatsappPhone}` : '#'} 
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="font-bold !text-slate-900 hover:text-love transition-colors flex items-center gap-1"
                        >
                          {branch.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones siempre visibles */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div
                    className="flex gap-2 w-full pt-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <a 
                      href={branch.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.name + ' ' + branch.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 border bg-love text-white border-none hover:bg-love/90 active:scale-95 shadow-md shadow-love/10"
                    >
                      <Navigation size={12} className="animate-pulse" />
                      Ver Ubicación
                    </a>

                    <a 
                      href={phoneClean ? `https://wa.me/${whatsappPhone}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 border bg-emerald-500 text-white border-none hover:bg-emerald-600 active:scale-95 shadow-md shadow-emerald-500/10"
                    >
                      <Phone size={12} />
                      Contactar
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
