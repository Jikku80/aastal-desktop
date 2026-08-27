import React from 'react';
import {
  EditorField, EditorSelect, EditorToggle, EditorColorPicker, useThemeSwatches,
  EditorSection, EditorTabs,
} from './EditorComponents';

interface Props {
  settings: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  /** Pass section type to conditionally show relevant options */
  sectionType?: string;
}

export function GlobalDesignEditor({ settings, onChange, sectionType }: Props) {
  const s = settings ?? {};
  const set = (key: string, val: any) => onChange({ [key]: val });
  const swatches = useThemeSwatches();

  const showCards     = ['services', 'team', 'testimonials', 'products', 'gallery', 'faq', 'branches'].includes(sectionType ?? '');
  const showButtons   = ['hero', 'services', 'cta-banner', 'about', 'contact', 'appointment-booking'].includes(sectionType ?? '');

  return (
    <EditorTabs tabs={[
      {
        label: 'Colors',
        content: (
          <div className="space-y-1">
            <EditorSection title="Background">
              <EditorSelect
                label="Type"
                value={s.sectionBgType ?? 'color'}
                onChange={v => set('sectionBgType', v)}
                options={[
                  { value: 'color',    label: 'Solid Color' },
                  { value: 'gradient', label: 'Gradient' },
                  { value: 'theme',    label: 'Use Theme' },
                ]}
              />
              {(!s.sectionBgType || s.sectionBgType === 'color') && (
                <EditorColorPicker swatches={swatches} label="Color" value={s.sectionBgColor ?? '#ffffff'} onChange={v => set('sectionBgColor', v)} />
              )}
              {s.sectionBgType === 'gradient' && (
                <EditorField
                  label="Gradient CSS"
                  value={s.sectionBgGradient ?? 'linear-gradient(135deg,#f0f9ff,#e0f2fe)'}
                  onChange={v => set('sectionBgGradient', v)}
                  placeholder="linear-gradient(135deg,#f0f9ff,#e0f2fe)"
                />
              )}
            </EditorSection>

            <EditorSection title="Text Colors">
              <EditorColorPicker swatches={swatches} label="Heading Color"  value={s.headingColor  ?? '#111827'} onChange={v => set('headingColor', v)} />
              <EditorColorPicker swatches={swatches} label="Body Text Color" value={s.bodyColor    ?? '#6b7280'} onChange={v => set('bodyColor', v)} />
              <EditorColorPicker swatches={swatches} label="Accent Color"   value={s.accentColor   ?? '#0ea5e9'} onChange={v => set('accentColor', v)} />
            </EditorSection>
          </div>
        ),
      },
      {
        label: 'Typography',
        content: (
          <div className="space-y-1">
            <EditorSection title="Heading Font">
              <EditorSelect
                label="Font Family"
                value={s.headingFont ?? 'theme'}
                onChange={v => set('headingFont', v)}
                options={[
                  { value: 'theme',        label: 'Use Theme Font' },
                  { value: 'Poppins',      label: 'Poppins' },
                  { value: 'Inter',        label: 'Inter' },
                  { value: 'Playfair Display', label: 'Playfair Display' },
                  { value: 'Montserrat',   label: 'Montserrat' },
                  { value: 'Nunito',       label: 'Nunito' },
                  { value: 'Raleway',      label: 'Raleway' },
                  { value: 'Lato',         label: 'Lato' },
                  { value: 'DM Sans',      label: 'DM Sans' },
                  { value: 'Outfit',       label: 'Outfit' },
                ]}
              />
              <EditorSelect
                label="Heading Size"
                value={s.headingSize ?? 'default'}
                onChange={v => set('headingSize', v)}
                options={[
                  { value: 'sm',      label: 'Small' },
                  { value: 'default', label: 'Default' },
                  { value: 'lg',      label: 'Large' },
                  { value: 'xl',      label: 'X-Large' },
                ]}
              />
              <EditorSelect
                label="Heading Weight"
                value={s.headingWeight ?? '700'}
                onChange={v => set('headingWeight', v)}
                options={[
                  { value: '400', label: 'Regular' },
                  { value: '600', label: 'Semibold' },
                  { value: '700', label: 'Bold' },
                  { value: '800', label: 'Extra Bold' },
                ]}
              />
            </EditorSection>

            <EditorSection title="Body Font">
              <EditorSelect
                label="Font Family"
                value={s.bodyFont ?? 'theme'}
                onChange={v => set('bodyFont', v)}
                options={[
                  { value: 'theme',    label: 'Use Theme Font' },
                  { value: 'Inter',    label: 'Inter' },
                  { value: 'Poppins',  label: 'Poppins' },
                  { value: 'Nunito',   label: 'Nunito' },
                  { value: 'Lato',     label: 'Lato' },
                  { value: 'DM Sans',  label: 'DM Sans' },
                  { value: 'Outfit',   label: 'Outfit' },
                ]}
              />
              <EditorSelect
                label="Body Size"
                value={s.bodyFontSize ?? 'default'}
                onChange={v => set('bodyFontSize', v)}
                options={[
                  { value: 'sm',      label: 'Small' },
                  { value: 'default', label: 'Default' },
                  { value: 'lg',      label: 'Large' },
                ]}
              />
            </EditorSection>

            <EditorSection title="Alignment">
              <EditorSelect
                label="Text Alignment"
                value={s.textAlign ?? 'center'}
                onChange={v => set('textAlign', v)}
                options={[
                  { value: 'left',   label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right',  label: 'Right' },
                ]}
              />
            </EditorSection>
          </div>
        ),
      },
      {
        label: 'Spacing',
        content: (
          <div className="space-y-1">
            <EditorSection title="Section Padding">
              <EditorSelect
                label="Vertical Spacing"
                hint="Space above and below this section's content."
                value={s.sectionSpacing ?? 'normal'}
                onChange={v => set('sectionSpacing', v)}
                options={[
                  { value: 'none',     label: 'None' },
                  { value: 'compact',  label: 'Compact' },
                  { value: 'normal',   label: 'Normal' },
                  { value: 'spacious', label: 'Spacious' },
                  { value: 'large',    label: 'Extra Large' },
                ]}
              />
              <EditorSelect
                label="Section Width"
                hint="How wide the content inside this section can stretch on large screens."
                value={s.containerWidth ?? 'contained'}
                onChange={v => set('containerWidth', v)}
                options={[
                  { value: 'full',      label: 'Full Width',        description: 'Content stretches edge to edge.' },
                  { value: 'wide',      label: 'Wide',               description: 'Content fills most of the screen.' },
                  { value: 'contained', label: 'Contained (default)', description: 'A comfortable reading width, centered.' },
                  { value: 'narrow',    label: 'Narrow',             description: 'A tighter, more focused column.' },
                ]}
              />
            </EditorSection>

            <EditorSection title="Advanced" collapsible defaultOpen={false}>
              <EditorSelect
                label="Mobile Padding"
                hint="Extra spacing above and below this section on phones — rarely needs changing."
                value={s.mobilePadding ?? 'normal'}
                onChange={v => set('mobilePadding', v)}
                options={[
                  { value: 'compact',  label: 'Compact' },
                  { value: 'normal',   label: 'Normal' },
                  { value: 'spacious', label: 'Spacious' },
                ]}
              />
            </EditorSection>
          </div>
        ),
      },
      {
        label: 'Borders',
        content: (
          <div className="space-y-1">
            <EditorSection title="Advanced: Section Border" collapsible defaultOpen={false}>
              <EditorSelect
                label="Border Style"
                value={s.sectionBorder ?? 'none'}
                onChange={v => set('sectionBorder', v)}
                options={[
                  { value: 'none',   label: 'None' },
                  { value: 'top',    label: 'Top Only' },
                  { value: 'bottom', label: 'Bottom Only' },
                  { value: 'both',   label: 'Top & Bottom' },
                  { value: 'all',    label: 'All Sides' },
                ]}
              />
              {s.sectionBorder && s.sectionBorder !== 'none' && (
                <EditorColorPicker swatches={swatches} label="Border Color" value={s.sectionBorderColor ?? '#e5e7eb'} onChange={v => set('sectionBorderColor', v)} />
              )}
            </EditorSection>

            {showCards && (
              <EditorSection title="Card Style">
                <EditorSelect
                  label="Card Border Radius"
                  value={s.cardRadius ?? 'md'}
                  onChange={v => set('cardRadius', v)}
                  options={[
                    { value: 'none', label: 'Square' },
                    { value: 'sm',   label: 'Small' },
                    { value: 'md',   label: 'Medium' },
                    { value: 'lg',   label: 'Large' },
                    { value: 'xl',   label: 'Extra Large' },
                  ]}
                />
                <EditorSelect
                  label="Card Shadow"
                  value={s.cardShadow ?? 'sm'}
                  onChange={v => set('cardShadow', v)}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'sm',   label: 'Subtle' },
                    { value: 'md',   label: 'Medium' },
                    { value: 'lg',   label: 'Strong' },
                  ]}
                />
                <EditorColorPicker swatches={swatches} label="Card Background"  value={s.cardBg      ?? '#ffffff'} onChange={v => set('cardBg', v)} />
                <EditorColorPicker swatches={swatches} label="Card Border Color" value={s.cardBorder  ?? '#f3f4f6'} onChange={v => set('cardBorder', v)} />
              </EditorSection>
            )}

            {showButtons && (
              <EditorSection title="Button Style">
                <EditorSelect
                  label="Button Style"
                  value={s.sectionBtnStyle ?? 'filled'}
                  onChange={v => set('sectionBtnStyle', v)}
                  options={[
                    { value: 'filled',  label: 'Filled' },
                    { value: 'outline', label: 'Outline' },
                    { value: 'ghost',   label: 'Ghost' },
                  ]}
                />
                <EditorSelect
                  label="Button Radius"
                  value={s.sectionBtnRadius ?? 'md'}
                  onChange={v => set('sectionBtnRadius', v)}
                  options={[
                    { value: 'none', label: 'Square' },
                    { value: 'sm',   label: 'Small' },
                    { value: 'md',   label: 'Medium' },
                    { value: 'lg',   label: 'Large' },
                    { value: 'full', label: 'Pill' },
                  ]}
                />
              </EditorSection>
            )}
          </div>
        ),
      },
    ]} />
  );
}