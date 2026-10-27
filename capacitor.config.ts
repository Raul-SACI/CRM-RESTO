import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ID único de la app en las tiendas (reverse-DNS, minúsculas, sin guiones).
  appId: 'ar.com.craftclub.app',
  appName: 'CLUB CRAFT',

  // Carpeta con el build web (necesaria aunque usemos server.url).
  webDir: 'dist',

  server: {
    // ── MODO RECOMENDADO PARA ARRANCAR ──────────────────────────────────────
    // La app carga el sitio en vivo. Ventajas: /api (pagos, emails), el login
    // de Google y el retorno de Mercado Pago funcionan igual que en la web, y
    // los cambios que publicamos salen al instante sin re-subir a la tienda.
    // (Si en el futuro querés una app 100% offline/empaquetada, ver CAPACITOR.md.)
    url: 'https://craftclub.com.ar',
    androidScheme: 'https',
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#D90015',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
