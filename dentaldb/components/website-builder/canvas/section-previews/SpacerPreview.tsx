'use client';

import React from 'react';
import type { PreviewProps } from './types';

export function SpacerPreview({ s }: { s: Record<string, any> }) {
  const presetMap: Record<string,number> = {small:20,medium:48,large:80,xl:120,xxl:160};
  const h = (s.presetSize && presetMap[s.presetSize]) ? presetMap[s.presetSize] : (s.height as number) || 80;
  return (
    <div style={{height:h}} className="bg-gray-50/50 border border-dashed border-gray-200 mx-4 my-2 rounded flex items-center justify-center">
      <span className="text-xs text-gray-300">{s.presetSize ? `${s.presetSize} spacer` : `${h}px spacer`}</span>
    </div>
  );
}