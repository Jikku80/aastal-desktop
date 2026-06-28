import { SiteData, DAYS, DAY_SHORT, fmtHours, getTodayKey, isVisible, getOpeningHours } from './types';

const ICONS: Record<string,string> = {
  phone:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.5 6.5l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  mail:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  pin:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  star:`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="color:inherit"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  arrow:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  menu:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
};

export default function MinimalTemplate({ data }: { data: SiteData }) {
  const { content, theme, clinic } = data;
  const P  = theme.primaryColor   || '#111827';
  const S  = theme.secondaryColor || '#6b7280';
  const FH = theme.fontHeading    || 'Georgia';
  const FB = theme.fontBody       || 'system-ui';
  const hours = getOpeningHours(data);
  const today = getTodayKey();
  const vis   = (id: string) => isVisible(data, id);
  const orderedSections = ['hero','about','services','team','testimonials','hours','contact']
    .map(id => (content._blocks||[]).find((b:any) => b.id === id) || { id, visible: true })
    .filter((b:any) => b.visible !== false);

  const css = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'${FB}',system-ui,sans-serif;background:#fff;color:#111;line-height:1.6}
    a{color:inherit;text-decoration:none}
    img{max-width:100%;display:block}

    .nav{background:#fff;border-bottom:1px solid #e5e5e5;position:sticky;top:0;z-index:100}
    .nav-inner{max-width:1160px;margin:0 auto;padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between}
    .logo{font-family:'${FH}',serif;font-size:19px;font-weight:700;color:#111;display:flex;align-items:center;gap:10px;letter-spacing:-.015em}
    .logo-cross{width:22px;height:22px;position:relative;flex-shrink:0}
    .logo-cross::before,.logo-cross::after{content:'';position:absolute;background:${P}}
    .logo-cross::before{width:2px;height:100%;left:50%;transform:translateX(-50%)}
    .logo-cross::after{width:100%;height:2px;top:50%;transform:translateY(-50%)}
    .nav-links{display:flex;align-items:center;gap:36px}
    .nav-links a{color:#999;font-size:13px;font-weight:500;padding:4px 0;transition:.15s;border-bottom:1px solid transparent}
    .nav-links a:hover{color:#111;border-bottom-color:#111}
    .nav-cta{background:#111!important;color:#fff!important;padding:9px 22px!important;border-radius:3px!important;border-bottom:none!important}
    .nav-cta:hover{background:${P}!important}
    .nav-toggle{display:none;background:none;border:none;cursor:pointer;color:#111;width:36px;height:36px;align-items:center;justify-content:center;padding:4px}
    .nav-mobile{display:none;position:absolute;top:64px;left:0;right:0;background:#fff;border-bottom:1px solid #e5e5e5;padding:24px 40px;z-index:99}
    .nav-mobile.open{display:block}
    .nav-mobile a{display:block;color:#999;padding:13px 0;font-size:14px;border-bottom:1px solid #f0f0f0}
    .nav-mobile a:last-child{border-bottom:none}
    .nav-mobile .nav-cta{background:#111!important;color:#fff!important;padding:12px 22px!important;text-align:center;margin-top:12px;border-radius:3px!important}

    .hero{min-height:88vh;display:flex;align-items:center;background:#fff;border-bottom:1px solid #e5e5e5}
    .hero-inner{max-width:1160px;margin:0 auto;padding:88px 40px;display:grid;grid-template-columns:1fr 1fr;gap:88px;align-items:center;width:100%}
    .hero-kicker{font-size:11px;font-weight:600;color:#bbb;text-transform:uppercase;letter-spacing:.18em;margin-bottom:28px}
    .hero h1{font-family:'${FH}',serif;font-size:clamp(36px,5vw,68px);font-weight:700;color:#111;line-height:1.04;letter-spacing:-.03em;margin-bottom:28px}
    .hero h1 em{font-style:italic;color:${P}}
    .hero-sub{font-size:17px;color:#888;line-height:1.8;max-width:440px;margin-bottom:44px;padding-left:22px;border-left:2px solid ${P}}
    .hero-btns{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:64px}
    .btn-p{display:inline-flex;align-items:center;gap:9px;background:#111;color:#fff;padding:14px 34px;font-weight:600;font-size:14px;border-radius:3px;transition:.2s}
    .btn-p:hover{background:${P}}
    .btn-s{display:inline-flex;align-items:center;gap:9px;background:transparent;color:#111;padding:13px 33px;font-weight:600;font-size:14px;border:1px solid #ddd;border-radius:3px;transition:.2s}
    .btn-s:hover{border-color:${P};color:${P}}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;padding-top:44px;border-top:1px solid #e5e5e5}
    .stat-n{font-family:'${FH}',serif;font-size:36px;font-weight:700;color:#111;line-height:1;letter-spacing:-.025em}
    .stat-l{font-size:11px;color:#bbb;margin-top:6px;text-transform:uppercase;letter-spacing:.1em}
    .hero-side{border:1px solid #e5e5e5;overflow:hidden}
    .hero-feature{padding:28px;border-bottom:1px solid #e5e5e5;transition:.2s}
    .hero-feature:last-child{border-bottom:none}
    .hero-feature:hover{background:#fafafa}
    .feat-n{font-family:'${FH}',serif;font-size:30px;font-weight:700;color:${P};margin-bottom:7px;line-height:1}
    .feat-t{font-size:13px;color:#999;line-height:1.55}

    .section{padding:88px 40px;border-bottom:1px solid #e5e5e5}
    .section-inner{max-width:1160px;margin:0 auto}
    .alt{background:#fafafa}
    .eyebrow{font-size:10px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px}
    .sec-h{font-family:'${FH}',serif;font-size:clamp(26px,3.5vw,44px);font-weight:700;color:#111;line-height:1.08;letter-spacing:-.03em;margin-bottom:18px}
    .sec-p{font-size:16px;color:#888;line-height:1.75;max-width:520px}
    .center{text-align:center;max-width:600px;margin:0 auto 56px}
    .center .sec-p{margin:0 auto}

    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:1px;margin-top:56px;background:#e5e5e5;border:1px solid #e5e5e5}
    .card{background:#fff;padding:30px;transition:.2s}
    .card:hover{background:#fafafa}
    .card-ico{width:42px;height:42px;border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:center;margin-bottom:22px;color:${P};border-radius:4px;transition:.2s}
    .card:hover .card-ico{border-color:${P}}
    .card h3{font-family:'${FH}',serif;font-size:17px;font-weight:700;color:#111;margin-bottom:8px;letter-spacing:-.01em}
    .card p{font-size:14px;color:#888;line-height:1.65}

    .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:32px;margin-top:56px}
    .team-card{border:1px solid #e5e5e5;overflow:hidden;transition:.2s;text-align:center}
    .team-card:hover{border-color:${P}}
    .team-av{height:150px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-family:'${FH}',serif;font-size:48px;font-weight:700;color:${P};border-bottom:1px solid #e5e5e5}
    .team-body{padding:22px}
    .team-name{font-family:'${FH}',serif;font-size:18px;font-weight:700;color:#111;margin-bottom:4px;letter-spacing:-.01em}
    .team-role{font-size:11px;color:${P};font-weight:600;text-transform:uppercase;letter-spacing:.09em;margin-bottom:10px}
    .team-bio{font-size:13px;color:#888;line-height:1.6}

    .testi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:1px;margin-top:56px;background:#e5e5e5;border:1px solid #e5e5e5}
    .testi{background:#fff;padding:30px;transition:.2s}
    .testi:hover{background:#fafafa}
    .testi-q{font-size:52px;font-family:'${FH}',serif;color:#ddd;line-height:1;height:34px;display:flex;align-items:center;margin-bottom:14px}
    .testi-text{font-size:15px;color:#555;line-height:1.78;margin-bottom:22px}
    .testi-author{display:flex;align-items:center;gap:12px;padding-top:18px;border-top:1px solid #e5e5e5}
    .testi-av{width:36px;height:36px;border:1px solid #e5e5e5;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;color:${P};font-size:14px;flex-shrink:0}
    .testi-name{font-weight:700;color:#111;font-size:14px;font-family:'${FH}',serif}
    .testi-stars{display:flex;gap:2px;margin-top:3px;color:${P}}

    .hours-wrap{margin-top:56px;border:1px solid #e5e5e5;max-width:700px}
    .hour-row{display:flex;justify-content:space-between;align-items:center;padding:15px 28px;border-bottom:1px solid #f0f0f0;transition:.12s}
    .hour-row:last-child{border-bottom:none}
    .hour-row:hover{background:#fafafa}
    .hour-row.today{background:#fafafa}
    .hour-row.today .hour-day{color:${P}}
    .hour-day{font-size:14px;font-weight:600;color:#111}
    .hour-badge{font-size:9px;font-weight:700;background:${P};color:#fff;padding:2px 7px;border-radius:3px;margin-left:9px;text-transform:uppercase;letter-spacing:.05em}
    .hour-time{font-size:13px;color:#888}
    .hour-time.closed{color:#ef4444;font-style:italic}
    .hour-time.now{color:${P};font-weight:600}

    .cta{background:#111;padding:96px 40px;text-align:center}
    .cta h2{font-family:'${FH}',serif;font-size:clamp(30px,4vw,52px);font-weight:700;color:#fff;margin-bottom:16px;letter-spacing:-.025em}
    .cta p{font-size:17px;color:rgba(255,255,255,.5);max-width:500px;margin:0 auto 44px;line-height:1.75}
    .btn-cta{display:inline-flex;align-items:center;gap:10px;background:#fff;color:#111;padding:17px 48px;font-weight:700;font-size:15px;border-radius:3px;transition:.2s}
    .btn-cta:hover{background:${P};color:#fff}

    .contact{background:#fff;padding:88px 40px;border-bottom:1px solid #e5e5e5}
    .contact-inner{max-width:1160px;margin:0 auto}
    .contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:1px;background:#e5e5e5;border:1px solid #e5e5e5;margin-top:16px}
    .contact-card{background:#fff;padding:28px;display:flex;flex-direction:column;gap:12px;transition:.15s}
    .contact-card:hover{background:#fafafa}
    .c-ico{width:40px;height:40px;border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:center;color:${P};border-radius:4px}
    .c-label{font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:#ccc;font-weight:600}
    .c-val{font-size:15px;font-weight:600;color:#111;word-break:break-word;line-height:1.45}
    .map-wrap{margin-top:32px;border:1px solid #e5e5e5;overflow:hidden;height:300px}
    .map-wrap iframe{width:100%;height:100%;border:0}

    footer{background:#fff;padding:40px;border-top:1px solid #e5e5e5}
    .foot{max-width:1160px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px}
    .foot-logo{font-family:'${FH}',serif;font-size:18px;font-weight:700;color:#111;display:flex;align-items:center;gap:10px}
    .foot-links{display:flex;flex-wrap:wrap;gap:28px}
    .foot-links a{color:#ccc;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:.1em;transition:.15s}
    .foot-links a:hover{color:#111}
    .foot-copy{font-size:11px;color:#ccc;width:100%;text-align:center}
    .foot-copy a{color:#bbb}

    @media(min-width:900px){.nav-toggle{display:none!important}.nav-links{display:flex!important}}
    @media(max-width:899px){
      .nav-links{display:none}.nav-toggle{display:flex!important}
      .hero-inner{grid-template-columns:1fr;padding:64px 24px}.hero-side{display:none}
      .section{padding:60px 24px}.contact{padding:60px 24px}.cta{padding:64px 24px}
      .stats{grid-template-columns:repeat(3,1fr)}.foot{flex-direction:column;text-align:center}
    }
    @media(max-width:480px){.hero-btns{flex-direction:column}.stats{grid-template-columns:repeat(2,1fr)}}
  `;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${data.seo?.title||clinic.name}</title>
${content._faviconUrl ? `<link rel="icon" href="${content._faviconUrl}"/>` : ''}
<style>${css}</style>
</head><body>

<nav class="nav" id="top">
  <div class="nav-inner">
    <div class="logo">${content._logoUrl ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:28px;object-fit:contain"/>` : `<div class="logo-cross"></div>${clinic.name}`}</div>
    <div class="nav-links">
      ${vis('about')&&content.about?.title?'<a href="#about">About</a>':''}
      ${vis('services')&&content.services?.length?'<a href="#services">Services</a>':''}
      ${vis('team')&&content.team?.length?'<a href="#team">Team</a>':''}
      ${vis('testimonials')&&content.testimonials?.length?'<a href="#testimonials">Reviews</a>':''}
      ${vis('hours')?'<a href="#hours">Hours</a>':''}
      <a href="#contact">Contact</a>
      <a href="#contact" class="nav-cta">Book Now</a>
    </div>
    <button class="nav-toggle" id="navToggle">${ICONS.menu}</button>
  </div>
  <div class="nav-mobile" id="navMobile">
    ${vis('about')&&content.about?.title?'<a href="#about">About</a>':''}
    ${vis('services')&&content.services?.length?'<a href="#services">Services</a>':''}
    ${vis('hours')?'<a href="#hours">Hours</a>':''}
    <a href="#contact">Contact</a>
    <a href="#contact" class="nav-cta">Book Now</a>
  </div>
</nav>
<script>(function(){var b=document.getElementById('navToggle'),m=document.getElementById('navMobile');if(b&&m){b.addEventListener('click',function(){m.classList.toggle('open')});m.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){m.classList.remove('open')})})}})()</script>

