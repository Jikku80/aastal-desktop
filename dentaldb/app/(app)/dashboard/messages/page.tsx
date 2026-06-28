'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, MailOpen, Trash2, ChevronLeft, ChevronRight,
  Clock, User, Phone, AtSign, AlertCircle, RefreshCw,
} from 'lucide-react';
import { websiteApi } from '@/lib/api/websiteApi';
import Header from '@/components/layout/Header';

interface ContactMessage {
  id:          string;
  senderName:  string;
  senderEmail: string;
  senderPhone: string | null;
  subject:     string | null;
  body:        string;
  isRead:      boolean;
  createdAt:   string;
}

interface MessagesResponse {
  data:  ContactMessage[];
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMs    = Date.now() - d.getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);
  if (diffMins < 1)   return 'Just now';
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7)   return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MessagesPage() {
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const queryClient             = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<MessagesResponse>({
    queryKey:  ['website-messages', page],
    queryFn:   () => websiteApi.getMessages(page, 20),
    staleTime: 30_000,
    retry: 1,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => websiteApi.markMessageRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['website-messages'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => websiteApi.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-messages'] });
      setSelected(null);
    },
  });

  const handleSelect = (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.isRead) markReadMutation.mutate(msg.id);
  };

  const messages   = data?.data    ?? [];
  const totalPages = data?.pages   ?? 1;
  const total      = data?.total   ?? 0;

  return (
    <div className="flex flex-col h-screen">
      <Header title="Website Messages" subtitle="Contact messages from your clinic website" />

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">Loading messages…</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[var(--text-primary)] mb-1">Failed to load messages</p>
              <p className="text-sm text-[var(--text-muted)] max-w-xs mb-4">
                There was a problem fetching your messages. Please try again.
              </p>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="btn-secondary flex items-center gap-2 mx-auto"
                style={{ border: '1px solid var(--border)' }}
              >
                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                {isFetching ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <Mail size={28} className="text-[var(--text-muted)]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[var(--text-primary)] mb-1">No messages yet</p>
              <p className="text-sm text-[var(--text-muted)] max-w-xs">
                When visitors submit the contact form on your clinic website, their messages will appear here.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !isError && messages.length > 0 && (
          <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">

            <div className="lg:col-span-2 space-y-2">
              <p className="text-xs font-medium text-[var(--text-muted)] mb-3">
                {total} message{total !== 1 ? 's' : ''}
              </p>

              {messages.map(msg => {
                const isSelected = selected?.id === msg.id;
                return (
                  <button
                    key={msg.id}
                    onClick={() => handleSelect(msg)}
                    className="w-full text-left rounded-xl p-4 transition-all"
                    style={isSelected ? {
                      background: 'var(--brand)',
                      border: '1px solid transparent',
                      boxShadow: '0 4px 12px rgba(2,124,198,0.3)',
                    } : {
                      background: msg.isRead ? 'var(--bg-card)' : 'rgba(2,124,198,0.06)',
                      border: `1px solid ${msg.isRead ? 'var(--border)' : 'rgba(2,124,198,0.25)'}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {!msg.isRead && !isSelected && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                        )}
                        <span className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                          {msg.senderName}
                        </span>
                      </div>
                      <span className={`text-xs whitespace-nowrap flex-shrink-0 ${isSelected ? 'text-blue-100' : 'text-[var(--text-muted)]'}`}>
                        {timeAgo(msg.createdAt)}
                      </span>
                    </div>
                    {msg.subject && (
                      <p className={`text-xs font-medium mb-1 truncate ${isSelected ? 'text-blue-100' : 'text-[var(--text-secondary)]'}`}>
                        {msg.subject}
                      </p>
                    )}
                    <p className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)]'}`}>
                      {msg.body}
                    </p>
                  </button>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="btn-ghost h-9 px-3 gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft size={15} /> Prev
                  </button>
                  <span className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="btn-ghost h-9 px-3 gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
              {selected ? (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="px-5 sm:px-6 py-4 sm:py-5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-bold text-[var(--text-primary)] text-base sm:text-lg truncate">
                          {selected.subject || 'No subject'}
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(selected.createdAt).toLocaleString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                            year: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (window.confirm('Delete this message?')) deleteMutation.mutate(selected.id); }}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 transition-colors flex-shrink-0 disabled:opacity-50 hover:bg-red-500/10"
                        style={{ border: '1px solid rgba(239,68,68,0.3)' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 py-4 grid sm:grid-cols-3 gap-3"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5">Name</p>
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{selected.senderName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <AtSign size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5">Email</p>
                        <a href={`mailto:${selected.senderEmail}`} className="text-sm font-medium truncate block text-brand-400 hover:underline">
                          {selected.senderEmail}
                        </a>
                      </div>
                    </div>
                    {selected.senderPhone && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5">Phone</p>
                          <a href={`tel:${selected.senderPhone}`} className="text-sm font-medium truncate block text-brand-400 hover:underline">
                            {selected.senderPhone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-5 sm:px-6 py-5 sm:py-6">
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{selected.body}</p>
                  </div>

                  <div className="px-5 sm:px-6 py-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    <a
                      href={`mailto:${selected.senderEmail}?subject=Re: ${encodeURIComponent(selected.subject || 'Your enquiry')}`}
                      className="btn-primary text-sm"
                    >
                      <MailOpen size={15} /> Reply via Email
                    </a>
                  </div>
                </div>
              ) : (
                <div className="h-64 lg:h-full min-h-[300px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                  <MailOpen size={32} className="text-[var(--text-muted)] opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">Select a message to read it</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}