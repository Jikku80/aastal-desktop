import { v4 as uuidv4 } from 'uuid';
import type { PageConfig, GlobalSettings, ThemeConfig, SectionConfig, SectionType } from '../hooks/useBuilderState';

export interface TemplatePreset {
  id:             string;
  name:           string;
  description:    string;
  thumbnail:      string;
  theme:          ThemeConfig;
  globalSettings: GlobalSettings;
  pages:          PageConfig[];
}

function makeId() { return uuidv4(); }

function makeSection(
  type: SectionType,
  settings: Record<string, any>,
  opts: Partial<Omit<SectionConfig, 'id' | 'type' | 'visible' | 'settings'>> = {},
): SectionConfig {
  return {
    id:      makeId(),
    type,
    visible: true,
    layout:  'contained',
    settings,
    ...opts,
  };
}

function miniHero(title: string, subtitle: string, bg: string, overlay = 60) {
  return makeSection('hero', {
    headline: title, subheadline: subtitle,
    ctaText: '', ctaAction: 'link',
    backgroundType: 'color', backgroundValue: bg,
    backgroundOverlay: overlay, layout: 'center',
    showClinicLogo: false, showRatingBadge: false, minHeight: 'small',
  }, { layout: 'full' });
}

function bookingSection(variant = 'classic') {
  return makeSection('appointment-booking', {
    variant, title: 'Book an Appointment', subtitle: 'Choose your preferred date and time',
    branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'slots-grid',
    formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: true, doctorSelect: true, branchSelect: true },
    confirmationMessage: 'Your appointment has been booked successfully!',
  }, { anchor: 'booking' });
}

