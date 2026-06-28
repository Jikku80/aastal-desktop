import { SiteData, DAYS, DAY_SHORT, fmtHours, getTodayKey, isVisible, getOpeningHours, getEnabledPages } from './types';

// ── Shared calendar booking script builder ────────────────────────────────────
function buildCalendarScript(subdomain: string, P: string, FH: string, FB: string, bg: string, _border: string, textColor: string, _cardBg: string, ctaLabel: string, dark: boolean, apiBase = '', sectionSuffix = ''): string {
  // Pre-compute all dark-dependent values as TS constants — no dark ternaries inside JS strings
  const inpBorder    = dark ? 'rgba(255,255,255,.15)' : '#e0d4c8';
  const inpBg        = dark ? 'rgba(255,255,255,.05)' : '#fff';
  const inp          = 'padding:10px 14px;border:1px solid ' + inpBorder + ';font-size:14px;font-family:inherit;width:100%;background:' + inpBg + ';color:' + textColor;
  const subColor     = dark ? 'rgba(255,255,255,.5)' : '#888';
  const calBdr       = dark ? 'border:1px solid rgba(255,255,255,.1)' : 'border:2px solid #1a1a1a';
  const hdrBg        = dark ? 'rgba(255,255,255,.06)' : P;
  const hdrBotBdr    = dark ? 'border-bottom:1px solid rgba(255,255,255,.1);' : '';
  const navBtnBdr    = dark ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.5)';
  const mnColor      = dark ? textColor : '#fff';
  const dayHdrExtra  = dark ? 'border-bottom:1px solid rgba(255,255,255,.08)' : 'background:#f5f0e8;border-bottom:1px solid #e8dcc8';
  const dayHdrColor  = dark ? 'rgba(255,255,255,.35)' : '#888';
  const emptyCellBdr = dark ? 'border:1px solid rgba(255,255,255,.04)' : 'border:1px solid #f0ebe4';
  const noSlotColor  = dark ? 'rgba(255,255,255,.4)' : '#888';
  const noSlotBdr    = dark ? 'border:1px solid rgba(255,255,255,.1)' : 'border:1px solid #e8dcc8';
  const formBdr      = dark ? 'border:1px solid rgba(255,255,255,.12)' : 'border:2px solid #1a1a1a';
  const formBg2      = dark ? 'rgba(255,255,255,.04)' : '#fff';
  const btnTransform = dark ? 'uppercase' : 'none';
  const btnLetterSp  = dark ? '.07em' : '0';
  const slotBdrDef   = dark ? '1px solid rgba(255,255,255,.15)' : '1px solid #e8dcc8';
  const todayBg      = dark ? 'rgba(255,255,255,.08)' : 'rgba(14,157,232,.08)';
  const normalBg     = dark ? 'transparent' : '#fff';
  const normalBdr    = dark ? '1px solid rgba(255,255,255,.06)' : '1px solid #e8dcc8';
  const pastColor    = dark ? 'rgba(255,255,255,.2)' : '#bbb';
  const calId        = subdomain.replace(/[^a-z0-9]/gi, '_');

  const uid = calId + (sectionSuffix ? '_' + sectionSuffix.replace(/[^a-z0-9]/gi,'_') : '');
  return `
<div id="booking-section" style="margin-top:48px">
  <h3 style="font-family:'${FH}',sans-serif;font-size:22px;font-weight:900;margin-bottom:8px;color:${textColor}">${ctaLabel}</h3>
  <p style="color:${subColor};margin-bottom:24px;font-size:14px">Select a date and time — click a slot to book</p>
  <div id="cal-root-${uid}" style="font-family:'${FB}',system-ui,sans-serif"></div>
</div>
<script>
(function(){
  var API='${apiBase}';
  var sub='${subdomain}';
  var root=document.getElementById('cal-root-${uid}');
  if(!root)return;
  var today=new Date();today.setHours(0,0,0,0);
  var current=new Date(today);
  var selected=null,selectedTime=null,allSlots={};
  function pad(n){return String(n).padStart(2,'0');}
  function fmt(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function fmtD(d){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});}
  function loadAll(){
    root.innerHTML='<p style="color:${subColor};font-size:13px;padding:16px 0;text-align:center">Loading slots…</p>';
    fetch(API+'/api/v1/website-builder/public/'+sub+'/available-slots')
      .then(function(r){return r.json();}).then(function(d){allSlots=d.slotsPerDay||{};renderCal();}).catch(function(){allSlots={};renderCal();});
  }
  var P_='${P}',TC='${textColor}',ESB='${slotBdrDef}',NB='${normalBg}',NR='${normalBdr}',TDB='${todayBg}',PC='${pastColor}';
  function renderCal(){
    var yr=current.getFullYear(),mo=current.getMonth();
    var fd=new Date(yr,mo,1).getDay(),dim=new Date(yr,mo+1,0).getDate();
    var mn=current.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    var h='<div style="background:${bg};${calBdr};overflow:hidden">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:${hdrBg};${hdrBotBdr}">';
    h+='<button id="cp" style="background:none;border:1px solid ${navBtnBdr};color:${textColor};width:30px;height:30px;cursor:pointer;font-size:15px">&#8249;</button>';
    h+='<span style="font-family:\\'${FH}\\',sans-serif;font-weight:900;color:${mnColor};font-size:15px">'+mn+'</span>';
    h+='<button id="cn" style="background:none;border:1px solid ${navBtnBdr};color:${textColor};width:30px;height:30px;cursor:pointer;font-size:15px">&#8250;</button>';
    h+='</div>';
    h+='<div style="display:grid;grid-template-columns:repeat(7,1fr);${dayHdrExtra}">';
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d){h+='<div style="text-align:center;padding:8px 2px;font-size:10px;font-weight:700;color:${dayHdrColor};text-transform:uppercase;letter-spacing:.06em">'+d+'</div>';});
    h+='</div><div style="display:grid;grid-template-columns:repeat(7,1fr)">';
    for(var i=0;i<fd;i++) h+='<div style="height:42px;${emptyCellBdr}"></div>';
    for(var d=1;d<=dim;d++){
      var dt=new Date(yr,mo,d),key=fmt(dt),past=dt<today,sel=key===selected,todayKey=key===fmt(today);
      var daySlots=allSlots[key];
      var hasS=daySlots&&daySlots.length>0;
      var bg2=sel?P_:(todayKey?TDB:NB);
      var brd=sel?('2px solid '+P_):(todayKey?('1px solid '+P_):NR);
      var col=sel?'#fff':(past?PC:TC);
      h+='<div data-date="'+key+'" data-past="'+(past?1:0)+'" data-has="'+(daySlots&&daySlots.length>0?1:0)+'" style="min-height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:'+(past||!daySlots||daySlots.length===0?'default':'pointer')+';background:'+bg2+';border:'+brd+'">';
      h+='<span style="font-size:12px;font-weight:700;color:'+col+'">'+d+'</span>';
      if(hasS&&!past) h+='<span style="font-size:9px;color:'+(sel?'rgba(255,255,255,.7)':P_)+';font-weight:700">'+daySlots.length+'</span>';
      else if(!past&&daySlots&&daySlots.length===0) h+='<span style="font-size:9px;color:'+PC+'">—</span>';
      h+='</div>';
    }
    h+='</div></div>';
    if(selected){
      var dSlots=allSlots[selected]||[];
      h+='<div style="margin-top:16px"><p style="font-size:13px;font-weight:700;color:${textColor};margin-bottom:10px">Times for '+fmtD(selected)+'</p>';
      if(!dSlots.length){
        h+='<p style="font-size:13px;color:${noSlotColor};padding:14px;${noSlotBdr};text-align:center">No slots for this date</p>';
      } else {
        h+='<div style="display:flex;flex-wrap:wrap;gap:8px">';
        dSlots.forEach(function(s){
          var t=typeof s==='string'?s:s.time||s;
          var isST=t===selectedTime;
          var bb=isST?('2px solid '+P_):ESB;
          h+='<button data-time="'+t+'" style="padding:7px 14px;border:'+bb+';background:'+(isST?P_:'transparent')+';color:'+(isST?'#fff':TC)+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border-radius:3px;transition:.15s">'+t+'</button>';
        });
        h+='</div>';
      }
      h+='</div>';
    }
    if(selected&&selectedTime){
      h+='<div style="margin-top:20px;padding:22px;${formBdr};background:${formBg2}">';
      h+='<h4 style="font-family:\\'${FH}\\',sans-serif;font-weight:900;font-size:15px;margin-bottom:14px;color:${textColor}">Your Details — '+fmtD(selected)+' at '+selectedTime+'</h4>';
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
      h+='<input id="b-name" placeholder="Full Name *" style="${inp}"/>';
      h+='<input id="b-phone" placeholder="Phone *" style="${inp}"/>';
      h+='</div>';
      h+='<input id="b-email" placeholder="Email (optional)" style="${inp};margin-bottom:10px"/>';
      h+='<textarea id="b-note" placeholder="Notes" rows="2" style="${inp};resize:none;margin-bottom:14px"></textarea>';
      h+='<button id="b-sub" style="background:${P};color:#fff;padding:12px 24px;font-size:14px;font-weight:800;border:none;cursor:pointer;font-family:inherit;width:100%;text-transform:${btnTransform};letter-spacing:${btnLetterSp}">Confirm Appointment</button>';
      h+='<div id="b-msg" style="margin-top:10px;font-size:13px"></div>';
      h+='</div>';
    }
    root.innerHTML=h;
    root.querySelectorAll('[data-date]').forEach(function(el){
      el.addEventListener('click',function(){
        var k=el.getAttribute('data-date'),p=el.getAttribute('data-past')==='1',has=el.getAttribute('data-has')==='1';
        if(p||!has) return;
        selected=k;selectedTime=null;renderCal();
      });
    });
    root.querySelectorAll('[data-time]').forEach(function(el){
      el.addEventListener('click',function(){selectedTime=el.getAttribute('data-time');renderCal();});
    });
    var prev=document.getElementById('cp'),next=document.getElementById('cn');
    if(prev) prev.addEventListener('click',function(){current.setMonth(current.getMonth()-1);renderCal();});
    if(next) next.addEventListener('click',function(){current.setMonth(current.getMonth()+1);renderCal();});
    var sub2=document.getElementById('b-sub');
    if(sub2) sub2.addEventListener('click',function(){
      var nm=document.getElementById('b-name').value.trim(),ph=document.getElementById('b-phone').value.trim();
      var em=document.getElementById('b-email').value.trim(),nt=document.getElementById('b-note').value.trim();
      var msg=document.getElementById('b-msg');
      if(!nm||!ph){msg.style.color='#ef4444';msg.textContent='Please enter name and phone.';return;}
      sub2.disabled=true;sub2.textContent='Booking…';
      fetch(API+'/api/v1/website-builder/public/'+sub+'/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nm,phone:ph,email:em,note:nt,date:selected,time:selectedTime})})
        .then(function(r){return r.json();}).then(function(d){
          if(d.success||d.appointmentId){
            msg.style.color='#16a34a';msg.textContent='✅ Booked! We will confirm shortly.';sub2.textContent='Booked!';
            if(allSlots[selected]){allSlots[selected]=allSlots[selected].filter(function(s){return s!==selectedTime;});}
            selected=null;selectedTime=null;setTimeout(function(){renderCal();},2200);
          } else {
            msg.style.color='#ef4444';msg.textContent=d.message||'Booking failed. Please call us.';sub2.disabled=false;sub2.textContent='Confirm Appointment';
          }
        }).catch(function(){msg.style.color='#ef4444';msg.textContent='Connection error. Please call us.';sub2.disabled=false;sub2.textContent='Confirm Appointment';});
    });
  }
  loadAll();
})();
</script>`;
}

