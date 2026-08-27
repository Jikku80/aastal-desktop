'use client';

import React from 'react';
import {
  EditorField, EditorSelect, EditorToggle, EditorColorPicker,
  EditorSection, EditorTabs, EditorImageUpload, useThemeSwatches,
} from './EditorComponents';

interface Props {
  settings: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export function HeroEditor({ settings, onChange }: Props) {
  const s: Record<string, any> = settings ?? {};
  const set = (key: string, val: any) => onChange({ [key]: val });
  const swatches = useThemeSwatches();

  return (
    <EditorTabs tabs={[
      {
        label: 'Content',
        content: (
          <div className="space-y-1">
            <EditorSection title="Text">
              <EditorField label="Headline"    value={s.headline}    onChange={v => set('headline', v)}    multiline />
              <EditorField label="Subheadline" value={s.subheadline} onChange={v => set('subheadline', v)} multiline />
            </EditorSection>

            <EditorSection title="Primary CTA">
              <EditorField label="Button Text" value={s.ctaText} onChange={v => set('ctaText', v)} />
              <EditorSelect label="Action" value={s.ctaAction} onChange={v => set('ctaAction', v)} options={[
                { value: 'scroll-to-booking', label: 'Scroll to Booking' },
                { value: 'link',              label: 'Link to URL' },
                { value: 'phone',             label: 'Call Phone' },
                { value: 'whatsapp',          label: 'WhatsApp' },
                { value: 'section',           label: 'Scroll to Section' },
              ]} />
              {s.ctaAction === 'link' && (
                <EditorField label="URL" value={s.ctaValue} onChange={v => set('ctaValue', v)} placeholder="https://example.com" />
              )}
              {s.ctaAction === 'phone' && (
                <EditorField label="Phone Number" value={s.ctaValue} onChange={v => set('ctaValue', v)} placeholder="+1 234 567 8900" />
              )}
              {s.ctaAction === 'whatsapp' && (
                <EditorField label="WhatsApp Number" value={s.ctaValue} onChange={v => set('ctaValue', v)} placeholder="+1 234 567 8900" />
              )}
              {s.ctaAction === 'section' && (
                <EditorField label="Section Anchor (#id)" value={s.ctaValue} onChange={v => set('ctaValue', v)} placeholder="#services" />
              )}
            </EditorSection>

            <EditorSection title="Secondary CTA (optional)">
              <EditorField label="Button Text" value={s.secondaryCtaText} onChange={v => set('secondaryCtaText', v)} placeholder="e.g. Learn More" />
              <EditorSelect label="Action" value={s.secondaryCtaAction} onChange={v => set('secondaryCtaAction', v)} options={[
                { value: 'link',              label: 'Link to URL' },
                { value: 'scroll-to-booking', label: 'Scroll to Booking' },
                { value: 'phone',             label: 'Call Phone' },
                { value: 'whatsapp',          label: 'WhatsApp' },
                { value: 'section',           label: 'Scroll to Section' },
              ]} />
              {s.secondaryCtaAction === 'link' && (
                <EditorField label="URL" value={s.secondaryCtaValue} onChange={v => set('secondaryCtaValue', v)} placeholder="https://example.com" />
              )}
              {s.secondaryCtaAction === 'phone' && (
                <EditorField label="Phone Number" value={s.secondaryCtaValue} onChange={v => set('secondaryCtaValue', v)} placeholder="+1 234 567 8900" />
              )}
              {s.secondaryCtaAction === 'whatsapp' && (
                <EditorField label="WhatsApp Number" value={s.secondaryCtaValue} onChange={v => set('secondaryCtaValue', v)} placeholder="+1 234 567 8900" />
              )}
              {s.secondaryCtaAction === 'section' && (
                <EditorField label="Section Anchor (#id)" value={s.secondaryCtaValue} onChange={v => set('secondaryCtaValue', v)} placeholder="#about" />
              )}
            </EditorSection>
          </div>
        ),
      },
      {
        label: 'Style',
        content: (
          <div className="space-y-1">
            <EditorSection title="Design Variant">
              <EditorSelect label="Layout Style" value={s.variant ?? 'classic'} onChange={v => set('variant', v)} options={[
                { value: 'classic',             label: '1. Classic' },
                { value: 'split-screen',        label: '2. Split Screen' },
                { value: 'appointment-focused', label: '3. Appointment Focused' },
                { value: 'doctor-spotlight',    label: '4. Doctor Spotlight' },
                { value: 'luxury-cosmetic',     label: '5. Luxury Cosmetic' },
                { value: 'gradient-saas',       label: '6. Gradient / SaaS' },
                { value: 'emergency-care',      label: '7. Emergency Care' },
                { value: 'children-clinic',     label: '8. Children Clinic' },
                { value: 'trust-focused',       label: '9. Trust Focused' },
                { value: 'minimal-premium',     label: '10. Minimal Premium' },
                { value: 'hospital-enterprise', label: '11. Hospital Enterprise' },
                { value: 'ai-healthcare',       label: '12. AI Healthcare' },
                { value: 'full-screen-premium', label: '13. Full Screen Premium' },
                { value: 'dental-clinic',       label: '14. Dental Clinic' },
                { value: 'image-collage',       label: '15. Image Collage' },
                { value: 'video-background',    label: '16. Video Background' },
              ]} />
            </EditorSection>
            <EditorSection title="Cover Image">
              <p className="text-[10px] text-gray-500 mb-2">
                Upload a cover photo. Leave empty to use colour / gradient below.
              </p>
              <EditorImageUpload label="Cover Image" value={s.coverImage} onChange={v => set('coverImage', v)} />
              {s.coverImage && (
                <>
                  <EditorField
                    label={`Dark Overlay: ${s.coverOverlay ?? 40}%`}
                    type="range" min={0} max={90}
                    value={s.coverOverlay ?? 40}
                    onChange={v => set('coverOverlay', Number(v))}
                  />
                  <EditorToggle
                    label="Force dark overlay (fix white/light images)"
                    checked={s.forceDarkOverlay ?? false}
                    onChange={v => set('forceDarkOverlay', v)}
                  />
                  <EditorSelect
                    label="Image Position"
                    value={s.coverPosition ?? 'center center'}
                    onChange={v => set('coverPosition', v)}
                    options={[
                      { value: 'center center', label: 'Center (default)' },
                      { value: 'center top',    label: 'Top center' },
                      { value: 'center bottom', label: 'Bottom center' },
                      { value: 'left center',   label: 'Left' },
                      { value: 'right center',  label: 'Right' },
                      { value: 'left top',      label: 'Top left' },
                      { value: 'right top',     label: 'Top right' },
                      { value: 'left bottom',   label: 'Bottom left' },
                      { value: 'right bottom',  label: 'Bottom right' },
                    ]}
                  />
                  <EditorSelect
                    label="Image Fit"
                    value={s.coverSize ?? 'cover'}
                    onChange={v => set('coverSize', v)}
                    options={[
                      { value: 'cover',     label: 'Cover — fill & crop' },
                      { value: 'contain',   label: 'Contain — show full image' },
                      { value: '100% 100%', label: 'Stretch — fill exactly' },
                      { value: 'auto',      label: 'Auto — original size' },
                    ]}
                  />
                </>
              )}
            </EditorSection>

            <EditorSection title="Fallback Background (no cover image)">
              <EditorSelect label="Type" value={s.backgroundType ?? 'color'} onChange={v => set('backgroundType', v)} options={[
                { value: 'color',    label: 'Solid Colour' },
                { value: 'gradient', label: 'Gradient' },
              ]} />
              {(!s.backgroundType || s.backgroundType === 'color') && (
                <EditorColorPicker swatches={swatches} label="Colour" value={s.backgroundValue} onChange={v => set('backgroundValue', v)} />
              )}
              {s.backgroundType === 'gradient' && (
                <EditorField label="CSS Gradient" value={s.backgroundValue} onChange={v => set('backgroundValue', v)} placeholder="linear-gradient(135deg,#0ea5e9,#6366f1)" />
              )}
            </EditorSection>

            <EditorSection title="Layout">
              <EditorSelect label="Alignment" value={s.layout} onChange={v => set('layout', v)} options={[
                { value: 'center', label: 'Centre' },
                { value: 'left',   label: 'Left' },
                { value: 'right',  label: 'Right' },
                { value: 'split',  label: 'Split' },
              ]} />
              <EditorSelect label="Height" value={s.minHeight} onChange={v => set('minHeight', v)} options={[
                { value: 'small',       label: 'Small (200px)' },
                { value: 'medium',      label: 'Medium (360px)' },
                { value: 'large',       label: 'Large (480px)' },
                { value: 'full-screen', label: 'Full Screen' },
              ]} />
            </EditorSection>

            <EditorSection title="Options">
              <EditorToggle label="Show Clinic Logo"  checked={s.showClinicLogo}  onChange={v => set('showClinicLogo',  v)} />
              <EditorToggle label="Show Rating Badge" checked={s.showRatingBadge} onChange={v => set('showRatingBadge', v)} />
            </EditorSection>
          </div>
        ),
      },
      {
        label: 'Typography',
        content: (
          <div className="space-y-1">
            <EditorSection title="Headline">
              <EditorColorPicker swatches={swatches} label="Text Color"   value={s.headlineColor ?? '#ffffff'} onChange={v => set('headlineColor', v)} />
              <EditorSelect label="Font Size" value={s.headlineFontSize ?? 'xl'} onChange={v => set('headlineFontSize', v)} options={[
                { value: 'sm',  label: 'Small  (1.5rem)' },
                { value: 'md',  label: 'Medium (2rem)' },
                { value: 'xl',  label: 'Large  (2.5rem)' },
                { value: '2xl', label: 'X-Large (3rem)' },
                { value: '3xl', label: 'Huge   (3.75rem)' },
              ]} />
              <EditorSelect label="Font Weight" value={s.headlineFontWeight ?? '700'} onChange={v => set('headlineFontWeight', v)} options={[
                { value: '400', label: 'Regular' },
                { value: '600', label: 'Semibold' },
                { value: '700', label: 'Bold' },
                { value: '800', label: 'Extra Bold' },
                { value: '900', label: 'Black' },
              ]} />
              <EditorToggle label="Gradient Text" checked={s.headlineGradient ?? false} onChange={v => set('headlineGradient', v)} />
              {s.headlineGradient && (
                <EditorField label="Gradient CSS" value={s.headlineGradientValue ?? 'linear-gradient(135deg,#fff,#93c5fd)'} onChange={v => set('headlineGradientValue', v)} placeholder="linear-gradient(135deg,#fff,#93c5fd)" />
              )}
              <EditorField label="Text Shadow (CSS)" value={s.headlineTextShadow ?? ''} onChange={v => set('headlineTextShadow', v)} placeholder="0 2px 8px rgba(0,0,0,0.4)" />
              <EditorField label={`Letter Spacing: ${s.headlineLetterSpacing ?? 0}em`} type="range" min={-2} max={10} value={s.headlineLetterSpacing ?? 0} onChange={v => set('headlineLetterSpacing', Number(v))} />
            </EditorSection>

            <EditorSection title="Subheadline">
              <EditorColorPicker swatches={swatches} label="Text Color" value={s.subheadlineColor ?? 'rgba(255,255,255,0.9)'} onChange={v => set('subheadlineColor', v)} />
              <EditorSelect label="Font Size" value={s.subheadlineFontSize ?? 'lg'} onChange={v => set('subheadlineFontSize', v)} options={[
                { value: 'sm',  label: 'Small  (0.875rem)' },
                { value: 'md',  label: 'Medium (1rem)' },
                { value: 'lg',  label: 'Large  (1.25rem)' },
                { value: 'xl',  label: 'X-Large (1.5rem)' },
              ]} />
            </EditorSection>
          </div>
        ),
      },
      {
        label: 'Buttons',
        content: (
          <div className="space-y-1">
            <EditorSection title="Primary Button">
              <EditorSelect label="Style" value={s.ctaStyle ?? 'filled'} onChange={v => set('ctaStyle', v)} options={[
                { value: 'filled',  label: 'Filled' },
                { value: 'outline', label: 'Outline' },
                { value: 'glass',   label: 'Glass / Frosted' },
                { value: 'ghost',   label: 'Ghost' },
              ]} />
              <EditorColorPicker swatches={swatches} label="Background"   value={s.ctaBg     ?? '#ffffff'}     onChange={v => set('ctaBg', v)} />
              <EditorColorPicker swatches={swatches} label="Text Color"   value={s.ctaColor  ?? '#111827'}     onChange={v => set('ctaColor', v)} />
              <EditorColorPicker swatches={swatches} label="Border Color" value={s.ctaBorder ?? 'transparent'} onChange={v => set('ctaBorder', v)} />
              <EditorSelect label="Border Radius" value={s.ctaRadius ?? 'md'} onChange={v => set('ctaRadius', v)} options={[
                { value: 'none', label: 'Square' },
                { value: 'sm',   label: 'Small' },
                { value: 'md',   label: 'Medium' },
                { value: 'lg',   label: 'Large' },
                { value: 'full', label: 'Pill' },
              ]} />
              <EditorSelect label="Size" value={s.ctaSize ?? 'md'} onChange={v => set('ctaSize', v)} options={[
                { value: 'sm',  label: 'Small' },
                { value: 'md',  label: 'Medium' },
                { value: 'lg',  label: 'Large' },
                { value: 'xl',  label: 'Extra Large' },
              ]} />
            </EditorSection>

            <EditorSection title="Secondary Button">
              <EditorSelect label="Style" value={s.secondaryCtaStyle ?? 'outline'} onChange={v => set('secondaryCtaStyle', v)} options={[
                { value: 'filled',  label: 'Filled' },
                { value: 'outline', label: 'Outline' },
                { value: 'glass',   label: 'Glass / Frosted' },
                { value: 'ghost',   label: 'Ghost' },
              ]} />
              <EditorColorPicker swatches={swatches} label="Background"   value={s.secondaryCtaBg     ?? 'transparent'} onChange={v => set('secondaryCtaBg', v)} />
              <EditorColorPicker swatches={swatches} label="Text Color"   value={s.secondaryCtaColor  ?? '#ffffff'}     onChange={v => set('secondaryCtaColor', v)} />
              <EditorColorPicker swatches={swatches} label="Border Color" value={s.secondaryCtaBorder ?? '#ffffff'}     onChange={v => set('secondaryCtaBorder', v)} />
            </EditorSection>
          </div>
        ),
      },
    ]} />
  );
}