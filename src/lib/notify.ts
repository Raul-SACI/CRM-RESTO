import { supabase } from '@/src/lib/supabase';

interface NotifyParams {
  clientId: string;
  clientEmail?: string | null;
  title: string;
  message: string;
  sendEmail?: boolean;
}

/**
 * Crea una notificación para un cliente: la guarda en la campanita de la app
 * y, si corresponde, envía también un email. Es "best effort": si algo falla,
 * no rompe la acción principal (carga de puntos, canje, compra).
 */
export async function notifyClient({ clientId, clientEmail, title, message, sendEmail = true }: NotifyParams) {
  // 1) Guardar el aviso en la app (campanita)
  try {
    const { error } = await supabase.from('notifications').insert([{ client_id: clientId, title, message }]);
    if (error) {
      // Supabase devuelve el error en .error (no lo lanza), por eso lo revisamos acá.
      console.warn('No se pudo guardar la notificación en la app:', error.message, error);
    }
  } catch (e) {
    console.warn('Excepción al guardar la notificación en la app:', e);
  }

  // 2) Enviar email (opcional)
  if (sendEmail && clientEmail && clientEmail.includes('@')) {
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: clientEmail.trim(), subject: title, message })
      });
    } catch (e) {
      console.warn('No se pudo enviar el email automático:', e);
    }
  }
}

interface TierLike { name: string; minPoints: number }

/**
 * Detecta si el cliente subió de categoría al pasar de oldPoints a newPoints.
 * Si subió y el aviso está activo, manda la felicitación (app + email) y,
 * si corresponde, regala puntos (registrando la transacción). Devuelve los
 * puntos de regalo aplicados (0 si ninguno) para que el llamador actualice saldo.
 */
export async function checkLevelUp(opts: {
  client: { id: string; full_name?: string; email?: string | null; points?: number };
  oldPoints: number;
  newPoints: number;
  tiers: TierLike[];
  cfg?: { enabled: boolean; message: string; giftPoints: number };
}): Promise<number> {
  const { client, oldPoints, newPoints, tiers, cfg } = opts;
  if (!cfg || !cfg.enabled) return 0;
  if (!tiers || tiers.length === 0) return 0;

  // Ordenamos los tiers por umbral ascendente
  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  const tierOf = (pts: number): TierLike => {
    let current = sorted[0];
    for (const t of sorted) {
      if (pts >= t.minPoints) current = t;
    }
    return current;
  };

  const before = tierOf(oldPoints);
  const after = tierOf(newPoints);

  // Subió si el umbral del tier nuevo es mayor que el del anterior
  if (after.minPoints <= before.minPoints) return 0;

  const msg = (cfg.message || '¡Felicitaciones {nombre}! Subiste a {categoria}.')
    .replace(/\{nombre\}/g, client.full_name || 'crafter')
    .replace(/\{categoria\}/g, after.name)
    .replace(/\{puntos\}/g, String(cfg.giftPoints || 0));

  // Aviso (app + email)
  await notifyClient({
    clientId: client.id,
    clientEmail: client.email,
    title: `¡Subiste a ${after.name}! 🎉`,
    message: msg
  });

  // Regalo de puntos (opcional). Registramos transacción trazable.
  const gift = cfg.giftPoints || 0;
  if (gift > 0) {
    try {
      await supabase.from('transactions').insert([{
        client_id: client.id,
        waiter_id: client.id,
        amount: 0,
        points_earned: gift,
        branch: 'REGALO AUTOMÁTICO',
        description: `REGALO_NIVEL: +${gift} puntos por subir a ${after.name}`
      }]);
    } catch (e) {
      console.warn('No se pudo registrar el regalo de nivel:', e);
    }
  }
  return gift;
}