const I: Record<string,string> = {
  phone:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.5 6.5l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  mail:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  pin:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  star:`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  arrow:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  menu:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
};
const nav_script = `<script>(function(){var b=document.getElementById('navToggle'),m=document.getElementById('navMobile');if(b&&m){b.addEventListener('click',function(){m.classList.toggle('open')});m.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){m.classList.remove('open')})})}})()</script>`;

// ── BOLD ──────────────────────────────────────────────────────────────────────
export function BoldTemplate({ data, page = 'home' }: { data: SiteData; page?: string }) {
  const { content, theme, clinic } = data;
  const P  = theme.primaryColor   || '#dc2626';
  const S  = theme.secondaryColor || '#1a0505';
  const FH = theme.fontHeading    || 'Impact';
  const FB = theme.fontBody       || 'system-ui';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const hours = getOpeningHours(data);
  const today = getTodayKey();
  const vis   = (id: string) => isVisible(data, id);
  const orderedSections = ['hero','about','services','team','testimonials','hours','contact']
    .map(id => (content._blocks||[]).find((b:any) => b.id === id) || { id, visible: true })
    .filter((b:any) => b.visible !== false);


  // ── Multi-page support ───────────────────────────────────────────────────
  const isMultiPage = !!(content._pages);
  const enabledPages = getEnabledPages(data);
  const bookLink = isMultiPage ? '?page=contact' : '#contact';
  const pageNavLinks = isMultiPage
    ? enabledPages.map(p => `<a href="?page=${p.id}" style="color:rgba(255,255,255,.65);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;text-decoration:none">${p.title}</a>`).join('')
    : `${vis('about')&&content.about?.title?'<a href="#about" style="color:rgba(255,255,255,.65);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;text-decoration:none">About</a>':''}${vis('services')&&content.services?.length?'<a href="#services" style="color:rgba(255,255,255,.65);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;text-decoration:none">Services</a>':''}${vis('team')&&content.team?.length?'<a href="#team" style="color:rgba(255,255,255,.65);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;text-decoration:none">Team</a>':''}${vis('hours')?'<a href="#hours" style="color:rgba(255,255,255,.65);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;text-decoration:none">Hours</a>':''}`;
  const footerPageLinks = isMultiPage
    ? enabledPages.map(p => `<a href="?page=${p.id}">${p.title}</a>`).join('')
    : `${vis('about')&&content.about?.title?'<a href="#about">About</a>':''}${vis('services')&&content.services?.length?'<a href="#services">Services</a>':''}${vis('hours')?'<a href="#hours">Hours</a>':''}`;

  const css = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'${FB}',system-ui,sans-serif;background:#0a0a0a;color:#f0f0f0;line-height:1.6}
    a{color:inherit;text-decoration:none}
    img{max-width:100%;display:block}

    .nav{background:#0a0a0a;border-bottom:1px solid #1f1f1f;position:sticky;top:0;z-index:100}
    .nav-inner{max-width:1440px;margin:0 auto;padding:0 40px;height:64px;display:flex;align-items:center;justify-content:space-between}
    .logo{font-family:'${FH}',sans-serif;font-size:20px;font-weight:900;color:#fff;display:flex;align-items:center;gap:12px;text-transform:uppercase;letter-spacing:.05em}
    .logo-box{width:32px;height:32px;background:${P};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;flex-shrink:0}
    .nav-links{display:flex;align-items:center;gap:0}
    .nav-links a{color:#555;font-size:12px;font-weight:700;padding:8px 18px;text-transform:uppercase;letter-spacing:.1em;transition:.15s}
    .nav-links a:hover{color:#fff}
    .nav-cta{color:${P}!important;border:1px solid ${P}!important}
    .nav-cta:hover{background:${P}!important;color:#fff!important}
    .nav-toggle{display:none;background:none;border:1px solid #333;cursor:pointer;color:#fff;width:38px;height:38px;align-items:center;justify-content:center;padding:4px}
    .nav-mobile{display:none;position:absolute;top:64px;left:0;right:0;background:#0a0a0a;border-bottom:1px solid #1f1f1f;padding:20px 40px;z-index:99}
    .nav-mobile.open{display:block}
    .nav-mobile a{display:block;color:#555;padding:13px 0;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid #1a1a1a}
    .nav-mobile .nav-cta{border:1px solid ${P}!important;color:${P}!important;padding:12px!important;text-align:center;margin-top:12px;display:block}

    .hero{min-height:100vh;display:flex;align-items:center;background:#0a0a0a;position:relative;overflow:hidden}
    .hero-stripe{position:absolute;top:0;bottom:0;right:0;width:45%;background:${P};clip-path:polygon(16% 0,100% 0,100% 100%,0 100%);opacity:.06}
    .hero-line{position:absolute;top:0;bottom:0;right:43%;width:1px;background:linear-gradient(to bottom,transparent,${P},transparent)}
    .hero-inner{max-width:1440px;margin:0 auto;padding:80px 40px;position:relative;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
    .hero-num{font-family:'${FH}',sans-serif;font-size:220px;font-weight:900;color:#111;line-height:1;position:absolute;top:-20px;left:20px;pointer-events:none;user-select:none}
    .hero-left{position:relative;z-index:1}
    .hero-label{font-size:11px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.18em;margin-bottom:22px;display:flex;align-items:center;gap:12px}
    .hero-label::after{content:'';width:48px;height:1px;background:${P};opacity:.5}
    .hero h1{font-family:'${FH}',sans-serif;font-size:clamp(44px,6.5vw,88px);font-weight:900;color:#fff;line-height:.92;letter-spacing:-.02em;text-transform:uppercase;margin-bottom:28px}
    .hero h1 em{display:block;font-style:normal;color:${P}}
    .hero-sub{font-size:15px;color:#555;line-height:1.8;max-width:440px;margin-bottom:44px}
    .hero-btns{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:60px}
    .btn-p{display:inline-flex;align-items:center;gap:10px;background:${P};color:#fff;padding:16px 40px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.09em;transition:.2s}
    .btn-p:hover{background:#fff;color:#0a0a0a}
    .btn-s{display:inline-flex;align-items:center;gap:10px;background:transparent;color:#fff;padding:15px 39px;font-weight:700;font-size:14px;border:1px solid #333;text-transform:uppercase;letter-spacing:.07em;transition:.2s}
    .btn-s:hover{border-color:${P};color:${P}}
    .stats{display:flex;gap:44px;padding-top:44px;border-top:1px solid #1f1f1f}
    .stat-n{font-family:'${FH}',sans-serif;font-size:40px;font-weight:900;color:#fff;line-height:1;letter-spacing:-.02em}
    .stat-l{font-size:11px;color:#444;margin-top:5px;text-transform:uppercase;letter-spacing:.09em;font-weight:600}
    .hero-right{display:flex;flex-direction:column;gap:0}
    .hero-card{background:#111;border:1px solid #1f1f1f;padding:26px 30px;transition:.2s;border-left:3px solid transparent}
    .hero-card:hover{background:#151515;border-left-color:${P}}
    .hcard-label{font-size:10px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px}
    .hcard-val{font-family:'${FH}',sans-serif;font-size:30px;font-weight:900;color:#fff;letter-spacing:-.01em}

    .section{padding:96px 40px;border-top:1px solid #1a1a1a}
    .section-inner{max-width:1440px;margin:0 auto}
    .alt{background:#0e0e0e}
    .eyebrow{font-size:10px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.18em;margin-bottom:12px}
    .sec-h{font-family:'${FH}',sans-serif;font-size:clamp(28px,3.5vw,54px);font-weight:900;color:#fff;line-height:1;letter-spacing:-.02em;text-transform:uppercase;margin-bottom:14px}
    .sec-p{font-size:15px;color:#555;line-height:1.75;max-width:520px}
    .center{text-align:center;max-width:640px;margin:0 auto 56px}
    .center .sec-p{margin:0 auto}

    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:1px;margin-top:56px;background:#1a1a1a}
    .card{background:#0a0a0a;padding:30px;transition:.2s;position:relative;overflow:hidden}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:${P};transform:scaleX(0);transform-origin:left;transition:.35s}
    .card:hover::before{transform:scaleX(1)}
    .card:hover{background:#0e0e0e}
    .card-ico{width:46px;height:46px;border:1px solid #222;display:flex;align-items:center;justify-content:center;margin-bottom:22px;color:${P};transition:.25s}
    .card:hover .card-ico{background:${P};border-color:${P};color:#fff}
    .card h3{font-family:'${FH}',sans-serif;font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;text-transform:uppercase;letter-spacing:.03em}
    .card p{font-size:14px;color:#555;line-height:1.65}

    .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:20px;margin-top:56px}
    .team-card{background:#111;border:1px solid #1a1a1a;overflow:hidden;transition:.3s;text-align:center}
    .team-card:hover{border-color:${P};transform:translateY(-4px)}
    .team-av{height:160px;background:linear-gradient(180deg,#1a1a1a,#0a0a0a);border-bottom:2px solid ${P};display:flex;align-items:center;justify-content:center;font-family:'${FH}',sans-serif;font-size:56px;font-weight:900;color:${P}}
    .team-body{padding:22px}
    .team-name{font-family:'${FH}',sans-serif;font-size:19px;font-weight:900;color:#fff;margin-bottom:4px;text-transform:uppercase;letter-spacing:.03em}
    .team-role{font-size:11px;color:${P};font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
    .team-bio{font-size:13px;color:#555;line-height:1.6}

    .testi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:20px;margin-top:56px}
    .testi{background:#111;border:1px solid #1a1a1a;padding:30px;transition:.2s}
    .testi:hover{border-color:${P}}
    .testi-q{font-size:64px;color:${P};font-family:'${FH}',sans-serif;height:40px;display:flex;align-items:center;margin-bottom:12px;opacity:.4}
    .testi-text{font-size:15px;color:#777;line-height:1.8;margin-bottom:22px}
    .testi-author{display:flex;align-items:center;gap:14px;border-top:1px solid #1a1a1a;padding-top:18px}
    .testi-av{width:40px;height:40px;background:${P};display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:16px;flex-shrink:0;font-family:'${FH}',sans-serif}
    .testi-name{font-weight:800;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:.05em;font-family:'${FH}',sans-serif}
    .testi-stars{display:flex;gap:2px;margin-top:3px;color:${P}}

    .hours-wrap{margin-top:56px;border:1px solid #1a1a1a;max-width:800px}
    .hour-row{display:flex;justify-content:space-between;align-items:center;padding:16px 28px;border-bottom:1px solid #1a1a1a;transition:.15s}
    .hour-row:last-child{border-bottom:none}
    .hour-row:hover{background:#111}
    .hour-row.today{background:#111;border-left:3px solid ${P}}
    .hour-day{font-size:13px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.09em;font-family:'${FH}',sans-serif}
    .hour-badge{font-size:9px;font-weight:800;background:${P};color:#fff;padding:2px 8px;margin-left:10px;text-transform:uppercase;letter-spacing:.07em}
    .hour-time{font-size:13px;color:#444;font-weight:600}
    .hour-time.closed{color:#ef4444}
    .hour-time.now{color:${P};font-weight:800}

    .cta{background:${P};padding:96px 40px;text-align:center;position:relative;overflow:hidden}
    .cta::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent,transparent 22px,rgba(0,0,0,.04) 22px,rgba(0,0,0,.04) 44px)}
    .cta h2{font-family:'${FH}',sans-serif;font-size:clamp(36px,5.5vw,72px);font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-.02em;margin-bottom:16px;line-height:.9;position:relative}
    .cta p{font-size:17px;color:rgba(255,255,255,.75);max-width:520px;margin:0 auto 48px;line-height:1.7;position:relative}
    .btn-cta{display:inline-flex;align-items:center;gap:12px;background:#0a0a0a;color:#fff;padding:20px 56px;font-weight:800;font-size:15px;text-transform:uppercase;letter-spacing:.12em;transition:.2s;position:relative}
    .btn-cta:hover{background:#fff;color:#0a0a0a}

    .contact{background:#0a0a0a;padding:96px 40px;border-top:1px solid #1a1a1a}
    .contact-inner{max-width:1440px;margin:0 auto}
    .contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:1px;background:#1a1a1a;border:1px solid #1a1a1a;margin-top:16px}
    .contact-card{background:#0a0a0a;padding:30px;display:flex;flex-direction:column;gap:14px;transition:.15s}
    .contact-card:hover{background:#0e0e0e}
    .c-ico{width:44px;height:44px;border:1px solid #222;display:flex;align-items:center;justify-content:center;color:${P}}
    .c-label{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#444;font-weight:700}
    .c-val{font-size:15px;font-weight:700;color:#fff;word-break:break-word;line-height:1.45;font-family:'${FH}',sans-serif}
    .map-wrap{margin-top:32px;border:1px solid #1a1a1a;overflow:hidden;height:300px}
    .map-wrap iframe{width:100%;height:100%;border:0}

    footer{background:#060606;padding:44px 40px;border-top:1px solid #1a1a1a}
    .foot{max-width:1440px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:24px}
    .foot-logo{font-family:'${FH}',sans-serif;font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:12px}
    .foot-links{display:flex;flex-wrap:wrap;justify-content:center;gap:32px}
    .foot-links a{color:#333;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;transition:.15s}
    .foot-links a:hover{color:#fff}
    .foot-copy{font-size:12px;color:#333}
    .foot-copy a{color:#444}

    @media(min-width:900px){.nav-toggle{display:none!important}.nav-links{display:flex!important}}
    @media(max-width:899px){
      .nav-links{display:none}.nav-toggle{display:flex!important}
      .hero-inner{grid-template-columns:1fr;padding:80px 24px 60px}
      .hero-num,.hero-right{display:none}.section{padding:64px 24px}
      .contact{padding:64px 24px}.cta{padding:64px 24px}
    }
    @media(max-width:480px){.hero-btns{flex-direction:column}.stats{flex-wrap:wrap;gap:20px}}
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
    <div class="logo">${content._logoUrl ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:32px;object-fit:contain"/>` : `<div class="logo-box">${clinic.name[0]}</div>${clinic.name}`}</div>
    <div class="nav-links">
      ${pageNavLinks}
      <a href="${bookLink}" class="nav-cta">Book Now</a>
    </div>
    <button class="nav-toggle" id="navToggle">${I.menu}</button>
  </div>
  <div class="nav-mobile" id="navMobile">
    ${pageNavLinks}
    <a href="${bookLink}" class="nav-cta">Book Now</a>
  </div>
