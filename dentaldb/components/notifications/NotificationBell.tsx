'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, Calendar, CreditCard, Users, ShoppingCart,
  AlertCircle, X, Clock, CalendarOff, CheckCircle, XCircle, Megaphone,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { io, Socket } from 'socket.io-client';
import { notificationsApi, BASE_URL as API_BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

// Fallback destination by type, for older notifications created before `link` was populated.
const FALLBACK_LINK: Record<string, string> = {
  appointment_created:   '/dashboard/appointments',
  appointment_updated:   '/dashboard/appointments',
  appointment_cancelled: '/dashboard/appointments',
  appointment_reminder:  '/dashboard/appointments',
  invoice_created:       '/dashboard/billing',
  invoice_paid:          '/dashboard/billing',
  patient_added:         '/dashboard/patients',
  history_access_requested: '/dashboard/patients',
  referral_received:     '/doctor/referrals',
  refill_requested:      '/doctor/refill-requests',
  refill_approved:       '/dashboard/prescriptions',
  leave_requested:       '/dashboard/leave',
  leave_approved:        '/dashboard/leave',
  leave_rejected:        '/dashboard/leave',
  schedule_updated:      '/dashboard/staff',
  shift_assigned:        '/dashboard/staff',
  holiday_created:       '/dashboard/holidays',
  notice_posted:         '/dashboard/notices',
  notice_updated:        '/dashboard/notices',
};

// Map every notification type to an icon + colour
const TYPE_META: Record<string, { icon: any; color: string }> = {
  appointment_created:   { icon: Calendar,    color: 'bg-brand-500/15 text-brand-400'    },
  appointment_updated:   { icon: Calendar,    color: 'bg-brand-500/15 text-brand-400'    },
  appointment_cancelled: { icon: Calendar,    color: 'bg-red-500/15 text-red-400'        },
  appointment_reminder:  { icon: Clock,       color: 'bg-amber-500/15 text-amber-400'    },
  invoice_created:       { icon: CreditCard,  color: 'bg-blue-500/15 text-blue-400'      },
  invoice_paid:          { icon: CreditCard,  color: 'bg-emerald-500/15 text-emerald-400'},
  patient_added:         { icon: Users,       color: 'bg-brand-500/15 text-brand-400'    },
  leave_requested:       { icon: CalendarOff, color: 'bg-orange-500/15 text-orange-400'  },
  leave_approved:        { icon: CheckCircle, color: 'bg-emerald-500/15 text-emerald-400'},
  leave_rejected:        { icon: XCircle,     color: 'bg-red-500/15 text-red-400'        },
  schedule_updated:      { icon: Clock,       color: 'bg-brand-500/15 text-brand-400'    },
  shift_assigned:        { icon: Clock,       color: 'bg-brand-500/15 text-brand-400'    },
  holiday_created:       { icon: CalendarOff, color: 'bg-rose-500/15 text-rose-400'      },
  notice_posted:         { icon: Megaphone,   color: 'bg-violet-500/15 text-violet-400'  },
  notice_updated:        { icon: Megaphone,   color: 'bg-violet-500/15 text-violet-400'  },
  website_order_placed:  { icon: ShoppingCart, color: 'bg-green-500/15 text-green-400'    },
  website_order_updated: { icon: ShoppingCart, color: 'bg-blue-500/15 text-blue-400'      },
  system:                { icon: AlertCircle, color: 'bg-amber-500/15 text-amber-400'    },
};

const FALLBACK = { icon: AlertCircle, color: 'bg-gray-500/15 text-gray-400' };

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export default function NotificationBell() {
  const router = useRouter();
  const { user, activeBranch } = useAuthStore();
  const [open, setOpen]   = useState(false);
  const panelRef          = useRef<HTMLDivElement>(null);
  const qc                = useQueryClient();

  const branchId = activeBranch?.id;

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', branchId],
    queryFn:  () => notificationsApi.list(30, branchId).then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread', branchId],
    queryFn:  () => notificationsApi.unreadCount(branchId).then(r => r.data),
    refetchInterval: 15_000,
  });

  const unreadCount: number =
    typeof unreadData === 'number' ? unreadData : (unreadData as any)?.count ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', branchId] });
      qc.invalidateQueries({ queryKey: ['notifications-unread', branchId] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(branchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', branchId] });
      qc.invalidateQueries({ queryKey: ['notifications-unread', branchId] });
    },
  });

  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    if (!user) return;
    if (socketRef.current?.connected) return;

    const BASE = API_BASE_URL; // Electron-aware, from lib/api.ts
    const socket: Socket = io(`${BASE}/notifications`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],  // polling fallback for restrictive networks
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => console.debug('Notifications WS connected'));
    socket.on('connect_error', (err) => console.debug('Notifications WS error:', err.message));
    socket.on('disconnect', (reason) => console.debug('Notifications WS disconnected:', reason));
    socket.on('notification', (payload: any) => {
      qc.setQueryData(['notifications-unread', branchId], (old: any) => {
        const count = typeof old === 'number' ? old : (old?.count ?? 0);
        return count + 1;
      });
      qc.invalidateQueries({ queryKey: ['notifications', branchId] });

      // Desktop: also surface this as a real system notification (Windows
      // Action Center / macOS Notification Center / Linux libnotify), not
      // just the in-app bell — covers every notification type that flows
      // through this socket (appointments, low inventory, leave requests,
      // shift assignments, etc.) since they all arrive here the same way.
      if (isElectron && payload?.title) {
        window.electronAPI!.showSystemNotification({
          title: payload.title,
          body: payload.body,
          type: payload.type,
          link: payload.link,
          entityId: payload.entityId,
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, qc]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Clicking a native OS notification (see socket handler above) should
  // land the user in the same place clicking it in the in-app bell would —
  // reuses the exact same fallback-link logic.
  useEffect(() => {
    if (!isElectron) return;
    const unsubscribe = window.electronAPI!.onNotificationClick(({ type, link, entityId }) => {
      const dest = link || (type ? FALLBACK_LINK[type] : undefined);
      if (dest) router.push(entityId ? `${dest}?id=${entityId}` : dest);
    });
    return unsubscribe;
  }, [router]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
        style={{ border: '1px solid var(--border)' }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
        <Bell size={16} className="text-[var(--text-secondary)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={clsx(
              "fixed md:absolute z-[120] overflow-hidden shadow-2xl",
              // Mobile: Full width at top under header
              "top-16 inset-x-4 w-auto rounded-2xl",
              // Desktop: Standard dropdown
              "md:top-12 md:right-0 md:inset-x-auto md:w-96"
            )}
            style={{ 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border)', 
              maxHeight: 'calc(100vh - 120px)' 
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}>

            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-brand-500/15 text-brand-400 text-[10px] px-2 py-0.5 rounded-full">{unreadCount} new</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs px-2 py-1 transition-colors"
                    title="Mark all as read">
                    <CheckCheck size={12} /> <span className="hidden xs:inline">All read</span>
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:bg-white/5 w-7 h-7 flex items-center justify-center rounded-lg transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'min(28rem, 70vh)' }}>
              {(notifications as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Bell size={28} className="text-[var(--text-muted)] opacity-30" />
                  <p className="text-sm text-[var(--text-muted)]">All caught up!</p>
                </div>
              ) : (
                (notifications as any[]).map((n: any) => {
                  const meta  = TYPE_META[n.type] ?? FALLBACK;
                  const Icon  = meta.icon;
                  return (
                    <div
                      key={n.id}
                      className={clsx(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5',
                        !n.isRead && 'bg-brand-500/5',
                      )}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onClick={() => {
                        if (!n.isRead) markReadMutation.mutate(n.id);
                        const dest = n.link || FALLBACK_LINK[n.type];
                        if (dest) {
                          setOpen(false);
                          router.push(n.entityId ? `${dest}?id=${n.entityId}` : dest);
                        }
                      }}>

                      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', meta.color)}>
                        <Icon size={14} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={clsx(
                          'text-xs font-medium',
                          n.isRead ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]',
                        )}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                        )}
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {!n.isRead && (
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}