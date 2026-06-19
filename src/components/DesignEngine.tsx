import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

export interface BannerConfig {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  bgColor: string;
  textColor: string;
  buttonText: string;
}

export interface Branch {
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

export interface FaqItem {
  q: string;
  a: string;
  category: string;
}

export interface ComboConfig {
  id: string;
  title: string;
  description: string;
  price: number;
  totalUses: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface DesignConfig {
  fontSans: string;
  fontHeadings: string;
  primaryColor: string;
  primaryColorHover: string;
  primaryColorRgb: string;
  radiusLg: string;
  radiusMd: string;
  radiusSm: string;
  bgPaperLight: string;
  bgPaperDark: string;
  bgCardLight: string;
  bgCardDark: string;
  logoUrl: string;
  logoText: string;
  logoSubtitle: string;
  customCss: string;
  banners: BannerConfig[];
  
  // Custom Help/FAQ & Terms Config added by user
  faqs?: FaqItem[];
  terms?: string;
  
  // Custom branches added by user
  branches?: Branch[];

  // Custom combos prepago added by user
  combos?: ComboConfig[];
  
  // Custom client button colors (active/inactive styling)
  navButtonColors?: Record<string, string>; // e.g. { '/': '#ef4444', '/rewards': '#10b981', '/help': '#3b82f6', '/branches': '#f59e0b' }
  // Custom client button positions/order
  navButtonOrder?: string[]; // e.g. ['/', '/rewards', '/help', '/branches']
  
  // Custom Card/Button visual styling
  pointsCardBg?: string;
  pointsCardText?: string;
  profileButtonBg?: string;
  profileButtonText?: string;

  // Custom section titles and subtitles
  recomTitle?: string;
  recomSubtitle?: string;
  rutaTitle?: string;
  rutaSubtitle?: string;
  txTitle?: string;
  txSubtitle?: string;
}

export const DEFAULT_DESIGN: DesignConfig = {
  fontSans: 'Inter',
  fontHeadings: 'Space Grotesk',
  primaryColor: '#ef4444',
  primaryColorHover: '#dc2626',
  primaryColorRgb: '239, 68, 68',
  radiusLg: '24px',
  radiusMd: '16px',
  radiusSm: '8px',
  bgPaperLight: '#f8fafc',
  bgPaperDark: '#020617',
  bgCardLight: '#ffffff',
  bgCardDark: '#0f172a',
  logoUrl: '',
  logoText: 'CLUB CRAFT',
  logoSubtitle: 'Management & Loyalty',
  customCss: '',
  banners: [
    {
      id: 'banner-1',
      title: '¡Hora de Especialidad!',
      subtitle: 'Canjea tu café de especialidad con 100 puntos hoy mismo.',
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=600&auto=format&fit=crop',
      linkUrl: '#/rewards',
      bgColor: '#7c2d12',
      textColor: '#ffedd5',
      buttonText: 'Ver Premios'
    },
    {
      id: 'banner-2',
      title: 'Doble de Puntos los Jueves',
      subtitle: 'Todos los consumos de este jueves suman el doble en tu perfil.',
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop',
      linkUrl: '#/',
      bgColor: '#1e3a8a',
      textColor: '#dbeafe',
      buttonText: 'Saber Más'
    }
  ],
  faqs: [
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
    }
  ],
  terms: "El programa de beneficios 'Club CRAFT' es operado exclusivamente por la administración de la marca CRAFT. Al registrarse en la plataforma, el usuario declara haber leído, comprendido e implicado su pleno consentimiento sobre cada cláusula de este reglamento de uso activo.\n\nLos puntos son individuales, estrictamente intransferibles y no son intercambiables por dinero físico. El usuario está obligado a corroborar su identidad mediante DNI original ante el personal de sucursal para validar cualquier carga o canje de puntos dentro del local.\n\nLos puntos acumulados no vencen siempre y cuando se asocie al menos 1 visita o consumo en el término de 12 meses. Sin embargo, los cupones redimidos de premios solo tienen validez estricta para el día natural de su fecha de emisión (vencen a las 23:59 hs). Pasado ese límite, el premio se extingue sin derecho a reintegro de puntos.\n\nCRAFT se guarda el derecho soberano de dar por finalizado el programa, alterar la tasa de equivalencia de puntos ($1000 = 1 PTS) o remover premios de la tienda informando con al menos 15 días corridos de antelación en sus canales públicos.",
  branches: [
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
    }
  ],
  combos: [
    {
      id: 'combo-1',
      title: 'Pase de Almuerzos',
      description: '5 Menús de canje de mediodía a elección en cualquier sucursal. Incluye bebida y postre.',
      price: 65000,
      totalUses: 5,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop',
      isActive: true
    },
    {
      id: 'combo-2',
      title: 'Pack Especialidad Espresso',
      description: '10 cafés de especialidad o lattes a elección de nuestra carta Barista. Ahorra 30% en cada taza.',
      price: 30000,
      totalUses: 10,
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=600&auto=format&fit=crop',
      isActive: true
    },
    {
      id: 'combo-3',
      title: 'Abono Brunch Premium (3)',
      description: '3 Brunchs completos de fin de semana para dos personas. Ideal para regalar o compartir.',
      price: 42000,
      totalUses: 3,
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=600&auto=format&fit=crop',
      isActive: true
    }
  ],
  navButtonColors: {
    '/': '#ef4444',
    '/rewards': '#ef4444',
    '/help': '#ef4444',
    '/branches': '#ef4444'
  },
  navButtonOrder: ['/', '/rewards', '/help', '/branches']
};