</nav>
${nav_script}

${isMultiPage && page !== 'home' ? (() => {
  const pg = (content._pages || {})[page] as any;
  if (!pg || pg.enabled === false) return '<section style="min-height:70vh;display:flex;align-items:center;justify-content:center;background:' + S + '"><p style="color:rgba(255,255,255,.4)">Page not found</p></section>';
  if (page === 'about') return `<section style="background:${S};padding:80px 32px;min-height:70vh"><div style="max-width:1100px;margin:0 auto"><div style="font-size:11px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.18em;margin-bottom:16px">About Us</div><h1 style="font-family:'${FH}',sans-serif;font-size:clamp(36px,5vw,66px);font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-.02em;margin-bottom:20px;line-height:1">${pg.headline || content.about?.title || 'About Our Clinic'}</h1><div style="width:44px;height:4px;background:${P};margin-bottom:28px"></div><p style="font-size:17px;color:rgba(255,255,255,.6);line-height:1.8;max-width:640px;margin-bottom:48px">${pg.content || content.about?.description || ''}</p>${content.team?.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0;border:1px solid rgba(255,255,255,.1)">${content.team.map((m:any)=>`<div style="padding:24px;border-right:1px solid rgba(255,255,255,.1)"><div style="font-size:32px;font-weight:900;font-family:'${FH}',sans-serif;color:${P}">${(m.name?.[0]||'D').toUpperCase()}</div><div style="font-size:15px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.04em">${m.name}</div><div style="font-size:11px;color:${P};text-transform:uppercase;letter-spacing:.08em;margin-top:4px">${m.role}</div></div>`).join('')}</div>`:''}</div></section>`;
  if (page === 'doctors') {
    const doctorImages: Record<string,string> = {};
    (content._doctorImages||[]).forEach((d:any)=>{ if(d.name&&d.url) doctorImages[d.name.toLowerCase()]=d.url; });
    const noTeam = '<p style="color:rgba(255,255,255,.4);padding:60px 0;text-align:center;font-size:16px">No doctors listed yet — add team members in Content → Our Team.</p>';
    const cards = (content.team||[]).map((m:any)=>{
      const img=doctorImages[m.name?.toLowerCase()]||'';
      return `<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);overflow:hidden">${img?`<img src="${img}" alt="${m.name}" style="width:100%;height:200px;object-fit:cover;object-position:top"/>`:`<div style="height:100px;background:${P};display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:900;color:#fff;font-family:'${FH}',sans-serif">${(m.name?.[0]||'D').toUpperCase()}</div>`}<div style="padding:24px"><div style="font-size:18px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;font-family:'${FH}',sans-serif">${m.name}</div><div style="font-size:11px;color:${P};text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px">${m.role}</div>${m.bio?`<div style="font-size:13px;color:rgba(255,255,255,.5);line-height:1.65">${m.bio}</div>`:''}</div></div>`;
    }).join('');
    return `<section style="background:${S};padding:80px 32px;min-height:70vh"><div style="max-width:1100px;margin:0 auto"><div style="font-size:11px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.18em;margin-bottom:16px">Our Team</div><h1 style="font-family:'${FH}',sans-serif;font-size:clamp(36px,5vw,66px);font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-.02em;margin-bottom:20px;line-height:1">${pg.headline || 'Meet Our Doctors'}</h1><div style="width:44px;height:4px;background:${P};margin-bottom:28px"></div>${pg.content?`<p style="font-size:17px;color:rgba(255,255,255,.6);line-height:1.8;max-width:640px;margin-bottom:48px">${pg.content}</p>`:''} ${content.team?.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:2px;margin-top:20px">${cards}</div>`:noTeam}</div></section>`;
  }
  if (page === 'contact') {
    const phone = content.contact?.phone||clinic.phone||'';
    const email = content.contact?.email||clinic.email||'';
    const addr  = content.contact?.address||'';
    const subdomain = data.subdomain||'';
    const calScript = pg.hasBooking ? buildCalendarScript(subdomain, P, FH, FB, '#0a0a0a', '#1f1f1f', '#fff', 'rgba(255,255,255,.06)', pg.ctaText||'Book Appointment', true, apiBase, 'contact') : '';
    return `<section style="background:${S};padding:80px 32px;min-height:70vh"><div style="max-width:1100px;margin:0 auto"><div style="font-size:11px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.18em;margin-bottom:16px">Contact</div><h1 style="font-family:'${FH}',sans-serif;font-size:clamp(36px,5vw,66px);font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-.02em;margin-bottom:20px;line-height:1">${pg.headline||'Get In Touch'}</h1><div style="width:44px;height:4px;background:${P};margin-bottom:28px"></div>${pg.content?`<p style="font-size:17px;color:rgba(255,255,255,.6);line-height:1.8;max-width:640px;margin-bottom:40px">${pg.content}</p>`:''}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:2px;margin-bottom:32px">${phone?`<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:28px"><div style="font-size:10px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Phone</div><div style="font-size:16px;font-weight:700;color:#fff">${phone}</div></div>`:''}${email?`<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:28px"><div style="font-size:10px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Email</div><div style="font-size:16px;font-weight:700;color:#fff">${email}</div></div>`:''}${addr?`<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:28px"><div style="font-size:10px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Address</div><div style="font-size:16px;font-weight:700;color:#fff">${addr}</div></div>`:''}</div>${calScript}</div></section>`;
  }
  return '<section style="min-height:70vh;display:flex;align-items:center;justify-content:center;background:' + S + '"><p style="color:rgba(255,255,255,.4)">Page not found</p></section>';
})() : `${orderedSections.map(block => {
  if (block.id === 'hero') return `
