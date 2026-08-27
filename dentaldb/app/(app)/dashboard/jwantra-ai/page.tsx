'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Settings2, Unlink, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import JwantraConnectFlow from '@/components/jwantra/JwantraConnectFlow';
import JwantraAnalysisPanel from '@/components/jwantra/JwantraAnalysisPanel';
import { jwantraApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const OWNER_ROLES = new Set(['owner', 'super_admin']);

export default function JwantraAiPage() {
  const { user } = useAuthStore();
  const isOwner = OWNER_ROLES.has(user?.role ?? '');
  const qc = useQueryClient();
  const [manageOpen, setManageOpen] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['jwantra-status'],
    queryFn: () => jwantraApi.status().then(r => r.data),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => jwantraApi.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jwantra-status'] });
      toast.success('Jwantra disconnected — data sharing stopped');
      setManageOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to disconnect'),
  });

  const unlinkAiMutation = useMutation({
    mutationFn: () => jwantraApi.unlinkApiKey(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jwantra-status'] });
      toast.success('Jwantra AI unlinked');
      setManageOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to unlink'),
  });

  const ready = status?.connected && status?.aiLinked;

  return (
    <>
      <Header
        title="Jwantra AI"
        subtitle={ready ? "AI analysis of your clinic's data, powered by Jwantra" : 'Connect your sibling AI analytics product'}
        action={
          ready && isOwner
            ? { label: 'Manage', onClick: () => setManageOpen(true), icon: Settings2 }
            : undefined
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={20} className="animate-spin text-brand-400" />
          </div>
        ) : !ready ? (
          isOwner ? (
            <JwantraConnectFlow status={status} />
          ) : (
            <div className="max-w-md mx-auto text-center py-20">
              {/* <Sparkles size={28} className="text-brand-400 mx-auto mb-4" /> */}
              <img src="/logo.png" alt="Jwantra Logo" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">Jwantra AI isn't connected yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Ask a clinic owner or admin to connect it from this page — it only takes a couple of minutes.
              </p>
            </div>
          )
        ) : (
          <div className="card p-4 sm:p-6 max-w-3xl mx-auto" style={{ height: 'calc(100vh - 180px)', minHeight: 480 }}>
            <JwantraAnalysisPanel />
          </div>
        )}
      </div>

      {manageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setManageOpen(false)}>
          <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Manage Jwantra connection</p>
              <button className="btn-ghost !p-1" onClick={() => setManageOpen(false)}><X size={15} /></button>
            </div>
            <div className="space-y-2">
              <button
                className="btn-secondary w-full justify-start text-xs"
                onClick={() => unlinkAiMutation.mutate()}
                disabled={unlinkAiMutation.isPending}
              >
                {unlinkAiMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                Unlink AI key (keeps data sharing on)
              </button>
              <button
                className="btn-secondary w-full justify-start text-xs text-red-400 hover:!border-red-500/30"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Disconnect Jwantra entirely
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-4">
              Disconnecting stops Jwantra from syncing new data and disables AI analysis here. You can reconnect anytime.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
