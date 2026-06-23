import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { AppNotification } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationBellProps {
  clientId: string;
}

export function NotificationBell({ clientId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      // Avisos para este cliente o para todos (client_id null)
      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`client_id.eq.${clientId},client_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && notifs) {
        setNotifications(notifs as AppNotification[]);
      }

      // Qué avisos ya leyó este cliente
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('client_id', clientId);

      if (reads) {
        setReadIds(new Set(reads.map((r: any) => r.notification_id)));
      }
    } catch (e) {
      console.warn('Error cargando notificaciones:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresca al re-enfocar la pestaña
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const handleOpen = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      // Marcar como leídos los que aún no lo están
      const toMark = notifications.filter(n => !readIds.has(n.id));
      const rows = toMark.map(n => ({ notification_id: n.id, client_id: clientId }));
      try {
        await supabase.from('notification_reads').insert(rows);
        setReadIds(prev => {
          const next = new Set(prev);
          toMark.forEach(n => next.add(n.id));
          return next;
        });
      } catch (e) {
        console.warn('Error marcando leídos:', e);
      }
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border-none bg-transparent"
        aria-label="Notificaciones"
      >
        <Bell size={20} className="text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-love text-white text-[9px] font-black rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[300px] max-w-[85vw] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-[100] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-widest !text-slate-900">Notificaciones</h4>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border-none bg-transparent cursor-pointer">
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            <div className="max-h-[320px] overflow-y-auto">
              {loading ? (
                <p className="text-center py-8 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Cargando...</p>
              ) : notifications.length === 0 ? (
                <p className="text-center py-8 text-[10px] uppercase tracking-widest text-slate-400 font-bold">No tenés avisos por ahora</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 ${!readIds.has(n.id) ? 'bg-love/5' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!readIds.has(n.id) && <span className="w-2 h-2 rounded-full bg-love mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black !text-slate-900 leading-tight">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mt-1.5">{formatDate(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
