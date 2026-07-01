"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ─── Design tokens ──────────────────────────────────────────────────────────
// Palette: paper (warm white), ink (deep pine-black), pine (primary teal),
// amber (sparing highlight), slate (muted body), line (hairline borders).
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }

  :root {
    --paper: #fffefb;
    --paper-soft: #f5f6f2;
    --ink: #10231c;
    --pine: #0b6e5d;
    --pine-soft: #e5f1ec;
    --pine-dark: #084f43;
    --amber: #b9752b;
    --amber-soft: #f7ecdc;
    --slate: #55655f;
    --line: #e3e6e0;
  }

  .aa-serif { font-family: 'Instrument Serif', Georgia, serif; }
  .aa-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }

  .aa-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--pine);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.875rem;
  }
  .aa-eyebrow::before {
    content: '';
    width: 14px;
    height: 1px;
    background: var(--pine);
    display: inline-block;
  }

  .aa-nav-link {
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.5rem 0.875rem;
    border-radius: 0.5rem;
    color: var(--slate);
    transition: color 0.2s, background 0.2s;
    text-decoration: none;
  }
  .aa-nav-link:hover { color: var(--ink); background: var(--paper-soft); }

  .aa-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1.875rem;
    border-radius: 0.625rem;
    font-weight: 700;
    font-size: 0.9375rem;
    color: #fff;
    background: var(--pine);
    border: none;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    text-decoration: none;
    box-shadow: 0 6px 20px rgba(11,110,93,0.22);
  }
  .aa-btn-primary:hover { background: var(--pine-dark); transform: translateY(-1px); box-shadow: 0 8px 26px rgba(11,110,93,0.3); }

  .aa-btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1.875rem;
    border-radius: 0.625rem;
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--ink);
    background: transparent;
    border: 1px solid var(--line);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
    text-decoration: none;
  }
  .aa-btn-outline:hover { border-color: var(--pine); background: var(--pine-soft); transform: translateY(-1px); }

  .aa-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .aa-card:hover { border-color: rgba(11,110,93,0.28); box-shadow: 0 10px 30px rgba(16,35,28,0.06); transform: translateY(-2px); }

  .aa-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6875rem;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 0.375rem;
    background: var(--pine-soft);
    color: var(--pine-dark);
    display: inline-block;
  }

  .aa-thread-dash { stroke-dasharray: 3 7; }

  .aa-tilt {
    transform: perspective(1400px) rotateX(4deg) scale(0.985);
    transform-origin: top center;
    border-radius: 1.125rem;
    overflow: hidden;
    box-shadow: 0 40px 90px rgba(16,35,28,0.14), 0 0 0 1px rgba(16,35,28,0.05);
  }
  @media (max-width: 640px) {
    .aa-tilt { transform: none; box-shadow: 0 20px 50px rgba(16,35,28,0.12); }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }
`;

// ─── Icons (inline, monochrome, minimal) ───────────────────────────────────
const Icon = {
  pulse: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  ),
  calendar: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  users: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  invoice: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  building: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  clock: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  bars: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  share: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="10.5" x2="15.4" y2="6.5" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </svg>
  ),
  family: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" /><circle cx="17" cy="6" r="2.5" /><path d="M2 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2" /><path d="M15 12a4 4 0 0 1 4 4v2" />
    </svg>
  ),
  shield: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
    </svg>
  ),
  star: (p: any) => (
    <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
  ),
  check: (p: any) => (
    <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  cross: (p: any) => (
    <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  ),
  arrow: (p: any) => (
    <svg width={p.s || 16} height={p.s || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  ),
  desktop: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="13" rx="1.5" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  mobile: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2.5" /><line x1="10" y1="19" x2="14" y2="19" />
    </svg>
  ),
  cloud: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.5A4.5 4.5 0 0 0 6.5 19h11z" />
    </svg>
  ),
  stethoscope: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 3v6a4.5 4.5 0 0 0 9 0V3" /><path d="M9 13.5V16a5 5 0 0 0 10 0v-1.5" /><circle cx="19" cy="12" r="1.75" />
    </svg>
  ),
  folder: (p: any) => (
    <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  ),
};

// ─── Counter ────────────────────────────────────────────────────────────────
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        let start = 0;
        const duration = 1300;
        const steps = 46;
        const step = end / steps;
        const interval = duration / steps;
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, interval);
        observer.disconnect();
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Nav ────────────────────────────────────────────────────────────────────
function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
      <div style={{ width: 32, height: 32, borderRadius: "0.625rem", background: "var(--pine)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: "1.15rem", color: dark ? "#fff" : "var(--ink)", letterSpacing: "-0.02em" }}>Aastal</span>
    </Link>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Platform", href: "#platform" },
    { label: "For clinics", href: "#clinics" },
    { label: "For patients", href: "#audiences" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,254,251,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
          <Logo />

          <div className="hidden md:flex items-center gap-1">
            {links.map(({ label, href }) => (
              <a key={label} href={href} className="aa-nav-link">{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="aa-nav-link">Sign in</Link>
            <Link href="/auth/register" className="aa-btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem", borderRadius: "0.5rem" }}>
              Get started free
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 rounded-lg"
            style={{ color: "var(--ink)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            {mobileOpen ? <Icon.cross s={22} /> : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {mobileOpen && (
          <div style={{ background: "var(--paper)", borderTop: "1px solid var(--line)" }} className="md:hidden px-5 py-4">
            {links.map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMobileOpen(false)}
                className="block text-sm py-3"
                style={{ color: "var(--slate)", borderBottom: "1px solid var(--line)", textDecoration: "none", fontWeight: 500 }}
              >{label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-4">
              <Link href="/auth/login" className="aa-btn-outline" style={{ justifyContent: "center" }}>Sign in</Link>
              <Link href="/auth/register" className="aa-btn-primary" style={{ justifyContent: "center" }}>Get started free</Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ background: "var(--paper)", paddingTop: "7.5rem", paddingBottom: "4rem", position: "relative", overflow: "hidden" }}>
      <div
        className="absolute pointer-events-none"
        style={{ top: "-120px", left: "50%", transform: "translateX(-50%)", width: 900, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(11,110,93,0.07) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center">
        <span className="aa-eyebrow" style={{ justifyContent: "center" }}>One record. Every screen.</span>

        <h1
          className="aa-serif"
          style={{ fontWeight: 400, fontSize: "clamp(2.5rem, 7vw, 4.75rem)", lineHeight: 1.04, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: "1.5rem", maxWidth: 860, marginLeft: "auto", marginRight: "auto" }}
        >
          Healthcare, connected — for clinics, doctors, and the people they treat.
        </h1>

        <p style={{ fontSize: "clamp(1rem, 2.2vw, 1.1875rem)", color: "var(--slate)", maxWidth: 600, lineHeight: 1.7, marginBottom: "2.25rem", marginLeft: "auto", marginRight: "auto" }}>
          Aastal is one platform with a web dashboard for clinics and hospitals, a desktop app for offline
          front desks, and a mobile app patients and doctors carry everywhere.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <Link href="/auth/register" className="aa-btn-primary" style={{ minWidth: 210 }}>
            Get started free <Icon.arrow />
          </Link>
          <Link href="#platform" className="aa-btn-outline" style={{ minWidth: 190 }}>
            See the platform
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mb-14">
          {["14-day free trial", "No credit card needed", "Free for patients & doctors", "Access from any device"].map(t => (
            <div key={t} className="flex items-center gap-1.5" style={{ fontSize: "0.75rem", color: "var(--slate)", fontWeight: 500 }}>
              <Icon.check s={11} />{t}
            </div>
          ))}
        </div>

        {/* Thread — connects the three surfaces */}
        <div style={{ position: "relative", maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
          <svg viewBox="0 0 980 90" style={{ width: "100%", height: "auto", display: "block" }} className="hidden sm:block">
            <path d="M 160 45 C 350 -10, 630 100, 820 45" fill="none" stroke="var(--pine)" strokeOpacity="0.35" strokeWidth="1.5" className="aa-thread-dash" />
            <circle cx="160" cy="45" r="4" fill="var(--pine)" />
            <circle cx="490" cy="46" r="4" fill="var(--amber)" />
            <circle cx="820" cy="45" r="4" fill="var(--pine)" />
          </svg>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-5" style={{ marginTop: "-0.5rem" }}>
            {/* Clinic dashboard mockup */}
            <div className="aa-tilt" style={{ background: "#fff" }}>
              <div style={{ borderBottom: "1px solid var(--line)", padding: "0.625rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon.cloud s={13} />
                <span className="aa-mono" style={{ fontSize: "0.625rem", color: "var(--slate)" }}>Web · Clinic dashboard</span>
              </div>
              <div style={{ padding: "1rem", textAlign: "left" }}>
                <p className="aa-mono" style={{ fontSize: "0.5625rem", color: "var(--slate)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>Today</p>
                <p style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--pine)", lineHeight: 1, marginBottom: "0.75rem" }}>24 <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate)" }}>appointments</span></p>
                {["09:00 Ramesh S.", "10:30 Sita T.", "11:00 Bikash K."].map(r => (
                  <div key={r} style={{ fontSize: "0.6875rem", color: "var(--ink)", padding: "0.375rem 0", borderTop: "1px solid var(--paper-soft)" }}>{r}</div>
                ))}
              </div>
            </div>

            {/* Doctor mockup */}
            <div className="aa-tilt" style={{ background: "#fff" }}>
              <div style={{ borderBottom: "1px solid var(--line)", padding: "0.625rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon.stethoscope s={13} />
                <span className="aa-mono" style={{ fontSize: "0.625rem", color: "var(--slate)" }}>Mobile · Doctor</span>
              </div>
              <div style={{ padding: "1rem", textAlign: "left" }}>
                <p className="aa-mono" style={{ fontSize: "0.5625rem", color: "var(--slate)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>Patient history</p>
                <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)", marginBottom: "0.5rem" }}>Anita Rai</p>
                <div className="aa-tag" style={{ marginRight: "0.375rem" }}>2 clinics shared</div>
                <div className="aa-tag" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>Consent active</div>
              </div>
            </div>

            {/* Patient mockup */}
            <div className="aa-tilt" style={{ background: "#fff" }}>
              <div style={{ borderBottom: "1px solid var(--line)", padding: "0.625rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon.mobile s={13} />
                <span className="aa-mono" style={{ fontSize: "0.625rem", color: "var(--slate)" }}>Mobile · Patient</span>
              </div>
              <div style={{ padding: "1rem", textAlign: "left" }}>
                <p className="aa-mono" style={{ fontSize: "0.5625rem", color: "var(--slate)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>Family</p>
                {[["You", "3 records"], ["Mother", "1 record"], ["Son", "5 records"]].map(([n, r]) => (
                  <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", padding: "0.375rem 0", borderTop: "1px solid var(--paper-soft)" }}>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{n}</span>
                    <span style={{ color: "var(--slate)" }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { val: 500, suffix: "+", label: "Clinics & hospitals" },
    { val: 1200, suffix: "+", label: "Doctors on Aastal" },
    { val: 60000, suffix: "+", label: "Patients connected" },
    { val: 3, suffix: "", label: "Platforms, one record" },
  ];
  return (
    <section style={{ background: "var(--paper-soft)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8" style={{ textAlign: "center" }}>
        {stats.map(({ val, suffix, label }) => (
          <div key={label}>
            <div className="aa-mono" style={{ fontSize: "clamp(1.5rem,4vw,2.125rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--pine)", lineHeight: 1, marginBottom: "0.5rem" }}>
              <Counter end={val} suffix={suffix} />
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--slate)", fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Platform showcase ──────────────────────────────────────────────────────
function PlatformShowcase() {
  const platforms = [
    {
      icon: <Icon.cloud s={22} />,
      title: "Web admin dashboard",
      who: "Clinics & hospitals",
      desc: "Run appointments, patients, billing, staff, and multi-branch reporting from any browser. Nothing to install for your front desk.",
      items: ["Works on any device with a browser", "Real-time across every branch", "Role-based access for your team"],
    },
    {
      icon: <Icon.desktop s={22} />,
      title: "Desktop app",
      who: "Windows · macOS · Linux",
      desc: "The same front desk, built to keep working when the internet doesn't. Book, bill, and chart offline — Aastal syncs the moment you're back online.",
      items: ["Full offline mode with local storage", "Automatic sync & conflict resolution", "One installer, three operating systems"],
    },
    {
      icon: <Icon.mobile s={22} />,
      title: "Mobile app",
      who: "Patients & doctors · iOS & Android",
      desc: "Patients book visits, view records, and message care teams. Doctors manage their day and their patients, wherever they're practicing.",
      items: ["One app, two experiences by role", "Push reminders for visits & refills", "Works for independent doctors too"],
    },
  ];
  return (
    <section id="platform" style={{ background: "var(--paper)", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div style={{ marginBottom: "3rem", maxWidth: 560 }}>
          <span className="aa-eyebrow">The platform</span>
          <h2 className="aa-serif" style={{ fontWeight: 400, fontSize: "clamp(2rem,4.5vw,2.875rem)", color: "var(--ink)", lineHeight: 1.1, marginBottom: "0.875rem" }}>
            Three surfaces. The same source of truth.
          </h2>
          <p style={{ fontSize: "1.0625rem", color: "var(--slate)", lineHeight: 1.6 }}>
            A clinic's front desk, a doctor's pocket, and a patient's phone are different jobs. Aastal gives each one its own app, all reading and writing the same record.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {platforms.map(({ icon, title, who, desc, items }) => (
            <div key={title} className="aa-card" style={{ padding: "1.75rem" }}>
              <div style={{ width: 46, height: 46, borderRadius: "0.75rem", background: "var(--pine-soft)", color: "var(--pine-dark)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                {icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: "var(--ink)", marginBottom: "0.25rem" }}>{title}</h3>
              <p className="aa-mono" style={{ fontSize: "0.6875rem", color: "var(--amber)", marginBottom: "0.875rem" }}>{who}</p>
              <p style={{ fontSize: "0.875rem", color: "var(--slate)", lineHeight: 1.65, marginBottom: "1.125rem" }}>{desc}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {items.map(it => (
                  <li key={it} style={{ display: "flex", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--ink)" }}>
                    <span style={{ color: "var(--pine)", flexShrink: 0, marginTop: 2 }}><Icon.check s={13} /></span>{it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Audience tabs (Clinics / Doctors / Patients) ──────────────────────────
function AudienceTabs() {
  const tabs = [
    {
      key: "clinics",
      label: "Clinics & hospitals",
      icon: <Icon.building s={16} />,
      heading: "Run the whole practice from one screen",
      desc: "Appointments, patient charts, billing, and staff — for one branch or twenty — with reporting that rolls everything up for the owner.",
      features: [
        { icon: <Icon.calendar />, title: "Appointments", desc: "Online booking, SMS reminders, and live availability per doctor and branch." },
        { icon: <Icon.users />, title: "Patient records", desc: "Full history, treatment notes, and file uploads, searchable across your base." },
        { icon: <Icon.invoice />, title: "Billing & invoicing", desc: "VAT-compliant invoices, partial payments, and eSewa or Khalti at checkout." },
        { icon: <Icon.building />, title: "Multi-branch control", desc: "Each branch runs itself; owners see every branch in one dashboard." },
        { icon: <Icon.clock />, title: "Staff & HR", desc: "Shifts, attendance, leave, and commissions in one place." },
        { icon: <Icon.bars />, title: "Analytics", desc: "Revenue, appointment trends, and doctor performance, exportable to PDF." },
      ],
    },
    {
      key: "doctors",
      label: "Doctors",
      icon: <Icon.stethoscope s={16} />,
      heading: "Practice on your own terms",
      desc: "Join a clinic, or start on Aastal without one. Either way, your patients and your schedule stay with you.",
      features: [
        { icon: <Icon.stethoscope />, title: "Sign up independently", desc: "No clinic required. Set your own hours, fees, and patients from day one." },
        { icon: <Icon.calendar />, title: "Your own schedule", desc: "Manage bookings across any clinics you work with, or entirely on your own." },
        { icon: <Icon.shield />, title: "Consent-gated history", desc: "See a patient's care across other clinics only once they share it with you." },
        { icon: <Icon.share />, title: "Patient messaging", desc: "Answer questions, send instructions, and issue prescriptions from the app." },
        { icon: <Icon.star />, title: "Build your reputation", desc: "Patients you've treated can leave verified reviews that follow your profile." },
        { icon: <Icon.building />, title: "Join a clinic anytime", desc: "Get added to a clinic's roster later without losing your own patients." },
      ],
    },
    {
      key: "patients",
      label: "Patients",
      icon: <Icon.users s={16} />,
      heading: "Your care, in one place — on your terms",
      desc: "Every visit, every clinic, every prescription — together, and shared only with who you choose.",
      features: [
        { icon: <Icon.folder />, title: "All your records, together", desc: "Visits from every clinic you've used, pulled into one history." },
        { icon: <Icon.share />, title: "Share with a doctor", desc: "Grant a specific doctor or clinic access to your history for as long as you choose." },
        { icon: <Icon.family />, title: "Family accounts", desc: "Manage records for your kids or parents alongside your own." },
        { icon: <Icon.calendar />, title: "Book anywhere", desc: "Find and book appointments at any clinic on Aastal, from one app." },
        { icon: <Icon.star />, title: "Review your doctors", desc: "Rate and review after a visit to help other patients choose well." },
        { icon: <Icon.shield />, title: "You control access", desc: "Nothing is visible to a clinic or doctor until you share it — and you can revoke it." },
      ],
    },
  ];

  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find(t => t.key === active)!;

  return (
    <section id="audiences" style={{ background: "var(--paper-soft)", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div style={{ marginBottom: "2.5rem", maxWidth: 560 }}>
          <span className="aa-eyebrow">Built for everyone in the room</span>
          <h2 className="aa-serif" style={{ fontWeight: 400, fontSize: "clamp(2rem,4.5vw,2.875rem)", color: "var(--ink)", lineHeight: 1.1 }}>
            One Aastal account. A different view for each role.
          </h2>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-2 mb-8" id="clinics">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.625rem 1.125rem", borderRadius: "0.625rem",
                fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                border: active === t.key ? "1px solid var(--pine)" : "1px solid var(--line)",
                background: active === t.key ? "var(--ink)" : "#fff",
                color: active === t.key ? "#fff" : "var(--slate)",
                transition: "all 0.2s",
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: "2rem", maxWidth: 620 }}>
          <h3 style={{ fontWeight: 700, fontSize: "1.375rem", color: "var(--ink)", marginBottom: "0.5rem" }}>{current.heading}</h3>
          <p style={{ fontSize: "0.9375rem", color: "var(--slate)", lineHeight: 1.65 }}>{current.desc}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {current.features.map(({ icon, title, desc }) => (
            <div key={title} className="aa-card" style={{ padding: "1.375rem", background: "#fff" }}>
              <div style={{ width: 38, height: 38, borderRadius: "0.625rem", background: "var(--pine-soft)", color: "var(--pine-dark)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.875rem" }}>
                {icon}
              </div>
              <h4 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)", marginBottom: "0.375rem" }}>{title}</h4>
              <p style={{ fontSize: "0.8125rem", color: "var(--slate)", lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ───────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", title: "Create your account", desc: "Register as a clinic, an independent doctor, or a patient. Each takes under five minutes." },
    { num: "02", title: "Set up your space", desc: "Clinics add staff, branches, and services. Doctors set hours and fees. Patients add family members." },
    { num: "03", title: "Connect the record", desc: "Book a visit, share history with a doctor, or invite your team — the record follows, with consent." },
    { num: "04", title: "Work from anywhere", desc: "Web on the front desk, desktop when offline, mobile everywhere else. Always in sync." },
  ];
  return (
    <section style={{ background: "var(--paper)", paddingTop: "5rem", paddingBottom: "5rem", borderTop: "1px solid var(--line)" }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <span className="aa-eyebrow" style={{ justifyContent: "center" }}>Getting started</span>
          <h2 className="aa-serif" style={{ fontWeight: 400, fontSize: "clamp(2rem,4.5vw,2.75rem)", color: "var(--ink)", lineHeight: 1.1 }}>
            Up and running in minutes
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="aa-card" style={{ padding: "1.5rem" }}>
              <p className="aa-mono" style={{ fontSize: "0.75rem", color: "var(--amber)", fontWeight: 600, marginBottom: "0.875rem" }}>{num}</p>
              <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)", marginBottom: "0.5rem" }}>{title}</h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--slate)", lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────
function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Free trial",
      badge: "14 days",
      price: "Free",
      priceNote: "14-day trial · no renewal",
      yearlyNote: null as string | null,
      description: "For clinics trying Aastal. Every admin feature unlocked, no card required.",
      featured: false,
      cta: "Start free trial",
      features: [
        { text: "Dashboard, appointments, patients", included: true },
        { text: "Billing & analytics", included: true },
        { text: "Staff management", included: true },
        { text: "SMS reminders & notifications", included: true },
        { text: "Expires after 14 days", included: true },
        { text: "Website builder", included: false },
        { text: "API access", included: false },
      ],
    },
    {
      name: "Pro",
      badge: "Most popular",
      price: billing === "monthly" ? "NPR 1,500" : "NPR 16,500",
      priceNote: billing === "monthly" ? "per month · 1 branch" : "per year · 1 month free",
      yearlyNote: billing === "yearly" ? "Save NPR 1,500/yr" : null,
      description: "Everything a growing clinic needs, priced per branch as you scale.",
      featured: true,
      cta: "Get started",
      features: [
        { text: "Everything in Free trial", included: true },
        { text: "Desktop app for offline front desk", included: true },
        { text: "Attendance & leave", included: true },
        { text: "eSewa & Khalti checkout", included: true },
        { text: "+ NPR 500/mo per extra branch", included: true },
        { text: "Website builder", included: false },
        { text: "API access", included: false },
      ],
    },
    {
      name: "Enterprise",
      badge: "Full power",
      price: billing === "monthly" ? "NPR 2,500" : "NPR 27,500",
      priceNote: billing === "monthly" ? "per month · 1 branch" : "per year · 1 month free",
      yearlyNote: billing === "yearly" ? "Save NPR 2,500/yr" : null,
      description: "For hospitals and multi-branch groups that need a public website and integrations.",
      featured: false,
      cta: "Get started",
      features: [
        { text: "Everything in Pro", included: true },
        { text: "Public clinic website builder", included: true },
        { text: "API access", included: true },
        { text: "+ NPR 500/mo per extra branch", included: true },
        { text: "Priority support", included: true },
      ],
    },
  ];

  return (
    <section id="pricing" style={{ background: "var(--paper-soft)", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <span className="aa-eyebrow" style={{ justifyContent: "center" }}>Simple pricing</span>
          <h2 className="aa-serif" style={{ fontWeight: 400, fontSize: "clamp(2rem,4.5vw,2.875rem)", color: "var(--ink)", lineHeight: 1.1, marginBottom: "0.75rem" }}>
            Pricing for the clinic side
          </h2>
          <p style={{ fontSize: "1.0625rem", color: "var(--slate)", maxWidth: 460, margin: "0 auto 1.75rem" }}>
            Clinics and hospitals pay per branch. Patients and independent doctors use Aastal at no cost.
          </p>

          <div className="inline-flex items-center rounded-xl p-1 gap-1" style={{ background: "#fff", border: "1px solid var(--line)" }}>
            {(["monthly", "yearly"] as const).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "0.5rem", fontSize: "0.875rem", fontWeight: 600,
                  border: "none", cursor: "pointer",
                  background: billing === b ? "var(--pine)" : "transparent",
                  color: billing === b ? "#fff" : "var(--slate)",
                  transition: "background 0.2s, color 0.2s",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                }}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span className="aa-mono" style={{ fontSize: "0.625rem", fontWeight: 600, padding: "2px 7px", borderRadius: "0.375rem", background: billing === "yearly" ? "rgba(255,255,255,0.2)" : "var(--pine-soft)", color: billing === "yearly" ? "#fff" : "var(--pine-dark)" }}>
                    1 month free
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {plans.map(({ name, badge, price, priceNote, yearlyNote, description, featured, cta, features }) => (
            <div
              key={name}
              className="pricing-card"
              style={{
                borderRadius: "1.125rem", padding: "2rem", display: "flex", flexDirection: "column",
                background: featured ? "var(--ink)" : "#fff",
                border: featured ? "1px solid var(--pine)" : "1px solid var(--line)",
                boxShadow: featured ? "0 16px 40px rgba(16,35,28,0.18)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <span className="aa-mono" style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "4px 10px", borderRadius: "0.5rem", background: featured ? "rgba(255,255,255,0.1)" : "var(--paper-soft)", color: featured ? "#a8d9cd" : "var(--slate)" }}>
                  {badge}
                </span>
                {featured && <span style={{ color: "var(--amber)" }}><Icon.star s={16} /></span>}
              </div>

              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: featured ? "#fff" : "var(--ink)", marginBottom: "0.375rem" }}>{name}</h3>
              <p style={{ fontSize: "0.8125rem", color: featured ? "rgba(255,255,255,0.55)" : "var(--slate)", lineHeight: 1.6, marginBottom: "1.25rem" }}>{description}</p>

              <div style={{ marginBottom: "0.25rem" }}>
                <span className="aa-serif" style={{ fontSize: "clamp(1.75rem,4vw,2.25rem)", fontWeight: 400, color: featured ? "#fff" : "var(--ink)" }}>{price}</span>
                {name !== "Free trial" && <span style={{ fontSize: "0.8125rem", color: featured ? "rgba(255,255,255,0.4)" : "var(--slate)", marginLeft: "0.25rem" }}>/mo</span>}
              </div>
              <p style={{ fontSize: "0.75rem", color: featured ? "rgba(255,255,255,0.4)" : "var(--slate)", marginBottom: "0.25rem" }}>{priceNote}</p>
              {yearlyNote && <p style={{ fontSize: "0.75rem", fontWeight: 600, color: featured ? "#a8d9cd" : "var(--pine)", marginBottom: "1rem" }}>✓ {yearlyNote}</p>}

              <div style={{ borderTop: featured ? "1px solid rgba(255,255,255,0.1)" : "1px solid var(--paper-soft)", margin: "1.25rem 0" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {features.map(({ text, included }) => (
                  <li key={text} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                    <span style={{ flexShrink: 0, marginTop: 2, color: included ? (featured ? "#4fb89e" : "var(--pine)") : (featured ? "rgba(255,255,255,0.2)" : "#c7ccc9") }}>
                      {included ? <Icon.check /> : <Icon.cross />}
                    </span>
                    <span style={{ fontSize: "0.8125rem", lineHeight: 1.5, color: included ? (featured ? "rgba(255,255,255,0.8)" : "var(--ink)") : (featured ? "rgba(255,255,255,0.3)" : "#b6bcb8") }}>{text}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/register"
                style={
                  featured
                    ? { display: "block", textAlign: "center", fontSize: "0.9375rem", fontWeight: 700, padding: "0.875rem", borderRadius: "0.625rem", background: "var(--pine)", color: "#fff", textDecoration: "none" }
                    : { display: "block", textAlign: "center", fontSize: "0.9375rem", fontWeight: 600, padding: "0.875rem", borderRadius: "0.625rem", background: "var(--paper-soft)", color: "var(--ink)", textDecoration: "none", border: "1px solid var(--line)" }
                }
              >
                {cta} →
              </Link>
            </div>
          ))}
        </div>

        <div className="aa-card" style={{ marginTop: "1.5rem", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap", justifyContent: "center", background: "#fff" }}>
          <span style={{ color: "var(--pine)" }}><Icon.mobile s={18} /></span>
          <p style={{ fontSize: "0.875rem", color: "var(--ink)", fontWeight: 500 }}>
            Personal accounts for patients and independent doctors are <strong>always free</strong> on web and mobile.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Payments strip ─────────────────────────────────────────────────────────
function Payments() {
  const methods = [
    { name: "eSewa", letter: "e", bg: "#0b6e5d" },
    { name: "Khalti", letter: "K", bg: "#5b3fa3" },
    { name: "Bank transfer", letter: "B", bg: "#2a5fa3" },
    { name: "Cash / POS", letter: "₨", bg: "#b9752b" },
  ];
  return (
    <section style={{ background: "var(--paper)", paddingTop: "3.5rem", paddingBottom: "3.5rem", borderTop: "1px solid var(--line)" }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8" style={{ textAlign: "center" }}>
        <p className="aa-mono" style={{ fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--slate)", marginBottom: "1.75rem" }}>
          Built for Nepal's payment ecosystem
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {methods.map(({ name, letter, bg }) => (
            <div key={name} className="aa-card" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem" }}>
              <div style={{ width: 34, height: 34, borderRadius: "0.5rem", background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8125rem", flexShrink: 0 }}>{letter}</div>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ───────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    { quote: "Aastal replaced four different tools we were using for appointments, billing, and staff records. We save two hours a day, easily.", name: "Dr. Suman Shrestha", role: "Owner, Shrestha Dental Clinic", initial: "S" },
    { quote: "I started on Aastal without a clinic behind me. Patients found me, booked directly, and now I decide my own hours.", name: "Dr. Priya Adhikari", role: "Independent physician, Pokhara", initial: "P" },
    { quote: "I moved cities and my new doctor could see my whole history the moment I shared it. No folders, no calling the old clinic.", name: "Anjali Gurung", role: "Patient", initial: "A" },
  ];
  return (
    <section style={{ background: "var(--paper-soft)", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="aa-eyebrow" style={{ justifyContent: "center" }}>Trusted across the room</span>
          <h2 className="aa-serif" style={{ fontWeight: 400, fontSize: "clamp(2rem,4.5vw,2.75rem)", color: "var(--ink)", lineHeight: 1.1 }}>
            From the front desk to the front pocket
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map(({ quote, name, role, initial }) => (
            <div key={name} className="aa-card" style={{ padding: "1.75rem", background: "#fff" }}>
              <div style={{ display: "flex", gap: "2px", marginBottom: "1rem", color: "var(--amber)" }}>
                {[1, 2, 3, 4, 5].map(i => <Icon.star key={i} s={13} />)}
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--ink)", marginBottom: "1.25rem" }}>&ldquo;{quote}&rdquo;</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--pine)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.875rem", flexShrink: 0 }}>{initial}</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--ink)" }}>{name}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--slate)" }}>{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ background: "var(--paper)", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-3xl mx-auto px-5 sm:px-8" style={{ textAlign: "center" }}>
        <div style={{ background: "var(--ink)", borderRadius: "1.5rem", padding: "clamp(2.5rem,5vw,4rem)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 400, height: 200, borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(11,110,93,0.35) 0%, transparent 70%)", pointerEvents: "none" }} />

          <span className="aa-eyebrow" style={{ justifyContent: "center", color: "#7fc9b6" }}>Free for 14 days · no card needed</span>

          <h2 className="aa-serif" style={{ fontWeight: 400, fontSize: "clamp(2rem,5vw,2.875rem)", color: "#fff", lineHeight: 1.1, marginBottom: "1rem" }}>
            Bring your practice — or your care — onto one platform.
          </h2>
          <p style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65, marginBottom: "2rem" }}>
            500+ clinics run their front desk on Aastal. Doctors and patients join free, on web or mobile.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register" className="aa-btn-primary" style={{ minWidth: 200 }}>Start for free <Icon.arrow /></Link>
            <Link href="#pricing" className="aa-btn-outline" style={{ minWidth: 170, color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}>View pricing</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "var(--paper)", borderTop: "1px solid var(--line)", paddingTop: "3.5rem", paddingBottom: "3.5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10" style={{ marginBottom: "2.5rem" }}>
          <div style={{ gridColumn: "span 2 / span 2" }} className="md:col-span-2">
            <div style={{ marginBottom: "1rem" }}><Logo /></div>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.65, color: "var(--slate)", marginBottom: "0.75rem", maxWidth: 260 }}>
              One platform for clinics, doctors, and patients — on web, desktop, and mobile.
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--slate)" }}>Made in Nepal 🇳🇵</p>
          </div>

          {[
            { heading: "Platform", links: ["Web dashboard", "Desktop app", "Mobile app", "Pricing"] },
            { heading: "Company", links: ["About us", "Blog", "Contact"] },
            { heading: "Legal", links: ["Privacy policy", "Terms of service", "Security"] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "1rem" }}>{heading}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {links.map(link => (
                  <li key={link}>
                    <Link href="#" style={{ fontSize: "0.8125rem", color: "var(--slate)", textDecoration: "none" }}>{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3" style={{ paddingTop: "2rem", borderTop: "1px solid var(--line)" }}>
          <p style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>© 2026 Aastal. All rights reserved.</p>
          <p style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>One record, every screen.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: "var(--paper)" }}>
      <Nav />
      <Hero />
      <Stats />
      <PlatformShowcase />
      <AudienceTabs />
      <HowItWorks />
      <Pricing />
      {/* <Payments /> */}
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}