// Quick Color Presets
export const COLOR_PRESETS = [
  {
    name: 'Love Red (Estándar)',
    primary: '#ef4444',
    hover: '#dc2626',
    rgb: '239, 68, 68'
  },
  {
    name: 'Tuscan Sunset (Naranja/Coral)',
    primary: '#f97316',
    hover: '#ea580c',
    rgb: '249, 115, 22'
  },
  {
    name: 'Forest Emerald (Verde Orgánico)',
    primary: '#10b981',
    hover: '#059669',
    rgb: '16, 185, 129'
  },
  {
    name: 'Electric Indigo (Elegante/Moderno)',
    primary: '#6366f1',
    hover: '#4f46e5',
    rgb: '99, 102, 241'
  },
  {
    name: 'Velvet Violet (Sofisticado)',
    primary: '#8b5cf6',
    hover: '#7c3aed',
    rgb: '139, 92, 246'
  },
  {
    name: 'Gold Amber (Premium/Café)',
    primary: '#d97706',
    hover: '#b45309',
    rgb: '217, 119, 6'
  },
  {
    name: 'Cyber Magenta (Atrevido/Retro)',
    primary: '#ec4899',
    hover: '#db2777',
    rgb: '236, 72, 153'
  },
  {
    name: 'Nordic Charcoal (Minimalista)',
    primary: '#334155',
    hover: '#1e293b',
    rgb: '51, 65, 85'
  }
];

// Quick Corner Presets
export const CORNER_PRESETS = [
  { name: 'Recto (Modern Brutalist)', lg: '0px', md: '0px', sm: '0px' },
  { name: 'Sutil (Clásico)', lg: '12px', md: '8px', sm: '4px' },
  { name: 'Redondeado (Moderno)', lg: '24px', md: '16px', sm: '8px' },
  { name: 'Extra Redondo (Playful)', lg: '40px', md: '24px', sm: '12px' }
];

// Available Google Fonts for dropdown selection
export const AVAILABLE_FONTS = [
  'Inter',
  'Space Grotesk',
  'Playfair Display',
  'Outfit',
  'Plus Jakarta Sans',
  'Montserrat',
  'JetBrains Mono',
  'Quicksand',
  'DM Sans',
  'Syne',
  'Bricolage Grotesque',
  'Cabin'
];

interface DesignContextType {
  designConfig: DesignConfig;
  setDesignConfig: React.Dispatch<React.SetStateAction<DesignConfig>>;
  saveDesignConfig: (newConfig: DesignConfig) => Promise<void>;
  loading: boolean;
  refreshDesign: () => Promise<void>;
}

const DesignContext = createContext<DesignContextType>({
  designConfig: DEFAULT_DESIGN,
  setDesignConfig: () => {},
  saveDesignConfig: async () => {},
  loading: true,
  refreshDesign: async () => {}
});

