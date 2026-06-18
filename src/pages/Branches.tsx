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
  const { designConfig } = useDesign();

  const branches = designConfig?.branches || [];

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
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#92400E] dark:text-amber-400">Presencia en la Provincia</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-ink dark:text-white" style={{ fontFamily: `"${designConfig?.fontHeadings || 'Inter'}", sans-serif` }}>
              Nuestras Sucursales
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm mt-1.5 font-medium max-w-xl">
              Encuentra la sucursal de Club CRAFT más cercana a ti en la provincia de Entre Ríos, conoce sus cómodos horarios y acécate a sumar puntos con tus amigos o familia.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 font-mono text-[10px] text-slate-400 font-extrabold uppercase shrink-0">
            📍 {branches.length} Locales en Entre Ríos
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {branches.map((branch) => {
          return (
            <div 
              key={branch.id}
              className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/45 dark:shadow-none flex flex-col group hover:border-love/30 transition-all duration-300"
            >
              {/* Branch Image Hero banner with Overlay details */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-200 dark:bg-slate-850">
                <img 
                  src={branch.imageUrl} 
                  alt={branch.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* City & Province tag */}
                <div className="absolute top-4 left-4">
                  <span className="bg-black/70 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg backdrop-blur-xs flex items-center gap-1">
                    <Compass size={10} className="text-love" /> {branch.city}, ER
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
                    
                    <span className="bg-love/10 text-love text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
                      CRAFT ORIGINAL
                    </span>
                  </div>

                  {/* Specialty badge summary */}
                  <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150/10 rounded-xl p-3 mb-4 mt-2">
                    <p className="text-[9px] font-black uppercase text-love tracking-wider mb-1 flex items-center gap-1">
                      <Coffee size={10} /> Especialidad destacada
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                      {branch.specialty}
                    </p>
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
                        <p className="leading-none text-slate-500 dark:text-slate-400">Lun a Vie: <span className="font-bold text-ink dark:text-white">{branch.hoursWeekday}</span></p>
                        <p className="leading-none mt-1 text-slate-500 dark:text-slate-400">Sáb, Dom y Fer: <span className="font-bold text-ink dark:text-white">{branch.hoursWeekend}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pt-1">
                      <Phone size={14} className="text-love shrink-0" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Llamar / Reservar / WhatsApp</p>
                        <a 
                          href={`https://wa.me/${branch.phone.replace(/\D/g, '')}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-ink dark:text-white hover:text-love transition-colors flex items-center gap-1"
                        >
                          {branch.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Visual Maps & Navigation links */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 w-full">
                  <a 
                    href={branch.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 border bg-slate-50 border-slate-200/50 dark:bg-slate-950 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 active:scale-95"
                  >
                    <Map size={12} />
                    Ver Ubicación
                  </a>

                  <a 
                    href={branch.googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 bg-love hover:bg-love/90 text-white rounded-xl transition-all flex items-center justify-center shadow-lg shadow-love/15 active:scale-95"
                    title="Navegar en Google Maps"
                  >
                    <Navigation size={14} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
