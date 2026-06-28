'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Phone, ChevronDown } from 'lucide-react';
import type {
  GlobalSettings,
  ThemeConfig,
  PageConfig,
  NavVariant,
  FooterVariant,
} from '@/lib/seoUtils'; 

function isColorDark(color: string): boolean {
  if (!color) return false;
  const hex = color.replace('#', '');
  if (hex.length === 3 || hex.length === 6) {
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return false;
}

interface Props {
  children:        React.ReactNode;
  globalSettings:  GlobalSettings;
  theme:           ThemeConfig;
  pages:           PageConfig[];
  subdomain:       string;
  clinic:          Record<string, any> | null;
  branches?:       Record<string, any>[];
  basePath?:       string;
  isCustomDomain?: boolean;
}

export function PublicSiteLayout({
  children,
  globalSettings,
  theme,
  pages,
  subdomain,
  clinic,
  branches = [],
  basePath,
  isCustomDomain = false,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav:    GlobalSettings['nav']    = globalSettings?.nav    ?? { sticky: false, transparent: false, links: [] };
  const footer: GlobalSettings['footer'] = globalSettings?.footer ?? { columns: [], showSocials: false };

  const navVariant: NavVariant       = nav.variant    ?? 'classic';
  const footerVariant: FooterVariant = footer.variant ?? 'classic';

  const RADIUS_MAP: Record<string, string> = {
    none: '0', sm: '4px', md: '8px', lg: '16px', full: '9999px',
  };

  const cssVars = {
    '--primary':   theme?.primaryColor    || '#0ea5e9',
    '--secondary': theme?.secondaryColor  || '#6366f1',
    '--accent':    theme?.accentColor     || '#f59e0b',
    '--bg':        theme?.backgroundColor || '#ffffff',
    '--text':      theme?.textColor       || '#111827',
    '--radius':    RADIUS_MAP[theme?.borderRadius ?? 'md'] ?? '8px',
  } as React.CSSProperties;

  const enabledPages = (pages || []).filter(p => p.enabled);

  // ── Public-facing hrefs ─────────────────────────────────────────────────────
  // For real public pages (subdomain / custom-domain), links must be the URLs
  // a visitor actually sees in their browser — root-relative paths like '/'
  // and '/shop' — NOT the internal `/site/<subdomain>?page=<slug>` path the
  // middleware rewrites to. Using the internal path as a link href broke
  // navigation to every page except home.
  //
  // The preview pane is different: it's a real route
  // (`/site/<subdomain>/preview`) that reads `?page=` itself, so it passes an
  // explicit `basePath` and we keep the `?page=` query-string style for it.
  const pageHref = (p: PageConfig): string => {
    if (basePath) {
      // Preview mode: navigate within the preview route via ?page=
      return p.isHome ? basePath : `${basePath}?page=${p.slug}`;
    }
    if (p.isHome) return '/';
    return `/${p.slug}`;
  };
  const homeHref = basePath || '/';

  const ctaBtn = nav.ctaButton;
  const ctaHref = ctaBtn
    ? ctaBtn.action === 'book'
      ? '#booking'
      : ctaBtn.action === 'call'
      ? `tel:${ctaBtn.value ?? ''}`
      : (ctaBtn.value ?? '#')
    : '#';

  const logoUrl = nav.logo
    ? nav.logo.startsWith('http') || nav.logo.startsWith('//')
      ? nav.logo
      : `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ?? ''}${nav.logo}`
    : null;

  const logoText = nav.logoText || (clinic?.name as string | undefined) || 'Clinic';

  // ── Compute nav background & text colors based on variant ──────────────────
  const isDarkBg = isColorDark(theme?.backgroundColor || '#ffffff');

  const getNavStyle = (): React.CSSProperties => {
    // Explicit bgColor always wins
    if (nav.bgColor) return { background: nav.bgColor, borderBottom: '1px solid rgba(0,0,0,0.08)' };

    switch (navVariant) {
      case 'dark':
        return {
          background: '#111827',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        };
      case 'transparent-light':
        return {
          background: scrolled ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
        };
      case 'transparent-dark':
        return {
          background: scrolled ? 'rgba(17,24,39,0.98)' : 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(12px)',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        };
      case 'minimal':
        return {
          background: '#ffffff',
          borderBottom: '1px solid #f3f4f6',
          boxShadow: 'none',
        };
      case 'centered':
        return {
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        };
      case 'gradient':
        return {
          background: `linear-gradient(135deg, ${theme?.primaryColor || '#0ea5e9'}, ${theme?.secondaryColor || theme?.primaryColor || '#6366f1'})`,
          borderBottom: 'none',
          boxShadow: `0 2px 20px ${theme?.primaryColor || '#0ea5e9'}40`,
        };
      case 'glass':
        return {
          background: isDarkBg ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: isDarkBg ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        };
      case 'colored':
        return {
          background: theme?.primaryColor || '#0ea5e9',
          borderBottom: 'none',
          boxShadow: `0 2px 16px ${theme?.primaryColor || '#0ea5e9'}40`,
        };
      case 'white-shadow':
        return {
          background: '#ffffff',
          borderBottom: 'none',
          boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
        };
      case 'classic':
      default:
        if (nav.transparent) {
          return {
            background: isDarkBg ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: isDarkBg ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
          };
        }
        return {
          background: theme?.primaryColor || '#0ea5e9',
          borderBottom: 'none',
        };
    }
  };

  const getNavTextColor = (): string => {
    if (nav.textColor) return nav.textColor;
    if (nav.bgColor) {
      // Auto-detect contrast for custom bgColor
      const hex = nav.bgColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
        return (r*299+g*587+b*114)/1000 < 128 ? 'rgba(255,255,255,0.92)' : '#111827';
      }
    }
    switch (navVariant) {
      case 'dark':              return 'rgba(255,255,255,0.9)';
      case 'transparent-light': return scrolled ? (theme?.textColor || '#111827') : '#ffffff';
      case 'transparent-dark':  return 'rgba(255,255,255,0.9)';
      case 'minimal':           return theme?.textColor || '#374151';
      case 'centered':          return theme?.textColor || '#374151';
      case 'gradient':          return '#ffffff';
      case 'glass':             return isDarkBg ? 'rgba(255,255,255,0.9)' : (theme?.textColor || '#374151');
      case 'colored':           return '#ffffff';
      case 'white-shadow':      return theme?.textColor || '#374151';
      case 'classic':
      default:
        if (nav.transparent) return isDarkBg ? 'rgba(255,255,255,0.85)' : (theme?.textColor || '#374151');
        // classic with primary color bg — always white text
        return '#ffffff';
    }
  };

  const navTextColor = getNavTextColor();

  // ── Logo size / alignment ─────────────────────────────────────────────────
  const logoHeight   = (nav as any).logoHeight  ? Number((nav as any).logoHeight)  : 36;
  const logoWidth    = (nav as any).logoWidth   ? Number((nav as any).logoWidth)   : undefined;
  const logoAlign    = (nav as any).logoAlign   ?? 'left';   // 'left' | 'center' | 'right'
  const logoFontSize = (nav as any).logoFontSize ? `${(nav as any).logoFontSize}px` : '1.1rem';

  const LOGO_JUSTIFY: Record<string, string> = {
    left: 'flex-start', center: 'center', right: 'flex-end',
  };

  // ── Logo ──────────────────────────────────────────────────────────────────
  const LogoEl = () => (
    <Link
      href={homeHref}
      className="flex items-center gap-2 flex-shrink-0"
      style={{ textDecoration: 'none', justifyContent: LOGO_JUSTIFY[logoAlign] ?? 'flex-start' }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={logoText}
          style={{
            height: logoHeight,
            width:  logoWidth ? logoWidth : 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        <span style={{ fontFamily: theme?.fontHeading, fontWeight: 700, fontSize: logoFontSize, color: navTextColor }}>
          {logoText}
        </span>
      )}
    </Link>
  );

  // ── CTA button ────────────────────────────────────────────────────────────
  const CtaBtn = ({ style: extraStyle }: { style?: React.CSSProperties }) => ctaBtn?.text ? (
    <a
      href={ctaHref}
      style={{
        padding: '8px 20px',
        borderRadius: RADIUS_MAP[theme?.borderRadius ?? 'md'],
        background: theme?.accentColor || '#f59e0b',
        color: '#ffffff',
        fontWeight: 600,
        fontSize: 14,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        ...extraStyle,
      }}
    >
      {ctaBtn.text}
    </a>
  ) : null;

  // ── Nav links ─────────────────────────────────────────────────────────────
  const NavLinks = ({ color }: { color: string }) => (
    <>
      {enabledPages.map(p => (
        <Link
          key={p.id}
          href={pageHref(p)}
          style={{ color, fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {p.title}
        </Link>
      ))}
    </>
  );

  // ── Nav variant renderers ─────────────────────────────────────────────────

  const renderNav = () => {
    const navStyle = getNavStyle();

    if (navVariant === 'centered') {
      return (
        <nav
          className={nav.sticky ? 'sticky top-0 z-50' : 'relative z-50'}
          style={navStyle}
        >
          {/* Top bar: logo position controlled by logoAlign */}
          <div style={{ padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: LOGO_JUSTIFY[logoAlign] ?? 'center' }}>
            <LogoEl />
          </div>
          {/* Links bar */}
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '0 32px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, height: 44 }}>
              <div className="hidden md:flex items-center gap-8">
                <NavLinks color={navTextColor} />
              </div>
              <CtaBtn />
              {/* Mobile toggle */}
              <button className="md:hidden" onClick={() => setMobileMenuOpen(v => !v)} style={{ color: navTextColor, background: 'none', border: 'none', cursor: 'pointer' }}>
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
          {mobileMenuOpen && <MobileDrawer color={navTextColor} style={navStyle} />}
        </nav>
      );
    }

    if (navVariant === 'minimal') {
      return (
        <nav
          className={nav.sticky ? 'sticky top-0 z-50' : 'relative z-50'}
          style={navStyle}
        >
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
            <LogoEl />
            <div className="hidden md:flex items-center gap-8">
              <NavLinks color={navTextColor} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {ctaBtn?.text && (
                <a href={ctaHref} style={{ fontSize: 14, fontWeight: 600, color: theme?.primaryColor, textDecoration: 'none' }}>
                  {ctaBtn.text} →
                </a>
              )}
              <button className="md:hidden" onClick={() => setMobileMenuOpen(v => !v)} style={{ color: navTextColor, background: 'none', border: 'none', cursor: 'pointer' }}>
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
          {mobileMenuOpen && <MobileDrawer color={navTextColor} style={navStyle} />}
        </nav>
      );
    }

    // classic / dark / transparent-light
    return (
      <nav
        className={nav.sticky ? 'sticky top-0 z-50' : 'relative z-50'}
        style={{ ...navStyle, transition: 'all 0.25s' }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <LogoEl />
          <div className="hidden md:flex items-center gap-7">
            <NavLinks color={navTextColor} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="hidden md:block">
              <CtaBtn />
            </div>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(v => !v)} style={{ color: navTextColor, background: 'none', border: 'none', cursor: 'pointer' }}>
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && <MobileDrawer color={navTextColor} style={navStyle} />}
      </nav>
    );
  };

  const MobileDrawer = ({ color, style }: { color: string; style: React.CSSProperties }) => (
    <div style={{
      background: isColorDark(theme?.backgroundColor || '#fff') ? '#111827' : '#ffffff',
      borderTop: '1px solid rgba(0,0,0,0.08)',
      padding: '16px 24px',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {enabledPages.map(p => (
          <Link
            key={p.id}
            href={pageHref(p)}
            onClick={() => setMobileMenuOpen(false)}
            style={{ padding: '10px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: isColorDark(theme?.backgroundColor || '#fff') ? 'rgba(255,255,255,0.85)' : '#374151', textDecoration: 'none' }}
          >
            {p.title}
          </Link>
        ))}
        {ctaBtn?.text && (
          <a
            href={ctaHref}
            style={{ padding: '10px 12px', borderRadius: 8, background: theme?.accentColor, color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: 14, textDecoration: 'none', marginTop: 8 }}
          >
            {ctaBtn.text}
          </a>
        )}
      </div>
    </div>
  );

  // ── Footer renderers ──────────────────────────────────────────────────────

  const getFooterBg = (): string => {
    if (footer.bgColor) return footer.bgColor;
    switch (footerVariant) {
      case 'minimal':      return '#f9fafb';
      case 'centered':     return theme?.primaryColor || '#0ea5e9';
      case 'columns-only': return '#1f2937';
      case 'dark':
      default:             return '#111827';
    }
  };

  const footerBg = getFooterBg();
  const footerTextLight = isColorDark(footerBg);

  const footerTextColor = footerTextLight ? '#f9fafb' : '#374151';
  const footerMutedColor = footerTextLight ? '#9ca3af' : '#6b7280';
  const footerBorderColor = footerTextLight ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  const renderFooter = () => {
    if (footerVariant === 'minimal') {
      return (
        <footer style={{ background: footerBg, borderTop: '1px solid #e5e7eb', padding: '24px 32px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontFamily: theme?.fontHeading, fontWeight: 700, color: footerTextColor, fontSize: 15 }}>
              {clinic?.name as string || ''}
            </span>
            <div style={{ display: 'flex', gap: 24 }}>
              {enabledPages.slice(0, 5).map(p => (
                <Link key={p.id} href={pageHref(p)} style={{ fontSize: 13, color: footerMutedColor, textDecoration: 'none' }}>{p.title}</Link>
              ))}
            </div>
            <span style={{ fontSize: 12, color: footerMutedColor }}>
              {footer.copyrightText || `© ${new Date().getFullYear()} ${clinic?.name || ''}`}
            </span>
          </div>
        </footer>
      );
    }

    if (footerVariant === 'centered') {
      return (
        <footer style={{ background: footerBg, padding: '60px 32px 32px', textAlign: 'center' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ fontFamily: theme?.fontHeading, fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 8 }}>
              {clinic?.name as string || ''}
            </div>
            {footer.tagline && <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 24 }}>{footer.tagline}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20, marginBottom: 32 }}>
              {enabledPages.map(p => (
                <Link key={p.id} href={pageHref(p)} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, textDecoration: 'none' }}>{p.title}</Link>
              ))}
            </div>
            {footer.showSocials && footer.socials && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                {footer.socials.facebook  && <SocialLink href={footer.socials.facebook}  icon="f"  light />}
                {footer.socials.instagram && <SocialLink href={footer.socials.instagram} icon="ig" light />}
                {footer.socials.twitter   && <SocialLink href={footer.socials.twitter}   icon="tw" light />}
                {footer.socials.youtube   && <SocialLink href={footer.socials.youtube}   icon="yt" light />}
              </div>
            )}
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              {footer.copyrightText || `© ${new Date().getFullYear()} ${clinic?.name || ''}`}
            </p>
          </div>
        </footer>
      );
    }

    // classic / dark / columns-only
    return (
      <footer style={{ background: footerBg, color: footerTextColor, paddingTop: 48, paddingBottom: 24 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `1fr ${footer.columns?.length ? `repeat(${Math.min(footer.columns.length, 4)}, 1fr)` : ''}`,
            gap: 40,
            marginBottom: 40,
          }}>
            {/* Brand column */}
            <div>
              <div style={{ fontFamily: theme?.fontHeading, fontWeight: 700, fontSize: 18, marginBottom: 8, color: footerTextColor }}>
                {clinic?.name as string || ''}
              </div>
              {footer.tagline && (
                <p style={{ color: footerMutedColor, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{footer.tagline}</p>
              )}
              {clinic?.phone && (
                <a href={`tel:${clinic.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: footerMutedColor, textDecoration: 'none', marginBottom: 4 }}>
                  📞 {clinic.phone as string}
                </a>
              )}
              {clinic?.email && (
                <a href={`mailto:${clinic.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: footerMutedColor, textDecoration: 'none' }}>
                  ✉️ {clinic.email as string}
                </a>
              )}
              {footer.showSocials && footer.socials && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {footer.socials.facebook  && <SocialLink href={footer.socials.facebook}  icon="f"  light={footerTextLight} />}
                  {footer.socials.instagram && <SocialLink href={footer.socials.instagram} icon="ig" light={footerTextLight} />}
                  {footer.socials.twitter   && <SocialLink href={footer.socials.twitter}   icon="tw" light={footerTextLight} />}
                  {footer.socials.youtube   && <SocialLink href={footer.socials.youtube}   icon="yt" light={footerTextLight} />}
                  {footer.socials.tiktok    && <SocialLink href={footer.socials.tiktok}    icon="tk" light={footerTextLight} />}
                </div>
              )}
            </div>

            {/* Link columns */}
            {(footer.columns || []).map((col, i) => (
              <div key={i}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: footerTextColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.heading}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(col.links || []).map((link, j) => (
                    <li key={j} style={{ marginBottom: 8 }}>
                      <a href={link.href} style={{ fontSize: 13, color: footerMutedColor, textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = footerTextColor)}
                        onMouseLeave={e => (e.currentTarget.style.color = footerMutedColor)}
                      >{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: `1px solid ${footerBorderColor}`, paddingTop: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, fontSize: 12, color: footerMutedColor }}>
            <p style={{ margin: 0 }}>
              {footer.copyrightText || `© ${new Date().getFullYear()} ${clinic?.name || ''}. All rights reserved.`}
            </p>
            {footer.showPoweredBy !== false && (
              <p style={{ margin: 0 }}>
                Powered by{' '}
                <a href="https://clinickarobar.com" style={{ color: footerMutedColor, textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">
                  Clinic Karobar
                </a>
              </p>
            )}
          </div>
        </div>
      </footer>
    );
  };

  return (
    <div style={{ ...cssVars, fontFamily: theme?.fontBody, background: theme?.backgroundColor, color: theme?.textColor }}>
      {/* Google Fonts */}
      {theme?.fontHeading && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontHeading)}:wght@400;600;700;800&family=${encodeURIComponent(theme.fontBody || 'Inter')}:wght@400;500;600&display=swap`}
          />
        </>
      )}

      {renderNav()}
      <main>{children}</main>
      {renderFooter()}
    </div>
  );
}

function SocialLink({ href, icon, light = true }: { href: string; icon: string; light?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        width: 32, height: 32, borderRadius: '50%',
        background: light ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        color: light ? '#fff' : '#374151',
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
    >
      {icon}
    </a>
  );
}