${orderedSections.map(block => {
  if (block.id === 'hero') return `
<section class="hero">
  <div class="hero-inner">
    <div>
      <div class="hero-kicker">Dental Excellence</div>
      <h1>${content.hero?.headline ? `<em>${content.hero.headline}</em>` : `<em>${clinic.name}</em>`}</h1>
      <p class="hero-sub">${content.hero?.subheadline||'Thoughtful, precise dental care in a calm and welcoming environment.'}</p>
      <div class="hero-btns">
        <a href="#contact" class="btn-p">${content.hero?.ctaText||'Book Appointment'} ${ICONS.arrow}</a>
        ${vis('about')&&content.about?.title?'<a href="#about" class="btn-s">Learn More</a>':''}
      </div>
      <div class="stats">
        <div><div class="stat-n">10+</div><div class="stat-l">Years</div></div>
        <div><div class="stat-n">5k+</div><div class="stat-l">Patients</div></div>
        <div><div class="stat-n">98%</div><div class="stat-l">Satisfaction</div></div>
      </div>
    </div>
    <div class="hero-side">
      <div class="hero-feature"><div class="feat-n">01</div><div class="feat-t">Precision diagnostics with digital X-ray and 3D imaging</div></div>
      <div class="hero-feature"><div class="feat-n">02</div><div class="feat-t">Comprehensive care from prevention to restoration</div></div>
      <div class="hero-feature"><div class="feat-n">03</div><div class="feat-t">Emergency appointments available same-day</div></div>
    </div>
  </div>
</section>`;

  if (block.id === 'about' && vis('about') && content.about?.title) return `
<section class="section" id="about">
  <div class="section-inner">
    <div style="max-width:680px;margin-bottom:56px">
      <div class="eyebrow">About</div>
      <h2 class="sec-h">${content.about.title}</h2>
      <p class="sec-p">${content.about.description}</p>
    </div>
    <div class="grid">
      ${['Tailored Care','Modern Equipment','Comfort First','Flexible Booking'].map((t,i) => `
      <div class="card">
        <div class="card-ico">${[ICONS.phone,ICONS.clock,ICONS.pin,ICONS.mail][i]||ICONS.phone}</div>
        <h3>${t}</h3>
        <p>${['Every treatment plan built around your specific needs.','State-of-the-art tools for precise, comfortable procedures.','Your ease and comfort guide every decision we make.','Book online or by phone at your convenience.'][i]}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'services' && vis('services') && content.services?.length) return `
<section class="section alt" id="services">
  <div class="section-inner">
    <div class="center">
      <div class="eyebrow">Services</div>
      <h2 class="sec-h">What We Offer</h2>
      <p class="sec-p">Comprehensive dental care for the whole family, from routine to specialist treatments.</p>
    </div>
    <div class="grid">
      ${content.services.map(s => `
      <div class="card">
        <div class="card-ico">${ICONS.pin}</div>
        <h3>${s.title}</h3><p>${s.description}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'team' && vis('team') && content.team?.length) return `
<section class="section" id="team">
  <div class="section-inner">
    <div class="center">
      <div class="eyebrow">Team</div>
      <h2 class="sec-h">Our People</h2>
    </div>
    <div class="team-grid">
      ${content.team.map(m => `
      <div class="team-card">
        <div class="team-av">${m.name?.[0]?.toUpperCase()||'D'}</div>
        <div class="team-body">
          <div class="team-name">${m.name}</div>
          <div class="team-role">${m.role}</div>
          ${m.bio?`<div class="team-bio">${m.bio}</div>`:''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'testimonials' && vis('testimonials') && content.testimonials?.length) return `
<section class="section alt" id="testimonials">
  <div class="section-inner">
    <div class="center">
      <div class="eyebrow">Reviews</div>
      <h2 class="sec-h">Patient Stories</h2>
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
            <div class="testi-stars">${Array.from({length:Math.min(t.rating||5,5)},()=>ICONS.star).join('')}</div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'hours' && vis('hours')) return `
<section class="section" id="hours">
  <div class="section-inner">
    <div style="max-width:700px">
      <div class="eyebrow">Hours</div>
      <h2 class="sec-h">Opening Hours</h2>
    </div>
    <div class="hours-wrap">
      ${DAYS.map(day => {
        const h = hours[day]; const isToday = day===today;
        return `<div class="hour-row${isToday?' today':''}">
          <span class="hour-day">${day.charAt(0).toUpperCase()+day.slice(1)}${isToday?`<span class="hour-badge">Today</span>`:''}</span>
          <span class="hour-time${!h?' closed':isToday?' now':''}">${fmtHours(h)}</span>
        </div>`;
      }).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'contact' && vis('contact')) return `
<div class="cta">
  <h2>Ready to Begin?</h2>
  <p>Book your appointment and take the first step toward lasting oral health.</p>
  <a href="#contact" class="btn-cta">Book Appointment ${ICONS.arrow}</a>
</div>
<section class="contact" id="contact">
  <div class="contact-inner">
    <div style="margin-bottom:40px"><div class="eyebrow">Contact</div><h2 class="sec-h">Get In Touch</h2></div>
    <div class="contact-grid">
      ${(content.contact?.phone||clinic.phone)?`<div class="contact-card"><div class="c-ico">${ICONS.phone}</div><div class="c-label">Phone</div><div class="c-val">${content.contact?.phone||clinic.phone}</div></div>`:''}
      ${(content.contact?.email||clinic.email)?`<div class="contact-card"><div class="c-ico">${ICONS.mail}</div><div class="c-label">Email</div><div class="c-val">${content.contact?.email||clinic.email}</div></div>`:''}
      ${content.contact?.address?`<div class="contact-card"><div class="c-ico">${ICONS.pin}</div><div class="c-label">Address</div><div class="c-val">${content.contact.address}</div></div>`:''}
      ${hours[today]!==undefined?`<div class="contact-card"><div class="c-ico">${ICONS.clock}</div><div class="c-label">Today</div><div class="c-val">${fmtHours(hours[today])}</div></div>`:''}
    </div>
    ${content.contact?.mapEmbed?`<div class="map-wrap"><iframe src="${content.contact.mapEmbed}" allowfullscreen loading="lazy" title="Location"></iframe></div>`:''}
  </div>
</section>`;
  return '';
}).join('')}