<section class="hero">
  <div class="hero-stripe"></div><div class="hero-line"></div>
  <div class="hero-inner">
    <div class="hero-num">01</div>
    <div class="hero-left">
      <div class="hero-label">Premium Dental Care</div>
      <h1>${content.hero?.headline
        ? content.hero.headline.split(' ').slice(0,3).join(' ') + (content.hero.headline.split(' ').length > 3 ? `<em>${content.hero.headline.split(' ').slice(3).join(' ')}</em>` : '')
        : `${clinic.name}<em>Dental Care</em>`
      }</h1>
      <p class="hero-sub">${content.hero?.subheadline||'World-class dentistry delivered with precision, care, and absolute commitment to your smile.'}</p>
      <div class="hero-btns">
        <a href="#contact" class="btn-p">${content.hero?.ctaText||'Book Now'} ${I.arrow}</a>
        ${vis('services')&&content.services?.length?'<a href="#services" class="btn-s">Our Services</a>':''}
      </div>
      <div class="stats">
        <div><div class="stat-n">10+</div><div class="stat-l">Years</div></div>
        <div><div class="stat-n">5K+</div><div class="stat-l">Patients</div></div>
        <div><div class="stat-n">98%</div><div class="stat-l">Satisfied</div></div>
      </div>
    </div>
    <div class="hero-right">
      <div class="hero-card"><div class="hcard-label">Excellence</div><div class="hcard-val">Award Winning Care</div></div>
      <div class="hero-card"><div class="hcard-label">Technology</div><div class="hcard-val">Digital X-Ray & 3D</div></div>
      <div class="hero-card"><div class="hcard-label">Availability</div><div class="hcard-val">Emergency Appts.</div></div>
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
      ${['Excellence','Innovation','Integrity','Accessibility'].map((t,i) => `
      <div class="card">
        <div class="card-ico">${[I.phone,I.clock,I.pin,I.mail][i]}</div>
        <h3>${t}</h3>
        <p>${['Uncompromising standards in every treatment we deliver.','Cutting-edge technology for the most precise dental care.','Transparent, honest care built on trust.','Flexible scheduling for every lifestyle.'][i]}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'services' && vis('services') && content.services?.length) return `
<section class="section alt" id="services">
  <div class="section-inner">
    <div class="center">
      <div class="eyebrow">Services</div>
      <h2 class="sec-h">What We Do</h2>
      <p class="sec-p">Comprehensive dental services delivered with expertise and precision.</p>
    </div>
    <div class="grid">
      ${content.services.map(s => `
      <div class="card">
        <div class="card-ico">${I.pin}</div>
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
      <h2 class="sec-h">Our Experts</h2>
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
      <h2 class="sec-h">What They Say</h2>
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
            <div class="testi-stars">${Array.from({length:Math.min(t.rating||5,5)},()=>I.star).join('')}</div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'hours' && vis('hours')) return `
<section class="section" id="hours">
  <div class="section-inner">
    <div style="max-width:800px">
      <div class="eyebrow">Hours</div>
      <h2 class="sec-h">We're Open</h2>
    </div>
    <div class="hours-wrap">
      ${DAYS.map(day => {
        const h = hours[day]; const isToday = day===today;
        return `<div class="hour-row${isToday?' today':''}">
          <span class="hour-day">${day.toUpperCase().slice(0,3)}${isToday?`<span class="hour-badge">Today</span>`:''}</span>
          <span class="hour-time${!h?' closed':isToday?' now':''}">${fmtHours(h)}</span>
        </div>`;
      }).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'contact' && vis('contact')) {
    const pg0 = (content._pages?.['home'] as any) || {};
    const showBooking = !isMultiPage || pg0.hasBooking !== false;
    const subdomain0 = data.subdomain||'';
    const calScript0 = showBooking ? buildCalendarScript(subdomain0, P, FH, FB, '#0a0a0a', '#1f1f1f', '#fff', 'rgba(255,255,255,.06)', 'Book Appointment', true, apiBase, 'sp-contact') : '';
    return `
<div class="cta">
  <h2>Book Your Visit</h2>
  <p>Experience world-class dental care. Your best smile starts here.</p>
  <a href="#contact" class="btn-cta">Book Now ${I.arrow}</a>
</div>
<section class="contact" id="contact">
  <div class="contact-inner">
    <div style="margin-bottom:44px"><div class="eyebrow">Contact</div><h2 class="sec-h">Find Us</h2></div>
    <div class="contact-grid">
      ${(content.contact?.phone||clinic.phone)?`<div class="contact-card"><div class="c-ico">${I.phone}</div><div class="c-label">Phone</div><div class="c-val">${content.contact?.phone||clinic.phone}</div></div>`:''}
      ${(content.contact?.email||clinic.email)?`<div class="contact-card"><div class="c-ico">${I.mail}</div><div class="c-label">Email</div><div class="c-val">${content.contact?.email||clinic.email}</div></div>`:''}
      ${content.contact?.address?`<div class="contact-card"><div class="c-ico">${I.pin}</div><div class="c-label">Address</div><div class="c-val">${content.contact.address}</div></div>`:''}
      ${hours[today]!==undefined?`<div class="contact-card"><div class="c-ico">${I.clock}</div><div class="c-label">Today</div><div class="c-val">${fmtHours(hours[today])}</div></div>`:''}
    </div>
    ${content.contact?.mapEmbed?`<div class="map-wrap"><iframe src="${content.contact.mapEmbed}" allowfullscreen loading="lazy" title="Location"></iframe></div>`:''}
    ${calScript0}
  </div>
</section>`;
  }
  return '';
}).join('')}`}

${(() => {
  const now = new Date();
  const activeOffers = (content._offers||[]).filter((o:any)=>o.title&&(!o.validTo||new Date(o.validTo)>=now));
  const popupOffer = activeOffers.find((o:any)=>o.showAsBanner!==false&&o.showOnHome);
  const homeOffers = activeOffers.filter((o:any)=>o.showOnHome);
  const offerPopup = popupOffer && page==='home' ? `
<div id="offer-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;animation:bfadeIn .25s ease">
  <style>@keyframes bfadeIn{from{opacity:0}to{opacity:1}}@keyframes bslideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
  <div style="background:#111;border:1px solid ${P};max-width:520px;width:100%;position:relative;animation:bslideUp .3s ease">
    <button id="offer-close-btn" style="position:absolute;top:12px;right:12px;background:none;border:1px solid #333;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;z-index:1">×</button>
    ${popupOffer.bannerUrl?`<img src="${popupOffer.bannerUrl}" alt="${popupOffer.title}" style="width:100%;max-height:200px;object-fit:cover;display:block"/>`:`<div style="height:4px;background:${P}"></div>`}
    <div style="padding:24px 28px 28px">
      <div style="font-size:10px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.14em;margin-bottom:8px">Special Offer</div>
      <h2 style="font-family:'${FH}',sans-serif;font-size:22px;font-weight:900;color:#fff;text-transform:uppercase;margin-bottom:10px;letter-spacing:.02em">${popupOffer.title}</h2>
      <p style="font-size:14px;color:#666;line-height:1.6;margin-bottom:14px">${popupOffer.description}</p>
      ${popupOffer.validTo?`<p style="font-size:11px;color:${P};font-weight:700;text-transform:uppercase;letter-spacing:.06em">Valid until ${new Date(popupOffer.validTo).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>`:''}
    </div>
  </div>
</div>
<script>(function(){var o=document.getElementById('offer-overlay'),b=document.getElementById('offer-close-btn');if(!o||!b)return;var k='offer_dismissed_${popupOffer.id||0}';if(sessionStorage.getItem(k)){o.style.display='none';return;}b.addEventListener('click',function(){o.style.display='none';sessionStorage.setItem(k,'1');});o.addEventListener('click',function(e){if(e.target===o){o.style.display='none';sessionStorage.setItem(k,'1');}});})();</script>` : '';
  const homeOffersHtml = homeOffers.length && page==='home' ? `
<section style="background:#0e0e0e;padding:48px 40px;border-top:1px solid #1a1a1a">
  <div style="max-width:1440px;margin:0 auto">
    <div style="font-size:10px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.18em;margin-bottom:20px">Current Offers</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1px;background:#1a1a1a">
      ${homeOffers.map((o:any)=>`
      <div style="background:#0a0a0a;overflow:hidden">
        ${o.bannerUrl?`<img src="${o.bannerUrl}" alt="${o.title}" style="width:100%;height:120px;object-fit:cover;display:block"/>`:`<div style="height:3px;background:${P}"></div>`}
        <div style="padding:20px 24px">
          <div style="font-size:15px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;font-family:'${FH}',sans-serif">${o.title}</div>
          <div style="font-size:13px;color:#555;line-height:1.55">${o.description}</div>
          ${o.validTo?`<div style="font-size:11px;color:${P};margin-top:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Until ${new Date(o.validTo).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</div>`:''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>` : '';
  const homeBooking = page==='home' && isMultiPage && (content._pages as any)?.home?.hasBooking ? `
<section style="background:#0a0a0a;padding:80px 40px;border-top:1px solid #1a1a1a">
  <div style="max-width:760px;margin:0 auto">
    <div style="font-size:10px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.18em;margin-bottom:16px">Appointments</div>
    <h2 style="font-family:'${FH}',sans-serif;font-size:clamp(28px,4vw,48px);font-weight:900;color:#fff;text-transform:uppercase;margin-bottom:32px">Book Online</h2>
    ${buildCalendarScript(data.subdomain||'', P, FH, FB, '#0a0a0a', '#1f1f1f', '#fff', 'rgba(255,255,255,.06)', 'Book Appointment', true, apiBase, 'home')}
  </div>
</section>` : '';
  return offerPopup + homeOffersHtml + homeBooking;
})()}

