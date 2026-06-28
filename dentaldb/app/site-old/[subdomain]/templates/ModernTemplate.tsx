import { SiteData, DAYS, DAY_SHORT, fmtHours, getTodayKey, isVisible, getOpeningHours } from './types';

export default function ModernTemplate({ data }: { data: SiteData }) {
  const { content, theme, clinic } = data;
  const P  = theme.primaryColor   || '#0e9de8';
  const S  = theme.secondaryColor || '#1a1d27';
  const A  = theme.accentColor    || '#38b6f8';
  const FH = theme.fontHeading    || 'Georgia';
  const FB = theme.fontBody       || 'system-ui';
  const hours  = getOpeningHours(data);
  const today  = getTodayKey();
  const vis    = (id: string) => isVisible(data, id);
  const blocks = content._blocks || DAYS.map(d => ({ id: d, visible: true }));
  const orderedSections = ['hero','about','services','team','testimonials','hours','contact']
    .map(id => (content._blocks || []).find((b:any) => b.id === id) || { id, visible: true })
    .filter((b:any) => b.visible !== false);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
    :root { --p:${P}; --s:${S}; --a:${A}; }
    *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; }
    body { font-family:'${FB}',system-ui,sans-serif; background:#080c18; color:#e2e8f0; line-height:1.6; }
    a { color:inherit; text-decoration:none; }
    img { max-width:100%; display:block; }

    /* Nav */
    .nav { position:sticky; top:0; z-index:100; backdrop-filter:blur(24px);
      background:rgba(8,12,24,0.88); border-bottom:1px solid rgba(255,255,255,.06); }
    .nav-inner { max-width:1280px; margin:0 auto; padding:0 28px; height:68px;
      display:flex; align-items:center; justify-content:space-between; }
    .logo { font-family:'${FH}',serif; font-size:20px; font-weight:800; display:flex; align-items:center; gap:10px; }
    .logo-text { background:linear-gradient(135deg,#fff 0%,${A} 100%);
      -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .logo-dot { width:8px; height:8px; border-radius:50%; background:${P};
      box-shadow:0 0 12px ${P}; flex-shrink:0; animation:glow 2s ease-in-out infinite; }
    @keyframes glow { 0%,100%{box-shadow:0 0 8px ${P}} 50%{box-shadow:0 0 20px ${P},0 0 40px ${P}44} }
    .nav-links { display:flex; align-items:center; gap:2px; }
    .nav-links a { color:rgba(255,255,255,.55); font-size:14px; font-weight:500;
      padding:8px 16px; border-radius:10px; transition:.2s; }
    .nav-links a:hover { color:#fff; background:rgba(255,255,255,.07); }
    .nav-cta { background:${P}!important; color:#fff!important; border-radius:999px!important;
      font-weight:600!important; box-shadow:0 0 24px ${P}44!important; }
    .nav-cta:hover { opacity:.9!important; transform:translateY(-1px)!important; }
    .nav-toggle { display:none; background:none; border:1px solid rgba(255,255,255,.1);
      cursor:pointer; padding:6px; color:#fff; border-radius:10px; width:38px; height:38px;
      align-items:center; justify-content:center; }
    .nav-mobile { display:none; position:absolute; top:68px; left:0; right:0;
      background:rgba(8,12,24,.97); backdrop-filter:blur(20px); padding:16px;
      border-bottom:1px solid rgba(255,255,255,.06); z-index:99; }
    .nav-mobile.open { display:block; }
    .nav-mobile a { display:block; color:rgba(255,255,255,.6); padding:13px 16px;
      border-radius:12px; font-size:15px; margin-bottom:4px; transition:.15s; }
    .nav-mobile a:hover { background:rgba(255,255,255,.06); color:#fff; }
    .nav-mobile .nav-cta { background:${P}!important; color:#fff!important; text-align:center; margin-top:8px; }

    /* Hero */
    .hero { min-height:100vh; display:flex; align-items:center; position:relative;
      overflow:hidden; background:radial-gradient(ellipse 100% 80% at 60% 20%,${S}dd 0%,#080c18 70%); }
    .hero-grid { position:absolute; inset:0;
      background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
      background-size:64px 64px; pointer-events:none; }
    .hero-glow { position:absolute; width:600px; height:600px; border-radius:50%;
      background:${P}; opacity:.08; filter:blur(100px); top:-100px; right:-50px; pointer-events:none; }
    .hero-inner { max-width:1280px; margin:0 auto; padding:100px 28px 80px;
      display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center;
      position:relative; width:100%; }
    .hero-badge { display:inline-flex; align-items:center; gap:8px;
      background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
      color:${A}; padding:7px 18px; border-radius:999px; font-size:12px; font-weight:600;
      letter-spacing:.06em; text-transform:uppercase; margin-bottom:28px; }
    .hero-badge-pulse { width:7px; height:7px; border-radius:50%; background:${P};
      animation:pulse 2s infinite; }
    @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(.8);opacity:.5} }
    .hero h1 { font-family:'${FH}',serif; font-size:clamp(40px,5.5vw,72px);
      font-weight:900; color:#fff; line-height:1.02; letter-spacing:-.03em; margin-bottom:22px; }
    .hero h1 .accent { background:linear-gradient(135deg,${P},${A});
      -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .hero-sub { font-size:17px; color:rgba(255,255,255,.55); line-height:1.8;
      max-width:500px; margin-bottom:40px; }
    .hero-btns { display:flex; flex-wrap:wrap; gap:14px; margin-bottom:56px; }
    .btn-p { display:inline-flex; align-items:center; gap:10px; background:${P};
      color:#fff; padding:15px 34px; border-radius:999px; font-weight:700; font-size:15px;
      transition:.25s; box-shadow:0 8px 32px ${P}44; }
    .btn-p:hover { transform:translateY(-3px); box-shadow:0 16px 48px ${P}66; }
    .btn-s { display:inline-flex; align-items:center; gap:10px;
      background:rgba(255,255,255,.06); color:#fff; padding:15px 34px; border-radius:999px;
      font-weight:600; font-size:15px; border:1px solid rgba(255,255,255,.12); transition:.25s;
      backdrop-filter:blur(10px); }
    .btn-s:hover { background:rgba(255,255,255,.1); transform:translateY(-2px); }
    .stats { display:flex; gap:44px; padding-top:40px; border-top:1px solid rgba(255,255,255,.08); }
    .stat-n { font-family:'${FH}',serif; font-size:34px; font-weight:900; line-height:1;
      background:linear-gradient(135deg,#fff,${A}); -webkit-background-clip:text;
      -webkit-text-fill-color:transparent; background-clip:text; }
    .stat-l { font-size:11px; color:rgba(255,255,255,.35); margin-top:5px;
      text-transform:uppercase; letter-spacing:.08em; }
    .hero-orb { display:flex; justify-content:center; align-items:center; position:relative; }
    .orb-wrap { width:400px; height:400px; position:relative; }
    .orb-ring { position:absolute; border-radius:50%; border:1px solid ${P}33;
      animation:spin 20s linear infinite; }
    .orb-ring:nth-child(1) { inset:0; }
    .orb-ring:nth-child(2) { inset:50px; animation-duration:15s; animation-direction:reverse; border-color:${P}22; }
    .orb-ring:nth-child(3) { inset:100px; animation-duration:10s; border-color:${P}15; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .orb-core { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
    .orb-center { width:180px; height:180px; border-radius:50%;
      background:linear-gradient(135deg,${P},${S});
      box-shadow:0 0 80px ${P}44, inset 0 0 40px rgba(255,255,255,.1);
      display:flex; align-items:center; justify-content:center; }
    .orb-icon { width:72px; height:72px; color:#fff; opacity:.9; }

    /* Sections */
    .section { padding:96px 28px; }
    .section-inner { max-width:1280px; margin:0 auto; }
    .sec-alt { background:rgba(255,255,255,.018); }
    .eyebrow { font-size:11px; font-weight:700; color:${P}; text-transform:uppercase;
      letter-spacing:.14em; margin-bottom:14px; display:flex; align-items:center; gap:10px; }
    .eyebrow::before { content:''; width:28px; height:1px; background:${P}; }
    .sec-h { font-family:'${FH}',serif; font-size:clamp(28px,3.5vw,46px);
      font-weight:900; color:#fff; line-height:1.1; letter-spacing:-.02em; margin-bottom:14px; }
    .sec-p { font-size:16px; color:rgba(255,255,255,.45); line-height:1.75; max-width:560px; }
    .sec-head { display:flex; flex-direction:column; align-items:flex-start; }
    .sec-head.center { align-items:center; text-align:center; margin:0 auto 52px; max-width:600px; }

    /* Cards */
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));
      gap:20px; margin-top:52px; }
    .card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
      border-radius:20px; padding:28px; transition:.3s; position:relative; overflow:hidden;
      backdrop-filter:blur(8px); }
    .card::after { content:''; position:absolute; inset:0;
      background:linear-gradient(135deg,${P}0a,transparent 60%); opacity:0; transition:.3s; }
    .card:hover { transform:translateY(-6px); border-color:${P}44;
      box-shadow:0 24px 60px rgba(0,0,0,.4); }
    .card:hover::after { opacity:1; }
    .card-ico { width:52px; height:52px; border-radius:14px;
      background:linear-gradient(135deg,${P},${S}); display:flex; align-items:center;
      justify-content:center; margin-bottom:22px; color:#fff;
      box-shadow:0 8px 20px ${P}33; position:relative; z-index:1; }
    .card-ico svg { width:24px; height:24px; }
    .card h3 { font-family:'${FH}',serif; font-size:18px; font-weight:700; color:#fff;
      margin-bottom:8px; position:relative; z-index:1; }
    .card p { font-size:14px; color:rgba(255,255,255,.45); line-height:1.65;
      position:relative; z-index:1; }

    /* Team */
    .team-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));
      gap:20px; margin-top:52px; }
    .team-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
      border-radius:22px; overflow:hidden; transition:.3s; text-align:center; }
    .team-card:hover { transform:translateY(-5px); border-color:${P}44;
      box-shadow:0 20px 48px rgba(0,0,0,.35); }
    .team-av { height:150px; background:linear-gradient(135deg,${S},${P});
      display:flex; align-items:center; justify-content:center; font-family:'${FH}',serif;
      font-size:52px; font-weight:900; color:#fff; }
    .team-body { padding:22px; }
    .team-name { font-family:'${FH}',serif; font-size:18px; font-weight:700;
      color:#fff; margin-bottom:4px; }
    .team-role { font-size:11px; color:${A}; font-weight:600; text-transform:uppercase;
      letter-spacing:.08em; margin-bottom:10px; }
    .team-bio { font-size:13px; color:rgba(255,255,255,.4); line-height:1.6; }

    /* Testimonials */
    .testi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr));
      gap:20px; margin-top:52px; }
    .testi { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
      border-radius:20px; padding:28px; transition:.3s; }
    .testi:hover { border-color:${P}33; box-shadow:0 20px 48px rgba(0,0,0,.3); }
    .testi-q { font-size:56px; line-height:1; color:${P}44; font-family:'${FH}',serif;
      height:36px; display:flex; align-items:center; margin-bottom:10px; }
    .testi-text { font-size:15px; color:rgba(255,255,255,.65); line-height:1.8;
      margin-bottom:22px; font-style:italic; }
    .testi-author { display:flex; align-items:center; gap:12px; }
    .testi-av { width:40px; height:40px; border-radius:50%;
      background:linear-gradient(135deg,${P},${S}); display:flex; align-items:center;
      justify-content:center; font-weight:700; color:#fff; font-size:15px; flex-shrink:0; }
    .testi-name { font-weight:700; color:#fff; font-size:14px; }
    .testi-stars { display:flex; gap:2px; margin-top:2px; color:${A}; }
    .testi-stars svg { width:13px; height:13px; fill:currentColor; }

    /* Hours */
    .hours-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));
      gap:12px; margin-top:52px; }
    .hour-row { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
      border-radius:14px; padding:16px 20px; display:flex; justify-content:space-between;
      align-items:center; transition:.2s; }
    .hour-row:hover { background:rgba(255,255,255,.06); }
    .hour-row.today { border-color:${P}55; background:${P}11;
      box-shadow:0 0 24px ${P}18; }
    .hour-day { font-size:14px; font-weight:600; color:#fff; }
    .hour-badge { font-size:9px; font-weight:700; background:${P}; color:#fff;
      padding:2px 8px; border-radius:999px; margin-left:8px; text-transform:uppercase; letter-spacing:.04em; }
    .hour-time { font-size:13px; color:rgba(255,255,255,.4); }
    .hour-time.closed { color:#f87171; font-style:italic; }
    .hour-time.now { color:${A}; font-weight:600; }

    /* CTA */
    .cta { background:linear-gradient(135deg,${S} 0%,${P} 100%); padding:96px 28px;
      text-align:center; position:relative; overflow:hidden; }
    .cta::before { content:''; position:absolute; inset:0;
      background:radial-gradient(ellipse 60% 80% at 50% 50%,rgba(255,255,255,.08),transparent); }
    .cta h2 { font-family:'${FH}',serif; font-size:clamp(32px,4.5vw,54px);
      font-weight:900; color:#fff; margin-bottom:16px; letter-spacing:-.025em; position:relative; }
    .cta p { font-size:18px; color:rgba(255,255,255,.75); max-width:560px;
      margin:0 auto 44px; line-height:1.7; position:relative; }
    .btn-cta { display:inline-flex; align-items:center; gap:10px; background:#fff;
      color:${P}; padding:18px 48px; border-radius:999px; font-weight:800; font-size:16px;
      transition:.25s; box-shadow:0 12px 40px rgba(0,0,0,.25); position:relative; }
    .btn-cta:hover { transform:translateY(-3px); box-shadow:0 20px 60px rgba(0,0,0,.35); }

    /* Contact */
    .contact { background:#080c18; padding:96px 28px; border-top:1px solid rgba(255,255,255,.06); }
    .contact-inner { max-width:1280px; margin:0 auto; }
    .contact-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));
      gap:16px; margin-top:16px; }
    .contact-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
      border-radius:18px; padding:28px; display:flex; flex-direction:column; gap:14px; transition:.2s; }
    .contact-card:hover { background:rgba(255,255,255,.07); border-color:${P}33; }
    .c-ico { width:44px; height:44px; border-radius:12px; background:${P}1a;
      border:1px solid ${P}33; display:flex; align-items:center; justify-content:center; color:${A}; }
    .c-ico svg { width:20px; height:20px; }
    .c-label { font-size:10px; text-transform:uppercase; letter-spacing:.12em;
      color:rgba(255,255,255,.3); font-weight:600; }
    .c-val { font-size:15px; font-weight:600; color:#fff; word-break:break-word; line-height:1.5; }
    .map-wrap { margin-top:32px; border-radius:18px; overflow:hidden; height:320px;
      border:1px solid rgba(255,255,255,.06); }
    .map-wrap iframe { width:100%; height:100%; border:0; }

    /* Footer */
    footer { background:#040710; padding:40px 28px; border-top:1px solid rgba(255,255,255,.05); }
    .foot { max-width:1280px; margin:0 auto; display:flex; flex-direction:column;
      align-items:center; gap:22px; }
    .foot-logo { font-family:'${FH}',serif; font-size:20px; font-weight:800;
      background:linear-gradient(135deg,#fff,${A}); -webkit-background-clip:text;
      -webkit-text-fill-color:transparent; background-clip:text;
      display:flex; align-items:center; gap:10px; }
    .foot-links { display:flex; flex-wrap:wrap; justify-content:center; gap:28px; }
    .foot-links a { color:rgba(255,255,255,.3); font-size:13px; transition:.15s; }
    .foot-links a:hover { color:rgba(255,255,255,.75); }
    .foot-copy { font-size:12px; color:rgba(255,255,255,.18); }
    .foot-copy a { color:rgba(255,255,255,.3); }

    /* Responsive */
    @media(min-width:900px) { .nav-toggle{display:none!important} .nav-links{display:flex!important} }
    @media(max-width:899px) {
      .nav-links{display:none} .nav-toggle{display:flex!important}
      .hero-inner{grid-template-columns:1fr;padding:80px 20px 60px}
      .hero-orb{display:none} .section{padding:64px 20px} .stats{gap:24px}
      .contact{padding:64px 20px} .cta{padding:64px 20px}
    }
    @media(max-width:480px) { .hero-btns{flex-direction:column} .stats{flex-wrap:wrap} }
  `;

  const svgIcons: Record<string, string> = {
    shield:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    zap:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    heart:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    calendar:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    phone:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.5 6.5l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    mail:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    pin:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    clock:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    star:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    tooth:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5C10 3 7 3 5.5 5S4 9.5 5 11c1 1.5 1 3 1 4.5S6.5 20 8 20s2-2 4-2 2.5 2 4 2 2-3 2-4.5 0-3 1-4.5 0-4.5-1.5-6S14 3 12 5.5z"/></svg>`,
    arrow:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    menu:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  };
  const ico = (name: string) => `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%">${svgIcons[name]||svgIcons.tooth}</span>`;
  const featureIcons = ['shield','zap','heart','calendar'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${data.seo?.title||clinic.name}</title>
${content._faviconUrl ? `<link rel="icon" href="${content._faviconUrl}"/>` : ''}
<style>${css}</style>
</head>
<body>

<nav class="nav" id="top">
  <div class="nav-inner">
    <div class="logo">
      ${content._logoUrl
        ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:32px;object-fit:contain"/>`
        : `<div class="logo-dot"></div><span class="logo-text">${clinic.name}</span>`}
    </div>
    <div class="nav-links">
      ${vis('about')&&content.about?.title ? '<a href="#about">About</a>' : ''}
      ${vis('services')&&content.services?.length ? '<a href="#services">Services</a>' : ''}
      ${vis('team')&&content.team?.length ? '<a href="#team">Team</a>' : ''}
      ${vis('testimonials')&&content.testimonials?.length ? '<a href="#testimonials">Reviews</a>' : ''}
      ${vis('hours') ? '<a href="#hours">Hours</a>' : ''}
      <a href="#contact">Contact</a>
      <a href="#contact" class="nav-cta">Book Now</a>
    </div>
    <button class="nav-toggle" id="navToggle" aria-label="Menu">${svgIcons.menu}</button>
  </div>
  <div class="nav-mobile" id="navMobile">
    ${vis('about')&&content.about?.title ? '<a href="#about">About</a>' : ''}
    ${vis('services')&&content.services?.length ? '<a href="#services">Services</a>' : ''}
    ${vis('team')&&content.team?.length ? '<a href="#team">Team</a>' : ''}
    ${vis('testimonials')&&content.testimonials?.length ? '<a href="#testimonials">Reviews</a>' : ''}
    ${vis('hours') ? '<a href="#hours">Hours</a>' : ''}
    <a href="#contact">Contact</a>
    <a href="#contact" class="nav-cta">Book Appointment</a>
  </div>
</nav>
<script>(function(){var b=document.getElementById('navToggle'),m=document.getElementById('navMobile');if(b&&m){b.addEventListener('click',function(){m.classList.toggle('open')});m.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){m.classList.remove('open')})})}})()</script>

${orderedSections.map(block => {
  if (block.id === 'hero') return `
<section class="hero">
  <div class="hero-grid"></div>
  <div class="hero-glow"></div>
  <div class="hero-inner">
    <div>
      <div class="hero-badge">
        <span class="hero-badge-pulse"></span>
        Trusted Dental Care
      </div>
      <h1>${content.hero?.headline || `Expert Dental Care at <span class="accent">${clinic.name}</span>`}</h1>
      <p class="hero-sub">${content.hero?.subheadline || 'Your smile is our priority. Experience gentle, modern dental care tailored for you.'}</p>
      <div class="hero-btns">
        <a href="#contact" class="btn-p">${content.hero?.ctaText || 'Book Appointment'} ${svgIcons.arrow}</a>
        ${vis('about')&&content.about?.title ? '<a href="#about" class="btn-s">Learn More</a>' : ''}
      </div>
      <div class="stats">
        <div><div class="stat-n">10+</div><div class="stat-l">Years Experience</div></div>
        <div><div class="stat-n">5k+</div><div class="stat-l">Happy Patients</div></div>
        <div><div class="stat-n">98%</div><div class="stat-l">Satisfaction</div></div>
      </div>
    </div>
    <div class="hero-orb">
      <div class="orb-wrap">
        <div class="orb-ring"></div>
        <div class="orb-ring"></div>
        <div class="orb-ring"></div>
        <div class="orb-core">
          <div class="orb-center">
            <div class="orb-icon">${svgIcons.tooth}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;

  if (block.id === 'about' && vis('about') && content.about?.title) return `
<section class="section" id="about">
  <div class="section-inner">
    <div class="sec-head" style="max-width:680px;margin-bottom:52px">
      <div class="eyebrow">About Us</div>
      <h2 class="sec-h">${content.about.title}</h2>
      <p class="sec-p">${content.about.description}</p>
    </div>
    <div class="grid" style="margin-top:0">
      ${['Patient-First Care','Advanced Technology','Gentle Approach','Easy Scheduling'].map((t,i) => `
      <div class="card">
        <div class="card-ico">${ico(featureIcons[i])}</div>
        <h3>${t}</h3>
        <p>${['Every treatment plan is tailored to your unique needs and comfort level.','State-of-the-art equipment ensuring precise and comfortable dental care.','We prioritize your comfort and well-being throughout every procedure.','Online and phone booking available six days a week for your convenience.'][i]}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'services' && vis('services') && content.services?.length) return `
<section class="section sec-alt" id="services">
  <div class="section-inner">
    <div class="sec-head center">
      <div class="eyebrow">What We Offer</div>
      <h2 class="sec-h">Our Services</h2>
      <p class="sec-p">Comprehensive dental care from routine check-ups to advanced treatments — all under one roof.</p>
    </div>
    <div class="grid">
      ${content.services.map(s => `
      <div class="card">
        <div class="card-ico">${ico('tooth')}</div>
        <h3>${s.title}</h3>
        <p>${s.description}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'team' && vis('team') && content.team?.length) return `
<section class="section" id="team">
  <div class="section-inner">
    <div class="sec-head center">
      <div class="eyebrow">Meet the Team</div>
      <h2 class="sec-h">Our Dentists & Staff</h2>
      <p class="sec-p">Experienced, compassionate professionals dedicated to your oral health.</p>
    </div>
    <div class="team-grid">
      ${content.team.map(m => `
      <div class="team-card">
        <div class="team-av">${m.name?.[0]?.toUpperCase()||'D'}</div>
        <div class="team-body">
          <div class="team-name">${m.name}</div>
          <div class="team-role">${m.role}</div>
          ${m.bio ? `<div class="team-bio">${m.bio}</div>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'testimonials' && vis('testimonials') && content.testimonials?.length) return `
<section class="section sec-alt" id="testimonials">
  <div class="section-inner">
    <div class="sec-head center">
      <div class="eyebrow">Patient Reviews</div>
      <h2 class="sec-h">What Our Patients Say</h2>
    </div>
    <div class="testi-grid">
      ${content.testimonials.map(t => `
      <div class="testi">
        <div class="testi-q">"</div>
        <p class="testi-text">${t.text}</p>
        <div class="testi-author">
          <div class="testi-av">${t.name?.[0]||'P'}</div>
          <div>
            <div class="testi-name">${t.name}</div>
            <div class="testi-stars">${Array.from({length:Math.min(t.rating||5,5)},()=>`<span style="color:${A}">${svgIcons.star}</span>`).join('')}</div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'hours' && vis('hours')) return `
<section class="section" id="hours">
  <div class="section-inner">
    <div class="sec-head center">
      <div class="eyebrow">Opening Hours</div>
      <h2 class="sec-h">When We're Open</h2>
      <p class="sec-p">Walk-ins welcome during business hours. Call ahead for same-day appointments.</p>
    </div>
    <div class="hours-grid">
      ${DAYS.map(day => {
        const h = hours[day]; const isToday = day===today;
        return `<div class="hour-row${isToday?' today':''}">
          <span class="hour-day">${DAY_SHORT[day]}${isToday?`<span class="hour-badge">Today</span>`:''}</span>
          <span class="hour-time${!h?' closed':isToday?' now':''}">${fmtHours(h)}</span>
        </div>`;
      }).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'contact' && vis('contact')) return `
<div class="cta">
  <h2>Ready to Book Your Visit?</h2>
  <p>Take the first step toward a healthier, brighter smile today.</p>
  <a href="#contact" class="btn-cta">Book Appointment ${svgIcons.arrow}</a>
</div>
<section class="contact" id="contact">
  <div class="contact-inner">
    <div class="sec-head" style="margin-bottom:40px">
      <div class="eyebrow">Get In Touch</div>
      <h2 class="sec-h">Visit Us</h2>
    </div>
    <div class="contact-grid">
      ${(content.contact?.phone||clinic.phone)?`<div class="contact-card"><div class="c-ico">${ico('phone')}</div><div class="c-label">Phone</div><div class="c-val">${content.contact?.phone||clinic.phone}</div></div>`:''}
      ${(content.contact?.email||clinic.email)?`<div class="contact-card"><div class="c-ico">${ico('mail')}</div><div class="c-label">Email</div><div class="c-val">${content.contact?.email||clinic.email}</div></div>`:''}
      ${content.contact?.address?`<div class="contact-card"><div class="c-ico">${ico('pin')}</div><div class="c-label">Address</div><div class="c-val">${content.contact.address}</div></div>`:''}
      ${hours[today]!==undefined?`<div class="contact-card"><div class="c-ico">${ico('clock')}</div><div class="c-label">Today's Hours</div><div class="c-val">${fmtHours(hours[today])}</div></div>`:''}
    </div>
    ${content.contact?.mapEmbed?`<div class="map-wrap"><iframe src="${content.contact.mapEmbed}" allowfullscreen loading="lazy" title="Location"></iframe></div>`:''}
  </div>
</section>`;

  return '';
}).join('')}

${content._offers?.filter((o:any)=>o.showOnHome).length ? `
<section style="background:#0d1117;padding:48px 40px;border-top:1px solid rgba(255,255,255,.06)">
  <div style="max-width:1200px;margin:0 auto">
    <div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.15em;margin-bottom:20px">Current Offers</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
      ${content._offers.filter((o:any)=>o.showOnHome).map((o:any)=>`
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden">
        ${o.bannerUrl?`<img src="${o.bannerUrl}" alt="${o.title}" style="width:100%;height:120px;object-fit:cover;display:block"/>`:`<div style="height:3px;background:${P};border-radius:16px 16px 0 0"></div>`}
        <div style="padding:18px 20px">
          <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px">${o.title}</div>
          <div style="font-size:13px;color:rgba(255,255,255,.45);line-height:1.55">${o.description}</div>
          ${o.validTo?`<div style="font-size:11px;color:${P};margin-top:8px;font-weight:600">Until ${new Date(o.validTo).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</div>`:''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

${(content.gallery||[]).length > 0 ? `
<section style="padding:60px 40px;background:#080c18;border-top:1px solid rgba(255,255,255,.06)">
  <div style="max-width:1200px;margin:0 auto">
    <div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.15em;margin-bottom:20px">Gallery</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px;border-radius:16px;overflow:hidden">
      ${(content.gallery||[]).map((url:string)=>`<div style="aspect-ratio:1/1;overflow:hidden"><img src="${url}" alt="Gallery" style="width:100%;height:100%;object-fit:cover"/></div>`).join('')}
    </div>
  </div>
</section>` : ''}

<footer>
  <div class="foot">
    <div class="foot-logo">
      ${content._logoUrl ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:28px;object-fit:contain"/>` : `<div class="logo-dot"></div>${clinic.name}`}
    </div>
    <div class="foot-links">
      ${vis('about')&&content.about?.title?'<a href="#about">About</a>':''}
      ${vis('services')&&content.services?.length?'<a href="#services">Services</a>':''}
      ${vis('team')&&content.team?.length?'<a href="#team">Team</a>':''}
      ${vis('hours')?'<a href="#hours">Hours</a>':''}
      <a href="#contact">Contact</a>
    </div>
    <p class="foot-copy">© ${new Date().getFullYear()} ${clinic.name}. All rights reserved. · Powered by <a href="https://clinickarobar.app" target="_blank" rel="noopener">ClinicKarobar</a></p>
  </div>
</footer>
</body></html>`;
}