<footer>
  <div class="foot">
    <div class="foot-logo"><div class="logo-cross" style="width:18px;height:18px"></div>${clinic.name}</div>
    <div class="foot-links">
      ${vis('about')&&content.about?.title?'<a href="#about">About</a>':''}
      ${vis('services')&&content.services?.length?'<a href="#services">Services</a>':''}
      ${vis('hours')?'<a href="#hours">Hours</a>':''}
      <a href="#contact">Contact</a>
    </div>
    <p class="foot-copy">© ${new Date().getFullYear()} ${clinic.name} · Powered by <a href="https://clinickarobar.app" target="_blank" rel="noopener">ClinicKarobar</a></p>
  </div>
</footer>

${content._offers?.filter((o:any)=>o.showOnHome).length ? `
<section style="background:#f9f9f9;padding:48px 40px;border-top:1px solid #e5e5e5">
  <div style="max-width:960px;margin:0 auto">
    <div style="font-size:10px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:.18em;margin-bottom:20px">Current Offers</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1px;background:#e5e5e5">
      ${content._offers.filter((o:any)=>o.showOnHome).map((o:any)=>`
      <div style="background:#fff;overflow:hidden">
        ${o.bannerUrl?`<img src="${o.bannerUrl}" alt="${o.title}" style="width:100%;height:110px;object-fit:cover;display:block"/>`:''}
        <div style="padding:18px 20px">
          <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:6px">${o.title}</div>
          <div style="font-size:12px;color:#888;line-height:1.55">${o.description}</div>
          ${o.validTo?`<div style="font-size:11px;color:#aaa;margin-top:8px">Until ${new Date(o.validTo).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</div>`:''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

${(content.gallery||[]).length > 0 ? `
<section style="padding:48px 40px;background:#fff;border-top:1px solid #e5e5e5">
  <div style="max-width:960px;margin:0 auto">
    <div style="font-size:10px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:.18em;margin-bottom:20px">Gallery</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1px;background:#e5e5e5">
      ${(content.gallery||[]).map((url:string)=>`<div style="aspect-ratio:1/1;overflow:hidden"><img src="${url}" alt="Gallery" style="width:100%;height:100%;object-fit:cover"/></div>`).join('')}
    </div>
  </div>
</section>` : ''}

</body></html>`;
}