${page === 'home' && (content.gallery||[]).length > 0 ? `
<section style="padding:64px 40px;background:#0a0a0a;border-top:1px solid #1a1a1a">
  <div style="max-width:1440px;margin:0 auto">
    <div style="font-size:10px;font-weight:800;color:${P};text-transform:uppercase;letter-spacing:.18em;margin-bottom:20px">Gallery</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:2px">
      ${(content.gallery||[]).map((url:string)=>`<div style="aspect-ratio:1/1;overflow:hidden"><img src="${url}" alt="Gallery" style="width:100%;height:100%;object-fit:cover"/></div>`).join('')}
    </div>
  </div>
</section>` : ''}

<footer>
  <div class="foot">
    <div class="foot-logo">${content._logoUrl ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:28px;object-fit:contain"/>` : `<div class="logo-box" style="width:28px;height:28px">${clinic.name[0]}</div>${clinic.name}`}</div>
    <div class="foot-links">
      ${footerPageLinks}
    </div>
    <p class="foot-copy">© ${new Date().getFullYear()} ${clinic.name} · Powered by <a href="https://clinickarobar.app" target="_blank" rel="noopener">ClinicKarobar</a></p>
  </div>
</footer>
</body></html>`;
}

// ── WARM ──────────────────────────────────────────────────────────────────────
export function WarmTemplate({ data, page = 'home' }: { data: SiteData; page?: string }) {
  const { content, theme, clinic } = data;
  const P  = theme.primaryColor   || '#d97706';
  const S  = theme.secondaryColor || '#292218';
  const A  = theme.accentColor    || '#fcd34d';
  const FH = theme.fontHeading    || 'Georgia';
  const FB = theme.fontBody       || 'system-ui';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const hours = getOpeningHours(data);
  const today = getTodayKey();
  const vis   = (id: string) => isVisible(data, id);
  const orderedSections = ['hero','about','services','team','testimonials','hours','contact']
    .map(id => (content._blocks||[]).find((b:any) => b.id === id) || { id, visible: true })
    .filter((b:any) => b.visible !== false);


  // ── Multi-page support ───────────────────────────────────────────────────
  const isMultiPage = !!(content._pages);
  const enabledPages = getEnabledPages(data);
  const bookLink = isMultiPage ? '?page=contact' : '#contact';
  const pageNavLinks = isMultiPage
    ? enabledPages.map(p => `<a href="?page=${p.id}" style="color:#6b4e3d;font-size:13px;font-weight:600;text-decoration:none">${p.title}</a>`).join('')
    : `${vis('about')&&content.about?.title?'<a href="#about" style="color:#6b4e3d;font-size:13px;font-weight:600;text-decoration:none">About</a>':''}${vis('services')&&content.services?.length?'<a href="#services" style="color:#6b4e3d;font-size:13px;font-weight:600;text-decoration:none">Services</a>':''}${vis('team')&&content.team?.length?'<a href="#team" style="color:#6b4e3d;font-size:13px;font-weight:600;text-decoration:none">Team</a>':''}${vis('hours')?'<a href="#hours" style="color:#6b4e3d;font-size:13px;font-weight:600;text-decoration:none">Hours</a>':''}`;
  const footerPageLinks = isMultiPage
    ? enabledPages.map(p => `<a href="?page=${p.id}">${p.title}</a>`).join('')
    : `${vis('about')&&content.about?.title?'<a href="#about">About</a>':''}${vis('services')&&content.services?.length?'<a href="#services">Services</a>':''}${vis('hours')?'<a href="#hours">Hours</a>':''}`;

  const css = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'${FB}',system-ui,sans-serif;background:#fdfaf5;color:#2c1810;line-height:1.6}
    a{color:inherit;text-decoration:none}
    img{max-width:100%;display:block}

    .nav{background:#fdfaf5;border-bottom:1px solid #e8dcc8;position:sticky;top:0;z-index:100}
    .nav-inner{max-width:1200px;margin:0 auto;padding:0 36px;height:70px;display:flex;align-items:center;justify-content:space-between}
    .logo{font-family:'${FH}',serif;font-size:22px;font-weight:700;color:#2c1810;font-style:italic;display:flex;align-items:center;gap:12px}
    .logo-leaf{width:30px;height:30px;flex-shrink:0;color:${P}}
    .nav-links{display:flex;align-items:center;gap:4px}
    .nav-links a{color:#9a7c6a;font-size:14px;font-weight:500;padding:8px 16px;border-radius:999px;transition:.2s}
    .nav-links a:hover{color:#2c1810;background:#f5f0e8}
    .nav-cta{background:${P}!important;color:#fff!important;border-radius:999px!important;font-weight:600!important}
    .nav-cta:hover{opacity:.9!important}
    .nav-toggle{display:none;background:none;border:1px solid #e8dcc8;cursor:pointer;color:#2c1810;width:38px;height:38px;align-items:center;justify-content:center;padding:4px;border-radius:10px}
    .nav-mobile{display:none;position:absolute;top:70px;left:0;right:0;background:#fdfaf5;border-bottom:1px solid #e8dcc8;padding:20px 36px;z-index:99}
    .nav-mobile.open{display:block}
    .nav-mobile a{display:block;color:#9a7c6a;padding:13px 0;font-size:15px;border-bottom:1px solid #f0e8d8}
    .nav-mobile .nav-cta{background:${P}!important;color:#fff!important;border-radius:999px!important;text-align:center;margin-top:12px;display:block;padding:13px!important;border:none!important}

    .hero{min-height:90vh;display:flex;align-items:center;background:#f5f0e8;position:relative;overflow:hidden}
    .hero-blob{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
    .hero-blob1{width:500px;height:500px;background:${P};opacity:.07;top:-100px;right:-50px}
    .hero-blob2{width:300px;height:300px;background:${A};opacity:.1;bottom:-50px;left:80px}
    .hero-inner{max-width:1200px;margin:0 auto;padding:80px 36px;display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;position:relative;width:100%}
    .hero-badge{display:inline-flex;align-items:center;gap:10px;background:#fff;color:#9a7c6a;padding:9px 20px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.05em;margin-bottom:30px;border:1px solid #e8dcc8;box-shadow:0 2px 16px rgba(0,0,0,.06)}
    .hero-badge-dot{width:7px;height:7px;border-radius:50%;background:${P};flex-shrink:0}
    .hero h1{font-family:'${FH}',serif;font-size:clamp(36px,5vw,66px);font-weight:700;color:#2c1810;line-height:1.06;letter-spacing:-.02em;margin-bottom:24px;font-style:italic}
    .hero-sub{font-size:17px;color:#9a7c6a;line-height:1.82;max-width:460px;margin-bottom:44px}
    .hero-btns{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:56px}
    .btn-p{display:inline-flex;align-items:center;gap:10px;background:${P};color:#fff;padding:16px 36px;border-radius:999px;font-weight:600;font-size:15px;transition:.25s;box-shadow:0 8px 28px ${P}33}
    .btn-p:hover{transform:translateY(-3px);box-shadow:0 16px 44px ${P}44}
    .btn-s{display:inline-flex;align-items:center;gap:10px;background:#fff;color:#2c1810;padding:15px 35px;border-radius:999px;font-weight:600;font-size:15px;border:1px solid #e8dcc8;transition:.25s;box-shadow:0 2px 12px rgba(0,0,0,.05)}
    .btn-s:hover{border-color:${P};color:${P};transform:translateY(-2px)}
    .stats{display:flex;gap:40px;padding-top:36px;border-top:1px solid #e8dcc8}
    .stat-n{font-family:'${FH}',serif;font-size:34px;font-weight:700;color:#2c1810;line-height:1;font-style:italic}
    .stat-l{font-size:12px;color:#9a7c6a;margin-top:5px}
    .hero-card{background:#fff;border-radius:24px;padding:36px;box-shadow:0 24px 64px rgba(0,0,0,.09);border:1px solid #e8dcc8;position:relative}
    .hero-card::before{content:'';position:absolute;top:0;left:36px;right:36px;height:3px;background:linear-gradient(90deg,${P},${A});border-radius:0 0 3px 3px}
    .hero-card-n{font-family:'${FH}',serif;font-size:56px;font-weight:700;color:${P};line-height:1;font-style:italic;margin-bottom:8px}
    .hero-card-badge{display:inline-flex;align-items:center;gap:8px;background:${P}1a;color:${P};padding:6px 16px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:20px;border:1px solid ${P}22}
    .hero-card-t{font-size:15px;color:#9a7c6a;line-height:1.7}

    .section{padding:88px 36px;border-bottom:1px solid #e8dcc8}
    .section-inner{max-width:1200px;margin:0 auto}
    .alt{background:#f5f0e8}
    .eyebrow{font-size:12px;font-weight:600;color:${P};text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px}
    .sec-h{font-family:'${FH}',serif;font-size:clamp(26px,3.5vw,44px);font-weight:700;color:#2c1810;line-height:1.1;letter-spacing:-.02em;margin-bottom:18px;font-style:italic}
    .sec-p{font-size:16px;color:#9a7c6a;line-height:1.8;max-width:540px}
    .center{text-align:center;max-width:600px;margin:0 auto 56px}
    .center .sec-p{margin:0 auto}

    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:20px;margin-top:56px}
    .card{background:#fff;border-radius:20px;padding:30px;border:1px solid #e8dcc8;transition:.3s;box-shadow:0 2px 16px rgba(0,0,0,.04)}
    .card:hover{transform:translateY(-6px);box-shadow:0 20px 52px rgba(0,0,0,.1);border-color:${P}55}
    .card-ico{width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,${P},${A});display:flex;align-items:center;justify-content:center;margin-bottom:22px;color:#fff;box-shadow:0 6px 18px ${P}33}
    .card h3{font-family:'${FH}',serif;font-size:18px;font-weight:700;color:#2c1810;margin-bottom:8px;font-style:italic}
    .card p{font-size:14px;color:#9a7c6a;line-height:1.65}

    .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:24px;margin-top:56px}
    .team-card{background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e8dcc8;transition:.3s;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,.04)}
    .team-card:hover{transform:translateY(-5px);box-shadow:0 16px 44px rgba(0,0,0,.1)}
    .team-av{height:150px;background:linear-gradient(135deg,${P},${A});display:flex;align-items:center;justify-content:center;font-family:'${FH}',serif;font-size:48px;font-weight:700;color:#fff;font-style:italic}
    .team-body{padding:22px}
    .team-name{font-family:'${FH}',serif;font-size:18px;font-weight:700;color:#2c1810;margin-bottom:4px;font-style:italic}
    .team-role{font-size:11px;color:${P};font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}
    .team-bio{font-size:13px;color:#9a7c6a;line-height:1.6}

    .testi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:20px;margin-top:56px}
    .testi{background:#fff;border-radius:20px;padding:28px;border:1px solid #e8dcc8;transition:.3s;box-shadow:0 2px 16px rgba(0,0,0,.04)}
    .testi:hover{box-shadow:0 16px 44px rgba(0,0,0,.1);border-color:${P}44}
    .testi-q{font-size:52px;font-family:'${FH}',serif;color:${P};opacity:.35;line-height:1;height:36px;display:flex;align-items:center;margin-bottom:12px;font-style:italic}
    .testi-text{font-size:15px;color:#9a7c6a;line-height:1.8;margin-bottom:22px;font-style:italic}
    .testi-author{display:flex;align-items:center;gap:12px;padding-top:18px;border-top:1px solid #f0e8d8}
    .testi-av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${P},${A});display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:15px;flex-shrink:0}
    .testi-name{font-weight:700;color:#2c1810;font-size:14px;font-family:'${FH}',serif;font-style:italic}
    .testi-stars{display:flex;gap:2px;margin-top:3px;color:${P}}

    .hours-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:12px;margin-top:56px}
    .hour-row{background:#fff;border-radius:14px;padding:18px 22px;border:1px solid #e8dcc8;display:flex;justify-content:space-between;align-items:center;transition:.2s}
    .hour-row:hover{border-color:${P}55;box-shadow:0 4px 16px rgba(0,0,0,.06)}
    .hour-row.today{background:${P};border-color:${P};box-shadow:0 8px 28px ${P}33}
    .hour-day{font-size:14px;font-weight:600;color:#2c1810;font-family:'${FH}',serif;font-style:italic}
    .hour-row.today .hour-day{color:#fff}
    .hour-badge{font-size:9px;font-weight:700;background:#fff;color:${P};padding:2px 8px;border-radius:999px;margin-left:9px}
    .hour-time{font-size:13px;color:#9a7c6a}
    .hour-row.today .hour-time{color:rgba(255,255,255,.9);font-weight:600}
    .hour-time.closed{color:#ef4444;font-style:italic}

    .cta{background:linear-gradient(135deg,${S},${P});padding:96px 36px;text-align:center;position:relative;overflow:hidden}
    .cta::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 50% 100%,rgba(255,255,255,.07),transparent)}
    .cta h2{font-family:'${FH}',serif;font-size:clamp(30px,4.5vw,54px);font-weight:700;color:#fff;margin-bottom:16px;font-style:italic;position:relative}
    .cta p{font-size:18px;color:rgba(255,255,255,.78);max-width:540px;margin:0 auto 44px;line-height:1.78;position:relative}
    .btn-cta{display:inline-flex;align-items:center;gap:12px;background:#fff;color:${P};padding:18px 52px;border-radius:999px;font-weight:700;font-size:16px;transition:.25s;box-shadow:0 12px 44px rgba(0,0,0,.2);position:relative}
    .btn-cta:hover{transform:translateY(-3px);box-shadow:0 20px 60px rgba(0,0,0,.3)}

    .contact{background:#f5f0e8;padding:88px 36px}
    .contact-inner{max-width:1200px;margin:0 auto}
    .contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:16px;margin-top:16px}
    .contact-card{background:#fff;border-radius:20px;padding:28px;border:1px solid #e8dcc8;display:flex;flex-direction:column;gap:13px;transition:.2s;box-shadow:0 2px 12px rgba(0,0,0,.04)}
    .contact-card:hover{border-color:${P}55;box-shadow:0 8px 28px rgba(0,0,0,.08)}
    .c-ico{width:44px;height:44px;border-radius:14px;background:${P}1a;border:1px solid ${P}22;display:flex;align-items:center;justify-content:center;color:${P}}
    .c-label{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#c4a882;font-weight:600}
    .c-val{font-size:15px;font-weight:600;color:#2c1810;word-break:break-word;line-height:1.45;font-family:'${FH}',serif}
    .map-wrap{margin-top:32px;border-radius:20px;overflow:hidden;height:320px;border:1px solid #e8dcc8}
    .map-wrap iframe{width:100%;height:100%;border:0}

    footer{background:${S};padding:44px 36px}
    .foot{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:22px}
    .foot-logo{font-family:'${FH}',serif;font-size:22px;font-weight:700;color:#fff;font-style:italic;display:flex;align-items:center;gap:12px}
    .foot-links{display:flex;flex-wrap:wrap;justify-content:center;gap:28px}
    .foot-links a{color:rgba(255,255,255,.4);font-size:13px;font-weight:500;transition:.15s}
    .foot-links a:hover{color:rgba(255,255,255,.85)}
    .foot-copy{font-size:12px;color:rgba(255,255,255,.25)}
    .foot-copy a{color:rgba(255,255,255,.4)}

    @media(min-width:900px){.nav-toggle{display:none!important}.nav-links{display:flex!important}}
    @media(max-width:899px){
      .nav-links{display:none}.nav-toggle{display:flex!important}
      .hero-inner{grid-template-columns:1fr;padding:72px 24px 60px}
      .hero-card{display:none}.section{padding:60px 24px}.contact{padding:60px 24px}.cta{padding:64px 24px}
    }
    @media(max-width:480px){.hero-btns{flex-direction:column}.stats{flex-wrap:wrap;gap:20px}}
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
    <div class="logo">
      ${content._logoUrl
        ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:32px;object-fit:contain"/>`
        : `<svg class="logo-leaf" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
      ${clinic.name}`}
    </div>
    <div class="nav-links">
      ${pageNavLinks}
      <a href="${bookLink}" class="nav-cta">Book Now</a>
    </div>
    <button class="nav-toggle" id="navToggle">${I.menu}</button>
  </div>
  <div class="nav-mobile" id="navMobile">
    ${vis('about')&&content.about?.title?'<a href="#about">About</a>':''}
    ${vis('services')&&content.services?.length?'<a href="#services">Services</a>':''}
    ${vis('hours')?'<a href="#hours">Hours</a>':''}
    <a href="#contact">Contact</a>
    <a href="#contact" class="nav-cta">Book Now</a>
  </div>
