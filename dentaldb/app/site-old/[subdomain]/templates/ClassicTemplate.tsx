import { SiteData, DAYS, DAY_SHORT, fmtHours, getTodayKey, isVisible, getOpeningHours, getEnabledPages } from './types';

// ── Shared booking calendar script (returns inline JS string) ─────────────────
function buildBookingScript(opts: {
  P: string; FH: string; FB: string;
  subdomain: string; apiBase: string;
  darkBg?: string; textColor?: string; borderColor?: string;
  btnBg?: string; btnColor?: string;
}) {
  const { P, FH, FB, subdomain, apiBase, darkBg = '#1a1208', textColor = '#1a1208', borderColor = '#e8e0d0', btnBg = '#1a1208', btnColor = '#fff' } = opts;
  return `
(function(){
  var API='${apiBase}',sub='${subdomain}';
  var root=document.getElementById('cal-root');
  if(!root)return;
  var today=new Date();today.setHours(0,0,0,0);
  var current=new Date(today);
  var selected=null,selectedTime=null,allSlots={};
  var branchId=null;

  function pad(n){return String(n).padStart(2,'0');}
  function fmt(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function fmtDisp(d){return new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});}

  // Load all 14-day slots at once
  function loadAllSlots(){
    var url=API+'/api/v1/website-builder/public/'+sub+'/available-slots'+(branchId?'?branchId='+branchId:'');
    root.innerHTML='<p style="color:#888;font-size:13px;padding:20px 0;text-align:center">Loading available slots…</p>';
    fetch(url).then(function(r){return r.json();}).then(function(d){
      allSlots=d.slotsPerDay||{};
      renderCalendar();
    }).catch(function(){allSlots={};renderCalendar();});
  }

  function renderCalendar(){
    var year=current.getFullYear(),month=current.getMonth();
    var firstDay=new Date(year,month,1).getDay();
    var daysInMonth=new Date(year,month+1,0).getDate();
    var monthName=current.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    var P='${P}';

    var html='<div style="background:#fff;border:2px solid ${textColor};overflow:hidden;font-family:\\'${FB}\\',system-ui,sans-serif">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:${darkBg}">';
    html+='<button id="cal-prev" style="background:none;border:1px solid rgba(255,255,255,.3);color:#fff;width:30px;height:30px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">‹</button>';
    html+='<span style="font-family:\\'${FH}\\',serif;font-weight:900;color:#fff;font-size:15px">'+monthName+'</span>';
    html+='<button id="cal-next" style="background:none;border:1px solid rgba(255,255,255,.3);color:#fff;width:30px;height:30px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">›</button>';
    html+='</div>';
    // Day labels
    html+='<div style="display:grid;grid-template-columns:repeat(7,1fr);background:#f9f6f1;border-bottom:1px solid ${borderColor}">';
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d){
      html+='<div style="text-align:center;padding:8px 2px;font-size:10px;font-weight:700;color:#7a6a58;text-transform:uppercase;letter-spacing:.05em">'+d+'</div>';
    });
    html+='</div>';
    // Days grid
    html+='<div style="display:grid;grid-template-columns:repeat(7,1fr)">';
    for(var i=0;i<firstDay;i++) html+='<div style="min-height:42px;background:#fafafa;border:1px solid #f0ebe4"></div>';
    for(var d=1;d<=daysInMonth;d++){
      var dt=new Date(year,month,d),key=fmt(dt);
      var isPast=dt<today,isSel=key===selected,isToday=key===fmt(today);
      var daySlots=allSlots[key];
      var hasSlots=daySlots&&daySlots.length>0;
      var bg=isSel?P:(isToday?'#f9f6f1':'#fff');
      var border=isSel?'2px solid '+P:(isToday?'2px solid ${textColor}':'1px solid ${borderColor}');
      var color=isSel?'#fff':(isPast?'#ccc':'${textColor}');
      html+='<div data-date="'+key+'" data-past="'+(isPast?1:0)+'" style="min-height:42px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:'+(isPast||!daySlots?'default':'pointer')+';background:'+bg+';border:'+border+';position:relative;transition:.15s;padding:4px 2px">';
      html+='<span style="font-size:13px;font-weight:700;color:'+color+'">'+d+'</span>';
      if(hasSlots&&!isPast){
        html+='<div style="font-size:9px;color:'+(isSel?'rgba(255,255,255,.8)':P)+';font-weight:600;margin-top:1px">'+daySlots.length+' free</div>';
      } else if(!isPast&&daySlots&&daySlots.length===0){
        html+='<div style="font-size:9px;color:#ccc;margin-top:1px">full</div>';
      }
      html+='</div>';
    }
    html+='</div></div>';

    // Time slots panel
    if(selected){
      var daySlotsSel=allSlots[selected]||[];
      html+='<div style="margin-top:16px"><p style="font-family:\\'${FH}\\',serif;font-weight:700;font-size:13px;color:${textColor};margin-bottom:10px">Available times — '+fmtDisp(selected)+'</p>';
      if(daySlotsSel.length===0){
        html+='<p style="color:#7a6a58;font-size:13px;padding:14px;border:1px solid ${borderColor};text-align:center;background:#fafafa">No available slots for this date</p>';
      } else {
        html+='<div style="display:flex;flex-wrap:wrap;gap:8px">';
        daySlotsSel.forEach(function(s){
          var t=typeof s==='string'?s:(s.time||s);
          var isST=t===selectedTime;
          html+='<button data-time="'+t+'" style="padding:8px 14px;border:'+(isST?'2px solid '+P:'1px solid ${borderColor}')+';background:'+(isST?P:'#fff')+';color:'+(isST?'#fff':'${textColor}')+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:.15s;border-radius:4px">'+t+'</button>';
        });
        html+='</div>';
      }
      html+='</div>';
    }

    // Booking form
    if(selected&&selectedTime){
      html+='<div style="margin-top:20px;padding:22px;border:2px solid ${textColor};background:#fff">';
      html+='<h4 style="font-family:\\'${FH}\\',serif;font-weight:900;font-size:15px;margin-bottom:14px;color:${textColor}">Your Details — '+fmtDisp(selected)+' at '+selectedTime+'</h4>';
      html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
      html+='<input id="b-name" placeholder="Full Name *" style="padding:10px 12px;border:2px solid ${textColor};font-size:14px;font-family:inherit;width:100%;outline:none"/>';
      html+='<input id="b-phone" placeholder="Phone *" style="padding:10px 12px;border:2px solid ${textColor};font-size:14px;font-family:inherit;width:100%;outline:none"/>';
      html+='</div>';
      html+='<input id="b-email" placeholder="Email (optional)" style="padding:10px 12px;border:1px solid ${borderColor};font-size:14px;font-family:inherit;width:100%;margin-bottom:10px;outline:none"/>';
      html+='<textarea id="b-note" placeholder="Notes (optional)" rows="2" style="padding:10px 12px;border:1px solid ${borderColor};font-size:14px;font-family:inherit;width:100%;resize:none;margin-bottom:14px;outline:none"></textarea>';
      html+='<button id="b-submit" style="background:${btnBg};color:${btnColor};padding:12px 28px;font-size:14px;font-weight:700;border:none;cursor:pointer;font-family:inherit;width:100%;transition:.2s">Confirm Appointment</button>';
      html+='<div id="b-msg" style="margin-top:10px;font-size:13px"></div>';
      html+='</div>';
    }

    root.innerHTML=html;

    // Events
    root.querySelectorAll('[data-date]').forEach(function(el){
      el.addEventListener('click',function(){
        var key=el.getAttribute('data-date');
        var past=el.getAttribute('data-past')==='1';
        var slots=allSlots[key];
        if(past||!slots||slots.length===0)return;
        selected=key;selectedTime=null;renderCalendar();
      });
    });
    root.querySelectorAll('[data-time]').forEach(function(el){
      el.addEventListener('click',function(){selectedTime=el.getAttribute('data-time');renderCalendar();});
    });
    var prev=document.getElementById('cal-prev');
    var next=document.getElementById('cal-next');
    if(prev)prev.addEventListener('click',function(){current.setMonth(current.getMonth()-1);renderCalendar();});
    if(next)next.addEventListener('click',function(){current.setMonth(current.getMonth()+1);renderCalendar();});
    var sub2=document.getElementById('b-submit');
    if(sub2)sub2.addEventListener('click',function(){
      var name=document.getElementById('b-name').value.trim();
      var phone=document.getElementById('b-phone').value.trim();
      var email=document.getElementById('b-email').value.trim();
      var note=document.getElementById('b-note').value.trim();
      var msg=document.getElementById('b-msg');
      if(!name||!phone){msg.style.color='#ef4444';msg.textContent='Please enter your name and phone number.';return;}
      sub2.disabled=true;sub2.textContent='Booking…';
      fetch(API+'/api/v1/website-builder/public/'+sub+'/book',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:name,phone:phone,email:email,note:note,date:selected,time:selectedTime,branchId:branchId})
      }).then(function(r){return r.json();}).then(function(d){
        if(d.success||d.appointmentId){
          msg.style.color='#16a34a';
          msg.innerHTML='✅ Booked! We will confirm your appointment shortly.';
          sub2.textContent='Booked!';
          // Remove slot from local cache
          if(allSlots[selected]){allSlots[selected]=allSlots[selected].filter(function(s){return s!==selectedTime;});}
          selected=null;selectedTime=null;
          setTimeout(function(){renderCalendar();},2200);
        } else {
          msg.style.color='#ef4444';
          msg.textContent=d.message||'Booking failed. Please call us directly.';
          sub2.disabled=false;sub2.textContent='Confirm Appointment';
        }
      }).catch(function(){
        msg.style.color='#ef4444';msg.textContent='Connection error. Please call us to book.';
        sub2.disabled=false;sub2.textContent='Confirm Appointment';
      });
    });
  }

  // Branch selector wiring
  var bsel=document.getElementById('branch-select');
  if(bsel){bsel.addEventListener('change',function(){branchId=bsel.value||null;selected=null;selectedTime=null;loadAllSlots();});}

  loadAllSlots();
})();
`;
}

