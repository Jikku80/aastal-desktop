'use client';

import React from 'react';
import type { SecProps } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

export function AiChatbotSection({ s, theme }: SecProps) {
  const [open, setOpen]       = React.useState(false);
  const [input, setInput]     = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<{ from: 'bot' | 'user'; text: string }[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const accent  = (s.accentColor as string) || theme.primaryColor;
  const botName = (s.botName  as string) || 'Clinic Assistant';
  const welcome = (s.welcomeMessage as string) || `Hello! 👋 I'm ${botName}. How can I help you today?`;
  const position = (s.position as string) || 'bottom-right';

  const clinicContext = [
    s.clinicName   ? `Clinic name: ${s.clinicName}`         : '',
    s.clinicPhone  ? `Phone: ${s.clinicPhone}`               : '',
    s.clinicEmail  ? `Email: ${s.clinicEmail}`               : '',
    s.openingHours ? `Opening hours: ${s.openingHours}`      : '',
    s.branches     ? `Branch locations: ${s.branches}`       : '',
    s.doctors      ? `Doctors/Specialists: ${s.doctors}`     : '',
    s.services     ? `Services offered: ${s.services}`       : '',
    s.extraInfo    ? `Additional info: ${s.extraInfo}`       : '',
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are a helpful clinic assistant chatbot for a dental/medical clinic. Answer visitor questions concisely and helpfully using the clinic information below. If you don't know something not covered below, say you'll check with the clinic team and suggest they call or email. Never make up information.\n\nCLINIC INFORMATION:\n${clinicContext || 'No specific clinic information configured yet.'}`;

  React.useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ from: 'bot', text: welcome }]);
    }
  }, [open]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { from: 'user', text }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role:    m.from === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 512,
          system:     systemPrompt,
          messages:   [...history, { role: 'user', content: text }],
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data  = await res.json();
      const reply = data.content?.[0]?.text ?? "I'm sorry, I couldn't process that. Please call or email us directly.";
      setMessages(prev => [...prev, { from: 'bot', text: reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { from: 'bot', text: "I'm having trouble connecting right now. Please call or email us directly — our team is happy to help!" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const posStyle: React.CSSProperties =
    position === 'bottom-left'
      ? { position: 'fixed', bottom: 24, left: 24, zIndex: 9999 }
      : { position: 'fixed', bottom: 24, right: 24, zIndex: 9999 };

  const chatWindowStyle: React.CSSProperties = {
    position:      'absolute',
    bottom:        70,
    ...(position === 'bottom-left' ? { left: 0 } : { right: 0 }),
    width:         340,
    maxWidth:      'calc(100vw - 48px)',
    borderRadius:  20,
    overflow:      'hidden',
    boxShadow:     '0 20px 60px rgba(0,0,0,0.2)',
    background:    '#fff',
    border:        '1px solid rgba(0,0,0,0.08)',
    display:       open ? 'flex' : 'none',
    flexDirection: 'column',
  };

  const variant = (s.variant as string) ?? 'floating';

  // ── Shared chat UI (used by in-page variants) ────────────────────────────
  const ChatUI = ({ inPage = false }: { inPage?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: inPage ? 480 : 380, background: '#fff', borderRadius: inPage ? 20 : 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', background: accent, color: '#fff', borderRadius: inPage ? '20px 20px 0 0' : 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{botName}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>● Online · AI-powered</div>
        </div>
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8, background: '#f9fafb' }}>
        {messages.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>Start a conversation…</div>}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '8px 12px', fontSize: 13, lineHeight: 1.5, borderRadius: m.from === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.from === 'user' ? accent : '#fff', color: m.from === 'user' ? '#fff' : '#1f2937', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Typing…</div>}
        <div ref={messagesEndRef} />
      </div>
      {/* Input */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #f0f0f0', background: '#fff', borderRadius: inPage ? '0 0 20px 20px' : 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message…"
          style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '9px 14px', fontSize: 13, outline: 'none' }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{ width: 36, height: 36, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!input.trim() || loading) ? 0.5 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );

  // ── Variant: full-panel ──────────────────────────────────────────────────
  if (variant === 'full-panel') {
    React.useEffect(() => { if (messages.length === 0) setMessages([{ from: 'bot', text: welcome }]); }, []);
    return (
      <div className="py-14 sm:py-20" style={{ background: '#f8faff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          <SectionTitle title={(s.title as string) || 'Chat with Our Assistant'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)', borderRadius: 20, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
            <ChatUI inPage />
          </div>
        </div>
      </div>
    );
  }

  // ── Variant: sidebar ────────────────────────────────────────────────────
  if (variant === 'sidebar') {
    React.useEffect(() => { if (messages.length === 0) setMessages([{ from: 'bot', text: welcome }]); }, []);
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>
          <div>
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: theme.textColor, marginBottom: 12 }}>{(s.title as string) || 'Have Questions?'}</h2>
            <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>{(s.subtitle as string) || 'Our AI assistant can answer your questions instantly.'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['⚡', 'Instant answers', '24/7 availability'], ['🔒', 'Private & secure', 'Your data stays safe'], ['🤝', 'Human handoff', 'Connect to our team anytime']].map(([ic, t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span style={{ fontSize: 24 }}>{ic}</span>
                  <div><div style={{ fontWeight: 700, color: theme.textColor, fontSize: 14 }}>{t}</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{d}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderRadius: 20, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
            <ChatUI inPage />
          </div>
        </div>
      </div>
    );
  }

  // ── Variant: doctor-ai ───────────────────────────────────────────────────
  if (variant === 'doctor-ai') {
    React.useEffect(() => { if (messages.length === 0) setMessages([{ from: 'bot', text: welcome }]); }, []);
    return (
      <div className="py-14 sm:py-20" style={{ background: `${accent}08` }}>
        <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${accent}20`, border: `3px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 32 }}>👨‍⚕️</div>
            <h2 style={{ fontFamily: theme.fontHeading, fontWeight: 700, color: theme.textColor, fontSize: '1.4rem' }}>{botName}</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>AI Medical Assistant · Available 24/7</p>
          </div>
          <div style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderRadius: 20, overflow: 'hidden' }}>
            <ChatUI inPage />
          </div>
        </div>
      </div>
    );
  }

  // ── Default: floating widget ─────────────────────────────────────────────
  return (
    <div style={posStyle}>
      {/* Chat window */}
      <div style={chatWindowStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', background: accent, color: '#fff' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🤖</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{botName}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>● Online · AI-powered</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8, fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, minHeight: 180, background: '#f9fafb' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '9px 13px', fontSize: 13, lineHeight: 1.5,
                borderRadius: m.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.from === 'user' ? accent : '#fff',
                color: m.from === 'user' ? '#fff' : '#1f2937',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 12px', width: 'fit-content', background: '#fff', borderRadius: '18px 18px 18px 4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: accent, animation: `chatdot 1.2s ${i * 0.2}s ease-in-out infinite`, opacity: 0.6 }} />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type your message…"
            disabled={loading}
            style={{ flex: 1, padding: '9px 13px', borderRadius: 20, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#f9fafb', color: '#1f2937' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ width: 36, height: 36, borderRadius: '50%', background: input.trim() && !loading ? accent : '#d1d5db', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: 56, height: 56, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 20px ${accent}66`, transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        aria-label="Open chat"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      <style>{`
        @keyframes chatdot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}