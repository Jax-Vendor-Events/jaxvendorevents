/* Jax Vendor Events: appearance (follows the phone's light/dark setting by default; the header button overrides) + the Account sheet (was "More"), Florida regions + the 5-tab navigation (Home · Events · Saved · Pro · Account). Runs in <head> before paint. */
(function(){
  'use strict';
  var root=document.documentElement,KA='jve_look2',THEME='ocean';
  var META={dark:'#12141a',light:'#f3f6f5'};
  function get(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function put(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  var mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
  function pref(){var m=get(KA);return (m==='light'||m==='dark'||m==='auto')?m:'auto';}
  function dark(){var m=pref();return m==='dark'||(m==='auto'&&!!(mq&&mq.matches));}
  function setMeta(d){var ms=document.querySelectorAll('meta[name="theme-color"]');if(!ms.length){var n=document.createElement('meta');n.name='theme-color';document.head.appendChild(n);ms=[n];}
    for(var i=0;i<ms.length;i++){ms[i].removeAttribute('media');ms[i].setAttribute('content',d?META.dark:META.light);}
    var s=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(s)s.setAttribute('content',d?'black-translucent':'default');}
  function apply(anim){var d=dark();
    if(anim){root.classList.add('theming');clearTimeout(apply.t);apply.t=setTimeout(function(){root.classList.remove('theming');},450);}
    root.setAttribute('data-theme',THEME);root.setAttribute('data-mode',d?'dark':'light');root.style.colorScheme=d?'dark':'light';setMeta(d);sync();}
  function sync(){var m=pref(),d=root.getAttribute('data-mode')==='dark';
    var b=document.querySelectorAll('.mseg button');for(var i=0;i<b.length;i++)b[i].setAttribute('aria-checked',String(b[i].getAttribute('data-mode')===m));
    var t=document.getElementById('lookBtn');if(t){t.setAttribute('aria-label',d?'Switch to light':'Switch to dark');t.innerHTML=d?ICO.light:ICO.dark;}}
  apply(false);
  try{if(/[?&]admin=1/.test(location.search))put('jve_admin','1');if(get('jve_admin')==='1')root.classList.add('admin');}catch(_){}
  var ICO={light:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    auto:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M12 6.5a5.5 5.5 0 0 1 0 11z" fill="currentColor"/></svg>'};
  var X='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function svg(p){return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';}
  var I={
    send:'<path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>',
    star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>',
    kit:'<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    shield:'<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>',
    user:'<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/>',
    users:'<circle cx="9" cy="9" r="3.3"/><path d="M3 19.5c.9-3.2 3.2-4.8 6-4.8s5.1 1.6 6 4.8"/><path d="M15.5 5.9a3.2 3.2 0 0 1 0 6.2M17.6 14.9c1.7.6 2.9 2.1 3.4 4.6"/>',
    sliders:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
    info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/>',
    doc:'<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h4"/>',
    pin:'<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    chev:'<path d="M9.5 6l6 6-6 6"/>'};
  /* ---- Florida regions (Luis, Nov 1 2026: the site covers all of Florida). An event's own "region" wins; else its county decides. ---- */
  var REG=[['ne','Northeast FL','Duval|St. Johns|Clay|Nassau|Baker|Flagler|Putnam|Bradford|Union'],
    ['panhandle','Panhandle','Escambia|Santa Rosa|Okaloosa|Walton|Holmes|Washington|Bay|Jackson|Calhoun|Gulf|Liberty|Franklin|Gadsden|Leon|Wakulla|Jefferson'],
    ['nc','North Central','Alachua|Columbia|Suwannee|Hamilton|Madison|Taylor|Lafayette|Dixie|Gilchrist|Levy|Marion'],
    ['central','Central / Orlando','Orange|Seminole|Osceola|Lake|Volusia|Brevard|Sumter|Polk'],
    ['tampa','Tampa Bay','Hillsborough|Pinellas|Pasco|Hernando|Citrus|Manatee'],
    ['sw','Southwest','Lee|Collier|Charlotte|Sarasota|DeSoto|Glades|Hendry|Hardee|Highlands'],
    ['se','Southeast / Miami','Miami-Dade|Broward|Palm Beach|Martin|St. Lucie|Indian River|Okeechobee'],
    ['keys','Keys','Monroe']];
  function ck(s){return String(s||'').toLowerCase().replace(/\bcounty\b/g,'').replace(/\bsaint\b/g,'st').replace(/[^a-z]/g,'');}
  var C2R={},R2={},RK='jve_region';
  REG.forEach(function(r){r[2].split('|').forEach(function(c){C2R[ck(c)]=r[0];});
    [r[0],r[1],r[1].replace(/ FL$/,'')].concat(r[1].split('/')).forEach(function(a){R2[ck(a)]=r[0];});});
  R2.northeast=R2.northeastflorida=R2.jax=R2.jacksonville='ne';R2.orlando=R2.central='central';R2.tampa='tampa';R2.miami=R2.southeast='se';R2.floridakeys='keys';
  function regionOf(e){if(!e)return 'ne';var r=e.region&&R2[ck(e.region)];if(r)return r;return C2R[ck(e.county)]||'ne';}
  function regionGet(){var v=get(RK);if(v&&R2[v]===v)return v;var A=window.JVE_AUTH,p=A&&A.profile&&A.profile.region;return (p&&R2[ck(p)])||'ne';}
  function regionSet(v){if(R2[v]!==v)return;put(RK,v);try{document.dispatchEvent(new CustomEvent('jve:region',{detail:v}));}catch(_){}
    var s=document.querySelectorAll('select[data-region]');for(var i=0;i<s.length;i++)s[i].value=v;}
  function regionLabel(v){for(var i=0;i<REG.length;i++)if(REG[i][0]===v)return REG[i][1];return 'Northeast FL';}
  window.JVE_REGIONS={list:REG.map(function(r){return {id:r[0],label:r[1],counties:r[2].split('|')};}),of:regionOf,get:regionGet,set:regionSet,label:regionLabel};
  function regionOptions(){return REG.map(function(r){return '<option value="'+r[0]+'">'+r[1]+'</option>';}).join('');}
  /* ---- the Account sheet (was "More"): account, plan, organizer + vendor tools, settings, help ---- */
  var LINKS=[
    ['For organizers',[['list.html','send','List your event','Free · we check it against your page'],['pricing.html#organizers','star','Get featured','Top spots from $10'],['sponsor.html','kit','Sponsor media kit','Audience and placements']]],
    ['For vendors',[['profiles.html','users','Vendor & organizer directory','Browse makers and markets'],['join.html','user','Create your vendor profile','Logo, links and the events you want'],['city.html','shield','City & county vendor signup','Official permits, fees and steps'],['newsletter.html','mail','Weekly email','New markets + deadlines every Monday · free']]],
    ['Help',[['about.html','info','About Jax Vendor Events',''],['terms.html','doc','Terms & Privacy','']]]];
  I.mail='<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.8 7.2l8.2 5.8 8.2-5.8"/>';
  I.login='<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>';
  I.out='<path d="M15 17l5-5-5-5M20 12H8"/><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/>';
  function li(l){return '<li><a href="'+l[0]+'"'+(l[4]||'')+'><span class="mi">'+svg(I[l[1]])+'</span><span class="mt"><b>'+esc(l[2])+'</b>'+(l[3]?'<small>'+esc(l[3])+'</small>':'')+'</span><span class="mc">'+svg(I.chev)+'</span></a></li>';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var TN={'featured-event':'Featured event','deadline-spotlight':'Deadline spotlight','organizer-plus':'Organizer Plus','newsletter-sponsor':'Newsletter sponsor','directory-sponsor':'Directory sponsor','featured-vendor':'Featured vendor','vendor-pro':'Vendor Pro'};
  var authDone=false;
  function drawAcct(){
    var box=document.getElementById('macct');if(!box)return;
    var A=window.JVE_AUTH,h='',plan='';
    if(!A||!A.sb){
      h='<div class="acard"><span class="aav">'+svg(I.user)+'</span><span class="at"><b>Free accounts are almost ready</b><small>Soon you can log in, keep your saved events on every phone and unlock Pro.</small></span></div>';
      plan=li(['pricing.html#vendors','star','Vendor Pro · $6/mo','Every market name, place + apply link']);
    }else if(!authDone){
      h='<div class="acard"><span class="aav">'+svg(I.user)+'</span><span class="at"><b>Checking your login…</b><small>One moment</small></span></div>';
    }else if(!A.user){
      h='<div class="acard"><span class="aav">'+svg(I.user)+'</span><span class="at"><b>Welcome! You’re not logged in</b><small>A free account keeps your saved events and region on every device.</small></span></div>'+
        '<div class="abtns"><a class="btn" href="login.html?mode=signup">Create free account</a><a class="btn ghost" href="login.html">Log in</a></div>';
      plan=li(['pricing.html#vendors','star','Vendor Pro · $6/mo','Every market name, place + apply link']);
    }else{
      var P=A.profile||{},n=(P.full_name||P.business_name||A.user.email||'?').trim(),tiers=(A.tiers||[]);
      var role=P.role?(' · '+String(P.role).charAt(0).toUpperCase()+String(P.role).slice(1)):'';
      h='<a class="acard" href="account.html"><span class="aav txt">'+esc(n.charAt(0).toUpperCase())+'</span><span class="at"><b>'+esc(n)+(A.has&&A.has('vendor-pro')?' <i class="apro">PRO</i>':'')+'</b><small>'+esc((tiers.length?tiers.map(function(t){return TN[t]||t;}).join(', '):'Free member')+role)+'</small></span><span class="mc">'+svg(I.chev)+'</span></a>'+
        '<div class="abtns"><a class="btn" href="account.html">My account</a><a class="btn ghost" href="#" data-logout>Log out</a></div>';
      plan=(A.has&&A.has('vendor-pro'))?li(['account.html','star','Vendor Pro is on','Manage your plan and reminders']):li(['pricing.html#vendors','star','Go Vendor Pro · $6/mo','Every market name, place + apply link']);
      if(A.admin)plan+=li(['admin.html','shield','Admin','Users, plans, sales, approvals']);
    }
    box.innerHTML=h+(plan?'<p class="mgrp">Your plan</p><ul class="mlist">'+plan+'</ul>':'');
  }
  function current(){var p=(location.pathname.split('/').pop()||'index.html');var h=location.hash;
    if(p==='index.html'||p===''){if(/^#e=/.test(h)){var st=history.state||{};return st.v==='saved'?'saved':st.v==='home'||!st.v?'':'events';}
      return /^#(events|deadlines|matches)$/.test(h)?'events':h==='#saved'?'saved':'home';}
    if(p==='pricing.html')return 'pro';
    if(/^(account|login|admin|reset|welcome)\.html$/.test(p))return 'account';
    return '';}
  function markNav(){var c=current();if(!c&&/^#e=/.test(location.hash))return;var a=document.querySelectorAll('[data-nav]');for(var i=0;i<a.length;i++){if(a[i].getAttribute('data-nav')===c)a[i].setAttribute('aria-current','page');else a[i].removeAttribute('aria-current');}}
  function build(){
    markNav();window.addEventListener('hashchange',markNav);
    var hdr=document.querySelector('.top .wrap');
    if(hdr&&!document.getElementById('lookBtn')){var b=document.createElement('button');b.type='button';b.id='lookBtn';b.className='lookbtn';hdr.appendChild(b);
      b.addEventListener('click',function(){window.JVE_THEMES.setMode(dark()?'light':'dark');});}
    if(document.getElementById('moreSheet'))return;
    var sc=document.createElement('div');sc.className='tsheet-scrim';sc.id='moreScrim';
    var sh=document.createElement('div');sh.className='tsheet more';sh.id='moreSheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-labelledby','moreTitle');sh.hidden=true;
    var h='<div class="grab" aria-hidden="true"></div><button type="button" class="x" id="moreClose" aria-label="Close">'+X+'</button><h2 id="moreTitle">Account</h2><div class="macct" id="macct"></div>';
    LINKS.forEach(function(g,gi){
      if(gi===2){h+='<p class="mgrp">Settings</p>'+
        '<div class="mrow"><span class="mlab">Region<small>Home and Events open here</small></span><span class="hsel"><select id="mRegion" data-region aria-label="Region">'+regionOptions()+'</select></span></div>'+
        '<div class="mrow"><span class="mlab">Appearance</span><div class="mseg" role="radiogroup" aria-label="Appearance">'+
        ['auto','light','dark'].map(function(m){return '<button type="button" role="radio" data-mode="'+m+'" aria-checked="false">'+ICO[m]+'<span>'+(m==='auto'?'Auto':m==='light'?'Light':'Dark')+'</span></button>';}).join('')+'</div></div>';}
      h+='<p class="mgrp">'+g[0]+'</p><ul class="mlist">';g[1].forEach(function(l){h+=li(l);});h+='</ul>';});
    sh.innerHTML=h;document.body.appendChild(sc);document.body.appendChild(sh);
    drawAcct();sync();
    var rs=document.getElementById('mRegion');rs.value=regionGet();rs.addEventListener('change',function(){regionSet(rs.value);});
    Array.prototype.forEach.call(sh.querySelectorAll('.mseg button'),function(bt){bt.addEventListener('click',function(){window.JVE_THEMES.setMode(bt.getAttribute('data-mode'));});});
    var A=window.JVE_AUTH;if(A&&A.ready&&A.ready.then)A.ready.then(function(){authDone=true;drawAcct();});
    document.addEventListener('jve:auth',function(){authDone=true;drawAcct();});
    var last=null,pushed=false;
    function open(){if(!sh.hidden&&sh.classList.contains('open'))return;last=document.activeElement;drawAcct();rs.value=regionGet();sh.hidden=false;void sh.offsetWidth;sh.classList.add('open');sc.classList.add('open');document.body.classList.add('noscroll');
      var ab=document.querySelectorAll('[data-nav=account]');for(var i=0;i<ab.length;i++)ab[i].setAttribute('aria-expanded','true');
      try{history.pushState({jveMore:1},'',location.href);pushed=true;}catch(_){pushed=false;}
      var c=sh.querySelector('#moreClose');if(c)c.focus({preventScroll:true});}
    function shut(){sh.classList.remove('open');sc.classList.remove('open');document.body.classList.remove('noscroll');setTimeout(function(){if(!sh.classList.contains('open'))sh.hidden=true;},380);
      var ab=document.querySelectorAll('[data-nav=account]');for(var i=0;i<ab.length;i++)ab[i].setAttribute('aria-expanded','false');
      if(last&&last.focus)last.focus({preventScroll:true});}
    function close(){if(!sh.classList.contains('open'))return;if(pushed){pushed=false;history.back();}else shut();}
    window.addEventListener('popstate',function(){if(sh.classList.contains('open')){pushed=false;shut();}});
    sc.addEventListener('click',close);document.getElementById('moreClose').addEventListener('click',close);
    document.addEventListener('click',function(e){var t=e.target.closest('[data-open-more]');if(t){e.preventDefault();open();}});
    sh.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(!a||a.hasAttribute('data-logout'))return;var u=a.getAttribute('href');if(!u||u==='#')return;
      if(pushed){e.preventDefault();pushed=false;shut();try{history.replaceState(null,'',location.href);}catch(_){}
        var here=location.pathname.split('/').pop()||'index.html',tp=u.split('#')[0];
        if(tp===here&&u.indexOf('#')>-1){location.hash=u.split('#')[1];}else location.href=u;}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&sh.classList.contains('open')){e.stopPropagation();close();}},true);
    var y0=null,dy=0;sh.addEventListener('touchstart',function(t){if(sh.scrollTop>0)return;y0=t.touches[0].clientY;dy=0;},{passive:true});
    sh.addEventListener('touchmove',function(t){if(y0===null)return;dy=Math.max(0,t.touches[0].clientY-y0);if(dy>0){sh.style.transition='none';sh.style.transform='translateY('+dy+'px)';}},{passive:true});
    sh.addEventListener('touchend',function(){if(y0===null)return;y0=null;sh.style.transition='';sh.style.transform='';if(dy>100)close();});
    window.JVE_THEMES.open=open;window.JVE_THEMES.close=close;
    extras();
  }
  window.JVE_THEMES={setMode:function(m){if(m!=='light'&&m!=='dark'&&m!=='auto')return;put(KA,m);apply(true);},mode:pref,effectiveMode:function(){return root.getAttribute('data-mode');},current:function(){return THEME;}};
  if(mq){var on=function(){if(pref()==='auto')apply(true);};mq.addEventListener?mq.addEventListener('change',on):mq.addListener&&mq.addListener(on);}
  window.addEventListener('storage',function(e){if(e.key===KA)apply(true);});
  function standalone(){try{return (window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;}catch(e){return false;}}
  function extras(){
    // iPhone "Add to Home Screen" hint, shown once (unlocked only)
    var ios=/iphone|ipad|ipod/i.test(navigator.userAgent||'')||/[?&]a2hs=1/.test(location.search);
    if(ios&&!standalone()&&!get('jve_a2hs')&&!root.classList.contains('locked')){
      var c=document.createElement('div');c.className='a2hs';c.setAttribute('role','note');
      c.innerHTML='<span class="a2i"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></span><span class="a2t"><b>Install the app</b><small>Tap Share, then “Add to Home Screen”. Opens full screen, works offline.</small></span><button type="button" class="a2x" aria-label="Dismiss">'+X+'</button>';
      document.body.appendChild(c);setTimeout(function(){c.classList.add('show');},900);
      c.querySelector('.a2x').addEventListener('click',function(){put('jve_a2hs','1');c.classList.remove('show');setTimeout(function(){c.remove();},400);});
    }
    // pull to refresh (home-screen app only; Safari has its own)
    if(standalone()||/[?&]ptr=1/.test(location.search)){
      var ind=document.createElement('div');ind.className='ptr';ind.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/></svg>';document.body.appendChild(ind);
      var y0=null,dy=0;
      document.addEventListener('touchstart',function(e){if(window.scrollY<=0&&!document.querySelector('.sheet.open,.tsheet.open')){y0=e.touches[0].clientY;dy=0;}},{passive:true});
      document.addEventListener('touchmove',function(e){if(y0===null)return;dy=Math.max(0,Math.min(130,(e.touches[0].clientY-y0)*0.55));ind.style.transform='translate(-50%,'+(dy-50)+'px) rotate('+(dy*2.6)+'deg)';ind.classList.toggle('ready',dy>72);ind.style.opacity=String(Math.min(1,dy/60));},{passive:true});
      document.addEventListener('touchend',function(){if(y0===null)return;y0=null;if(dy>72){ind.classList.add('spin');setTimeout(function(){location.reload();},350);}else{ind.style.transform='';ind.style.opacity='0';}});
    }
  }
  // offline: cache the app on this device (network first, so updates show right away)
  if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