export default function ClassicTemplate({ data, page = 'home' }: { data: SiteData; page?: string }) {
  const { content, theme, clinic } = data;
  const P  = theme.primaryColor   || '#2563eb';
  const S  = theme.secondaryColor || '#1e3a5f';
  const FH = theme.fontHeading    || 'Georgia';
  const FB = theme.fontBody       || 'system-ui';
  const hours = getOpeningHours(data);
  const today = getTodayKey();
  const vis   = (id: string) => isVisible(data, id);
  const orderedSections = ['hero','about','services','team','testimonials','hours','contact']
    .map(id => (content._blocks || []).find((b:any) => b.id === id) || { id, visible: true })
    .filter((b:any) => b.visible !== false);

  const isMultiPage = !!(content._pages);
  const enabledPages = getEnabledPages(data);
  const pageData = content._pages?.[page];
  const branches: any[] = (data as any).branches || [];

  const pageNavLinks = isMultiPage
    ? enabledPages.map(p =>
        `<a href="?page=${p.id}" class="nav-link${p.id === page ? ' nav-link-active' : ''}">${p.title}</a>`
      ).join('')
    : `${vis('about')&&content.about?.title?'<a href="#about" class="nav-link">About</a>':''}
       ${vis('services')&&content.services?.length?'<a href="#services" class="nav-link">Services</a>':''}
       ${vis('team')&&content.team?.length?'<a href="#team" class="nav-link">Team</a>':''}
       ${vis('testimonials')&&content.testimonials?.length?'<a href="#testimonials" class="nav-link">Reviews</a>':''}
       ${vis('hours')?'<a href="#hours" class="nav-link">Hours</a>':''}
       <a href="#contact" class="nav-link">Contact</a>`;

  const footerPageLinks = isMultiPage
    ? enabledPages.map(p => `<a href="?page=${p.id}">${p.title}</a>`).join('')
    : `${vis('about')&&content.about?.title?'<a href="#about">About</a>':''}
       ${vis('services')&&content.services?.length?'<a href="#services">Services</a>':''}
       ${vis('hours')?'<a href="#hours">Hours</a>':''}
       <a href="#contact">Contact</a>`;

  const bookLink = isMultiPage ? '?page=contact' : '#contact';
  const subdomain = data.subdomain || '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const svgIco = (name: string) => {
    const icons: Record<string,string> = {
      phone:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.5 6.5l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
      mail:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
      pin:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
      clock:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      star:`<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
      arrow:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
      menu:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
      x:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    };
    return icons[name] || icons.phone;
  };

  // Branch selector HTML (only if multiple branches)
  const branchSelector = branches.length > 1
    ? `<div style="margin-bottom:18px"><label style="font-size:12px;font-weight:700;color:#7a6a58;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:6px">Select Branch</label>
       <select id="branch-select" style="padding:10px 14px;border:2px solid #1a1208;font-size:14px;font-family:inherit;width:100%;background:#fff;color:#1a1208;cursor:pointer">
         <option value="">All branches</option>
         ${branches.map((b:any) => `<option value="${b.id}">${b.name}${b.address?` — ${b.address}`:''}</option>`).join('')}
       </select></div>`
    : '';

  // Booking calendar block
  const calendarBlock = `
<div id="booking-section" style="margin-top:48px">
  <h3 style="font-family:'${FH}',serif;font-size:22px;font-weight:900;margin-bottom:6px;color:#1a1208">Book an Appointment</h3>
  <p style="color:#7a6a58;margin-bottom:20px;font-size:14px">Select a date and time — click any green slot to book</p>
  ${branchSelector}
  <div id="cal-root" style="font-family:'${FB}',system-ui,sans-serif"></div>
</div>
<script>
${buildBookingScript({ P, FH, FB, subdomain, apiBase, darkBg:'#1a1208', textColor:'#1a1208', borderColor:'#e8e0d0', btnBg:'#1a1208', btnColor:'#fff' })}
</script>`;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700&family=Source+Sans+3:wght@400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'${FB}',system-ui,sans-serif;background:#f9f6f1;color:#1a1208;line-height:1.6}
    a{color:inherit;text-decoration:none}
    img{max-width:100%;display:block}

    .nav{background:#fff;border-bottom:3px solid #1a1208;position:sticky;top:0;z-index:100}
    .nav-inner{max-width:1200px;margin:0 auto;padding:0 32px;height:72px;display:flex;align-items:center;justify-content:space-between}
    .logo{font-family:'${FH}',serif;font-size:22px;font-weight:900;color:#1a1208;display:flex;align-items:center;gap:14px;letter-spacing:-.01em}
    .logo-bar{width:4px;height:28px;background:${P};border-radius:1px;flex-shrink:0}
    .nav-links{display:flex;align-items:center;gap:0}
    .nav-links a{color:#888;font-size:13px;font-weight:600;padding:8px 18px;text-transform:uppercase;letter-spacing:.07em;transition:.15s;border-bottom:3px solid transparent;margin-bottom:-3px}
    .nav-links a:hover,.nav-link-active{color:#1a1208!important;border-bottom-color:#1a1208!important}
    .nav-cta{background:#1a1208!important;color:#fff!important;border-bottom:3px solid #1a1208!important;padding:10px 26px!important}
    .nav-cta:hover{background:${P}!important;border-bottom-color:${P}!important}
    .nav-toggle{display:none;background:none;border:2px solid #1a1208;cursor:pointer;padding:6px;color:#1a1208;width:40px;height:40px;align-items:center;justify-content:center}
    .nav-mobile{display:none;position:absolute;top:72px;left:0;right:0;background:#fff;border-bottom:3px solid #1a1208;padding:20px 32px;z-index:99}
    .nav-mobile.open{display:block}
    .nav-mobile a{display:block;color:#555;padding:13px 0;font-size:15px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e8e0d0}
    .nav-mobile .nav-cta{background:#1a1208!important;color:#fff!important;text-align:center;margin-top:12px;display:block;border:none!important;padding:13px!important}

    /* Offer popup banner */
    .offer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .25s ease}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .offer-modal{background:#fff;border:3px solid #1a1208;max-width:540px;width:100%;position:relative;animation:slideUp .3s ease}
    @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
    .offer-close{position:absolute;top:12px;right:12px;background:none;border:2px solid #1a1208;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#1a1208}
    .offer-close:hover{background:#1a1208;color:#fff}

    .hero{background:#1a1208;min-height:88vh;display:flex;align-items:center;position:relative;overflow:hidden}
    .hero-texture{position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 72px),repeating-linear-gradient(90deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 72px)}
    .hero-accent{position:absolute;top:0;right:0;bottom:0;width:42%;background:${P};clip-path:polygon(18% 0,100% 0,100% 100%,0 100%);opacity:.07}
    .hero-inner{max-width:1200px;margin:0 auto;padding:80px 32px;display:grid;grid-template-columns:1.1fr 0.9fr;gap:72px;align-items:center;position:relative;width:100%}
    .hero-tag{font-size:11px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.18em;margin-bottom:20px;display:flex;align-items:center;gap:14px}
    .hero-tag::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.12);max-width:80px}
    .hero h1{font-family:'${FH}',serif;font-size:clamp(38px,5.5vw,70px);font-weight:900;color:#fff;line-height:1.0;letter-spacing:-.03em;margin-bottom:24px}
    .hero-rule{width:56px;height:4px;background:${P};margin-bottom:24px}
    .hero-sub{font-size:17px;color:rgba(255,255,255,.55);line-height:1.8;max-width:460px;margin-bottom:44px}
    .hero-btns{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:60px}
    .btn-p{display:inline-flex;align-items:center;gap:10px;background:${P};color:#fff;padding:16px 38px;font-weight:700;font-size:15px;transition:.2s;letter-spacing:.01em}
    .btn-p:hover{background:#fff;color:#1a1208}
    .btn-s{display:inline-flex;align-items:center;gap:10px;background:transparent;color:#fff;padding:15px 37px;font-weight:600;font-size:15px;border:2px solid rgba(255,255,255,.25);transition:.2s}
    .btn-s:hover{border-color:#fff}
    .stats{display:flex;gap:52px;padding-top:44px;border-top:1px solid rgba(255,255,255,.1)}
    .stat-n{font-family:'${FH}',serif;font-size:38px;font-weight:900;color:#fff;line-height:1}
    .stat-l{font-size:11px;color:rgba(255,255,255,.35);margin-top:5px;text-transform:uppercase;letter-spacing:.08em}
    .hero-facts{display:flex;flex-direction:column;gap:0}
    .fact{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);padding:26px 28px;position:relative;transition:.2s}
    .fact:hover{background:rgba(255,255,255,.07)}
    .fact::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:${P}}
    .fact-n{font-family:'${FH}',serif;font-size:42px;font-weight:900;color:${P};line-height:1;margin-bottom:7px}
    .fact-t{font-size:13px;color:rgba(255,255,255,.45);line-height:1.5}

    .section{padding:88px 32px;border-bottom:1px solid #e8e0d0}
    .section-inner{max-width:1200px;margin:0 auto}
    .sec-alt{background:#fff}
    .eyebrow{font-size:11px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.14em;margin-bottom:12px}
    .sec-h{font-family:'${FH}',serif;font-size:clamp(28px,3.5vw,46px);font-weight:900;color:#1a1208;line-height:1.08;letter-spacing:-.025em;margin-bottom:10px}
    .rule{width:44px;height:3px;background:#1a1208;margin-bottom:20px}
    .sec-p{font-size:16px;color:#7a6a58;line-height:1.75;max-width:560px}
    .sec-center{text-align:center;max-width:600px;margin:0 auto 52px}
    .sec-center .rule{margin:0 auto 20px}

    .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:0;margin-top:52px;border:2px solid #1a1208}
    .card{padding:32px;border-right:2px solid #1a1208;border-bottom:2px solid #1a1208;background:#fff;transition:.2s;position:relative;overflow:hidden}
    .card:last-child,.card:nth-child(4n){border-right:none}
    .card::after{content:'';position:absolute;bottom:0;left:0;width:0;height:3px;background:${P};transition:.35s}
    .card:hover::after{width:100%}
    .card:hover{background:#f9f6f1}
    .card-ico{width:50px;height:50px;border:2px solid #1a1208;display:flex;align-items:center;justify-content:center;margin-bottom:22px;color:#1a1208;transition:.25s}
    .card:hover .card-ico{background:${P};border-color:${P};color:#fff}
    .card h3{font-family:'${FH}',serif;font-size:19px;font-weight:800;color:#1a1208;margin-bottom:8px}
    .card p{font-size:14px;color:#7a6a58;line-height:1.65}

    .team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:28px;margin-top:52px}
    .team-card{background:#fff;border:2px solid #1a1208;overflow:hidden;transition:.25s;text-align:center}
    .team-card:hover{box-shadow:8px 8px 0 #1a1208;transform:translate(-2px,-2px)}
    .team-av{height:180px;background:${P};border-bottom:2px solid #1a1208;display:flex;align-items:center;justify-content:center;font-family:'${FH}',serif;font-size:56px;font-weight:900;color:#fff;background-size:cover;background-position:center}
    .team-body{padding:22px}
    .team-name{font-family:'${FH}',serif;font-size:20px;font-weight:800;color:#1a1208;margin-bottom:4px}
    .team-role{font-size:11px;color:${P};font-weight:700;text-transform:uppercase;letter-spacing:.09em;margin-bottom:10px}
    .team-bio{font-size:13px;color:#7a6a58;line-height:1.6}

    .testi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:28px;margin-top:52px}
    .testi{background:#fff;border:2px solid #1a1208;padding:30px;position:relative;transition:.25s}
    .testi:hover{box-shadow:6px 6px 0 ${P};transform:translate(-2px,-2px)}
    .testi-q{font-family:'${FH}',serif;font-size:80px;line-height:1;color:${P};height:44px;margin-bottom:10px;display:flex;align-items:center;opacity:.25}
    .testi-text{font-size:15px;color:#374151;line-height:1.8;margin-bottom:22px;font-style:italic}
    .testi-author{display:flex;align-items:center;gap:14px;border-top:2px solid #1a1208;padding-top:16px}
    .testi-av{width:42px;height:42px;border:2px solid #1a1208;display:flex;align-items:center;justify-content:center;font-weight:700;color:#1a1208;font-size:16px;flex-shrink:0;font-family:'${FH}',serif}
    .testi-name{font-weight:800;color:#1a1208;font-size:15px;font-family:'${FH}',serif}
    .testi-stars{display:flex;gap:2px;margin-top:3px;color:${P}}
    .testi-stars svg{fill:${P}}

    .hours-list{margin-top:52px;border:2px solid #1a1208}
    .hour-row{display:flex;justify-content:space-between;align-items:center;padding:16px 28px;border-bottom:1px solid #e8e0d0;transition:.15s}
    .hour-row:last-child{border-bottom:none}
    .hour-row.today{background:${P};border-color:transparent}
    .hour-row:not(.today):hover{background:#f9f6f1}
    .hour-day{font-family:'${FH}',serif;font-size:15px;font-weight:700;color:#1a1208;text-transform:uppercase;letter-spacing:.04em}
    .hour-row.today .hour-day{color:#fff}
    .hour-badge{font-size:9px;font-weight:700;background:#fff;color:${P};padding:2px 8px;border-radius:2px;margin-left:10px;text-transform:uppercase;letter-spacing:.06em}
    .hour-time{font-size:14px;color:#7a6a58;font-weight:500}
    .hour-row.today .hour-time{color:rgba(255,255,255,.9);font-weight:600}
    .hour-time.closed{color:#ef4444;font-style:italic}

    .cta{background:#1a1208;padding:96px 32px;text-align:center;position:relative;overflow:hidden}
    .cta-frame{position:absolute;inset:20px;border:1px solid rgba(255,255,255,.06);pointer-events:none}
    .cta h2{font-family:'${FH}',serif;font-size:clamp(32px,4.5vw,58px);font-weight:900;color:#fff;margin-bottom:16px;letter-spacing:-.025em;position:relative}
    .cta p{font-size:18px;color:rgba(255,255,255,.55);max-width:540px;margin:0 auto 44px;line-height:1.7;position:relative}
    .btn-cta{display:inline-flex;align-items:center;gap:12px;background:${P};color:#fff;padding:18px 52px;font-weight:700;font-size:16px;transition:.2s;letter-spacing:.01em;position:relative}
    .btn-cta:hover{background:#fff;color:#1a1208}

    .contact{background:#f9f6f1;padding:88px 32px;border-top:none}
    .contact-inner{max-width:1200px;margin:0 auto}
    .contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:0;border:2px solid #1a1208;margin-top:16px}
    .contact-card{padding:30px;border-right:2px solid #1a1208;background:#fff;display:flex;flex-direction:column;gap:13px;transition:.15s}
    .contact-card:last-child{border-right:none}
    .contact-card:hover{background:#f9f6f1}
    .c-ico{width:44px;height:44px;border:2px solid #1a1208;display:flex;align-items:center;justify-content:center;color:#1a1208;transition:.2s}
    .contact-card:hover .c-ico{background:#1a1208;color:#fff}
    .c-label{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#aaa;font-weight:700;font-family:'${FH}',serif}
    .c-val{font-size:15px;font-weight:700;color:#1a1208;word-break:break-word;line-height:1.45;font-family:'${FH}',serif}
    .map-wrap{margin-top:32px;border:2px solid #1a1208;overflow:hidden;height:320px}
    .map-wrap iframe{width:100%;height:100%;border:0}

    footer{background:#1a1208;padding:44px 32px;border-top:4px solid ${P}}
    .foot{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:22px}
    .foot-logo{font-family:'${FH}',serif;font-size:22px;font-weight:900;color:#fff;display:flex;align-items:center;gap:14px}
    .foot-bar{width:4px;height:24px;background:${P};border-radius:1px}
    .foot-links{display:flex;flex-wrap:wrap;justify-content:center;gap:28px}
    .foot-links a{color:rgba(255,255,255,.35);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;transition:.15s}
    .foot-links a:hover{color:#fff}
    .foot-copy{font-size:12px;color:rgba(255,255,255,.22)}
    .foot-copy a{color:rgba(255,255,255,.4)}

    @media(min-width:900px){.nav-toggle{display:none!important}.nav-links{display:flex!important}}
    @media(max-width:899px){
      .nav-links{display:none}.nav-toggle{display:flex!important}
      .hero-inner{grid-template-columns:1fr;padding:64px 20px}.hero-facts{display:none}
      .section{padding:60px 20px}.contact{padding:60px 20px}.cta{padding:64px 20px}
      .cards-grid{border:none}.card{border:2px solid #1a1208;margin-bottom:-2px;border-right:2px solid #1a1208!important}
      .contact-grid{border:none;flex-direction:column}.contact-card{border:2px solid #1a1208;margin-bottom:-2px;border-right:2px solid #1a1208!important}
    }
    @media(max-width:480px){.hero-btns{flex-direction:column}.stats{flex-wrap:wrap;gap:20px}}
  `;

  // ── Sub-page renderer (multi-page mode) ─────────────────────────────────
  const renderSubPage = (): string => {
    const pg = (content._pages || {})[page] as any;
    if (!pg || pg.enabled === false) {
      return '<div style="min-height:60vh;display:flex;align-items:center;justify-content:center"><p style="color:#888">Page not found</p></div>';
    }

    if (page === 'about') {
      const smallCards = (content.team || []).map((m: any) =>
        `<div class="card"><div class="card-ico">${m.name?.[0]?.toUpperCase()||'D'}</div><h3>${m.name}</h3><p>${m.role}</p></div>`
      ).join('');
      return `<section class="section" id="about" style="min-height:70vh"><div class="section-inner"><div style="max-width:680px;margin-bottom:52px"><div class="eyebrow">About Us</div><h1 class="sec-h">${pg.headline || content.about?.title || 'About Our Clinic'}</h1><div class="rule"></div><p class="sec-p">${pg.content || content.about?.description || ''}</p></div>${content.team?.length ? `<div class="cards-grid">${smallCards}</div>` : ''}</div></section>`;
    }

    if (page === 'doctors') {
      const doctorImages: Record<string,string> = {};
      (content._doctorImages || []).forEach((d: any) => { if (d.name && d.url) doctorImages[d.name.toLowerCase()] = d.url; });
      const teamCards = (content.team || []).map((m: any) => {
        const imgUrl = doctorImages[m.name?.toLowerCase()] || '';
        const avStyle = imgUrl
          ? `background-image:url('${imgUrl}');background-size:cover;background-position:center top;font-size:0`
          : `background:${P}`;
        return `<div class="team-card"><div class="team-av" style="${avStyle}">${imgUrl ? '' : (m.name?.[0]?.toUpperCase()||'D')}</div><div class="team-body"><div class="team-name">${m.name}</div><div class="team-role">${m.role}</div>${m.bio?`<div class="team-bio">${m.bio}</div>`:''}</div></div>`;
      }).join('');
      const noTeam = '<p style="text-align:center;color:#888;padding:60px 0;font-size:16px">No doctors listed yet — add team members in the Content tab.</p>';
      return `<section class="section" id="doctors" style="min-height:70vh"><div class="section-inner"><div class="sec-center" style="margin-bottom:52px"><div class="eyebrow">Our Professionals</div><h1 class="sec-h">${pg.headline || 'Meet Our Team'}</h1><div class="rule"></div>${pg.content ? `<p class="sec-p">${pg.content}</p>` : ''}</div>${content.team?.length ? `<div class="team-grid">${teamCards}</div>` : noTeam}</div></section>`;
    }

    if (page === 'contact') {
      const phone = content.contact?.phone || clinic.phone || '';
      const email = content.contact?.email || clinic.email || '';
      const addr  = content.contact?.address || '';
      const map   = content.contact?.mapEmbed || '';
      const cal   = pg.hasBooking ? calendarBlock : '';
      return `<section class="contact" id="contact" style="min-height:70vh"><div class="contact-inner"><div style="margin-bottom:40px"><div class="eyebrow">Contact</div><h1 class="sec-h">${pg.headline || 'Get In Touch'}</h1><div class="rule"></div>${pg.content ? `<p class="sec-p">${pg.content}</p>` : ''}</div><div class="contact-grid">${phone ? `<div class="contact-card"><div class="c-ico">${svgIco('phone')}</div><div class="c-label">Phone</div><div class="c-val">${phone}</div></div>` : ''}${email ? `<div class="contact-card"><div class="c-ico">${svgIco('mail')}</div><div class="c-label">Email</div><div class="c-val">${email}</div></div>` : ''}${addr ? `<div class="contact-card"><div class="c-ico">${svgIco('pin')}</div><div class="c-label">Address</div><div class="c-val">${addr}</div></div>` : ''}</div>${map ? `<div class="map-wrap"><iframe src="${map}" allowfullscreen loading="lazy" title="Location"></iframe></div>` : ''}${cal}</div></section>`;
    }

    return '<div style="min-height:60vh;display:flex;align-items:center;justify-content:center"><p style="color:#888">Page not found</p></div>';
  };

  // ── Body content ─────────────────────────────────────────────────────────
  const bodyContent: string = (isMultiPage && page !== 'home')
    ? renderSubPage()
    : orderedSections.map((block: any) => {

  if (block.id === 'hero') return `
<section class="hero">
  <div class="hero-texture"></div>
  <div class="hero-accent"></div>
  <div class="hero-inner">
    <div>
      <div class="hero-tag">Est. Excellence in Dental Care</div>
      <h1>${content.hero?.headline || clinic.name}</h1>
      <div class="hero-rule"></div>
      <p class="hero-sub">${content.hero?.subheadline || 'Professional, compassionate dental care delivered by experts committed to your long-term oral health.'}</p>
      <div class="hero-btns">
        <a href="#contact" class="btn-p">${content.hero?.ctaText||'Book Appointment'} ${svgIco('arrow')}</a>
        ${vis('about')&&content.about?.title?'<a href="#about" class="btn-s">Our Story</a>':''}
      </div>
      <div class="stats">
        <div><div class="stat-n">10+</div><div class="stat-l">Years</div></div>
        <div><div class="stat-n">5k+</div><div class="stat-l">Patients</div></div>
        <div><div class="stat-n">98%</div><div class="stat-l">Satisfaction</div></div>
      </div>
    </div>
    <div class="hero-facts">
      <div class="fact"><div class="fact-n">01</div><div class="fact-t">State-of-the-art digital X-ray and 3D imaging technology</div></div>
      <div class="fact"><div class="fact-n">02</div><div class="fact-t">Comprehensive family dentistry for all ages</div></div>
      <div class="fact"><div class="fact-n">03</div><div class="fact-t">Emergency dental appointments available</div></div>
    </div>
  </div>
</section>`;

  if (block.id === 'about' && vis('about') && content.about?.title) return `
<section class="section" id="about">
  <div class="section-inner">
    <div style="max-width:680px;margin-bottom:52px">
      <div class="eyebrow">About Us</div>
      <h2 class="sec-h">${content.about.title}</h2>
      <div class="rule"></div>
      <p class="sec-p">${content.about.description}</p>
    </div>
    <div class="cards-grid">
      ${['Patient-First','Precision Care','Gentle Touch','Easy Access'].map((t,i) => `
      <div class="card">
        <div class="card-ico">
          ${['<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'][i]}
        </div>
        <h3>${t}</h3>
        <p>${['Tailored treatment plans designed around your unique dental needs.','Precise diagnostics and treatments using the latest dental technology.','Your comfort is our priority throughout every appointment.','Flexible scheduling to fit your busy lifestyle.'][i]}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'services' && vis('services') && content.services?.length) return `
<section class="section sec-alt" id="services">
  <div class="section-inner">
    <div class="sec-center">
      <div class="eyebrow">Services</div>
      <h2 class="sec-h">What We Offer</h2>
      <div class="rule"></div>
    </div>
    <div class="cards-grid">
      ${content.services.map(s => `
      <div class="card">
        <div class="card-ico">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3>${s.title}</h3>
        <p>${s.description}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'team' && vis('team') && content.team?.length) {
    const doctorImages: Record<string,string> = {};
    (content._doctorImages || []).forEach((d: any) => { if (d.name && d.url) doctorImages[d.name.toLowerCase()] = d.url; });
    return `
<section class="section" id="team">
  <div class="section-inner">
    <div class="sec-center">
      <div class="eyebrow">Our Team</div>
      <h2 class="sec-h">Meet the Doctors</h2>
      <div class="rule"></div>
    </div>
    <div class="team-grid">
      ${content.team.map(m => {
        const imgUrl = doctorImages[m.name?.toLowerCase()] || '';
        const avStyle = imgUrl ? `background-image:url('${imgUrl}');background-size:cover;background-position:center top;font-size:0` : `background:${P}`;
        return `<div class="team-card">
        <div class="team-av" style="${avStyle}">${imgUrl ? '' : (m.name?.[0]?.toUpperCase()||'D')}</div>
        <div class="team-body">
          <div class="team-name">${m.name}</div>
          <div class="team-role">${m.role}</div>
          ${m.bio?`<div class="team-bio">${m.bio}</div>`:''}
        </div></div>`;
      }).join('')}
    </div>
  </div>
</section>`;
  }

  if (block.id === 'testimonials' && vis('testimonials') && content.testimonials?.length) return `
<section class="section sec-alt" id="testimonials">
  <div class="section-inner">
    <div class="sec-center">
      <div class="eyebrow">Patient Stories</div>
      <h2 class="sec-h">What They Say</h2>
      <div class="rule"></div>
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
            <div class="testi-stars">${Array.from({length:Math.min(t.rating||5,5)},()=>`${svgIco('star')}`).join('')}</div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>`;

  if (block.id === 'hours' && vis('hours')) return `
<section class="section" id="hours">
  <div class="section-inner">
    <div style="max-width:680px;margin-bottom:52px">
      <div class="eyebrow">Opening Hours</div>
      <h2 class="sec-h">When We're Open</h2>
      <div class="rule"></div>
    </div>
    <div class="hours-list" style="max-width:680px">
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
    const showBooking = !isMultiPage || pg0.hasBooking !== false;
    return `
<div class="cta">
  <div class="cta-frame"></div>
  <h2>Ready to Get Started?</h2>
  <p>Book your appointment today and experience the difference.</p>
  <a href="#contact" class="btn-cta">Book Appointment ${svgIco('arrow')}</a>
</div>
<section class="contact" id="contact">
  <div class="contact-inner">
    <div style="margin-bottom:40px">
      <div class="eyebrow">Contact</div>
      <h2 class="sec-h">Get In Touch</h2>
      <div class="rule"></div>
    </div>
    <div class="contact-grid">
      ${(content.contact?.phone||clinic.phone)?`<div class="contact-card"><div class="c-ico">${svgIco('phone')}</div><div class="c-label">Phone</div><div class="c-val">${content.contact?.phone||clinic.phone}</div></div>`:''}
      ${(content.contact?.email||clinic.email)?`<div class="contact-card"><div class="c-ico">${svgIco('mail')}</div><div class="c-label">Email</div><div class="c-val">${content.contact?.email||clinic.email}</div></div>`:''}
      ${content.contact?.address?`<div class="contact-card"><div class="c-ico">${svgIco('pin')}</div><div class="c-label">Address</div><div class="c-val">${content.contact.address}</div></div>`:''}
      ${hours[today]!==undefined?`<div class="contact-card"><div class="c-ico">${svgIco('clock')}</div><div class="c-label">Today</div><div class="c-val">${fmtHours(hours[today])}</div></div>`:''}
    </div>
    ${content.contact?.mapEmbed?`<div class="map-wrap"><iframe src="${content.contact.mapEmbed}" allowfullscreen loading="lazy" title="Location"></iframe></div>`:''}
    ${showBooking ? calendarBlock : ''}
  </div>
</section>`;
  }

  return '';
    }).join('');

  // Active offers for popup + home section
  const now = new Date();
  const activeOffers = (content._offers || []).filter((o: any) => {
    if (!o.title) return false;
    if (o.validTo && new Date(o.validTo) < now) return false;
    return true;
  });
  const popupOffers = activeOffers.filter((o: any) => o.showAsBanner !== false && o.showOnHome);
  const homeOffers  = activeOffers.filter((o: any) => o.showOnHome);

  // Offer popup HTML
  const offerPopupHtml = popupOffers.length && page === 'home' ? `
<div id="offer-overlay" class="offer-overlay">
  <div class="offer-modal">
    <button class="offer-close" id="offer-close-btn">${svgIco('x')}</button>
    ${popupOffers[0].bannerUrl ? `<img src="${popupOffers[0].bannerUrl}" alt="${popupOffers[0].title}" style="width:100%;max-height:220px;object-fit:cover;display:block"/>` : `<div style="height:8px;background:${P}"></div>`}
    <div style="padding:24px 28px 28px">
      <div style="font-size:10px;font-weight:700;color:${P};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">Special Offer</div>
      <h2 style="font-family:'${FH}',serif;font-size:22px;font-weight:900;color:#1a1208;margin-bottom:10px">${popupOffers[0].title}</h2>
      <p style="font-size:14px;color:#7a6a58;line-height:1.6;margin-bottom:14px">${popupOffers[0].description}</p>
      ${popupOffers[0].validTo ? `<p style="font-size:12px;color:#aaa;font-weight:600">Valid until ${new Date(popupOffers[0].validTo).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>` : ''}
    </div>
  </div>
</div>
<script>(function(){var o=document.getElementById('offer-overlay'),b=document.getElementById('offer-close-btn');if(!o||!b)return;var k='offer_dismissed_${popupOffers[0].id||0}';if(sessionStorage.getItem(k)){o.style.display='none';return;}b.addEventListener('click',function(){o.style.display='none';sessionStorage.setItem(k,'1');});o.addEventListener('click',function(e){if(e.target===o){o.style.display='none';sessionStorage.setItem(k,'1');}});})();</script>
` : '';

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${data.seo?.title||clinic.name}</title>
${content._faviconUrl ? `<link rel="icon" href="${content._faviconUrl}"/>` : ''}
<style>${css}</style>
</head><body>

${offerPopupHtml}

<nav class="nav" id="top">
  <div class="nav-inner">
    <div class="logo"><div class="logo-bar"></div><a href="?page=home" style="color:inherit;text-decoration:none">${content._logoUrl ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:32px;object-fit:contain;vertical-align:middle"/>` : clinic.name}</a></div>
    <div class="nav-links">
      ${pageNavLinks}
      <a href="${bookLink}" class="nav-cta">Book Now</a>
    </div>
    <button class="nav-toggle" id="navToggle">${svgIco('menu')}</button>
  </div>
  <div class="nav-mobile" id="navMobile">
    ${pageNavLinks}
    <a href="${bookLink}" class="nav-cta">Book Appointment</a>
  </div>
</nav>
<script>(function(){var b=document.getElementById('navToggle'),m=document.getElementById('navMobile');if(b&&m){b.addEventListener('click',function(){m.classList.toggle('open')});m.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){m.classList.remove('open')})})}})()</script>