</nav>
${nav_script}

${isMultiPage && page !== 'home' ? (() => {
  const pg = (content._pages || {})[page];
  if (!pg || pg.enabled === false) return '<section style="min-height:70vh;display:flex;align-items:center;justify-content:center;background:#fdfaf5"><p style="color:#9a7c6a">Page not found</p></section>';
  if (page === 'about') return `<section style="background:#fdfaf5;padding:80px 32px;min-height:70vh"><div style="max-width:1100px;margin:0 auto"><div style="font-size:11px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.14em;margin-bottom:16px">About Us</div><h1 style="font-family:'${FH}',serif;font-size:clamp(32px,4.5vw,58px);font-weight:800;color:#2c1810;letter-spacing:-.02em;font-style:italic;margin-bottom:20px;line-height:1.1">${pg.headline || content.about?.title || 'About Our Clinic'}</h1><div style="width:44px;height:3px;background:${P};border-radius:99px;margin-bottom:28px"></div><p style="font-size:17px;color:#7a6a58;line-height:1.8;max-width:640px;margin-bottom:48px">${pg.content || content.about?.description || ''}</p>${content.team?.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px">${content.team.map((m:any)=>`<div style="background:#fff;border:1px solid #e8dcc8;border-radius:12px;padding:28px;text-align:center"><div style="width:64px;height:64px;border-radius:50%;background:${P};color:#fff;font-family:'${FH}',serif;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">${(m.name?.[0]||'D').toUpperCase()}</div><div style="font-size:16px;font-weight:700;color:#2c1810;font-family:'${FH}',serif;font-style:italic">${m.name}</div><div style="font-size:12px;color:${P};font-weight:600;margin-top:4px">${m.role}</div></div>`).join('')}</div>`:''}</div></section>`;
  if (page === 'doctors') {
    const doctorImages: Record<string,string> = {};
    (content._doctorImages||[]).forEach((d:any)=>{ if(d.name&&d.url) doctorImages[d.name.toLowerCase()]=d.url; });
    const noTeamW = '<p style="color:#9a7c6a;padding:60px 0;text-align:center">No doctors listed yet — add team members in Content → Our Team.</p>';
    const warmCards = (content.team||[]).map((m:any)=>{const img=doctorImages[m.name?.toLowerCase()]||'';return`<div style="background:#fff;border:1px solid #e8dcc8;border-radius:16px;overflow:hidden">${img?`<img src="${img}" alt="${m.name}" style="width:100%;height:180px;object-fit:cover;object-position:top;display:block"/>`:`<div style="height:100px;background:${P};display:flex;align-items:center;justify-content:center;font-family:'${FH}',serif;font-size:48px;font-weight:800;color:#fff;font-style:italic">${(m.name?.[0]||'D').toUpperCase()}</div>`}<div style="padding:20px;text-align:center"><div style="font-size:17px;font-weight:700;color:#2c1810;font-family:'${FH}',serif;font-style:italic;margin-bottom:4px">${m.name}</div><div style="font-size:12px;color:${P};font-weight:600;margin-bottom:10px">${m.role}</div>${m.bio?`<div style="font-size:13px;color:#9a7c6a;line-height:1.65">${m.bio}</div>`:''}</div></div>`;}).join('');
    return `<section style="background:#fdfaf5;padding:80px 32px;min-height:70vh"><div style="max-width:1100px;margin:0 auto"><div style="font-size:11px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.14em;margin-bottom:16px">Our Team</div><h1 style="font-family:'${FH}',serif;font-size:clamp(32px,4.5vw,58px);font-weight:800;color:#2c1810;letter-spacing:-.02em;font-style:italic;margin-bottom:20px;line-height:1.1">${pg.headline || 'Meet Our Doctors'}</h1><div style="width:44px;height:3px;background:${P};border-radius:99px;margin-bottom:28px"></div>${pg.content?`<p style="font-size:17px;color:#7a6a58;line-height:1.8;max-width:640px;margin-bottom:48px">${pg.content}</p>`:''} ${content.team?.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:24px;margin-top:20px">${warmCards}</div>`:noTeamW}</div></section>`;
  }
  if (page === 'contact') {
    const phone = content.contact?.phone||clinic.phone||'';
    const email = content.contact?.email||clinic.email||'';
    const addr  = content.contact?.address||'';
    const map   = content.contact?.mapEmbed||'';
    const subdomain = data.subdomain||'';
    const calScript = pg.hasBooking ? buildCalendarScript(subdomain, P, FH, FB, '#fff', '#e8dcc8', '#2c1810', '#f5f0e8', pg.ctaText||'Book Appointment', false, apiBase, 'contact') : '';
    return `<section style="background:#fdfaf5;padding:80px 32px;min-height:70vh"><div style="max-width:1100px;margin:0 auto"><div style="font-size:11px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.14em;margin-bottom:16px">Contact</div><h1 style="font-family:'${FH}',serif;font-size:clamp(32px,4.5vw,58px);font-weight:800;color:#2c1810;letter-spacing:-.02em;font-style:italic;margin-bottom:20px;line-height:1.1">${pg.headline||'Get In Touch'}</h1><div style="width:44px;height:3px;background:${P};border-radius:99px;margin-bottom:28px"></div>${pg.content?`<p style="font-size:17px;color:#7a6a58;line-height:1.8;max-width:640px;margin-bottom:40px">${pg.content}</p>`:''}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:32px">${phone?`<div style="background:#fff;border:1px solid #e8dcc8;border-radius:12px;padding:24px"><div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Phone</div><div style="font-size:16px;font-weight:600;color:#2c1810">${phone}</div></div>`:''}${email?`<div style="background:#fff;border:1px solid #e8dcc8;border-radius:12px;padding:24px"><div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Email</div><div style="font-size:16px;font-weight:600;color:#2c1810">${email}</div></div>`:''}${addr?`<div style="background:#fff;border:1px solid #e8dcc8;border-radius:12px;padding:24px"><div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Address</div><div style="font-size:16px;font-weight:600;color:#2c1810">${addr}</div></div>`:''}</div>${map?`<div style="margin-bottom:32px;border-radius:16px;overflow:hidden;border:1px solid #e8dcc8"><iframe src="${map}" style="width:100%;height:300px;border:none" allowfullscreen loading="lazy" title="Location"></iframe></div>`:''} ${calScript}</div></section>`;
  }
  return '<section style="min-height:70vh;display:flex;align-items:center;justify-content:center;background:#fdfaf5"><p style="color:#9a7c6a">Page not found</p></section>';
})() : `${orderedSections.map(block => {
  if (block.id === 'hero') return `
