'use client';

import React from 'react';
import type { PageConfig, SectionConfig, ThemeConfig, SecProps } from './sections/siteRendererHelpers';

import { BlogSection }          from './sections/BlogSection';
import { HeroSection }          from './sections/HeroSection';
import { AboutSection }         from './sections/AboutSection';
import { ServicesSection }      from './sections/ServicesSection';
import { TeamSection }          from './sections/TeamSection';
import { TestimonialsSection }  from './sections/TestimonialsSection';
import { BookingSection }       from './sections/BookingSection';
import { WorkingHoursSection }  from './sections/WorkingHoursSection';
import { ContactSection }       from './sections/ContactSection';
import { GallerySection }       from './sections/GallerySection';
import { FaqSection }           from './sections/FaqSection';
import { StatsSection }         from './sections/StatsSection';
import { CtaBannerSection }     from './sections/CtaBannerSection';
import { RichTextSection }      from './sections/MiscSections';
import { BranchesSection }      from './sections/MiscSections';
import { MapSection }           from './sections/MiscSections';
import { VideoSection }         from './sections/MiscSections';
import { SocialProofSection }   from './sections/MiscSections';
import { DividerSection }       from './sections/MiscSections';
import { ProductsSection }      from './sections/ProductsSection';
import { AiChatbotSection }     from './sections/AiChatbotSection';
import { WhatsAppButtonSection } from './sections/WhatsAppButtonSection';
import { ClinicInfoSection }    from './sections/ClinicInfoSection';
import { AvailableSlotsSection } from './sections/AvailableSlotsSection';
import { LoginSection }         from './sections/LoginSection';

// ── Page renderer ─────────────────────────────────────────────────────────────

interface SitePageRendererProps {
  page:      PageConfig;
  theme:     ThemeConfig;
  subdomain: string;
  clinic:    Record<string, any> | null;
  branches:  Record<string, any>[];
  isPreview?: boolean;
}

export function SitePageRenderer({
  page, theme, subdomain, clinic, branches, isPreview,
}: SitePageRendererProps) {
  return (
    <>
      {page.sections
        .filter(s => s.visible !== false)
        .map(section => (
          <SiteSectionRenderer
            key={section.id}
            section={section}
            theme={theme}
            subdomain={subdomain}
            clinic={clinic}
            branches={branches}
            isPreview={isPreview}
          />
        ))}
    </>
  );
}

// ── Section renderer ──────────────────────────────────────────────────────────

interface SiteSectionProps {
  section:   SectionConfig;
  theme:     ThemeConfig;
  subdomain: string;
  clinic:    Record<string, any> | null;
  branches:  Record<string, any>[];
  isPreview?: boolean;
}

function SiteSectionRenderer({ section, theme, subdomain, clinic, branches, isPreview }: SiteSectionProps) {
  const s: Record<string, any> = section.settings ?? {};

  const wrapperStyle: React.CSSProperties = {};
  if (section.background) wrapperStyle.background = section.background.value;
  if (section.padding) {
    wrapperStyle.paddingTop    = section.padding.top;
    wrapperStyle.paddingBottom = section.padding.bottom;
  }

  const id = section.anchor ?? undefined;

  const CONTAINER_MAP: Record<string, string> = {
    full:      'w-full',
    contained: 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8',
    wide:      'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  };
  const containerClass =
    CONTAINER_MAP[section.layout ?? 'contained'] ??
    'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8';

  const commonProps: SecProps = { s, theme, subdomain, clinic, branches, containerClass, isPreview };

  switch (section.type) {
    case 'blog-articles':    return <div id={id} style={wrapperStyle}><BlogSection           {...commonProps} /></div>;
    case 'hero':             return <div id={id} style={wrapperStyle}><HeroSection            {...commonProps} /></div>;
    case 'about':            return <div id={id} style={wrapperStyle}><AboutSection           {...commonProps} /></div>;
    case 'services':         return <div id={id} style={wrapperStyle}><ServicesSection        {...commonProps} /></div>;
    case 'team':             return <div id={id} style={wrapperStyle}><TeamSection            {...commonProps} /></div>;
    case 'testimonials':     return <div id={id} style={wrapperStyle}><TestimonialsSection    {...commonProps} /></div>;
    case 'appointment-booking': return <div id={id ?? 'booking'} style={wrapperStyle}><BookingSection {...commonProps} /></div>;
    case 'working-hours':    return <div id={id} style={wrapperStyle}><WorkingHoursSection    {...commonProps} /></div>;
    case 'contact':          return <div id={id} style={wrapperStyle}><ContactSection         {...commonProps} /></div>;
    case 'gallery':          return <div id={id} style={wrapperStyle}><GallerySection         {...commonProps} /></div>;
    case 'faq':              return <div id={id} style={wrapperStyle}><FaqSection             {...commonProps} /></div>;
    case 'stats':            return <div id={id} style={wrapperStyle}><StatsSection           {...commonProps} /></div>;
    case 'cta-banner':       return <div id={id} style={wrapperStyle}><CtaBannerSection       {...commonProps} /></div>;
    case 'rich-text':        return <div id={id} style={wrapperStyle}><RichTextSection        {...commonProps} /></div>;
    case 'branches':         return <div id={id} style={wrapperStyle}><BranchesSection        {...commonProps} /></div>;
    case 'map':              return <div id={id} style={wrapperStyle}><MapSection             {...commonProps} /></div>;
    case 'video':            return <div id={id} style={wrapperStyle}><VideoSection           {...commonProps} /></div>;
    case 'social-proof':     return <div id={id} style={wrapperStyle}><SocialProofSection     {...commonProps} /></div>;
    case 'products':         return <div id={id} style={wrapperStyle}><ProductsSection        {...commonProps} /></div>;
    case 'ai-chatbot':       return <AiChatbotSection      {...commonProps} />;
    case 'whatsapp-button':  return <WhatsAppButtonSection {...commonProps} />;
    case 'clinic-info':      return <div id={id} style={wrapperStyle}><ClinicInfoSection     {...commonProps} /></div>;
    case 'available-slots':  return <div id={id} style={wrapperStyle}><AvailableSlotsSection {...commonProps} /></div>;
    case 'patient-login':    return <div id={id} style={wrapperStyle}><LoginSection         {...commonProps} /></div>;
    case 'divider':
      return <DividerSection s={s} />;
    case 'spacer':
      return <div style={{ height: (s.height as number) || 80 }} />;
    default:
      return null;
  }
}