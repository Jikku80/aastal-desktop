'use client';

import React from 'react';
import type { SectionConfig } from '../hooks/useBuilderState';
import { useSectionRenderProps } from './section-previews/useSectionRenderProps';
import { sectionPreviewRegistry } from './section-previews/sectionPreviewRegistry';

interface Props { section: SectionConfig; }

export function SectionRenderer({ section }: Props) {
  const { css, padding, wrapperClass, theme, liveDoctors, liveBranches } = useSectionRenderProps(section);

  const PreviewComponent = sectionPreviewRegistry[section.type];
  if (!PreviewComponent) {
    return <div className="p-8 text-center text-gray-400 text-sm">Unknown section: {section.type}</div>;
  }

  const s: Record<string, any> = section.settings ?? {};

  if (section.type === 'divider' || section.type === 'spacer') {
    return <PreviewComponent s={s} />;
  }
  if (section.type === 'team') {
    return <PreviewComponent s={s} css={css} padding={padding} theme={theme} wrapperClass={wrapperClass} liveDoctors={liveDoctors} />;
  }
  if (section.type === 'branches') {
    return <PreviewComponent s={s} css={css} padding={padding} theme={theme} wrapperClass={wrapperClass} liveBranches={liveBranches} />;
  }
  return <PreviewComponent s={s} css={css} padding={padding} theme={theme} wrapperClass={wrapperClass} />;
}
