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
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const branches: Branch[] = [
    {
      id: '1',
      name: 'CRAFT Centro',
      address: 'Urquiza 1024 (Esq. San Martín)',
      city: 'Paraná',
      province: 'Entre Ríos',
      phone: '+54 343 4221155',
      hoursWeekday: '07:00 a 21:00 hs',
      hoursWeekend: '08:30 a 20:30 hs',
      specialty: 'Café de Especialidad & Pastelería Fina Europea',
      features: ['Wifi de Alta Velocidad', 'Pet Friendly', 'Área de Coworking Silencioso', 'Take Away'],
      coordinates: '-31.733190, -60.529810',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=600',
      googleMapsUrl: 'https://maps.google.com/?q=-31.733190,-60.529810'
    },
    {
      id: '2',
      name: 'CRAFT Perón',
      address: 'Av. Francisco Ramírez 2450',
      city: 'Paraná',
      province: 'Entre Ríos',
      phone: '+54 343 4351166',
      hoursWeekday: '07:30 a 22:30 hs',
      hoursWeekend: '08:00 a 23:30 hs',
      specialty: 'Brunch Completo & Tragos de Autor',
      features: ['Estacionamiento Propio', 'Pet Friendly', 'Patio al Aire Libre', 'Música en Vivo'],
      coordinates: '-31.745120, -60.512640',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600',
      googleMapsUrl: 'https://maps.google.com/?q=-31.745120,-60.512640'
    },
    {
      id: '3',
      name: 'CRAFT Costanera',
      address: 'Av. Laurencena y Morse (Puerto)',
      city: 'Paraná',
      province: 'Entre Ríos',
      phone: '+54 343 4902233',
      hoursWeekday: '08:00 a 13:00 hs y de 16:30 a 23:00 hs',
      hoursWeekend: '08:00 a 00:30 hs (Corrido)',
      specialty: 'Licuados Premium & Tapas frente al Río Paraná',
      features: ['Deck de Madera al Río', 'Pet Friendly', 'Carga de Autos Eléctricos', 'Take Away'],
      coordinates: '-31.721450, -60.521890',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600',
      googleMapsUrl: 'https://maps.google.com/?q=-31.721450,-60.521890'
    },
    {
      id: '4',
      name: 'CRAFT Gualeguaychú',
      address: 'Costanera Morrogh Bernard y Bolívar',
      city: 'Gualeguaychú',
      province: 'Entre Ríos',
      phone: '+54 3446 423344',
      hoursWeekday: '08:00 a 12:30 hs y de 17:00 a 22:30 hs',
      hoursWeekend: '08:00 a 23:30 hs (Corrido)',
      specialty: 'Café de Autor & Cocina Saludable de Estación',
      features: ['Mesas al Aire Libre', 'Pet Friendly', 'Bici Soportes Seguros', 'Take Away'],
      coordinates: '-33.009450, -58.508120',
      imageUrl: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=600',
      googleMapsUrl: 'https://maps.google.com/?q=-33.009450,-58.508120'
    }
  ];

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
          const isMapOpen = selectedBranchId === branch.id;
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
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Llamar / Reservar</p>
                        <a 
                          href={`tel:${branch.phone.replace(/\s+/g, '')}`} 
                          className="font-bold text-ink dark:text-white hover:text-love transition-colors"
                        >
                          {branch.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Visual Maps & Navigation links */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 w-full">
                  <button 
                    onClick={() => setSelectedBranchId(isMapOpen ? null : branch.id)}
                    className={cn(
                      "flex-1 py-3 text-[10px] uppercase tracking-wider font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 border",
                      isMapOpen
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200/50 dark:bg-slate-950 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
                    )}
                  >
                    <Map size={12} />
                    {isMapOpen ? 'Ocultar Croquis' : 'Ver Ubicación'}
                  </button>

                  <a 
                    href={branch.googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 bg-love hover:bg-love/90 text-white rounded-xl transition-all flex items-center justify-center shadow-lg shadow-love/15"
                    title="Navegar en Google Maps"
                  >
                    <Navigation size={14} />
                  </a>
                </div>
              </div>

              {/* Collapsible Animated Visual Coordinates Croquis */}
              <AnimatePresence>
                {isMapOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-950 dark:bg-black/65 text-slate-400 overflow-hidden font-mono text-[10px] border-t border-slate-800"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-center text-love text-[9px] uppercase font-black tracking-widest">
                        <span>🛰️ Geoposicionamiento Activo</span>
                        <span>Club CRAFT Local ID #{branch.id}</span>
                      </div>
                      
                      {/* Stylized simulated schematic layout of standard ER city grid */}
                      <div className="h-28 bg-slate-900/60 rounded-xl relative border border-slate-800 overflow-hidden flex items-center justify-center">
                        {/* Street grid line decorations */}
                        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                        <div className="absolute h-[1px] w-full bg-slate-800/80 top-1/3" />
                        <div className="absolute h-[1px] w-full bg-slate-800/80 top-2/3" />
                        <div className="absolute w-[1px] h-full bg-slate-800/80 left-1/3" />
                        <div className="absolute w-[1px] h-full bg-slate-800/80 left-2/3" />
                        
                        {/* Streets Name plates */}
                        <div className="absolute top-1 right-2 bg-slate-950/80 px-2 py-0.5 rounded-md text-[8px] scale-90 border border-slate-800 text-slate-500">Calle Entre Ríos</div>
                        <div className="absolute left-1/2 bottom-2 bg-slate-950/80 px-2 py-0.5 rounded-md text-[8px] scale-90 border border-slate-800 text-slate-500">Av. Urquiza</div>

                        {/* Interactive pointer animate pin */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center flex flex-col items-center">
                          <span className="w-5 h-5 rounded-full bg-love/20 border border-love animate-ping absolute top-0" />
                          <MapPin size={18} className="text-love animate-bounce" />
                          <span className="bg-love text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md mt-1.5 shadow-md">Aquí CRAFT</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between text-[9px] text-slate-500 gap-2 font-mono">
                        <span>Coordenadas Gps: <b>{branch.coordinates}</b></span>
                        <span className="text-right">Provincia: <b>{branch.province} (Argentina)</b></span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