export const useDesign = () => useContext(DesignContext);

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [designConfig, setDesignConfig] = useState<DesignConfig>(DEFAULT_DESIGN);
  const [loading, setLoading] = useState(true);

  const fetchDesign = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogo_premios')
        .select('*')
        .eq('title', '__DESIGN_SETTINGS__')
        .maybeSingle();

      if (data && data.description) {
        const parsed = JSON.parse(data.description);
        // Fallbacks for any newly added fields to prevent crashes
        setDesignConfig({
          ...DEFAULT_DESIGN,
          ...parsed,
          banners: Array.isArray(parsed.banners) ? parsed.banners : DEFAULT_DESIGN.banners
        });
      } else {
        setDesignConfig(DEFAULT_DESIGN);
      }
    } catch (e) {
      console.error('Error fetching design configuration from DB:', e);
      setDesignConfig(DEFAULT_DESIGN);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesign();
  }, []);

  // Update dynamic styles in head
  useEffect(() => {
    // 1. Load Google Fonts dynamically
    const oldLink = document.getElementById('marketing-google-fonts');
    if (oldLink) oldLink.remove();

    const fontsToLoad: string[] = [];
    if (designConfig.fontSans) fontsToLoad.push(designConfig.fontSans);
    if (designConfig.fontHeadings && designConfig.fontHeadings !== designConfig.fontSans) {
      fontsToLoad.push(designConfig.fontHeadings);
    }

    if (fontsToLoad.length > 0) {
      const fontQuery = fontsToLoad
        .map((f) => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900`)
        .join('&');
      const link = document.createElement('link');
      link.id = 'marketing-google-fonts';
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
      document.head.appendChild(link);
    }

    // 2. Inject CSS styles with important overrides to override static classes
    const styleId = 'dynamic-marketing-design-styles';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    // Convert hex to rgb utility for custom opacity values
    const rgb = designConfig.primaryColorRgb;

    styleTag.innerHTML = `
      :root {
        --color-love: ${designConfig.primaryColor} !important;
        --radius-large: ${designConfig.radiusLg} !important;
        --radius-medium: ${designConfig.radiusMd} !important;
        --radius-small: ${designConfig.radiusSm} !important;
      }

      /* Fonts */
      body, button, input, select, textarea, .font-sans {
        font-family: "${designConfig.fontSans}", ui-sans-serif, system-ui, sans-serif !important;
      }
      
      h1, h2, h3, h4, h5, h6, .font-black, .font-extrabold, .logo-title {
        font-family: "${designConfig.fontHeadings}", "${designConfig.fontSans}", ui-sans-serif, system-ui, sans-serif !important;
      }

      /* Dynamic primary color class overrides */
      .bg-love {
        background-color: ${designConfig.primaryColor} !important;
      }
      .text-love {
        color: ${designConfig.primaryColor} !important;
      }
      .border-love {
        border-color: ${designConfig.primaryColor} !important;
      }
      .shadow-love\\/20 {
        --tw-shadow: 0 10px 15px -3px rgba(${rgb}, 0.2), 0 4px 6px -4px rgba(${rgb}, 0.2) !important;
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow) !important;
      }
      .shadow-love\\/10 {
        --tw-shadow: 0 4px 6px -1px rgba(${rgb}, 0.1), 0 2px 4px -2px rgba(${rgb}, 0.1) !important;
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow) !important;
      }
      .bg-love\\/5 {
        background-color: rgba(${rgb}, 0.05) !important;
      }
      .bg-love\\/10 {
        background-color: rgba(${rgb}, 0.1) !important;
      }
      .border-love\\/10 {
        border-color: rgba(${rgb}, 0.1) !important;
      }
      .border-love\\/15 {
        border-color: rgba(${rgb}, 0.15) !important;
      }
      
      .hover\\:bg-love:hover {
        background-color: ${designConfig.primaryColor} !important;
        color: white !important;
      }
      .hover\\:text-love:hover {
        color: ${designConfig.primaryColor} !important;
      }
      .hover\\:border-love\\/30:hover {
        border-color: rgba(${rgb}, 0.3) !important;
      }
      .focus\\:border-love\\/30:focus {
        border-color: rgba(${rgb}, 0.35) !important;
      }

      /* Rounded Presets */
      .rounded-3xl {
        border-radius: ${designConfig.radiusLg} !important;
      }
      .rounded-2xl {
        border-radius: ${designConfig.radiusMd} !important;
      }
      .rounded-xl {
        border-radius: ${designConfig.radiusSm} !important;
      }

      /* Custom Paper / Card canvas coloring */
      body {
        background-color: ${designConfig.bgPaperLight} !important;
      }
      .dark body {
        background-color: ${designConfig.bgPaperDark} !important;
      }

      .bg-paper {
        background-color: ${designConfig.bgPaperLight} !important;
      }
      .dark .bg-paper {
        background-color: ${designConfig.bgPaperDark} !important;
      }

      .bg-white {
        background-color: ${designConfig.bgCardLight} !important;
      }
      .dark .bg-white {
        background-color: ${designConfig.bgCardDark} !important;
      }

      /* Borders */
      .border-slate-100, .border-slate-200 {
        border-color: #f1f5f9;
      }
      .dark .border-slate-100, .dark .border-slate-200 {
        border-color: ${designConfig.bgPaperDark === '#020617' ? '#1e293b' : 'rgba(255,255,255,0.08)'} !important;
      }

      /* Arbitrary Marketing Custom CSS */
      ${designConfig.customCss || ''}
    `;
  }, [designConfig]);

  const saveDesignConfig = async (newConfig: DesignConfig) => {
    try {
      const { data: existing } = await supabase
        .from('catalogo_premios')
        .select('id')
        .eq('title', '__DESIGN_SETTINGS__')
        .maybeSingle();

      const dbPayload = {
        title: '__DESIGN_SETTINGS__',
        description: JSON.stringify(newConfig),
        points_cost: 0,
        image_url: newConfig.logoUrl || '',
        is_active: false // Keep invisible from prizes list
      };

      if (existing) {
        const { error } = await supabase
          .from('catalogo_premios')
          .update(dbPayload)
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('catalogo_premios')
          .insert([dbPayload]);
        
        if (error) throw error;
      }

      setDesignConfig(newConfig);
    } catch (e: any) {
      console.error('Error saving design configuration:', e);
      throw e;
    }
  };

  return (
    <DesignContext.Provider
      value={{
        designConfig,
        setDesignConfig,
        saveDesignConfig,
        loading,
        refreshDesign: fetchDesign,
      }}
    >
      {children}
    </DesignContext.Provider>
  );
}
