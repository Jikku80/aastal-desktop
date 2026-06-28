"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

// ─── Styles ───────────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  html { scroll-behavior: smooth; }

  .ck-nav-link {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    color: rgba(255,255,255,0.5);
    transition: color 0.2s, background 0.2s;
    text-decoration: none;
  }
  .ck-nav-link:hover { color: #fff; background: rgba(255,255,255,0.06); }

  .ck-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 2rem;
    border-radius: 0.75rem;
    font-weight: 700;
    font-size: 0.9375rem;
    color: #fff;
    background: #0e9de8;
    border: none;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
    text-decoration: none;
    box-shadow: 0 4px 18px rgba(14,157,232,0.3);
  }
  .ck-btn-primary:hover {
    background: #0b8acc;
    box-shadow: 0 6px 28px rgba(14,157,232,0.45);
    transform: translateY(-1px);
  }

  .ck-btn-outline-dark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 2rem;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.9375rem;
    color: rgba(255,255,255,0.65);
    background: transparent;
    border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s, transform 0.15s;
    text-decoration: none;
  }
  .ck-btn-outline-dark:hover {
    color: #fff;
    border-color: rgba(255,255,255,0.28);
    transform: translateY(-1px);
  }

  .ck-btn-outline-light {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 2rem;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.9375rem;
    color: #374151;
    background: transparent;
    border: 1px solid #d1d5db;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s, background 0.2s;
    text-decoration: none;
  }
  .ck-btn-outline-light:hover {
    color: #111827;
    border-color: #9ca3af;
    background: #f9fafb;
  }

  .feature-card {
    border-radius: 1rem;
    padding: 1.75rem;
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .feature-card-light {
    background: #ffffff;
    border: 1px solid #e5e7eb;
  }
  .feature-card-light:hover {
    border-color: rgba(14,157,232,0.3);
    box-shadow: 0 4px 24px rgba(14,157,232,0.08);
  }
  .feature-card-dark {
    background: #111827;
    border: 1px solid rgba(255,255,255,0.07);
  }
  .feature-card-dark:hover {
    border-color: rgba(14,157,232,0.2);
  }

  .pricing-card {
    border-radius: 1.25rem;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    transition: box-shadow 0.2s;
  }

  .testimonial-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 1rem;
    padding: 1.75rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .testimonial-card:hover {
    border-color: rgba(14,157,232,0.25);
    box-shadow: 0 4px 20px rgba(14,157,232,0.07);
  }

  .step-line {
    position: absolute;
    top: 2rem;
    left: calc(100% - 0.5rem);
    width: calc(100% - 1rem);
    height: 1px;
    background: linear-gradient(90deg, #0e9de8, transparent);
    pointer-events: none;
  }

  .mockup-tilt {
    transform: perspective(1200px) rotateX(8deg) scale(0.97);
    transform-origin: top center;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 48px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07);
  }

  @media (max-width: 640px) {
    .mockup-tilt { transform: none; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
  }

  .section-eyebrow {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #0e9de8;
    display: block;
    margin-bottom: 0.75rem;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }
`;

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        let start = 0;
        const duration = 1400;
        const steps = 50;
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

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(7,9,17,0.97)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" style={{ textDecoration: "none" }}>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "#0e9de8" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#fff", letterSpacing: "-0.02em" }}>
              Clinic<span style={{ color: "#0e9de8" }}>Karobar</span>
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ label, href }) => (
              <a key={label} href={href} className="ck-nav-link">{label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="ck-nav-link">Sign in</Link>
            <Link href="/auth/register" className="ck-btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem", borderRadius: "0.625rem" }}>
              Start free trial
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 rounded-lg"
            style={{ color: "rgba(255,255,255,0.6)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div style={{ background: "#070911", borderTop: "1px solid rgba(255,255,255,0.07)" }} className="md:hidden px-5 py-4">
            {links.map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMobileOpen(false)}
                className="block text-sm py-3"
                style={{ color: "rgba(255,255,255,0.55)", borderBottom: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}
              >{label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-4">
              <Link href="/auth/login"
                className="text-center text-sm py-3 rounded-xl"
                style={{ color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                Sign in
              </Link>
              <Link href="/auth/register" className="ck-btn-primary" style={{ borderRadius: "0.75rem", justifyContent: "center" }}>
                Start free trial
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "#070911",
        paddingTop: "6rem",
        paddingBottom: "0",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Subtle radial highlight — single, restrained */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-160px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "560px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(14,157,232,0.12) 0%, transparent 68%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 text-center flex-1 flex flex-col items-center justify-center py-16 sm:py-20">

        {/* Eyebrow pill */}
        <div
          className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "rgba(14,157,232,0.08)",
            border: "1px solid rgba(14,157,232,0.18)",
            color: "#5bbfe8",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0e9de8", display: "inline-block" }} />
          Trusted by 500+ clinics across Nepal
        </div>

        {/* Headline */}
        <h1
          style={{
            fontWeight: 900,
            fontSize: "clamp(2.4rem, 7.5vw, 5.25rem)",
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            color: "#fff",
            marginBottom: "1.5rem",
            maxWidth: "820px",
          }}
        >
          The clinic platform<br />
          <span
            style={{
              background: "linear-gradient(92deg, #38b8f8 10%, #0e9de8 55%, #0272c0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            built for Nepal.
          </span>
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            color: "rgba(255,255,255,0.45)",
            maxWidth: "600px",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
          }}
        >
          Appointments, patients, billing, staff, and branches — all unified.
          With eSewa & Khalti, VAT invoicing, and multi-branch support built in.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6" style={{ width: "100%" }}>
          <Link href="/auth/register" className="ck-btn-primary" style={{ minWidth: 200 }}>
            Get started free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
          <Link href="#pricing" className="ck-btn-outline-dark" style={{ minWidth: 160 }}>
            View pricing
          </Link>
        </div>

        {/* Trust row */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mb-16">
          {["14-day free trial", "No credit card needed", "Nepal-based support", "eSewa & Khalti"].map(t => (
            <div key={t} className="flex items-center gap-1.5" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0e9de8" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {t}
            </div>
          ))}
        </div>

        {/* Mockup — tilted perspective */}
        <div className="mockup-tilt w-full" style={{ maxWidth: "900px", marginLeft: "auto", marginRight: "auto" }}>
          {/* Browser chrome */}
          <div style={{ background: "#0f1221" }}>
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex gap-1.5">
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "rgba(239,68,68,0.45)" }} />
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "rgba(245,158,11,0.45)" }} />
                <div style={{ width: 11, height: 11, borderRadius: "50%", background: "rgba(16,185,129,0.45)" }} />
              </div>
              <div
                className="flex-1 mx-3 rounded-md px-3 py-1 text-xs text-center"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.22)", maxWidth: 280, margin: "0 auto" }}
              >
                app.clinickarobar.com/dashboard
              </div>
            </div>

            {/* Dashboard UI */}
            <div style={{ padding: "1.25rem 1.25rem 0" }}>
              {/* Top row: stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Today's Appointments", value: "24", color: "#0e9de8" },
                  { label: "Active Patients", value: "1,284", color: "#10b981" },
                  { label: "Monthly Revenue", value: "₨ 2.4L", color: "#f59e0b" },
                  { label: "Pending Billing", value: "₨ 18,400", color: "#f87171" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${color}22`,
                      borderRadius: "0.75rem",
                      padding: "0.875rem",
                      textAlign: "left",
                    }}
                  >
                    <p style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                    <p style={{ fontSize: "1.125rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Appointment table */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "0.75rem", overflow: "hidden" }}>
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>Today's Appointments</p>
                  <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: "rgba(14,157,232,0.12)", color: "#0e9de8" }}>Live</span>
                </div>
                <div>
                  {[
                    { time: "09:00", name: "Ramesh Sharma", type: "Consultation", status: "Confirmed", sc: "rgba(14,157,232,0.12)", tc: "#38b8f8" },
                    { time: "10:30", name: "Sita Thapa", type: "Root Canal", status: "In Progress", sc: "rgba(245,158,11,0.12)", tc: "#f59e0b" },
                    { time: "11:00", name: "Bikash Karki", type: "Cleaning", status: "Scheduled", sc: "rgba(255,255,255,0.07)", tc: "rgba(255,255,255,0.4)" },
                    { time: "02:00", name: "Anita Rai", type: "X-Ray", status: "Pending", sc: "rgba(255,255,255,0.04)", tc: "rgba(255,255,255,0.3)" },
                  ].map(({ time, name, type, status, sc, tc }, i) => (
                    <div
                      key={name}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{
                        fontSize: "0.75rem",
                        borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}
                    >
                      <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.25)", width: 36, flexShrink: 0 }}>{time}</span>
                      <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)", flex: 1 }}>{name}</span>
                      <span className="hidden sm:block" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{type}</span>
                      <span style={{ flexShrink: 0, fontSize: "0.625rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: sc, color: tc }}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Bottom fade */}
              <div style={{ height: "3.5rem", background: "linear-gradient(to top, #0f1221, transparent)", marginTop: "-1rem", position: "relative", zIndex: 2 }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section style={{ background: "#f7f8fc", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
      <div
        className="max-w-5xl mx-auto px-5 sm:px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-8"
        style={{ textAlign: "center" }}
      >
        {[
          { val: 500, suffix: "+", label: "Clinics on ClinicKarobar" },
          { val: 98000, suffix: "+", label: "Appointments booked" },
          { val: 99, suffix: "%", label: "Uptime guaranteed" },
          { val: 3, suffix: "", label: "Payment gateways" },
        ].map(({ val, suffix, label }) => (
          <div key={label}>
            <div style={{ fontSize: "clamp(1.75rem,5vw,2.5rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#0e9de8", lineHeight: 1, marginBottom: "0.375rem" }}>
              <Counter end={val} suffix={suffix} />
            </div>
            <p style={{ fontSize: "0.8125rem", color: "#6b7280", fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      title: "Smart Appointments",
      desc: "Patients book online 24/7 across all branches. Automatic SMS reminders cut no-shows. Real-time availability per doctor and location.",
      tags: ["Online booking", "SMS reminders", "Multi-branch"],
      color: "#0e9de8",
      large: true,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: "Patient Management",
      desc: "Full patient profiles, treatment history, clinical records, and file uploads — instantly searchable across your entire base.",
      tags: ["Medical history", "Clinical records", "File uploads"],
      color: "#10b981",
      large: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      ),
      title: "Billing & Invoicing",
      desc: "VAT-compliant invoices in seconds. Accept eSewa, Khalti, bank transfer, or cash.",
      tags: ["eSewa & Khalti", "VAT invoices", "Partial payments"],
      color: "#f59e0b",
      large: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      title: "Multi-Branch Control",
      desc: "Run one clinic or ten. Each branch has its own staff, appointments, and reports. Owners see everything; staff see only their branch.",
      tags: ["Branch analytics", "Role-based access", "Unified view"],
      color: "#8b5cf6",
      large: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      title: "Staff & HR Tools",
      desc: "Shifts, attendance, leave requests, commissions, and role-based permissions for every team member.",
      tags: ["Shift management", "Leave & attendance", "Commissions"],
      color: "#f97316",
      large: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      title: "Analytics & Reports",
      desc: "Revenue trends, appointment heatmaps, patient growth, doctor performance, and branch-wise P&L. Export to PDF anytime.",
      tags: ["Revenue analytics", "Patient trends", "PDF export"],
      color: "#ec4899",
      large: true,
    },
  ];

  return (
    <section id="features" style={{ background: "#f7f8fc", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div style={{ marginBottom: "3rem" }}>
          <span className="section-eyebrow">Everything you need</span>
          <h2 style={{ fontWeight: 900, fontSize: "clamp(1.875rem,5vw,3rem)", letterSpacing: "-0.035em", color: "#0f172a", lineHeight: 1.1, marginBottom: "0.875rem" }}>
            One platform. Zero chaos.
          </h2>
          <p style={{ fontSize: "1.0625rem", color: "#6b7280", maxWidth: 480 }}>
            Replace your spreadsheets, paper files, and five different apps with one beautifully simple system.
          </p>
        </div>

        {/* Bento-ish grid: pairs of [large | small small] */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {/* Row 1: large left, two smalls right */}
          <div className="feature-card feature-card-light" style={{ gridColumn: "span 1", gridRow: "span 2", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ width: 44, height: 44, borderRadius: "0.75rem", background: `rgba(14,157,232,0.08)`, color: "#0e9de8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                {features[0].icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: "#0f172a", marginBottom: "0.625rem" }}>{features[0].title}</h3>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.65, marginBottom: "1.25rem" }}>{features[0].desc}</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {features[0].tags.map(tag => (
                <span key={tag} style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "4px 10px", borderRadius: "0.5rem", background: "rgba(14,157,232,0.07)", color: "#0e9de8" }}>{tag}</span>
              ))}
            </div>
          </div>

          {[1, 2].map(i => (
            <div key={i} className="feature-card feature-card-light" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ width: 40, height: 40, borderRadius: "0.625rem", background: `${features[i].color}12`, color: features[i].color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                  {features[i].icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a", marginBottom: "0.5rem" }}>{features[i].title}</h3>
                <p style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: 1.6, marginBottom: "1rem" }}>{features[i].desc}</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {features[i].tags.map(tag => (
                  <span key={tag} style={{ fontSize: "0.625rem", fontWeight: 600, padding: "3px 8px", borderRadius: "0.375rem", background: `${features[i].color}10`, color: features[i].color }}>{tag}</span>
                ))}
              </div>
            </div>
          ))}

          {/* Row 2: two smalls left, large right */}
          {[3, 4].map(i => (
            <div key={i} className="feature-card feature-card-light" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ width: 40, height: 40, borderRadius: "0.625rem", background: `${features[i].color}12`, color: features[i].color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                  {features[i].icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a", marginBottom: "0.5rem" }}>{features[i].title}</h3>
                <p style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: 1.6, marginBottom: "1rem" }}>{features[i].desc}</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {features[i].tags.map(tag => (
                  <span key={tag} style={{ fontSize: "0.625rem", fontWeight: 600, padding: "3px 8px", borderRadius: "0.375rem", background: `${features[i].color}10`, color: features[i].color }}>{tag}</span>
                ))}
              </div>
            </div>
          ))}

          <div className="feature-card feature-card-light" style={{ gridColumn: "span 1", gridRow: "span 1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ width: 44, height: 44, borderRadius: "0.75rem", background: `rgba(236,72,153,0.08)`, color: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                {features[5].icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: "#0f172a", marginBottom: "0.625rem" }}>{features[5].title}</h3>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.65, marginBottom: "1.25rem" }}>{features[5].desc}</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {features[5].tags.map(tag => (
                <span key={tag} style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "4px 10px", borderRadius: "0.5rem", background: "rgba(236,72,153,0.07)", color: "#ec4899" }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile fallback grid (hidden on md+) */}
        <div className="sm:hidden" style={{ display: "none" }}>
          {features.map(({ icon, title, desc, tags, color }) => (
            <div key={title} className="feature-card feature-card-light" style={{ marginBottom: "0.75rem" }}>
              <div style={{ width: 40, height: 40, borderRadius: "0.625rem", background: `${color}12`, color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                {icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a", marginBottom: "0.5rem" }}>{title}</h3>
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: 1.6, marginBottom: "1rem" }}>{desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {tags.map(tag => (
                  <span key={tag} style={{ fontSize: "0.625rem", fontWeight: 600, padding: "3px 8px", borderRadius: "0.375rem", background: `${color}10`, color }}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", title: "Create your clinic", desc: "Register, enter your clinic details, and configure your branches. Takes under 5 minutes." },
    { num: "02", title: "Add staff & services", desc: "Invite your team with role-based permissions. Set up your service list and pricing." },
    { num: "03", title: "Start taking bookings", desc: "Share your booking link. Patients book; you get notified instantly." },
    { num: "04", title: "Bill & grow", desc: "Issue VAT invoices, accept eSewa/Khalti, and track analytics over time." },
  ];

  return (
    <section id="how" style={{ background: "#070911", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <span className="section-eyebrow">Getting started</span>
          <h2 style={{ fontWeight: 900, fontSize: "clamp(1.875rem,5vw,2.875rem)", letterSpacing: "-0.035em", color: "#fff", lineHeight: 1.1 }}>
            Up and running in minutes
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map(({ num, title, desc }, i) => (
            <div key={num} style={{ position: "relative" }}>
              {i < 3 && <div className="step-line hidden lg:block" />}
              <div
                style={{
                  background: "#0f1221",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.625rem",
                    background: "rgba(14,157,232,0.1)",
                    color: "#0e9de8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    fontWeight: 900,
                    fontSize: "0.8125rem",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {num}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#fff", marginBottom: "0.5rem" }}>{title}</h3>
                <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.65 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Free Trial",
      badge: "14 days",
      price: "Free",
      priceNote: "14-day trial — no renewal",
      yearlyNote: null as string | null,
      description: "Try everything risk-free. All features unlocked, no credit card needed.",
      color: "#6b7280",
      featured: false,
      cta: "Start free trial",
      ctaHref: "/auth/register",
      features: [
        { text: "Dashboard, Appointments, Patients", included: true },
        { text: "Billing & Analytics", included: true },
        { text: "Staff management", included: true },
        { text: "Settings & SMS Reminders", included: true },
        { text: "Notifications", included: true },
        { text: "Expires after 14 days", included: true },
        { text: "Website Builder", included: false },
        { text: "API Access", included: false },
      ],
    },
    {
      name: "Pro",
      badge: "Most Popular",
      price: billing === "monthly" ? "NPR 1,500" : "NPR 16,500",
      priceNote: billing === "monthly" ? "per month · 1 branch" : "per year · 1 month free",
      yearlyNote: billing === "yearly" ? "Save NPR 1,500/yr" : null,
      description: "Everything a growing clinic needs, with per-branch pricing that scales with you.",
      color: "#0e9de8",
      featured: true,
      cta: "Get started",
      ctaHref: "/auth/register",
      features: [
        { text: "Dashboard & Appointments", included: true },
        { text: "Patients & Billing", included: true },
        { text: "Analytics & Staff", included: true },
        { text: "Attendance & Leave", included: true },
        { text: "Settings & SMS Reminders", included: true },
        { text: "Notifications", included: true },
        { text: "+ NPR 500/mo per extra branch", included: true },
        { text: "Website Builder", included: false },
        { text: "API Access", included: false },
      ],
    },
    {
      name: "Enterprise",
      badge: "Full power",
      price: billing === "monthly" ? "NPR 2,500" : "NPR 27,500",
      priceNote: billing === "monthly" ? "per month · 1 branch" : "per year · 1 month free",
      yearlyNote: billing === "yearly" ? "Save NPR 2,500/yr" : null,
      description: "For multi-branch clinics that need a website, API integrations, and priority support.",
      color: "#8b5cf6",
      featured: false,
      cta: "Get started",
      ctaHref: "/auth/register",
      features: [
        { text: "Everything in Pro", included: true },
        { text: "NPR 2,500/mo for 1 branch", included: true },
        { text: "+ NPR 500/mo per extra branch", included: true },
        { text: "Website Builder", included: true },
        { text: "API Access", included: true },
        { text: "Priority support", included: true },
      ],
    },
  ];

  return (
    <section id="pricing" style={{ background: "#f7f8fc", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="section-eyebrow">Simple pricing</span>
          <h2 style={{ fontWeight: 900, fontSize: "clamp(1.875rem,5vw,3rem)", letterSpacing: "-0.035em", color: "#0f172a", lineHeight: 1.1, marginBottom: "0.75rem" }}>
            Plans for every clinic
          </h2>
          <p style={{ fontSize: "1.0625rem", color: "#6b7280", maxWidth: 420, margin: "0 auto 1.75rem" }}>
            Start free, scale as you grow. No hidden fees.
          </p>

          {/* Billing toggle */}
          <div
            className="inline-flex items-center rounded-xl p-1 gap-1"
            style={{ background: "#fff", border: "1px solid #e5e7eb" }}
          >
            {(["monthly", "yearly"] as const).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "0.625rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: billing === b ? "#0e9de8" : "transparent",
                  color: billing === b ? "#fff" : "#6b7280",
                  transition: "background 0.2s, color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "2px 7px", borderRadius: "0.375rem", background: billing === "yearly" ? "rgba(255,255,255,0.2)" : "rgba(16,185,129,0.12)", color: billing === "yearly" ? "#fff" : "#10b981" }}>
                    1 month free
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {plans.map(({ name, badge, price, priceNote, yearlyNote, description, color, featured, cta, ctaHref, features }) => (
            <div
              key={name}
              className="pricing-card"
              style={{
                background: featured ? "#0f172a" : "#fff",
                border: featured ? `1px solid rgba(14,157,232,0.25)` : "1px solid #e5e7eb",
                boxShadow: featured ? "0 8px 40px rgba(14,157,232,0.15)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <span style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "0.5rem",
                  background: featured ? "rgba(14,157,232,0.15)" : "#f3f4f6",
                  color: featured ? "#38b8f8" : "#6b7280",
                }}>
                  {badge}
                </span>
                {featured && (
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "4px 10px", borderRadius: "0.5rem", background: "rgba(14,157,232,0.12)", color: "#0e9de8" }}>
                    ★ Popular
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: featured ? "#fff" : "#0f172a", marginBottom: "0.375rem", letterSpacing: "-0.02em" }}>{name}</h3>
              <p style={{ fontSize: "0.8125rem", color: featured ? "rgba(255,255,255,0.4)" : "#9ca3af", lineHeight: 1.6, marginBottom: "1.25rem" }}>{description}</p>

              <div style={{ marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "clamp(1.5rem,4vw,2rem)", fontWeight: 900, color: featured ? "#0e9de8" : "#0f172a", letterSpacing: "-0.04em" }}>
                  {price}
                </span>
                {name !== "Free Trial" && (
                  <span style={{ fontSize: "0.8125rem", color: featured ? "rgba(255,255,255,0.3)" : "#9ca3af", marginLeft: "0.25rem" }}>/mo</span>
                )}
              </div>
              <p style={{ fontSize: "0.75rem", color: featured ? "rgba(255,255,255,0.3)" : "#9ca3af", marginBottom: "0.25rem" }}>{priceNote}</p>
              {yearlyNote && (
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#10b981", marginBottom: "1rem" }}>✓ {yearlyNote}</p>
              )}

              <div style={{ borderTop: featured ? "1px solid rgba(255,255,255,0.07)" : "1px solid #f3f4f6", margin: "1.25rem 0" }} />

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {features.map(({ text, included }) => (
                  <li key={text} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                    {included
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }} stroke={featured ? "#0e9de8" : color}><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={featured ? "rgba(255,255,255,0.15)" : "#d1d5db"} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    }
                    <span style={{
                      fontSize: "0.8125rem",
                      lineHeight: 1.5,
                      color: included
                        ? (featured ? "rgba(255,255,255,0.7)" : "#374151")
                        : (featured ? "rgba(255,255,255,0.2)" : "#d1d5db"),
                    }}>
                      {text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={ctaHref}
                style={
                  featured
                    ? { display: "block", textAlign: "center", fontSize: "0.9375rem", fontWeight: 700, padding: "0.875rem", borderRadius: "0.75rem", background: "#0e9de8", color: "#fff", textDecoration: "none", boxShadow: "0 4px 16px rgba(14,157,232,0.35)", transition: "background 0.2s" }
                    : { display: "block", textAlign: "center", fontSize: "0.9375rem", fontWeight: 600, padding: "0.875rem", borderRadius: "0.75rem", background: "#f9fafb", color: "#374151", textDecoration: "none", border: "1px solid #e5e7eb", transition: "background 0.2s" }
                }
              >
                {cta} →
              </Link>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.75rem", marginTop: "1.5rem", color: "#9ca3af" }}>
          All plans · NPR currency · VAT-compliant invoicing · eSewa & Khalti · Nepal-based support
        </p>
      </div>
    </section>
  );
}

// ─── Payments ─────────────────────────────────────────────────────────────────
function Payments() {
  return (
    <section style={{ background: "#070911", paddingTop: "4rem", paddingBottom: "4rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8" style={{ textAlign: "center" }}>
        <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: "2rem" }}>
          Fully integrated with Nepal's payment ecosystem
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {[
            { name: "eSewa", color: "#4ade80", bg: "#16a34a", letter: "e", textColor: "#fff" },
            { name: "Khalti", color: "#a78bfa", bg: "#5b21b6", letter: "K", textColor: "#fff" },
            { name: "Bank Transfer", color: "#60a5fa", bg: "#1d4ed8", letter: "B", textColor: "#fff" },
            { name: "Cash / POS", color: "#fbbf24", bg: "#b45309", letter: "₨", textColor: "#fff" },
          ].map(({ name, color, bg, letter, textColor }) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem", borderRadius: "0.875rem", background: "#0f1221", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "0.5rem", background: bg, color: textColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.875rem", flexShrink: 0 }}>
                {letter}
              </div>
              <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: color }}>{name}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.25)" }}>
          VAT-compliant invoices · Automatic payment tracking · NPR currency · Partial payments & refunds
        </p>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      quote: "ClinicKarobar replaced 4 different tools we were using. Appointments, billing, staff records — all in one place. We save 2+ hours every day.",
      name: "Dr. Suman Shrestha",
      role: "Owner, Shrestha Dental Clinic, Kathmandu",
      initial: "S",
    },
    {
      quote: "The multi-branch feature is incredible. I manage 3 clinics from my phone. Each branch has its own staff and reports but I see everything in one dashboard.",
      name: "Dr. Priya Adhikari",
      role: "Director, Adhikari Oral Care, Pokhara",
      initial: "P",
    },
    {
      quote: "eSewa and Khalti integration made it worth it alone. No more chasing payments. The VAT invoice feature saves hours for our accountant every month.",
      name: "Bikash Maharjan",
      role: "Manager, Smile Studio, Lalitpur",
      initial: "B",
    },
  ];

  return (
    <section style={{ background: "#f7f8fc", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <span className="section-eyebrow">Loved by clinics</span>
          <h2 style={{ fontWeight: 900, fontSize: "clamp(1.875rem,5vw,2.875rem)", letterSpacing: "-0.035em", color: "#0f172a", lineHeight: 1.1 }}>
            Real results, real clinics
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map(({ quote, name, role, initial }) => (
            <div key={name} className="testimonial-card">
              <div style={{ display: "flex", gap: "2px", marginBottom: "1rem" }}>
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "#374151", marginBottom: "1.25rem", fontStyle: "italic" }}>"{quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0e9de8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.875rem", flexShrink: 0 }}>
                  {initial}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>{name}</p>
                  <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ background: "#070911", paddingTop: "5rem", paddingBottom: "5rem" }}>
      <div className="max-w-3xl mx-auto px-5 sm:px-8" style={{ textAlign: "center" }}>
        <div
          style={{
            background: "#0f1221",
            border: "1px solid rgba(14,157,232,0.14)",
            borderRadius: "1.5rem",
            padding: "clamp(2.5rem,5vw,4rem)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle top-center accent */}
          <div style={{
            position: "absolute",
            top: -80,
            left: "50%",
            transform: "translateX(-50%)",
            width: 400,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(14,157,232,0.10) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full"
            style={{ background: "rgba(14,157,232,0.08)", border: "1px solid rgba(14,157,232,0.15)", fontSize: "0.75rem", fontWeight: 600, color: "#5bbfe8" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0e9de8", display: "inline-block" }} />
            Free for 14 days — no credit card needed
          </div>

          <h2
            style={{
              fontWeight: 900,
              fontSize: "clamp(1.875rem,5vw,2.875rem)",
              letterSpacing: "-0.035em",
              color: "#fff",
              lineHeight: 1.1,
              marginBottom: "1rem",
            }}
          >
            Ready to modernise<br />your clinic?
          </h2>
          <p style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.65, marginBottom: "2rem" }}>
            Join 500+ Nepali clinics running on ClinicKarobar. Setup takes less than 5 minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register" className="ck-btn-primary" style={{ minWidth: 200 }}>
              Start for free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <Link href="#pricing" className="ck-btn-outline-dark" style={{ minWidth: 160 }}>
              View pricing plans
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "#070911", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "3.5rem", paddingBottom: "3.5rem" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10" style={{ marginBottom: "2.5rem" }}>
          <div style={{ gridColumn: "span 2 / span 2" }} className="md:col-span-1">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem", textDecoration: "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: "0.625rem", background: "#0e9de8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>Clinic<span style={{ color: "#0e9de8" }}>Karobar</span></span>
            </Link>
            <p style={{ fontSize: "0.8125rem", lineHeight: 1.65, color: "rgba(255,255,255,0.28)", marginBottom: "0.75rem" }}>
              The complete platform for modern Nepali clinics.
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.18)" }}>Made with ♥ in Nepal 🇳🇵</p>
          </div>

          {[
            { heading: "Product", links: ["Features", "Pricing", "Changelog"] },
            { heading: "Company", links: ["About Us", "Blog", "Contact"] },
            { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "Security"] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fff", marginBottom: "1rem" }}>{heading}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {links.map(link => (
                  <li key={link}>
                    <Link href="#" style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.65)"}
                      onMouseLeave={e => (e.target as HTMLElement).style.color = "rgba(255,255,255,0.28)"}
                    >{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.18)" }}>© 2026 ClinicKarobar. All rights reserved.</p>
          <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.18)" }}>Empowering Nepali healthcare, one clinic at a time</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Pricing />
      <Payments />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}