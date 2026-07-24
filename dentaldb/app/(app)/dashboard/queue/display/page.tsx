'use client';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { queueApi, BASE_URL } from '@/lib/api';

// Reuse lib/api.ts's Electron-aware BASE_URL — a locally recomputed
// process.env.NEXT_PUBLIC_API_URL here always skipped the isElectron check,
// which kept this socket pointed at production from inside the desktop app.
const SOCKET_URL = BASE_URL;

export default function QueueDisplayPage() {
  const { clinic, activeBranch } = useAuthStore();
  const [queue, setQueue]             = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const socketRef = useRef<Socket | null>(null);
  const branchId  = activeBranch?.id ?? '';

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchQueue = async () => {
    if (!branchId) return;
    try { const res = await queueApi.getQueue(branchId); setQueue(res.data || []); } catch {}
  };

  useEffect(() => { fetchQueue(); }, [branchId]);

  useEffect(() => {
    if (!clinic?.id || !branchId) return;
    const socket = io(`${SOCKET_URL}/queue`, {
      auth: { token: localStorage.getItem('accessToken') },
      // 'websocket' only fails hard behind proxies/CDNs that don't forward
      // the Upgrade header — this is the TV board, so falling back to
      // polling matters even more here since there's no manual refresh.
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      socket.emit('join-queue-room', { clinicId: clinic.id, branchId });
      // Catch up on anything missed while disconnected/reconnecting.
      fetchQueue();
    });
    socket.on('queue:update', (payload: any) => {
      if (payload?.queue) setQueue(payload.queue); else fetchQueue();
    });
    return () => {
      socket.emit('leave-queue-room', { clinicId: clinic.id, branchId });
      socket.disconnect();
    };
  }, [clinic?.id, branchId]);

  const currentEntry = queue.find(e => e.status === 'called' || e.status === 'in_progress');
  const nextEntries  = queue.filter(e => e.status === 'waiting').sort((a,b) => a.tokenNumber - b.tokenNumber).slice(0, 3);
  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{clinic?.name ?? 'Clinic'}</div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{activeBranch?.name}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{timeStr}</div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{dateStr}</div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* NOW SERVING */}
        <div className="flex-1 flex flex-col items-center justify-center p-10" style={{ borderRight: '1px solid var(--border)' }}>
          <div className="text-sm font-semibold uppercase tracking-widest mb-8" style={{ color: 'var(--text-secondary)' }}>
            Now Serving
          </div>

          {currentEntry ? (
            <>
              <div
                className="w-56 h-56 rounded-full flex items-center justify-center mb-8"
                style={{ background: 'linear-gradient(135deg, var(--brand) 0%, #7c3aed 100%)', boxShadow: '0 0 80px color-mix(in srgb, var(--brand) 35%, transparent)' }}
              >
                <span className="text-8xl font-black text-white tabular-nums">{currentEntry.tokenNumber}</span>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {currentEntry.patient?.firstName} {currentEntry.patient?.lastName}
                </div>
                {currentEntry.doctor && (
                  <div className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                    Dr. {currentEntry.doctor.firstName} {currentEntry.doctor.lastName}
                  </div>
                )}
                <div
                  className="inline-block mt-4 px-5 py-2 rounded-full text-sm font-semibold"
                  style={{
                    background: currentEntry.status === 'in_progress' ? 'color-mix(in srgb,#7c3aed 15%,var(--bg-elevated))' : 'color-mix(in srgb,var(--brand) 15%,var(--bg-elevated))',
                    color:      currentEntry.status === 'in_progress' ? '#a78bfa' : 'var(--brand)',
                    border:     `1px solid ${currentEntry.status === 'in_progress' ? 'rgba(167,139,250,0.35)' : 'rgba(2,124,198,0.35)'}`,
                  }}
                >
                  {currentEntry.status === 'in_progress' ? 'In Consultation' : 'Please proceed to room'}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-40 h-40 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--bg-elevated)' }}>
                <span className="text-5xl" style={{ color: 'var(--text-muted)' }}>—</span>
              </div>
              <div className="text-2xl font-medium" style={{ color: 'var(--text-muted)' }}>No patient being called</div>
            </div>
          )}
        </div>

        {/* UP NEXT */}
        <div className="w-full lg:w-96 flex flex-col p-8" style={{ background: 'var(--bg-surface)' }}>
          <div className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--text-secondary)' }}>
            Up Next
          </div>

          <div className="space-y-4 flex-1">
            {nextEntries.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-lg" style={{ color: 'var(--text-muted)' }}>Queue is empty</div>
            ) : (
              nextEntries.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                  style={{
                    background: i === 0 ? 'var(--bg-elevated)' : 'var(--bg-base)',
                    border:     `1px solid ${i === 0 ? 'var(--border-hover)' : 'var(--border)'}`,
                    opacity:    i === 0 ? 1 : 0.6,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black shrink-0"
                    style={{ background: i === 0 ? '#f59e0b' : 'var(--bg-overlay)', color: i === 0 ? '#fff' : 'var(--text-secondary)' }}
                  >
                    {entry.tokenNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold truncate ${i === 0 ? 'text-lg' : ''}`} style={{ color: 'var(--text-primary)' }}>
                      {entry.patient?.firstName} {entry.patient?.lastName}
                    </div>
                    {entry.doctor && (
                      <div className="text-sm truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        Dr. {entry.doctor.firstName} {entry.doctor.lastName}
                      </div>
                    )}
                  </div>
                  {i === 0 && (
                    <div
                      className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: 'color-mix(in srgb,#f59e0b 15%,var(--bg-elevated))', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                    >
                      Next
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Stats */}
          <div className="mt-8 pt-6 grid grid-cols-2 gap-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {queue.filter(e => e.status === 'waiting').length}
              </div>
              <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--text-secondary)' }}>Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: 'var(--success, #10b981)' }}>
                {queue.filter(e => e.status === 'done').length}
              </div>
              <div className="text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--text-secondary)' }}>Served Today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-8 py-3 text-center text-sm"
        style={{ background: 'color-mix(in srgb,var(--brand) 8%,var(--bg-surface))', borderTop: '1px solid color-mix(in srgb,var(--brand) 20%,var(--border))', color: 'var(--brand)' }}
      >
        Please wait for your token number to be called · Thank you for your patience
      </div>
    </div>
  );
}