<section class="hero">
  <div class="hero-blob hero-blob1"></div><div class="hero-blob hero-blob2"></div>
  <div class="hero-inner">
    <div>
      <div class="hero-badge"><span class="hero-badge-dot"></span>Caring for Your Smile</div>
      <h1>${content.hero?.headline || `Welcome to<br>${clinic.name}`}</h1>
      <p class="hero-sub">${content.hero?.subheadline||'Warm, personalised dental care in a comfortable and welcoming environment.'}</p>
      <div class="hero-btns">
        <a href="#contact" class="btn-p">${content.hero?.ctaText||'Book Appointment'} ${I.arrow}</a>
        ${vis('about')&&content.about?.title?'<a href="#about" class="btn-s">Our Story</a>':''}
      </div>
      <div class="stats">
        <div><div class="stat-n">10+</div><div class="stat-l">Years of care</div></div>
        <div><div class="stat-n">5k+</div><div class="stat-l">Happy patients</div></div>
        <div><div class="stat-n">98%</div><div class="stat-l">Satisfaction</div></div>
      </div>
    </div>
    <div>
      <div class="hero-card">
        <div class="hero-card-badge"><span style="width:6px;height:6px;border-radius:50%;background:${P};flex-shrink:0;display:inline-block"></span>Trusted by families</div>
        <div class="hero-card-n">5,000+</div>
        <p class="hero-card-t">Families trust us with their smiles. Experience the warmth and expertise that sets us apart.</p>
      </div>
    </div>
  </div>
</section>`;

  if (block.id === 'about' && vis('about') && content.about?.title) return `
