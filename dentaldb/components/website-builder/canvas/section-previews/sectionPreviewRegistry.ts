import type React from 'react';
import {
  HeroPreview, AboutPreview, ServicesPreview, TeamPreview, TestimonialsPreview,
  BookingPreview, WorkingHoursPreview, ContactPreview, GalleryPreview, FaqPreview,
  StatsPreview, CtaBannerPreview, RichTextPreview, DividerPreview, SpacerPreview,
  MapPreview, SocialProofPreview, VideoPreview, BranchesPreview, SlotsPreview,
  ProductsPreview, AiChatbotPreview, WhatsAppButtonPreview, BlogPreview,
  ClinicInfoPreview, PatientLoginPreview,
} from './index';

// Mirrors the section.type → component mapping that used to live in
// SectionRenderer.tsx's switch statement, and follows the same pattern as
// right-panel/SectionEditor.tsx's EditorMap.
export const sectionPreviewRegistry: Record<string, React.ComponentType<any>> = {
  hero:                  HeroPreview,
  about:                 AboutPreview,
  services:              ServicesPreview,
  team:                  TeamPreview,
  testimonials:          TestimonialsPreview,
  'appointment-booking': BookingPreview,
  'working-hours':       WorkingHoursPreview,
  contact:               ContactPreview,
  gallery:               GalleryPreview,
  faq:                   FaqPreview,
  stats:                 StatsPreview,
  'cta-banner':          CtaBannerPreview,
  'rich-text':           RichTextPreview,
  divider:               DividerPreview,
  spacer:                SpacerPreview,
  map:                   MapPreview,
  'social-proof':        SocialProofPreview,
  video:                 VideoPreview,
  branches:              BranchesPreview,
  'available-slots':     SlotsPreview,
  products:              ProductsPreview,
  'ai-chatbot':          AiChatbotPreview,
  'whatsapp-button':     WhatsAppButtonPreview,
  'blog-articles':       BlogPreview,
  'clinic-info':         ClinicInfoPreview,
  'patient-login':       PatientLoginPreview,
};