// ── Build the 5 non-home pages for a given theme ─────────────────────────────
function buildExtraPages(
  primaryColor: string,
  bookingVariant = 'classic',
  contactVariant = 'classic',
  hoursVariant   = 'table',
): PageConfig[] {
  return [
    // ── SERVICES ───────────────────────────────────────────────────────────────
    {
      id: makeId(), slug: 'services', title: 'Services', enabled: true, isHome: false,
      sections: [
        miniHero('Our Services', 'Comprehensive care tailored to every need', primaryColor),
        makeSection('services', {
          title: 'What We Offer', subtitle: 'Expert treatments for every patient',
          variant: 'premium-cards',
          items: [
            { id: '1', title: 'General Consultation', icon: '🩺', description: 'Comprehensive health assessments and check-ups.', price: '' },
            { id: '2', title: 'Specialist Care',      icon: '👨‍⚕️', description: 'Expert-led specialist treatments.', price: '' },
            { id: '3', title: 'Preventive Care',      icon: '🛡️', description: 'Stay ahead of health issues.', price: '' },
            { id: '4', title: 'Emergency Services',   icon: '🚑', description: 'Priority care when you need it most.', price: '' },
            { id: '5', title: 'Lab & Diagnostics',    icon: '🔬', description: 'Advanced on-site diagnostics.', price: '' },
            { id: '6', title: 'Rehabilitation',       icon: '💪', description: 'Recovery and physiotherapy programs.', price: '' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('faq', {
          title: 'Services FAQ', subtitle: 'Common questions about our treatments',
          variant: 'accordion',
          items: [
            { id: '1', question: 'Do I need a referral?', answer: 'Most of our services do not require a referral. Walk-ins and direct bookings are welcome.' },
            { id: '2', question: 'What insurance do you accept?', answer: 'We accept most major insurance providers. Please call to confirm before your visit.' },
            { id: '3', question: 'How long is a typical consultation?', answer: 'General consultations are typically 20-30 minutes. Specialist appointments may be longer.' },
          ],
        }),
        bookingSection(bookingVariant),
      ],
    },

    // ── DOCTORS ────────────────────────────────────────────────────────────────
    {
      id: makeId(), slug: 'doctors', title: 'Doctors', enabled: true, isHome: false,
      sections: [
        miniHero('Meet Our Doctors', 'Qualified professionals dedicated to your health', primaryColor),
        makeSection('team', {
          title: 'Our Medical Team', subtitle: 'Board-certified specialists with years of experience',
          variant: 'premium-profiles',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 3,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('testimonials', {
          title: 'Patient Stories', subtitle: 'What our patients say about their doctors',
          variant: 'google-style',
          items: [
            { id: '1', name: 'Patient A', rating: 5, text: 'The doctor was incredibly thorough and caring. Best experience I have had.', role: 'Patient' },
            { id: '2', name: 'Patient B', rating: 5, text: 'Highly professional team. They made me feel at ease throughout my treatment.', role: 'Patient' },
          ],
          layout: 'carousel',
        }),
        bookingSection(bookingVariant),
      ],
    },

    // ── SHOP ───────────────────────────────────────────────────────────────────
    {
      id: makeId(), slug: 'shop', title: 'Shop', enabled: true, isHome: false,
      sections: [
        miniHero('Our Product Shop', 'Quality health products from our clinic', primaryColor),
        makeSection('products', {
          variant: 'grid',
          title: 'Shop Products', subtitle: 'Browse and order from our clinic inventory',
          layout: 'grid', columns: 3, showSearch: true, showStockBadge: true,
          featuredOnly: false, ctaText: 'Add to Cart',
        }),
      ],
    },

    // ── BLOG ───────────────────────────────────────────────────────────────────
    {
      id: makeId(), slug: 'blog', title: 'Blog', enabled: true, isHome: false,
      sections: [
        miniHero('Health Articles', 'Expert insights from our medical team', primaryColor),
        makeSection('blog-articles', {
          variant: 'modern-grid',
          title: 'Latest Articles', subtitle: 'Stay informed with our health tips and clinic news',
        }),
      ],
    },

    // ── CONTACT ────────────────────────────────────────────────────────────────
    {
      id: makeId(), slug: 'contact', title: 'Contact', enabled: true, isHome: false,
      sections: [
        miniHero('Contact Us', "We'd love to hear from you", primaryColor),
        makeSection('contact', {
          variant: contactVariant,
          title: 'Get in Touch', subtitle: "Reach out — we're here to help",
          showForm: true, showMap: true, showDetails: true,
          address: '', phone: '', email: '', mapEmbedUrl: '',
        }),
        makeSection('working-hours', {
          variant: hoursVariant,
          title: 'Opening Hours', dataSource: 'live-api', hours: {},
          showTodayHighlight: true, showClosedDays: true,
        }),
        makeSection('map', { title: 'Find Us', embedUrl: '', zoom: 15, height: 380, showDirectionsLink: true }, { layout: 'full' }),
        makeSection('branches', {
          title: 'Our Locations', subtitle: '', dataSource: 'live-api', items: [], layout: 'cards', showMap: true,
        }),
      ],
    },
  ];
}

// ── 1. OBSIDIAN — Ultra-modern dark mode dental ───────────────────────────────
export const modernDental: TemplatePreset = {
  id: 'modern-dental',
  name: 'Obsidian Dental',
  description: 'Dark-mode luxury dental — dramatic black/gold with cinematic hero',
  thumbnail: '/presets/modern-dental.jpg',
  theme: {
    primaryColor:    '#d4af37',
    secondaryColor:  '#b8960c',
    accentColor:     '#ffffff',
    backgroundColor: '#0a0a0f',
    textColor:       '#f0ece0',
    fontHeading:     'Playfair Display',
    fontBody:        'Inter',
    borderRadius:    'sm',
    buttonStyle:     'outlined',
    spacing:         'spacious',
  },
  globalSettings: {
    nav: {
      sticky: true, transparent: true, variant: 'transparent-dark', links: [],
      ctaButton: { text: 'Book Now', action: 'book' },
    },
    footer: {
      variant: 'dark',
      tagline: 'Precision dentistry. Lasting results.',
      columns: [], showSocials: true,
      copyrightText: `© ${new Date().getFullYear()} Obsidian Dental`,
    },
  },
  pages: [
    {
      id: makeId(), slug: 'home', title: 'Home', enabled: true, isHome: true,
      sections: [
        makeSection('hero', {
          headline: 'Dentistry Redefined',
          subheadline: 'Where science meets artistry. Experience dental care that transforms.',
          ctaText: 'Reserve Your Appointment',
          ctaAction: 'scroll-to-booking',
          backgroundType: 'gradient',
          backgroundValue: 'linear-gradient(160deg,#0a0a0f 0%,#1a1008 50%,#0a0a0f 100%)',
          backgroundOverlay: 0,
          layout: 'center',
          showClinicLogo: true,
          showRatingBadge: true,
          minHeight: 'fullscreen',
        }, { layout: 'full' }),
        makeSection('stats', {
          items: [
            { value: '20+', label: 'Years of Excellence' },
            { value: '12,000+', label: 'Smiles Transformed' },
            { value: '98%', label: 'Patient Retention' },
            { value: '4.9★', label: 'Google Rating' },
          ],
        }),
        makeSection('services', {
          title: 'Signature Services',
          subtitle: 'Bespoke treatments for the discerning patient',
          variant: 'premium-cards',
          items: [
            { id: '1', title: 'Smile Design', icon: '✦', description: 'Complete aesthetic transformation tailored to your face.' },
            { id: '2', title: 'Invisible Aligners', icon: '◈', description: 'Discreet orthodontic correction without metal.' },
            { id: '3', title: 'Porcelain Veneers', icon: '◇', description: 'Ultra-thin ceramic for perfection in form.' },
            { id: '4', title: 'Implantology', icon: '⬡', description: 'Permanent tooth replacement with titanium precision.' },
            { id: '5', title: 'Laser Whitening', icon: '◉', description: '8-shade lift in a single 90-minute session.' },
            { id: '6', title: 'Emergency Care', icon: '⚡', description: 'Priority same-day relief for urgent cases.' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('gallery', {
          title: 'Before & After',
          subtitle: 'Real patients. Real results.',
          items: [], columns: 3,
        }),
        makeSection('team', {
          title: 'The Specialists',
          subtitle: 'Board-certified experts with decades of combined experience',
          variant: 'premium-profiles',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 4,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('testimonials', {
          title: 'Patient Voices',
          variant: 'large-quote',
          items: [
            { id: '1', name: 'Alexandra M.', rating: 5, text: 'I flew from London for my veneers. Worth every mile. The precision is unmatched.', role: 'International Patient' },
            { id: '2', name: 'David K.', rating: 5, text: 'My smile makeover changed my confidence entirely. The team truly cares.', role: 'Patient' },
            { id: '3', name: 'Sarah P.', rating: 5, text: 'Finally a clinic where attention to detail is sacred. Exceptional from start to finish.', role: 'Patient' },
          ],
          layout: 'carousel',
        }),
        makeSection('appointment-booking', {
          variant: 'luxury',
          title: 'Reserve Your Visit',
          subtitle: 'Complimentary consultation available',
          branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'slots-grid',
          formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: true, doctorSelect: true, branchSelect: true },
          confirmationMessage: 'Your reservation is confirmed. We look forward to welcoming you.',
        }, { anchor: 'booking' }),
        makeSection('map', { title: 'Find Us', address: '', height: 380, showDirectionsLink: true }),
      ],
    },
    ...buildExtraPages('#d4af37', 'luxury', 'premium', 'premium'),
  ],
};

// ── 2. SUNRISE — Warm family clinic with coral/peach palette ─────────────────
export const warmFamily: TemplatePreset = {
  id: 'warm-family',
  name: 'Sunrise Family Care',
  description: 'Warm coral & cream — inviting, friendly, multi-generational care',
  thumbnail: '/presets/warm-family.jpg',
  theme: {
    primaryColor:    '#ff6b6b',
    secondaryColor:  '#ee5a24',
    accentColor:     '#ffd32a',
    backgroundColor: '#fff9f5',
    textColor:       '#2d3436',
    fontHeading:     'Nunito',
    fontBody:        'Nunito',
    borderRadius:    'lg',
    buttonStyle:     'filled',
    spacing:         'spacious',
  },
  globalSettings: {
    nav: {
      sticky: true, transparent: false, variant: 'white-shadow', links: [],
      ctaButton: { text: 'Meet Our Team', action: 'link', value: '/doctors' },
    },
    footer: {
      variant: 'classic',
      tagline: 'Your health is our family business.',
      columns: [], showSocials: true,
      copyrightText: `© ${new Date().getFullYear()} Sunrise Family Care`,
    },
  },
  pages: [
    {
      id: makeId(), slug: 'home', title: 'Home', enabled: true, isHome: true,
      sections: [
        makeSection('hero', {
          headline: 'Healthcare With Heart',
          subheadline: 'Three generations of families trust us for compassionate, complete care.',
          ctaText: 'Book a Visit',
          ctaAction: 'scroll-to-booking',
          backgroundType: 'gradient',
          backgroundValue: 'linear-gradient(135deg,#ff6b6b 0%,#ffd32a 100%)',
          backgroundOverlay: 15,
          layout: 'left',
          showClinicLogo: true,
          showRatingBadge: true,
          minHeight: 'large',
        }, { layout: 'full' }),
        makeSection('stats', {
          items: [
            { value: '25+', label: 'Years Serving Families' },
            { value: '15,000+', label: 'Happy Patients' },
            { value: '8', label: 'In-House Specialists' },
            { value: '4.8★', label: 'Patient Rating' },
          ],
        }),
        makeSection('testimonials', {
          title: 'What Families Say',
          subtitle: 'Hear from the people who matter most to us',
          variant: 'bento-reviews',
          items: [
            { id: '1', name: 'The Johnsons', rating: 5, text: 'We have been bringing our kids here for years. Always kind, always thorough.', role: 'Family Patient' },
            { id: '2', name: 'Maria S.', rating: 5, text: 'As a senior patient, I appreciate how the doctors take their time and really listen.', role: 'Patient' },
            { id: '3', name: 'Tom & Priya', rating: 5, text: 'From pregnancy check-ups to newborn care — this clinic has been with us every step.', role: 'Family Patient' },
          ],
          layout: 'carousel',
        }),
        makeSection('services', {
          title: 'Family Health Services',
          subtitle: 'Every stage of life, covered',
          variant: 'icon-based',
          items: [
            { id: '1', title: 'Paediatrics',        icon: '👶', description: 'Expert child health from birth to teens.', price: '' },
            { id: '2', title: 'General Medicine',   icon: '🏥', description: 'Routine care and chronic disease management.', price: '' },
            { id: '3', title: 'Women\'s Health',    icon: '🌸', description: 'Gynaecology, maternity, and wellness.', price: '' },
            { id: '4', title: 'Senior Care',        icon: '❤️', description: 'Geriatric assessments and long-term support.', price: '' },
            { id: '5', title: 'Dental',             icon: '🦷', description: 'Family dentistry for all ages.', price: '' },
            { id: '6', title: 'Physiotherapy',      icon: '💪', description: 'Rehabilitation and injury recovery.', price: '' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('team', {
          title: 'Your Family Doctors',
          subtitle: 'Warm, experienced, and always here for you',
          variant: 'cards',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 3,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('appointment-booking', {
          variant: 'full-width',
          title: 'Book a Family Visit',
          subtitle: 'Quick, easy online booking for all family members',
          branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'slots-grid',
          formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: true, doctorSelect: true, branchSelect: true },
          confirmationMessage: 'Your family appointment is confirmed!',
        }, { anchor: 'booking' }),
        makeSection('working-hours', {
          variant: 'cards',
          title: 'Clinic Hours',
          dataSource: 'live-api', hours: {}, showTodayHighlight: true, showClosedDays: true,
        }),
        makeSection('map', { title: 'Find Our Clinic', height: 360, showDirectionsLink: true }),
      ],
    },
    ...buildExtraPages('#ff6b6b', 'full-width', 'classic', 'cards'),
  ],
};

// ── 3. AZURE — Professional specialist clinic ─────────────────────────────────
export const specialist: TemplatePreset = {
  id: 'azure-specialist',
  name: 'Azure Specialist',
  description: 'Clean corporate blue — ideal for specialist and private practices',
  thumbnail: '/presets/azure-specialist.jpg',
  theme: {
    primaryColor:    '#0ea5e9',
    secondaryColor:  '#0284c7',
    accentColor:     '#f59e0b',
    backgroundColor: '#f0f9ff',
    textColor:       '#0c4a6e',
    fontHeading:     'Inter',
    fontBody:        'Inter',
    borderRadius:    'md',
    buttonStyle:     'filled',
    spacing:         'normal',
  },
  globalSettings: {
    nav: {
      sticky: true, transparent: false, variant: 'gradient', links: [],
      ctaButton: { text: 'Book Consultation', action: 'book' },
    },
    footer: {
      variant: 'dark',
      tagline: 'Excellence in specialist care.',
      columns: [], showSocials: true,
      copyrightText: `© ${new Date().getFullYear()} Azure Specialist Clinic`,
    },
  },
  pages: [
    {
      id: makeId(), slug: 'home', title: 'Home', enabled: true, isHome: true,
      sections: [
        makeSection('hero', {
          headline: 'Specialist Care You Can Trust',
          subheadline: 'Cutting-edge diagnostics and treatment from board-certified specialists.',
          ctaText: 'Book a Consultation',
          ctaAction: 'scroll-to-booking',
          backgroundType: 'color',
          backgroundValue: '#0ea5e9',
          backgroundOverlay: 55,
          layout: 'left',
          showClinicLogo: true,
          showRatingBadge: false,
          minHeight: 'large',
        }, { layout: 'full' }),
        makeSection('services', {
          title: 'Our Specialities',
          subtitle: 'Advanced clinical care across multiple disciplines',
          variant: 'bento-grid',
          items: [
            { id: '1', title: 'Cardiology',    icon: '❤️', description: 'Heart health and cardiovascular care.', price: '' },
            { id: '2', title: 'Orthopaedics',  icon: '🦴', description: 'Bone, joint, and muscle treatments.', price: '' },
            { id: '3', title: 'Neurology',     icon: '🧠', description: 'Brain and nervous system expertise.', price: '' },
            { id: '4', title: 'Oncology',      icon: '🎗️', description: 'Cancer diagnosis and treatment.', price: '' },
            { id: '5', title: 'Dermatology',   icon: '✨', description: 'Skin, hair, and nail conditions.', price: '' },
            { id: '6', title: 'Endocrinology', icon: '⚗️', description: 'Hormonal and metabolic disorders.', price: '' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('stats', {
          items: [
            { value: '30+', label: 'Years of Excellence' },
            { value: '50,000+', label: 'Patients Treated' },
            { value: '20+', label: 'Specialist Doctors' },
            { value: '99%', label: 'Satisfaction Rate' },
          ],
        }),
        makeSection('team', {
          title: 'Our Specialists',
          subtitle: 'Leading experts in their respective fields',
          variant: 'featured-doctor',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 3,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('social-proof', {
          title: 'Accreditations & Certifications',
          variant: 'logos',
          items: [
            { id: '1', image: '', name: 'ISO 9001 Certified' },
            { id: '2', image: '', name: 'NABH Accredited' },
            { id: '3', image: '', name: 'JCI Accredited' },
          ],
        }),
        makeSection('appointment-booking', {
          variant: 'doctor-first',
          title: 'Schedule a Consultation',
          subtitle: 'Choose your specialist and book at your convenience',
          branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'inline-calendar',
          formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: true, doctorSelect: true, branchSelect: true },
          confirmationMessage: 'Consultation scheduled. You will receive a confirmation by email.',
        }, { anchor: 'booking' }),
        makeSection('testimonials', {
          title: 'Patient Testimonials',
          variant: 'trust-wall',
          items: [
            { id: '1', name: 'Robert H.', rating: 5, text: 'The cardiologist was exceptional — thorough and reassuring throughout my treatment.', role: 'Patient' },
            { id: '2', name: 'Linda K.', rating: 5, text: 'Outstanding neurology team. They gave me answers when no one else could.', role: 'Patient' },
          ],
          layout: 'carousel',
        }),
      ],
    },
    ...buildExtraPages('#0ea5e9', 'doctor-first', 'premium', 'premium'),
  ],
};

// ── 4. SPROUT — Bright pediatric / children's clinic ─────────────────────────
export const pediatric: TemplatePreset = {
  id: 'sprout-pediatric',
  name: 'Sprout Pediatrics',
  description: 'Bright playful green — cheerful children\'s clinic for young families',
  thumbnail: '/presets/sprout-pediatric.jpg',
  theme: {
    primaryColor:    '#22c55e',
    secondaryColor:  '#16a34a',
    accentColor:     '#fbbf24',
    backgroundColor: '#f0fdf4',
    textColor:       '#14532d',
    fontHeading:     'Nunito',
    fontBody:        'Nunito',
    borderRadius:    'lg',
    buttonStyle:     'filled',
    spacing:         'spacious',
  },
  globalSettings: {
    nav: {
      sticky: true, transparent: false, variant: 'colored', links: [],
      ctaButton: { text: 'Book a Check-up', action: 'book' },
    },
    footer: {
      variant: 'centered',
      tagline: 'Growing healthy, growing happy.',
      columns: [], showSocials: true,
      copyrightText: `© ${new Date().getFullYear()} Sprout Pediatrics`,
    },
  },
  pages: [
    {
      id: makeId(), slug: 'home', title: 'Home', enabled: true, isHome: true,
      sections: [
        makeSection('hero', {
          headline: 'Little Patients, Big Hearts',
          subheadline: 'Expert paediatric care in a warm, welcoming environment your child will love.',
          ctaText: 'Book a Check-up',
          ctaAction: 'scroll-to-booking',
          backgroundType: 'gradient',
          backgroundValue: 'linear-gradient(135deg,#22c55e 0%,#fbbf24 100%)',
          backgroundOverlay: 10,
          layout: 'center',
          showClinicLogo: true,
          showRatingBadge: true,
          minHeight: 'large',
        }, { layout: 'full' }),
        makeSection('services', {
          title: 'Services for Growing Kids',
          subtitle: 'From newborns to teenagers, we have got them covered',
          variant: 'icon-based',
          items: [
            { id: '1', title: 'Newborn Care',      icon: '👶', description: 'Specialist care from day one.', price: '' },
            { id: '2', title: 'Vaccinations',      icon: '💉', description: 'Complete immunisation schedules.', price: '' },
            { id: '3', title: 'Growth Monitoring', icon: '📏', description: 'Track healthy development milestones.', price: '' },
            { id: '4', title: 'Nutrition Advice',  icon: '🥗', description: 'Tailored dietary plans for children.', price: '' },
            { id: '5', title: 'Child Dentistry',   icon: '🦷', description: 'Friendly dental care for little smiles.', price: '' },
            { id: '6', title: 'Child Psychology',  icon: '🧠', description: 'Emotional and behavioural support.', price: '' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('team', {
          title: 'Our Paediatric Team',
          subtitle: 'Kind, patient, and passionate about children\'s health',
          variant: 'cards',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 3,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('testimonials', {
          title: 'Parent Reviews',
          variant: 'bento-reviews',
          items: [
            { id: '1', name: 'Mum of Two', rating: 5, text: 'My children actually look forward to their check-ups! The staff are amazing with kids.', role: 'Parent' },
            { id: '2', name: 'James & Lucy', rating: 5, text: 'Fantastic care from birth. The doctors are knowledgeable and so reassuring.', role: 'Parents' },
          ],
          layout: 'carousel',
        }),
        makeSection('appointment-booking', {
          variant: 'classic',
          title: 'Book a Check-up',
          subtitle: 'Quick and easy appointments for your little one',
          branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'slots-grid',
          formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: true, doctorSelect: true, branchSelect: true },
          confirmationMessage: 'Appointment confirmed! See you soon 🌱',
        }, { anchor: 'booking' }),
        makeSection('working-hours', {
          variant: 'cards',
          title: 'When We\'re Open',
          dataSource: 'live-api', hours: {}, showTodayHighlight: true, showClosedDays: true,
        }),
      ],
    },
    ...buildExtraPages('#22c55e', 'classic', 'classic', 'cards'),
  ],
};

// ── 5. NOIR LUMIÈRE — High-end cosmetic & aesthetic clinic ────────────────────
export const aesthetic: TemplatePreset = {
  id: 'noir-lumiere',
  name: 'Noir Lumière',
  description: 'Sleek black/rose-gold — premium aesthetic medicine and cosmetic clinic',
  thumbnail: '/presets/noir-lumiere.jpg',
  theme: {
    primaryColor:    '#c9a96e',
    secondaryColor:  '#a07840',
    accentColor:     '#f0e6d0',
    backgroundColor: '#0c0c0e',
    textColor:       '#ede8df',
    fontHeading:     'Playfair Display',
    fontBody:        'Lato',
    borderRadius:    'sm',
    buttonStyle:     'outlined',
    spacing:         'spacious',
  },
  globalSettings: {
    nav: {
      sticky: true, transparent: true, variant: 'glass', links: [],
      ctaButton: { text: 'Book Consultation', action: 'book' },
    },
    footer: {
      variant: 'dark',
      tagline: 'Reveal your most confident self.',
      columns: [], showSocials: true,
      copyrightText: `© ${new Date().getFullYear()} Noir Lumière`,
    },
  },
  pages: [
    {
      id: makeId(), slug: 'home', title: 'Home', enabled: true, isHome: true,
      sections: [
        makeSection('hero', {
          headline: 'Beauty, Elevated.',
          subheadline: 'Medical-grade aesthetic treatments delivered by certified experts in a luxury setting.',
          ctaText: 'Book a Private Consultation',
          ctaAction: 'scroll-to-booking',
          backgroundType: 'color',
          backgroundValue: '#0c0c0e',
          backgroundOverlay: 0,
          layout: 'center',
          showClinicLogo: true,
          showRatingBadge: false,
          minHeight: 'fullscreen',
        }, { layout: 'full' }),
        makeSection('services', {
          title: 'Signature Treatments',
          subtitle: 'Science-backed aesthetics for extraordinary results',
          variant: 'premium-cards',
          items: [
            { id: '1', title: 'Anti-Ageing',       icon: '✨', description: 'Botox, fillers, and skin rejuvenation.', price: '' },
            { id: '2', title: 'Skin Resurfacing',  icon: '🔬', description: 'Laser and chemical peel treatments.', price: '' },
            { id: '3', title: 'Body Contouring',   icon: '⚡', description: 'Non-surgical fat reduction.', price: '' },
            { id: '4', title: 'Hair Restoration',  icon: '💎', description: 'PRP and advanced hair loss solutions.', price: '' },
            { id: '5', title: 'Skin Hydration',    icon: '🌙', description: 'Mesotherapy and hydro-facials.', price: '' },
            { id: '6', title: 'IV Wellness',       icon: '🏆', description: 'Vitamin and immunity infusions.', price: '' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('gallery', {
          title: 'Results Gallery',
          subtitle: 'Subtle transformations. Lasting confidence.',
          items: [], columns: 3, variant: 'masonry',
        }),
        makeSection('team', {
          title: 'Our Aesthetic Physicians',
          subtitle: 'Internationally trained, artistically gifted',
          variant: 'luxury-cosmetic-specialists',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 3,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('testimonials', {
          title: 'Client Experiences',
          variant: 'large-quote',
          items: [
            { id: '1', name: 'Elena V.', rating: 5, text: 'The results are absolutely natural and stunning. I feel like the best version of myself.', role: 'Client' },
            { id: '2', name: 'Camille B.', rating: 5, text: 'The level of discretion, skill, and aftercare here is unmatched. I will not go anywhere else.', role: 'Client' },
          ],
          layout: 'carousel',
        }),
        makeSection('appointment-booking', {
          variant: 'luxury',
          title: 'Reserve Your Private Consultation',
          subtitle: 'Completely confidential. Always personalised.',
          branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'date-picker',
          formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: true, doctorSelect: true, branchSelect: false },
          confirmationMessage: 'Your consultation is reserved. Our team will be in touch shortly.',
        }, { anchor: 'booking' }),
      ],
    },
    ...buildExtraPages('#c9a96e', 'luxury', 'minimal', 'premium'),
  ],
};

// ── 6. COMMONS — Community health centre ────────────────────────────────────
export const community: TemplatePreset = {
  id: 'commons-community',
  name: 'Commons Community',
  description: 'Earthy teal & sage — accessible, trusted community health centre',
  thumbnail: '/presets/commons-community.jpg',
  theme: {
    primaryColor:    '#0d9488',
    secondaryColor:  '#0f766e',
    accentColor:     '#f97316',
    backgroundColor: '#f0fdfa',
    textColor:       '#134e4a',
    fontHeading:     'Lato',
    fontBody:        'Lato',
    borderRadius:    'md',
    buttonStyle:     'filled',
    spacing:         'normal',
  },
  globalSettings: {
    nav: {
      sticky: true, transparent: false, variant: 'minimal', links: [],
      ctaButton: { text: 'Book Appointment', action: 'book' },
    },
    footer: {
      variant: 'minimal',
      tagline: 'Healthcare for everyone in our community.',
      columns: [], showSocials: true,
      copyrightText: `© ${new Date().getFullYear()} Commons Community Health`,
    },
  },
  pages: [
    {
      id: makeId(), slug: 'home', title: 'Home', enabled: true, isHome: true,
      sections: [
        makeSection('hero', {
          headline: 'Healthcare for Everyone',
          subheadline: 'Affordable, accessible, and compassionate care at the heart of our community.',
          ctaText: 'Book Appointment',
          ctaAction: 'scroll-to-booking',
          backgroundType: 'color',
          backgroundValue: '#0d9488',
          backgroundOverlay: 60,
          layout: 'left',
          showClinicLogo: true,
          showRatingBadge: true,
          minHeight: 'large',
        }, { layout: 'full' }),
        makeSection('stats', {
          items: [
            { value: '15+', label: 'Years of Service' },
            { value: '20,000+', label: 'Community Members' },
            { value: '5', label: 'Clinic Locations' },
            { value: '100%', label: 'Patient First' },
          ],
        }),
        makeSection('services', {
          title: 'Community Health Services',
          subtitle: 'Full-spectrum care under one roof',
          variant: 'tabs',
          items: [
            { id: '1', title: 'Primary Care',        icon: '🏥', description: 'GP visits, health checks, and chronic disease management.', price: '' },
            { id: '2', title: 'Mental Health',       icon: '🧠', description: 'Counselling, psychiatry, and support groups.', price: '' },
            { id: '3', title: 'Maternal Health',     icon: '🤱', description: 'Antenatal, postnatal, and family planning.', price: '' },
            { id: '4', title: 'Youth Health',        icon: '🌱', description: 'Adolescent and young adult services.', price: '' },
            { id: '5', title: 'Elder Care',          icon: '❤️', description: 'Geriatric assessment and home health planning.', price: '' },
            { id: '6', title: 'Allied Health',       icon: '💪', description: 'Physiotherapy, dietetics, and occupational therapy.', price: '' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('team', {
          title: 'Our Care Team',
          subtitle: 'Dedicated health professionals serving your community',
          variant: 'cards',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 3,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('appointment-booking', {
          variant: 'sidebar-card',
          title: 'Book an Appointment',
          subtitle: 'Walk-ins welcome, online booking preferred',
          branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'slots-grid',
          formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: false, doctorSelect: true, branchSelect: true },
          confirmationMessage: 'Appointment confirmed! We look forward to seeing you.',
        }, { anchor: 'booking' }),
        makeSection('testimonials', {
          title: 'Community Voices',
          variant: 'google-style',
          items: [
            { id: '1', name: 'Grace M.', rating: 5, text: 'This clinic has been there for my whole family through thick and thin. Truly community-centred.', role: 'Community Member' },
            { id: '2', name: 'Ahmed S.', rating: 5, text: 'Affordable care without compromising on quality. Exactly what we needed.', role: 'Patient' },
          ],
          layout: 'carousel',
        }),
        makeSection('branches', {
          title: 'Find Your Nearest Clinic',
          subtitle: 'Multiple locations across the community',
          variant: 'cards',
          dataSource: 'live-api', items: [], layout: 'cards', showMap: true,
        }),
        makeSection('working-hours', {
          variant: 'table',
          title: 'Opening Hours',
          dataSource: 'live-api', hours: {}, showTodayHighlight: true, showClosedDays: true,
        }),
      ],
    },
    ...buildExtraPages('#0d9488', 'sidebar-card', 'classic', 'table'),
  ],
};

// ── 7. ATLAS — Multi-branch hospital network ──────────────────────────────────
export const multiBranch: TemplatePreset = {
  id: 'atlas-multi-branch',
  name: 'Atlas Multi-Branch',
  description: 'Deep navy & silver — enterprise hospital network with multi-location support',
  thumbnail: '/presets/atlas-multi-branch.jpg',
  theme: {
    primaryColor:    '#3b82f6',
    secondaryColor:  '#2563eb',
    accentColor:     '#e2e8f0',
    backgroundColor: '#0f172a',
    textColor:       '#e2e8f0',
    fontHeading:     'Inter',
    fontBody:        'Inter',
    borderRadius:    'sm',
    buttonStyle:     'filled',
    spacing:         'normal',
  },
  globalSettings: {
    nav: {
      sticky: true, transparent: false, variant: 'dark', links: [],
      ctaButton: { text: 'Find a Clinic', action: 'link', value: '/contact' },
    },
    footer: {
      variant: 'dark',
      tagline: 'Advanced care. Every location.',
      columns: [], showSocials: true,
      copyrightText: `© ${new Date().getFullYear()} Atlas Healthcare Network`,
    },
  },
  pages: [
    {
      id: makeId(), slug: 'home', title: 'Home', enabled: true, isHome: true,
      sections: [
        makeSection('hero', {
          headline: 'Advanced Healthcare, Everywhere',
          subheadline: 'Atlas Healthcare Network — delivering world-class care across multiple locations.',
          ctaText: 'Find a Clinic Near You',
          ctaAction: 'scroll-to-booking',
          variant: 'hospital-enterprise',
          backgroundType: 'gradient',
          backgroundValue: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)',
          backgroundOverlay: 0,
          layout: 'center',
          showClinicLogo: true,
          showRatingBadge: false,
          minHeight: 'large',
        }, { layout: 'full' }),
        makeSection('stats', {
          items: [
            { value: '12', label: 'Clinic Locations' },
            { value: '100,000+', label: 'Patients Annually' },
            { value: '80+', label: 'Specialist Doctors' },
            { value: '24/7', label: 'Emergency Services' },
          ],
        }),
        makeSection('services', {
          title: 'Network Specialities',
          subtitle: 'Comprehensive care across all departments',
          variant: 'department-showcase',
          items: [
            { id: '1', title: 'Emergency Medicine',  icon: '🚑', description: 'Round-the-clock emergency and trauma care.', price: '' },
            { id: '2', title: 'Surgery',             icon: '🔬', description: 'Minimally invasive and open surgery.', price: '' },
            { id: '3', title: 'Radiology',           icon: '📡', description: 'Advanced imaging and diagnostics.', price: '' },
            { id: '4', title: 'ICU & Critical Care', icon: '❤️', description: 'Intensive monitoring and treatment.', price: '' },
            { id: '5', title: 'Outpatient Services', icon: '🏥', description: 'Convenient outpatient consultations.', price: '' },
            { id: '6', title: 'Laboratory',          icon: '⚗️', description: 'Comprehensive pathology services.', price: '' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('branches', {
          title: 'Our Locations',
          subtitle: 'Find the Atlas clinic closest to you',
          variant: 'cards',
          dataSource: 'live-api', items: [], layout: 'cards', showMap: true,
        }),
        makeSection('team', {
          title: 'Medical Leadership',
          subtitle: 'Senior specialists leading our network',
          variant: 'medical-board',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 4,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('appointment-booking', {
          variant: 'treatment-first',
          title: 'Book at Any Location',
          subtitle: 'Select your preferred branch and specialist',
          branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'inline-calendar',
          formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: true, doctorSelect: true, branchSelect: true },
          confirmationMessage: 'Appointment confirmed across the Atlas network.',
        }, { anchor: 'booking' }),
        makeSection('working-hours', {
          variant: 'emergency',
          title: 'Network Hours',
          dataSource: 'live-api', hours: {}, showTodayHighlight: true, showClosedDays: true,
        }),
      ],
    },
    ...buildExtraPages('#3b82f6', 'treatment-first', 'multi-location', 'emergency'),
  ],
};

// ── 8. TELECLINIC — Digital-first telemedicine platform ───────────────────────
export const telemedicine: TemplatePreset = {
  id: 'teleclinic-digital',
  name: 'TeleClinic Digital',
  description: 'Vibrant purple/cyan — modern telemedicine and digital-first healthcare',
  thumbnail: '/presets/teleclinic-digital.jpg',
  theme: {
    primaryColor:    '#8b5cf6',
    secondaryColor:  '#7c3aed',
    accentColor:     '#06b6d4',
    backgroundColor: '#0f0a1e',
    textColor:       '#f3f0ff',
    fontHeading:     'Inter',
    fontBody:        'Inter',
    borderRadius:    'lg',
    buttonStyle:     'filled',
    spacing:         'normal',
  },
  globalSettings: {
    nav: {
      sticky: true, transparent: true, variant: 'transparent-light', links: [],
      ctaButton: { text: 'See a Doctor Now', action: 'book' },
    },
    footer: {
      variant: 'centered',
      tagline: 'Healthcare in the palm of your hand.',
      columns: [], showSocials: true,
      copyrightText: `© ${new Date().getFullYear()} TeleClinic`,
    },
  },
  pages: [
    {
      id: makeId(), slug: 'home', title: 'Home', enabled: true, isHome: true,
      sections: [
        makeSection('hero', {
          headline: 'See a Doctor in Minutes',
          subheadline: 'Book video consultations, get prescriptions, and manage your health from anywhere.',
          ctaText: 'Book Online Consultation',
          ctaAction: 'scroll-to-booking',
          variant: 'ai-healthcare',
          backgroundType: 'gradient',
          backgroundValue: 'linear-gradient(135deg,#0f0a1e 0%,#1a0a3e 50%,#0a1a2e 100%)',
          backgroundOverlay: 0,
          layout: 'center',
          showClinicLogo: true,
          showRatingBadge: true,
          minHeight: 'fullscreen',
        }, { layout: 'full' }),
        makeSection('stats', {
          items: [
            { value: '5min', label: 'Avg. Wait Time' },
            { value: '200+', label: 'Online Doctors' },
            { value: '50,000+', label: 'Virtual Consultations' },
            { value: '4.9★', label: 'App Rating' },
          ],
        }),
        makeSection('services', {
          title: 'Digital Health Services',
          subtitle: 'Everything you need, accessible from your phone',
          variant: 'bento-grid',
          items: [
            { id: '1', title: 'Video Consultation',  icon: '📱', description: 'See a certified doctor face-to-face via video.', price: '' },
            { id: '2', title: 'e-Prescriptions',     icon: '💊', description: 'Digital prescriptions sent directly to your pharmacy.', price: '' },
            { id: '3', title: 'Lab Results Online',  icon: '🔬', description: 'Access your test results instantly via the app.', price: '' },
            { id: '4', title: 'Mental Health',       icon: '🧠', description: 'Confidential therapy and psychiatry online.', price: '' },
            { id: '5', title: 'Health Monitoring',   icon: '📊', description: 'Connect wearables and track vitals continuously.', price: '' },
            { id: '6', title: '24/7 Support',        icon: '🤖', description: 'AI-powered chat and nurse triage anytime.', price: '' },
          ],
          layout: 'grid', columns: 3, showPrices: false, showIcons: true,
        }),
        makeSection('team', {
          title: 'Meet Our Online Doctors',
          subtitle: 'Qualified, verified, and ready to help',
          variant: 'horizontal-cards',
          dataSource: 'live-api', members: [], layout: 'cards', columns: 4,
          showSpecializations: true, showBookButton: true,
        }),
        makeSection('appointment-booking', {
          variant: 'quick-consult',
          title: 'Book an Online Consultation',
          subtitle: 'Available 24/7, any device',
          branchFilter: 'all', doctorFilter: 'all', calendarStyle: 'slots-grid',
          formFields: { patientName: true, patientPhone: true, patientEmail: true, notes: true, doctorSelect: true, branchSelect: false },
          confirmationMessage: 'Your video consultation is confirmed! Check your email for the link.',
        }, { anchor: 'booking' }),
        makeSection('ai-chatbot', {
          variant: 'full-panel',
          title: 'AI Health Assistant',
          subtitle: 'Get instant answers about symptoms, services, and appointments',
          welcomeMessage: 'Hi there! 👋 I am your TeleClinic AI assistant. How can I help you today?',
          botName: 'HealthBot',
          position: 'bottom-right', showOnPages: 'all',
        }),
        makeSection('testimonials', {
          title: 'What Our Patients Say',
          variant: 'google-style',
          items: [
            { id: '1', name: 'Priya R.', rating: 5, text: 'Got a consultation within 3 minutes at midnight. Absolutely life-changing service.', role: 'Online Patient' },
            { id: '2', name: 'Marcus L.', rating: 5, text: 'The doctor was thorough, the prescription was ready immediately. 10/10.', role: 'Online Patient' },
          ],
          layout: 'carousel',
        }),
        makeSection('faq', {
          title: 'TeleHealth FAQ',
          variant: 'accordion',
          items: [
            { id: '1', question: 'How does a video consultation work?', answer: 'After booking, you receive a secure video link. At your appointment time, join from any browser — no app needed.' },
            { id: '2', question: 'Are online prescriptions valid?', answer: 'Yes. Our e-prescriptions are legally valid and can be filled at any registered pharmacy.' },
            { id: '3', question: 'Is my consultation private?', answer: 'Completely. All consultations are encrypted and fully confidential under healthcare privacy regulations.' },
          ],
        }),
      ],
    },
    ...buildExtraPages('#8b5cf6', 'quick-consult', 'minimal', 'timeline'),
  ],
};

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  modernDental,
  warmFamily,
  specialist,
  pediatric,
  aesthetic,
  community,
  multiBranch,
  telemedicine,
];