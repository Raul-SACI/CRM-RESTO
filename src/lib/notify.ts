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
    await supabase.from('notifications').insert([{ client_id: clientId, title, message }]);
  } catch (e) {
    console.warn('No se pudo guardar la notificación en la app:', e);
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
