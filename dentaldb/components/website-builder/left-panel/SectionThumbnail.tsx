'use client';

import React from 'react';
import type { SectionType } from '../hooks/useBuilderState';

interface Props { type: SectionType; color?: string; }

export function SectionThumbnail({ type, color = '#3b82f6' }: Props) {
  const light = color + '22';
  const mid   = color + '55';

  const thumbnails: Record<SectionType, JSX.Element> = {
    hero: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill={light} />
        <rect x="10" y="12" width="100" height="8" rx="2" fill={color} opacity="0.7" />
        <rect x="25" y="24" width="70" height="5" rx="2" fill={mid} />
        <rect x="40" y="34" width="40" height="10" rx="4" fill={color} />
      </svg>
    ),
    about: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="8" y="8" width="50" height="44" rx="3" fill={light} />
        <rect x="66" y="12" width="46" height="5" rx="2" fill={color} opacity="0.7" />
        <rect x="66" y="21" width="40" height="3" rx="1" fill={mid} />
        <rect x="66" y="27" width="44" height="3" rx="1" fill={mid} />
        <rect x="66" y="33" width="38" height="3" rx="1" fill={mid} />
        <rect x="66" y="42" width="28" height="8" rx="3" fill={color} />
      </svg>
    ),
    services: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="8" y="6" width="30" height="3" rx="1" fill={color} opacity="0.8" />
        {[0,1,2].map(i => (
          <g key={i}>
            <rect x={8 + i * 38} y="16" width="32" height="32" rx="4" fill={light} />
            <rect x={16 + i * 38} y="22" width="16" height="10" rx="2" fill={mid} />
            <rect x={16 + i * 38} y="36" width="16" height="4" rx="1" fill={color} opacity="0.5" />
            <rect x={14 + i * 38} y="42" width="20" height="3" rx="1" fill={mid} />
          </g>
        ))}
      </svg>
    ),
    team: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        {[0,1,2,3].map(i => (
          <g key={i}>
            <circle cx={16 + i * 28} cy="22" r="9" fill={light} />
            <rect x={8 + i * 28} y="34" width="18" height="3" rx="1" fill={color} opacity="0.6" />
            <rect x={10 + i * 28} y="39" width="14" height="2" rx="1" fill={mid} />
            <rect x={10 + i * 28} y="44" width="14" height="6" rx="2" fill={color} opacity="0.3" />
          </g>
        ))}
      </svg>
    ),
    testimonials: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="15" y="8" width="90" height="44" rx="6" fill={light} />
        <text x="24" y="22" fontSize="14" fill={color} opacity="0.8">"</text>
        <rect x="30" y="18" width="60" height="3" rx="1" fill={mid} />
        <rect x="30" y="24" width="55" height="3" rx="1" fill={mid} />
        <rect x="30" y="30" width="45" height="3" rx="1" fill={mid} />
        <circle cx="36" cy="44" r="5" fill={mid} />
        <rect x="44" y="42" width="25" height="2.5" rx="1" fill={color} opacity="0.5" />
        <rect x="44" y="47" width="20" height="2" rx="1" fill={mid} />
      </svg>
    ),
    'appointment-booking': (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="8" y="6" width="48" height="48" rx="4" fill={light} />
        <rect x="10" y="14" width="44" height="2" rx="1" fill={color} opacity="0.4" />
        {[0,1,2,3].map(r => [0,1,2,3,4,5,6].map(c => (
          <rect key={`${r}-${c}`} x={10 + c * 6.5} y={18 + r * 8} width="5" height="5" rx="1"
            fill={r === 1 && c === 2 ? color : r === 2 && c === 4 ? color : light}
            opacity={r === 1 && c === 2 ? 1 : 0.5} />
        )))}
        <rect x="62" y="8" width="50" height="12" rx="3" fill={light} />
        <rect x="62" y="24" width="50" height="12" rx="3" fill={light} />
        <rect x="62" y="40" width="50" height="12" rx="3" fill={color} />
      </svg>
    ),
    'available-slots': (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="8" y="8" width="104" height="44" rx="4" fill={light} />
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={12 + i * 17} y="18" width="13" height="10" rx="2"
            fill={i % 3 === 1 ? color : mid} opacity={i % 3 === 1 ? 1 : 0.5} />
        ))}
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={12 + i * 17} y="32" width="13" height="10" rx="2"
            fill={i % 4 === 2 ? color : mid} opacity={i % 4 === 2 ? 1 : 0.5} />
        ))}
      </svg>
    ),
    'working-hours': (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
          <g key={d}>
            <rect x="8" y={8 + i * 7} width="30" height="5" rx="1" fill={mid} opacity="0.4" />
            <rect x="50" y={8 + i * 7} width="62" height="5" rx="1"
              fill={i === 5 ? color : i === 6 ? '#ef4444' : color} opacity={i === 6 ? 0.3 : 0.7} />
          </g>
        ))}
      </svg>
    ),
    contact: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="8" y="8" width="55" height="8" rx="3" fill={light} />
        <rect x="8" y="20" width="55" height="8" rx="3" fill={light} />
        <rect x="8" y="32" width="55" height="20" rx="3" fill={light} />
        <rect x="8" y="54" width="55" height="0" rx="0" fill="none" />
        <rect x="68" y="8" width="44" height="44" rx="4" fill={light} />
        <circle cx="90" cy="28" r="8" fill={mid} />
        <rect x="78" y="40" width="24" height="3" rx="1" fill={color} opacity="0.5" />
      </svg>
    ),
    gallery: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        {[
          [8,8,50,30], [62,8,50,14], [62,26,24,12], [90,26,22,12],
          [8,42,36,12], [48,42,30,12], [82,42,30,12]
        ].map(([x,y,w,h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill={light} />
        ))}
      </svg>
    ),
    faq: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        {[0,1,2,3].map(i => (
          <g key={i}>
            <rect x="8" y={8 + i * 13} width="104" height="11" rx="3" fill={i === 1 ? light : '#f1f5f9'} />
            <rect x="14" y={11 + i * 13} width="60" height="4" rx="1" fill={i === 1 ? color : mid} opacity="0.6" />
            <text x="104" y={17 + i * 13} fontSize="8" fill={mid} textAnchor="middle">
              {i === 1 ? '−' : '+'}
            </text>
          </g>
        ))}
      </svg>
    ),
    stats: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        {[0,1,2,3].map(i => (
          <g key={i}>
            <rect x={8 + i * 28} y="12" width="22" height="36" rx="4" fill={light} />
            <rect x={12 + i * 28} y="18" width="14" height="8" rx="2" fill={color} opacity="0.8" />
            <rect x={12 + i * 28} y="30" width="14" height="4" rx="1" fill={mid} />
            <rect x={12 + i * 28} y="37" width="14" height="3" rx="1" fill={mid} opacity="0.5" />
          </g>
        ))}
      </svg>
    ),
    'cta-banner': (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill={color} />
        <rect x="10" y="14" width="70" height="8" rx="2" fill="white" opacity="0.9" />
        <rect x="10" y="26" width="50" height="5" rx="1" fill="white" opacity="0.5" />
        <rect x="82" y="20" width="30" height="14" rx="3" fill="white" />
      </svg>
    ),
    'rich-text': (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="8" y="8" width="80" height="7" rx="2" fill={color} opacity="0.7" />
        {[0,1,2,3,4].map(i => (
          <rect key={i} x="8" y={20 + i * 8} width={i % 3 === 2 ? 60 : 104} height="5" rx="1" fill={mid} opacity="0.4" />
        ))}
      </svg>
    ),
    divider: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="15" y="27" width="90" height="2" rx="1" fill={color} opacity="0.5" />
        <circle cx="60" cy="28" r="4" fill={color} opacity="0.7" />
      </svg>
    ),
    spacer: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        <rect x="30" y="10" width="60" height="40" rx="4" fill={light} stroke={color} strokeWidth="1" strokeDasharray="4 3" />
        <text x="60" y="34" textAnchor="middle" fill={color} fontSize="9" opacity="0.7">↕ Space</text>
      </svg>
    ),
    map: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill={light} />
        <rect x="8" y="8" width="104" height="44" rx="4" fill="white" opacity="0.5" />
        {/* Fake map grid */}
        <line x1="8" y1="28" x2="112" y2="28" stroke={mid} strokeWidth="0.5" />
        <line x1="8" y1="40" x2="112" y2="40" strokeDasharray="3 2" stroke={mid} strokeWidth="0.5" />
        <line x1="40" y1="8" x2="40" y2="52" stroke={mid} strokeWidth="0.5" />
        <line x1="80" y1="8" x2="80" y2="52" strokeDasharray="3 2" stroke={mid} strokeWidth="0.5" />
        <circle cx="60" cy="30" r="6" fill={color} />
        <polygon points="60,15 55,26 65,26" fill={color} />
      </svg>
    ),
    'social-proof': (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        {[0,1,2,3].map(i => (
          <g key={i}>
            <rect x={10 + i * 26} y="16" width="22" height="28" rx="4" fill={light} />
            <circle cx={21 + i * 26} cy="28" r="7" fill={mid} opacity="0.5" />
            <rect x={14 + i * 26} y="38" width="14" height="3" rx="1" fill={color} opacity="0.4" />
          </g>
        ))}
      </svg>
    ),
    video: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#111" />
        <rect x="8" y="8" width="104" height="44" rx="4" fill="#1f2937" />
        <circle cx="60" cy="30" r="14" fill={color} opacity="0.85" />
        <polygon points="56,23 56,37 70,30" fill="white" />
      </svg>
    ),
    branches: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        {[0,1,2].map(i => (
          <g key={i}>
            <rect x={8 + i * 38} y="10" width="32" height="40" rx="4" fill={light} />
            <rect x={12 + i * 38} y="16" width="24" height="8" rx="2" fill={mid} opacity="0.5" />
            <rect x={12 + i * 38} y="27" width="20" height="3" rx="1" fill={mid} opacity="0.4" />
            <rect x={12 + i * 38} y="33" width="24" height="3" rx="1" fill={mid} opacity="0.4" />
            <rect x={12 + i * 38} y="40" width="20" height="5" rx="2" fill={color} opacity="0.6" />
          </g>
        ))}
      </svg>
    ),
    products: (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f9fafb" />
        {[0,1,2].map(i => (
          <g key={i}>
            <rect x={8 + i * 38} y="8" width="32" height="44" rx="4" fill={light} />
            <rect x={8 + i * 38} y="8" width="32" height="20" rx="4" fill={mid} opacity="0.3" />
            <rect x={12 + i * 38} y="32" width="24" height="4" rx="1" fill={color} opacity="0.7" />
            <rect x={12 + i * 38} y="39" width="16" height="3" rx="1" fill={mid} opacity="0.5" />
            <rect x={12 + i * 38} y="44" width="24" height="5" rx="2" fill={color} opacity="0.5" />
          </g>
        ))}
      </svg>
    ),
    'ai-chatbot': (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f0f9ff" />
        {/* Chat window */}
        <rect x="8" y="6" width="72" height="48" rx="5" fill="white" stroke={mid} strokeWidth="0.5" />
        {/* Header bar */}
        <rect x="8" y="6" width="72" height="12" rx="5" fill={color} />
        <rect x="8" y="12" width="72" height="6" rx="0" fill={color} />
        <circle cx="17" cy="12" r="4" fill="white" opacity="0.25" />
        <rect x="24" y="9" width="20" height="2.5" rx="1" fill="white" opacity="0.8" />
        <rect x="24" y="13" width="14" height="1.5" rx="1" fill="white" opacity="0.5" />
        {/* Bot message */}
        <rect x="12" y="22" width="36" height="7" rx="3" fill={light} />
        <rect x="14" y="24" width="28" height="2" rx="1" fill={mid} />
        <rect x="14" y="27" width="20" height="2" rx="1" fill={mid} />
        {/* User message */}
        <rect x="34" y="33" width="30" height="6" rx="3" fill={color} opacity="0.8" />
        <rect x="36" y="35" width="22" height="2" rx="1" fill="white" opacity="0.7" />
        {/* Input bar */}
        <rect x="10" y="45" width="52" height="6" rx="3" fill="#f3f4f6" stroke={mid} strokeWidth="0.5" />
        <circle cx="74" cy="48" r="4" fill={color} />
        {/* Floating button */}
        <circle cx="106" cy="48" r="10" fill={color} />
        <rect x="102" y="44" width="8" height="8" rx="1" fill="none" stroke="white" strokeWidth="1.2" />
        <rect x="103" y="47" width="6" height="1.5" rx="0.5" fill="white" />
        <rect x="103" y="45" width="6" height="1.5" rx="0.5" fill="white" />
      </svg>
    ),
    'whatsapp-button': (
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <rect width="120" height="60" fill="#f0fdf4" />
        {/* Popup banner */}
        <rect x="8" y="6" width="76" height="38" rx="6" fill="white" stroke="#25d36633" strokeWidth="0.8" />
        {/* Banner header */}
        <circle cx="22" cy="18" r="7" fill="#25D366" />
        {/* WhatsApp icon hint */}
        <rect x="18" y="15" width="8" height="6" rx="3" fill="none" stroke="white" strokeWidth="1.2" />
        <rect x="30" y="13" width="30" height="3" rx="1" fill="#1f2937" opacity="0.7" />
        <rect x="30" y="18" width="22" height="2" rx="1" fill={mid} opacity="0.5" />
        {/* CTA button in banner */}
        <rect x="12" y="30" width="64" height="10" rx="4" fill="#25D366" />
        <rect x="26" y="33" width="36" height="3" rx="1" fill="white" opacity="0.85" />
        {/* Floating WhatsApp bubble */}
        <circle cx="104" cy="46" r="12" fill="#25D366" />
        <circle cx="104" cy="46" r="12" fill="#25D366" opacity="0.3" />
        <circle cx="104" cy="46" r="9" fill="#25D366" />
        {/* WhatsApp icon */}
        <rect x="100" y="42" width="8" height="8" rx="4" fill="none" stroke="white" strokeWidth="1.5" />
        <rect x="100" y="48" width="4" height="3" rx="1" fill="#25D366" />
        <rect x="99" y="49" width="3" height="2" rx="0.5" fill="white" />
      </svg>
    ),
    'blog-articles': (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <rect width="120" height="60" fill="#f9fafb" />
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={8 + i * 38} y="8" width="32" height="44" rx="4" fill={light} />
          <rect x={8 + i * 38} y="8" width="32" height="18" rx="4" fill={mid} opacity="0.3" />
          <rect x={12 + i * 38} y="30" width="24" height="3" rx="1" fill={color} opacity="0.7" />
          <rect x={12 + i * 38} y="36" width="20" height="2" rx="1" fill={mid} opacity="0.5" />
          <rect x={12 + i * 38} y="41" width="16" height="2" rx="1" fill={mid} opacity="0.4" />
        </g>
      ))}
    </svg>
  ),

  'clinic-info': (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <rect width="120" height="60" fill="#f9fafb" />
      <rect x="8" y="6" width="104" height="48" rx="4" fill={light} />
      <rect x="16" y="14" width="30" height="6" rx="2" fill={color} opacity="0.7" />
      <rect x="16" y="24" width="88" height="3" rx="1" fill={mid} opacity="0.4" />
      <rect x="16" y="30" width="70" height="3" rx="1" fill={mid} opacity="0.4" />
      <rect x="16" y="36" width="80" height="3" rx="1" fill={mid} opacity="0.4" />
      <rect x="16" y="44" width="40" height="6" rx="3" fill={color} opacity="0.6" />
    </svg>
  ),
  'patient-login': (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <rect width="120" height="60" fill="#f9fafb" />
      <rect x="30" y="8" width="60" height="44" rx="4" fill={light} />
      <circle cx="60" cy="22" r="8" fill={mid} />
      <rect x="44" y="34" width="32" height="6" rx="2" fill={color} />
    </svg>
  ),
  };

  return thumbnails[type] || (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <rect width="120" height="60" fill={light} />
      <rect x="20" y="20" width="80" height="20" rx="4" fill={mid} opacity="0.5" />
    </svg>
  );
}
