import React from 'react';

// ¿El error viene de un "chunk" que no cargó? (típico al abrir la app con una
// versión vieja en caché justo después de un deploy).
function isChunkError(err: any): boolean {
  const msg = String((err && err.message) || err || '');
  return /dynamically imported module|Failed to fetch dynamically|Importing a module script failed|ChunkLoadError|Loading chunk|error loading dynamically imported|module script failed/i.test(msg);
}

interface State { hasError: boolean; error: any; }

// Red de seguridad global: evita que un error deje la pantalla en blanco.
// - Si falló la carga de un chunk, recarga UNA vez para bajar la versión nueva.
// - Si es otro error, muestra un aviso con botón de recargar (no una pantalla blanca).
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any) {
    if (isChunkError(error)) {
      try {
        if (!sessionStorage.getItem('chunk_reloaded')) {
          sessionStorage.setItem('chunk_reloaded', '1');
          window.location.reload();
        }
      } catch (e) { /* noop */ }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#D90015', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, marginBottom: 16 }}>!</div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>No pudimos cargar la app</h1>
          <p style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '0 0 20px', lineHeight: 1.5 }}>
            Puede ser una actualización reciente o una conexión intermitente. Probá recargar; si sigue, cerrá y volvé a abrir.
          </p>
          <button
            onClick={() => { try { sessionStorage.removeItem('chunk_reloaded'); } catch (e) { /* noop */ } window.location.reload(); }}
            style={{ padding: '12px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