<section class="section" id="about">
  <div class="section-inner">
    <div style="max-width:700px;margin-bottom:56px">
      <div class="eyebrow">About Us</div>
      <h2 class="sec-h">${content.about.title}</h2>
      <p class="sec-p">${content.about.description}</p>
    </div>
    <div class="grid">
      ${['Family Care','Modern Comfort','Gentle Touch','Easy Scheduling'].map((t,i) => `
      <div class="card">
        <div class="card-ico">${[I.phone,I.clock,I.pin,I.mail][i]}</div>
        <h3>${t}</h3>
        <p>${['Comprehensive dental care for every member of your family.','A warm, modern clinic designed for your comfort.','Gentle techniques that prioritise your ease.','Book online or call — we fit around your life.'][i]}</p>
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
      <p class="sec-p">Comprehensive dental care for every stage of life.</p>
    </div>
    <div class="grid">
      ${content.services.map(s => `
      <div class="card">
        <div class="card-ico">${I.pin}</div>
        <h3>${s.title}</h3><p>${s.description}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'team' && vis('team') && content.team?.length) return `
<section class="section" id="team">
  <div class="section-inner">
    <div class="center">
      <div class="eyebrow">Our People</div>
      <h2 class="sec-h">Meet the Team</h2>
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
      <h2 class="sec-h">Our Patients Say</h2>
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
            <div class="testi-stars">${Array.from({length:Math.min(t.rating||5,5)},()=>I.star).join('')}</div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'hours' && vis('hours')) return `
<section class="section" id="hours">
  <div class="section-inner">
    <div class="center">
      <div class="eyebrow">Opening Hours</div>
      <h2 class="sec-h">When We're Here</h2>
    </div>
    <div class="hours-grid">
      ${DAYS.map(day => {
        const h = hours[day]; const isToday = day===today;
        return `<div class="hour-row${isToday?' today':''}">
          <span class="hour-day">${day.charAt(0).toUpperCase()+day.slice(1)}${isToday?`<span class="hour-badge">Today</span>`:''}</span>
          <span class="hour-time${!h?' closed':''}">${fmtHours(h)}</span>
        </div>`;
      }).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'contact' && vis('contact')) {
    const pg0 = (content._pages?.['home'] as any) || {};
    const showBookingW = !isMultiPage || pg0.hasBooking !== false;
    const subdomainW = data.subdomain||'';
    const calScriptW = showBookingW ? buildCalendarScript(subdomainW, P, FH, FB, '#fff', '#e8dcc8', '#2c1810', '#f5f0e8', 'Book Appointment', false, apiBase, 'sp-contact') : '';
    return `
<div class="cta">
  <h2>Ready to Book?</h2>
  <p>We'd love to welcome you and your family. Book your appointment today.</p>
  <a href="#contact" class="btn-cta">Book Appointment ${I.arrow}</a>
</div>
<section class="contact" id="contact">
  <div class="contact-inner">
    <div style="margin-bottom:44px"><div class="eyebrow">Get In Touch</div><h2 class="sec-h">Visit Us</h2></div>
    <div class="contact-grid">
      ${(content.contact?.phone||clinic.phone)?`<div class="contact-card"><div class="c-ico">${I.phone}</div><div class="c-label">Phone</div><div class="c-val">${content.contact?.phone||clinic.phone}</div></div>`:''}
      ${(content.contact?.email||clinic.email)?`<div class="contact-card"><div class="c-ico">${I.mail}</div><div class="c-label">Email</div><div class="c-val">${content.contact?.email||clinic.email}</div></div>`:''}
      ${content.contact?.address?`<div class="contact-card"><div class="c-ico">${I.pin}</div><div class="c-label">Address</div><div class="c-val">${content.contact.address}</div></div>`:''}
      ${hours[today]!==undefined?`<div class="contact-card"><div class="c-ico">${I.clock}</div><div class="c-label">Today</div><div class="c-val">${fmtHours(hours[today])}</div></div>`:''}
    </div>
    ${content.contact?.mapEmbed?`<div class="map-wrap"><iframe src="${content.contact.mapEmbed}" allowfullscreen loading="lazy" title="Location"></iframe></div>`:''}
    ${calScriptW}
  </div>
</section>`;
  }
  return '';
}).join('')}`}

${(() => {
  const now = new Date();
  const activeOffers = (content._offers||[]).filter((o:any)=>o.title&&(!o.validTo||new Date(o.validTo)>=now));
  const popupOffer = activeOffers.find((o:any)=>o.showAsBanner!==false&&o.showOnHome);
  const homeOffers = activeOffers.filter((o:any)=>o.showOnHome);
  const warmPopup = popupOffer && page==='home' ? `
<div id="offer-overlay" style="position:fixed;inset:0;background:rgba(41,34,24,.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;animation:wfadeIn .25s ease">
  <style>@keyframes wfadeIn{from{opacity:0}to{opacity:1}}@keyframes wslideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
  <div style="background:#fdfaf5;border:1px solid #e8dcc8;border-radius:20px;max-width:500px;width:100%;position:relative;overflow:hidden;animation:wslideUp .3s ease">
    <button id="offer-close-btn" style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,.06);border:none;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#2c1810;font-size:18px;border-radius:50%;z-index:1">×</button>
    ${popupOffer.bannerUrl?`<img src="${popupOffer.bannerUrl}" alt="${popupOffer.title}" style="width:100%;max-height:200px;object-fit:cover;display:block"/>`:`<div style="height:6px;background:${P};border-radius:99px 99px 0 0"></div>`}
    <div style="padding:24px 28px 28px">
      <div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Special Offer</div>
      <h2 style="font-family:'${FH}',serif;font-size:22px;font-weight:700;color:#2c1810;font-style:italic;margin-bottom:10px">${popupOffer.title}</h2>
      <p style="font-size:14px;color:#9a7c6a;line-height:1.6;margin-bottom:14px">${popupOffer.description}</p>
      ${popupOffer.validTo?`<p style="font-size:11px;color:${P};font-weight:600">Valid until ${new Date(popupOffer.validTo).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>`:''}
    </div>
  </div>
</div>
<script>(function(){var o=document.getElementById('offer-overlay'),b=document.getElementById('offer-close-btn');if(!o||!b)return;var k='offer_dismissed_${popupOffer.id||0}';if(sessionStorage.getItem(k)){o.style.display='none';return;}b.addEventListener('click',function(){o.style.display='none';sessionStorage.setItem(k,'1');});o.addEventListener('click',function(e){if(e.target===o){o.style.display='none';sessionStorage.setItem(k,'1');}});})();</script>` : '';
  const warmHomeOffers = homeOffers.length && page==='home' ? `
<section style="background:#fff;padding:48px 40px;border-top:1px solid #e8dcc8">
  <div style="max-width:1200px;margin:0 auto">
    <div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.14em;margin-bottom:20px">Current Offers</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
      ${homeOffers.map((o:any)=>`
      <div style="background:#fdfaf5;border:1px solid #e8dcc8;border-radius:16px;overflow:hidden">
        ${o.bannerUrl?`<img src="${o.bannerUrl}" alt="${o.title}" style="width:100%;height:130px;object-fit:cover;display:block"/>`:`<div style="height:4px;background:${P};border-radius:99px 99px 0 0"></div>`}
        <div style="padding:18px 20px">
          <div style="font-family:'${FH}',serif;font-size:16px;font-weight:700;color:#2c1810;font-style:italic;margin-bottom:6px">${o.title}</div>
          <div style="font-size:13px;color:#9a7c6a;line-height:1.55">${o.description}</div>
          ${o.validTo?`<div style="font-size:11px;color:${P};margin-top:8px;font-weight:600">Valid until ${new Date(o.validTo).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</div>`:''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>` : '';
  const warmHomeBooking = page==='home' && isMultiPage && (content._pages as any)?.home?.hasBooking ? `
<section style="background:#fdfaf5;padding:80px 40px;border-top:1px solid #e8dcc8">
  <div style="max-width:760px;margin:0 auto">
    <div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.14em;margin-bottom:16px">Appointments</div>
    <h2 style="font-family:'${FH}',serif;font-size:clamp(28px,4vw,44px);font-weight:700;color:#2c1810;font-style:italic;margin-bottom:32px">Book Your Visit</h2>
    ${buildCalendarScript(data.subdomain||'', P, FH, FB, '#fff', '#e8dcc8', '#2c1810', '#f5f0e8', 'Book Appointment', false, apiBase, 'home')}
  </div>
</section>` : '';
  return warmPopup + warmHomeOffers + warmHomeBooking;
})()}

${page === 'home' && (content.gallery||[]).length > 0 ? `
<section style="padding:64px 40px;background:#f5f0e8;border-top:1px solid #e8dcc8">
  <div style="max-width:1200px;margin:0 auto">
    <div style="font-family:'${FH}',serif;font-size:28px;font-weight:700;color:#2c1810;font-style:italic;margin-bottom:28px">Our Clinic</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
      ${(content.gallery||[]).map((url:string)=>`<div style="aspect-ratio:1/1;overflow:hidden;border-radius:12px"><img src="${url}" alt="Gallery" style="width:100%;height:100%;object-fit:cover"/></div>`).join('')}
    </div>
  </div>
</section>` : ''}

<footer>
  <div class="foot">
    <div class="foot-logo">
      ${content._logoUrl
        ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:26px;object-fit:contain"/>`
        : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:${P}"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
      ${clinic.name}`}
    </div>
    <div class="foot-links">
      ${footerPageLinks}
    </div>
    <p class="foot-copy">© ${new Date().getFullYear()} ${clinic.name} · Powered by <a href="https://clinickarobar.app" target="_blank" rel="noopener">ClinicKarobar</a></p>
  </div>
</footer>
</body></html>`;
}