${page === 'home' && homeOffers.length > 0 ? `
<section style="background:#fff;padding:0;border-bottom:3px solid #1a1208">
  <div style="max-width:1200px;margin:0 auto;padding:24px 32px">
    <div style="font-size:10px;font-weight:700;color:#7a6a58;text-transform:uppercase;letter-spacing:.14em;margin-bottom:16px">Current Offers</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${homeOffers.map((o:any)=>`
      <div style="border:2px solid #1a1208;overflow:hidden;display:flex;flex-direction:column">
        ${o.bannerUrl?`<img src="${o.bannerUrl}" alt="${o.title}" style="height:120px;width:100%;object-fit:cover;display:block"/>` : `<div style="height:6px;background:${P}"></div>`}
        <div style="padding:16px 20px">
          <div style="font-family:'${FH}',serif;font-size:16px;font-weight:900;color:#1a1208;margin-bottom:6px">${o.title}</div>
          <div style="font-size:13px;color:#7a6a58;line-height:1.55">${o.description}</div>
          ${o.validTo?`<div style="font-size:11px;color:#888;margin-top:8px;font-weight:600">Valid until ${new Date(o.validTo).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</div>`:''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

${bodyContent}

${page === 'home' && (content.gallery||[]).length > 0 ? `
<section class="section" style="background:#fff">
  <div class="section-inner">
    <div class="sec-center" style="margin-bottom:40px"><div class="eyebrow">Gallery</div><h2 class="sec-h">Our Clinic</h2></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:4px">
      ${(content.gallery||[]).map((url:string)=>`<div style="aspect-ratio:4/3;overflow:hidden"><img src="${url}" alt="Gallery" style="width:100%;height:100%;object-fit:cover;transition:.3s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"/></div>`).join('')}
    </div>
  </div>
</section>` : ''}

${page === 'home' && isMultiPage && (content._pages as any)?.home?.hasBooking ? `
<section class="section" id="home-booking" style="background:#f9f6f1">
  <div class="section-inner" style="max-width:760px">
    <div style="margin-bottom:32px">
      <div class="eyebrow">Appointments</div>
      <h2 class="sec-h">Book Online</h2>
      <div class="rule"></div>
      <p class="sec-p">Pick an available slot below — we'll confirm your appointment shortly.</p>
    </div>
    ${calendarBlock}
  </div>
</section>` : ''}

<footer>
  <div class="foot">
    <div class="foot-logo"><div class="foot-bar"></div>${content._logoUrl ? `<img src="${content._logoUrl}" alt="${clinic.name}" style="height:24px;object-fit:contain;vertical-align:middle"/>` : clinic.name}</div>
    <div class="foot-links">
      ${footerPageLinks}
    </div>
    <p class="foot-copy">© ${new Date().getFullYear()} ${clinic.name}. All rights reserved. · Powered by <a href="https://clinickarobar.app" target="_blank" rel="noopener">ClinicKarobar</a></p>
  </div>
</footer>
</body></html>`;
}