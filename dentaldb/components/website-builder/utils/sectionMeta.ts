import type { SectionType } from '../hooks/useBuilderState';

// ─── Default settings for each section type ───────────────────────────────────

export const SECTION_DEFAULTS: Record<SectionType, Record<string, any>> = {
  hero: {
    variant: 'classic',
    headline:          'Welcome to Our Clinic',
    subheadline:       'Compassionate care, exceptional results.',
    ctaText:           'Book Appointment',
    ctaAction:         'scroll-to-booking',
    secondaryCtaText:  'Learn More',
    secondaryCtaAction:'link',
    coverImage:        '',
    coverOverlay:      40,
    backgroundType:    'color',
    backgroundValue:   '#0ea5e9',
    backgroundOverlay: 50,
    layout:            'center',
    showClinicLogo:    true,
    showRatingBadge:   false,
    minHeight:         'large',
  },
  about: {
    variant: 'split',
    title:   'About Our Clinic',
    subtitle: '',
    body:    'We are committed to delivering the highest standard of healthcare.',
    image:   '',
    layout:  'image-right',
    showStats: false,
    stats: [],
  },
  services: {
    variant:    'cards',
    title:      'Our Services',
    subtitle:   'Comprehensive care for every need',
    dataSource: 'live-api',          // auto-pull from clinic — manual items are fallback
    items:      [
      { id: '1', title: 'General Checkup',  icon: '🩺',  description: 'Comprehensive health assessment.', price: '' },
      { id: '2', title: 'Specialist Care',  icon: '👨‍⚕️', description: 'Expert specialists on hand.',     price: '' },
      { id: '3', title: 'Preventive Care',  icon: '🛡️',  description: 'Stay ahead of health issues.',    price: '' },
    ],
    layout:     'grid',
    columns:    3,
    showPrices: false,
    showIcons:  true,
  },
  team: {
    variant: 'cards',
    title:              'Meet Our Team',
    subtitle:           'Experienced and caring professionals',
    dataSource:         'live-api',
    members:            [],
    layout:             'grid',
    columns:            3,
    showSpecializations: true,
    showBookButton:     true,
  },
  testimonials: {
    variant: 'cards',
    title:   'What Our Patients Say',
    subtitle: '',
    items:   [
      { id: '1', name: 'Sarah M.', rating: 5, text: 'Exceptional care and friendly staff!', role: 'Patient' },
      { id: '2', name: 'John D.', rating: 5, text: 'Highly professional team. Highly recommend.', role: 'Patient' },
      { id: '3', name: 'Priya S.', rating: 5, text: 'The best clinic experience I have had.', role: 'Patient' },
    ],
    layout:  'carousel',
  },
  'appointment-booking': {
    variant:       'multi-step',      // matches BookingSection.tsx default render
    title:         'Book an Appointment',
    subtitle:      'Choose your preferred date and time',
    branchFilter:  'all',
    doctorFilter:  'all',
    calendarStyle: 'slots-grid',
    formFields: {
      patientName:  true,
      patientPhone: true,
      patientEmail: true,
      notes:        false,
      doctorSelect: true,
      branchSelect: true,
    },
    confirmationMessage: 'Your appointment has been booked successfully!',
  },
  'available-slots': {
    variant: 'grid',
    title:       'Available Slots',
    subtitle:    '',
    branchFilter: 'all',
    doctorFilter: 'all',
  },
  'working-hours': {
    variant: 'table',
    title:              'Opening Hours',
    dataSource:         'live-api',
    hours:              {
      monday:    { open: '09:00', close: '17:00' },
      tuesday:   { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday:  { open: '09:00', close: '17:00' },
      friday:    { open: '09:00', close: '17:00' },
      saturday:  { open: '09:00', close: '13:00' },
      sunday:    null,
    },
    showTodayHighlight: true,
    showClosedDays:     true,
    layout:             'table',
  },
  contact: {
    variant: 'classic',
    title:       'Contact Us',
    subtitle:    "We'd love to hear from you",
    showForm:    true,
    showMap:     false,
    showDetails: true,
    address:     '',
    phone:       '',
    email:       '',
    mapEmbedUrl: '',
  },
  gallery: {
    variant: 'grid',
    title:    'Gallery',
    subtitle: 'A look inside our clinic',
    items:    [],
    columns:  3,
    layout:   'masonry',
  },
  faq: {
    variant: 'accordion',
    title:    'Frequently Asked Questions',
    subtitle: '',
    items:    [
      { id: '1', question: 'How do I book an appointment?', answer: 'You can book online through our website or call us directly.' },
      { id: '2', question: 'What insurance do you accept?',  answer: 'We accept most major insurance providers. Please call us to confirm.' },
      { id: '3', question: 'What are your opening hours?',   answer: 'We are open Monday–Friday 9am–5pm and Saturday 9am–1pm.' },
    ],
  },
  stats: {
    variant: 'banner',
    title: '',
    items: [
      { value: '10+',  label: 'Years Experience' },
      { value: '5000+', label: 'Happy Patients' },
      { value: '15+',  label: 'Expert Doctors' },
      { value: '98%',  label: 'Satisfaction Rate' },
    ],
  },
  'cta-banner': {
    variant: 'horizontal',
    title:       'Ready to Take Control of Your Health?',
    subtitle:    'Book your appointment today and take the first step.',
    ctaText:     'Book Now',
    ctaAction:   'scroll-to-booking',
    ctaValue:    '',
    layout:      'centered',
    background:  '#0ea5e9',
  },
  'rich-text': {
    variant: 'article',
    content: '<p>Enter your content here...</p>',
    alignment: 'left',
  },
  divider: {
    variant: 'line',
    style:    'line',
    color:    '#e5e7eb',
    thickness: 1,
  },
  spacer: {
    height: 80,
  },
  map: {
    variant:   'full-width',
    title:     'Find Us',
    embedUrl:  '',
    zoom:      15,
    height:    400,
    latitude:  null,   // populated via "Pull from branch" in MapEditor
    longitude: null,
    address:   '',
  },
  'social-proof': {
    variant: 'logos',
    title: 'Trusted & Certified',
    items: [
      { id: '1', image: '', name: 'ISO Certified' },
      { id: '2', image: '', name: 'NABH Accredited' },
    ],
  },
  video: {
    variant: 'featured',
    title:    '',
    url:      '',
    autoplay: false,
    loop:     false,
    caption:  '',
  },
  branches: {
    variant: 'cards',
    title:      'Our Locations',
    subtitle:   '',
    dataSource: 'live-api',
    items:      [],
    layout:     'cards',
    showMap:    true,
  },
  products: {
    variant:        'grid',
    title:          'Our Products',
    subtitle:       'Browse and order from our clinic inventory',
    dataSource:     'live-api',       // auto-pull from clinic inventory
    layout:         'grid',
    columns:        3,
    showSearch:     true,
    showStockBadge: true,
    featuredOnly:   false,
    ctaText:        'Add to Cart',
  },
  'ai-chatbot': {
    variant: 'floating',
    title:            'Chat With Us',
    subtitle:         'Ask anything about our clinic, services, or appointments',
    welcomeMessage:   'Hello! 👋 How can I help you today? Ask me about our services, opening hours, doctors, or book an appointment.',
    botName:          'Clinic Assistant',
    botAvatar:        '',
    accentColor:      '#0ea5e9',
    // Clinic knowledge — filled by the clinic owner in the editor
    clinicName:       '',
    clinicPhone:      '',
    clinicEmail:      '',
    openingHours:     'Monday–Friday: 9am–5pm, Saturday: 9am–1pm, Sunday: Closed',
    branches:         '',          // free-text: "Main Branch — 123 Medical Ave | Downtown — 456 Health St"
    doctors:          '',          // free-text: "Dr. Smith (General), Dr. Patel (Dental)"
    services:         '',          // free-text: list of services
    extraInfo:        '',          // anything extra the owner wants the bot to know
    position:         'bottom-right',
    showOnPages:      'all',
  },
  'whatsapp-button': {
    variant: 'floating-circle',
    phoneNumber:      '',          // e.g. 9779800000000 (with country code, no +)
    welcomeMessage:   'Hello! I have a question about your clinic.',
    bannerText:       'How can I help you?',
    bannerSubText:    'Chat with us on WhatsApp',
    position:         'bottom-right',
    showAfterSeconds: 2,
    accentColor:      '#25D366',
  },
  'blog-articles': {
    variant: 'modern-grid',
    title: 'Health Articles',
    subtitle: 'Expert insights from our medical team',
  },
  'clinic-info': {
    variant: 'modern-card',
    title: 'About Our Clinic',
    description: 'We provide world-class healthcare services with a patient-first approach.',
  },
  'patient-login': {
    variant: 'card',
    title: 'Patient Portal Login',
    subtitle: 'Access your appointments, records, and prescriptions',
    ctaText: 'Send OTP',
    verifyText: 'Verify & Login',
  },
};

// ─── Section metadata for the Library panel ───────────────────────────────────

export interface SectionMeta {
  type:        SectionType;
  label:       string;
  description: string;
  category:    'Layout' | 'Clinic Info' | 'Booking' | 'Media' | 'Content' | 'Social Proof';
  icon:        string;
  variant?:    string;
}

export const SECTION_META: SectionMeta[] = [
  // Clinic Info
  { type: 'hero',          label: 'Hero Banner',        description: 'Full-width banner with headline and CTA', category: 'Clinic Info',   icon: 'image' },
  { type: 'about',         label: 'About Section',      description: 'Clinic story with image and text',        category: 'Clinic Info',   icon: 'info' },
  { type: 'services',      label: 'Services Grid',      description: 'Showcase your services',                  category: 'Clinic Info',   icon: 'grid' },
  { type: 'team',          label: 'Team / Doctors',     description: 'Staff profiles grid or carousel',         category: 'Clinic Info',   icon: 'users' },
  { type: 'working-hours', label: 'Opening Hours',      description: 'Weekly schedule table',                   category: 'Clinic Info',   icon: 'clock' },
  { type: 'branches',      label: 'Branch Locations',   description: 'Multi-location cards',                    category: 'Clinic Info',   icon: 'map-pin' },
  { type: 'stats',         label: 'Stats / Numbers',    description: 'Key clinic statistics',                   category: 'Clinic Info',   icon: 'bar-chart' },

  // Booking
  { type: 'appointment-booking', label: 'Booking Widget',   description: 'Live appointment booking form',  category: 'Booking', icon: 'calendar' },
  { type: 'available-slots',     label: 'Available Slots',  description: 'Shows available time slots',     category: 'Booking', icon: 'calendar-check' },

  // Social Proof
  { type: 'testimonials',  label: 'Testimonials',       description: 'Patient reviews carousel',                category: 'Social Proof',  icon: 'star' },
  { type: 'social-proof',  label: 'Trust Badges',       description: 'Certifications and accreditations',       category: 'Social Proof',  icon: 'shield' },
  { type: 'faq',           label: 'FAQ Accordion',      description: 'Frequently asked questions',              category: 'Social Proof',  icon: 'help-circle' },

  // Media
  { type: 'gallery',       label: 'Photo Gallery',      description: 'Image grid or masonry layout',            category: 'Media',         icon: 'image' },
  { type: 'video',         label: 'Video Embed',        description: 'YouTube or Vimeo embed',                  category: 'Media',         icon: 'play' },
  { type: 'map',           label: 'Map Embed',          description: 'Google Maps location',                    category: 'Media',         icon: 'map' },

  // Content
  { type: 'contact',       label: 'Contact Section',    description: 'Contact form + details',                  category: 'Content',       icon: 'mail' },
  { type: 'cta-banner',    label: 'CTA Banner',         description: 'Call-to-action strip',                    category: 'Content',       icon: 'megaphone' },
  { type: 'rich-text',     label: 'Rich Text Block',    description: 'Free-form HTML/text content',             category: 'Content',       icon: 'type' },
  { type: 'products',      label: 'Product Shop',       description: 'Sell inventory products online',          category: 'Content',       icon: 'shopping-bag' },

  // Layout
  { type: 'divider',       label: 'Divider',            description: 'Visual separator line',                   category: 'Layout',        icon: 'minus' },
  { type: 'spacer',        label: 'Spacer',             description: 'Blank vertical space',                    category: 'Layout',        icon: 'space' },

  // Chatbots & Messaging
  { type: 'ai-chatbot',      label: 'AI Clinic Chatbot',   description: 'Smart chatbot that knows your clinic',    category: 'Content',       icon: 'message-circle' },
  { type: 'whatsapp-button', label: 'WhatsApp Button',     description: 'Floating WhatsApp chat button',           category: 'Content',       icon: 'phone' },
  { type: 'blog-articles',   label: 'Blog / Health Articles', description: 'Health articles and blog posts',      category: 'Content',       icon: 'file-text', variant: 'modern-grid' },
  { type: 'clinic-info',     label: 'Clinic Info',            description: 'Clinic overview and information',     category: 'Content',       icon: 'building',  variant: 'modern-card' },
  { type: 'patient-login',   label: 'Patient Login',          description: 'Patient OTP login linking to portal',  category: 'Booking',      icon: 'log-in' },
];

export function getSectionMeta(type: SectionType): SectionMeta {
  return SECTION_META.find(m => m.type === type) || {
    type, label: type, description: '', category: 'Content', icon: 'box',
  };
}