/* Jax Vendor Events: member login + tier access (runs on every page).
   Login is Supabase Auth (email + password, verified email). The listings, profiles and paid
   placements are NOT files on this site any more: they live in the member database and are
   only handed out to a logged-in member whose session is still valid (Row Level Security on
   the server; this script only decides what to draw). Pages declare:
     <html data-auth="member|admin|public|guest" data-needs="events,paid,profiles,pages">
   member/admin pages stay covered (html.authwait) until the server says the login is good.
   Page scripts that need the data are written as <script type="jve/boot" data-src="..."> and are
   started here, in order, once the data is in. */
(function(){
  'use strict';
  var C=window.JVE_SB,S=window.supabase,html=document.documentElement;
  var MODE=html.getAttribute('data-auth')||'public';
  var NEEDS=(html.getAttribute('data-needs')||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
  var TIER_NAMES={'featured-event':'Featured event','deadline-spotlight':'Deadline spotlight','organizer-plus':'Organizer Plus',
    'newsletter-sponsor':'Newsletter sponsor','directory-sponsor':'Directory sponsor','featured-vendor':'Featured vendor','vendor-pro':'Vendor Pro'};
  var A={sb:null,user:null,profile:null,tiers:[],admin:false,TIER_NAMES:TIER_NAMES,ready:null,_res:null};
  A.ready=new Promise(function(r){A._res=r;});
  window.JVE_AUTH=A;
  if(!C||!S||!S.createClient){console.error('auth: client missing');if(MODE==='member'||MODE==='admin')fail('Could not load the login system. Check your connection and refresh.');return;}
  var sb=S.createClient(C.url,C.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storageKey:'jve-auth'}});
  A.sb=sb;
  function pageName(){return location.pathname.split('/').pop()||'index.html';}
  function here(){return pageName()+location.search+location.hash;}
  A.toLogin=function(why,signup){
    var p=pageName();
    if(!why&&!signup&&(p==='index.html'||p===''))return location.replace('welcome.html');
    location.replace('login.html?'+(signup?'mode=signup&':'')+'next='+encodeURIComponent(here())+(why?'&why='+encodeURIComponent(why):''));
  };
  function fail(msg){var w=document.getElementById('authwaitMsg');if(w)w.textContent=msg;var b=document.getElementById('authwaitBtn');if(b)b.hidden=false;}
  A.has=function(t){return A.tiers.indexOf(t)>=0;};
  A.buyUrl=function(base){  /* attach the purchase to this account: Stripe Payment Links take client_reference_id + prefilled_email */
    if(!A.user||!/^https:\/\/buy\.stripe\.com\//.test(base||''))return base;
    var u=new URL(base);u.searchParams.set('client_reference_id',A.user.id);
    if(A.user.email)u.searchParams.set('prefilled_email',A.user.email);return u.toString();};
  A.signOut=function(scope){return sb.auth.signOut({scope:scope||'local'}).catch(function(){}).then(function(){try{localStorage.removeItem('jve-auth');}catch(_){}location.replace('login.html?why='+(scope==='global'?'everywhere':'out'));});};

  function bootScripts(){
    var list=document.querySelectorAll('script[type="jve/boot"]');
    Array.prototype.forEach.call(list,function(el){var s=document.createElement('script');s.src=el.getAttribute('data-src');s.async=false;document.body.appendChild(s);});
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function chip(){
    var hdr=document.querySelector('.top .wrap');if(!hdr||document.getElementById('acctBtn'))return;
    var a=document.createElement('a');a.id='acctBtn';a.className='acctbtn';
    if(A.user){var n=(A.profile&&(A.profile.full_name||A.profile.business_name))||A.user.email||'?';
      a.href='account.html';a.setAttribute('aria-label','My account');a.innerHTML='<span class="av">'+esc(n.trim().charAt(0).toUpperCase())+'</span>'+(A.has('vendor-pro')?'<span class="pro">PRO</span>':'');}
    else{a.href='login.html?next='+encodeURIComponent(here());a.textContent='Log in';a.classList.add('out');}
    var look=document.getElementById('lookBtn');if(look)hdr.insertBefore(a,look);else hdr.appendChild(a);
  }
  function moreSheet(){
    var tries=0;(function go(){var s=document.getElementById('moreSheet');
      if(!s){if(++tries<60)setTimeout(go,100);return;}
      if(s.querySelector('.macct'))return;
      var h=s.querySelector('h2'),box=document.createElement('div');box.className='macct';
      var P='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">';
      var items=A.user?[['account.html',P+'<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/></svg>','My account',(A.tiers.length?A.tiers.map(function(t){return TIER_NAMES[t]||t;}).join(', '):'Free member')]]
        :[['login.html',P+'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>','Log in or create a free account','']];
      if(A.admin)items.push(['admin.html',P+'<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/></svg>','Admin','Users, tiers, sales, approvals']);
      var x='<p class="mgrp">Your account</p><ul class="mlist">';
      items.forEach(function(l){x+='<li><a href="'+l[0]+'"><span class="mi">'+l[1]+'</span><span class="mt"><b>'+esc(l[2])+'</b>'+(l[3]?'<small>'+esc(l[3])+'</small>':'')+'</span></a></li>';});
      if(A.user)x+='<li><a href="#" data-logout><span class="mi">'+P+'<path d="M15 17l5-5-5-5M20 12H8"/><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/></svg></span><span class="mt"><b>Log out</b></span></a></li>';
      box.innerHTML=x+'</ul>';if(h&&h.nextSibling)s.insertBefore(box,h.nextSibling);else s.appendChild(box);})();
  }
  A.unlock=function(tier){tier=tier||'vendor-pro';
    if(!A.user){location.href='login.html?mode=signup&why=unlock&next='+encodeURIComponent('pricing.html?tier='+tier+'#'+tier);return;}
    fetch('data/checkout.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(m){var u=m&&m[tier];
      location.href=(typeof u==='string'&&/^https:\/\/buy\.stripe\.com\//.test(u))?A.buyUrl(u):'pricing.html?tier='+tier+'#get-featured';})
      .catch(function(){location.href='pricing.html?tier='+tier;});};
  document.addEventListener('click',function(e){
    var un=e.target.closest&&e.target.closest('[data-unlock]');if(un){e.preventDefault();A.unlock(un.getAttribute('data-unlock'));return;}
    var lo=e.target.closest&&e.target.closest('[data-logout]');if(lo){e.preventDefault();A.signOut(lo.getAttribute('data-logout')==='global'?'global':'local');return;}
    var a=e.target.closest&&e.target.closest('[data-buy]');if(!a)return;
    var href=a.getAttribute('href')||'';
    if(!/^https:\/\/buy\.stripe\.com\//.test(href))return;          /* request-form tiers: unchanged */
    if(!A.user){e.preventDefault();e.stopImmediatePropagation();
      location.href='login.html?mode=signup&why=buy&next='+encodeURIComponent('pricing.html?tier='+(a.getAttribute('data-buy')||''));return;}
    a.setAttribute('href',A.buyUrl(href));                          /* checkout now belongs to this account */
  },true);
  function applyTierMarks(){
    html.setAttribute('data-tiers',A.tiers.join(' '));
    html.classList.toggle('is-admin',A.admin);
    Array.prototype.forEach.call(document.querySelectorAll('[data-tier]'),function(el){
      var need=el.getAttribute('data-tier').split(/\s+/),ok=A.admin||need.some(function(t){return A.has(t);});
      el.hidden=!ok;});
    Array.prototype.forEach.call(document.querySelectorAll('[data-tier-lock]'),function(el){
      var need=el.getAttribute('data-tier-lock').split(/\s+/),ok=A.admin||need.some(function(t){return A.has(t);});
      el.hidden=ok;});
  }
  /* the only door to listings: get_site() on the server strips names, places, organizers and links
     unless this login has Vendor Pro / Organizer Plus / Directory sponsor (or is an admin) */
  async function loadData(){
    if(!NEEDS.length)return true;
    var r=await sb.rpc('get_site',{keys:NEEDS});
    if(r.error||!r.data)return false;
    var d=r.data;A.access=d.access||'anon';html.setAttribute('data-access',A.access);
    if(d.events)window.JVE_DATA=d.events;
    /* organizer links from our emails: ?t=<token>#e=<id> shows that one listing in full (the server checks the token) */
    var lt=new URLSearchParams(location.search).get('t'),le=(location.hash.match(/^#e=([^&]+)/)||[])[1];
    if(d.events&&lt&&le&&d.access!=='full'){try{var one=await sb.rpc('get_listing',{eid:decodeURIComponent(le),t:lt});
      if(one.data&&one.data.id){var L=d.events.events;for(var i=0;i<L.length;i++){if(L[i].id===one.data.id){L[i]=Object.assign({},one.data,{unlocked_by:'link'});break;}}}}catch(_){}}
    if(d.profiles)window.JVE_PROFILES=d.profiles;
    if(d.paid)window.JVE_PAID=d.paid;
    if(d.pages)Array.prototype.forEach.call(document.querySelectorAll('[data-secure-page]'),function(el){var k=el.getAttribute('data-secure-page');if(typeof d.pages[k]==='string')el.innerHTML=d.pages[k];});
    if(A.user&&NEEDS.indexOf('profiles')>=0&&!d.profiles)return false;
    return true;
  }
  async function start(){
    var got=await sb.auth.getSession();var sess=got.data&&got.data.session;
    if(!sess){A.user=null;await finishPublic();return;}
    var u=await sb.auth.getUser();                 /* the server checks this login is still valid (not signed out elsewhere) */
    if(u.error||!u.data||!u.data.user){await sb.auth.signOut({scope:'local'}).catch(function(){});A.user=null;
      if(MODE==='member'||MODE==='admin'){A.toLogin('expired');return;} await finishPublic();return;}
    A.user=u.data.user;
    var jobs=[sb.from('profiles').select('*').eq('id',A.user.id).maybeSingle(),sb.rpc('my_tiers'),sb.from('admins').select('user_id').eq('user_id',A.user.id).maybeSingle()];
    var r=await Promise.all(jobs);
    A.profile=r[0].data||null;A.tiers=Array.isArray(r[1].data)?r[1].data:[];A.admin=!!(r[2].data);
    if(MODE==='admin'&&!A.admin){location.replace('account.html?why=admin');return;}
    if(!(await loadData())){await sb.auth.signOut({scope:'local'}).catch(function(){});A.toLogin('expired');return;}
    html.classList.remove('authwait');html.classList.add('authed');
    applyTierMarks();chip();moreSheet();
    A._res(A);
    bootScripts();
    document.dispatchEvent(new CustomEvent('jve:auth',{detail:A}));
    /* anti-sharing: a login made on another device signs this one out; check every few minutes */
    setInterval(function(){sb.auth.getUser().then(function(x){if(x.error||!x.data||!x.data.user){sb.auth.signOut({scope:'local'}).catch(function(){}).then(function(){A.toLogin('elsewhere');});}});},240000);
  }
  async function finishPublic(){
    if(MODE==='member'||MODE==='admin'){A.toLogin();return;}
    if(!(await loadData())){fail('Could not load the listings. Check your connection and refresh.');return;}
    html.classList.remove('authwait');applyTierMarks();
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){chip();moreSheet();});else{chip();moreSheet();}
    A._res(A);bootScripts();document.dispatchEvent(new CustomEvent('jve:auth',{detail:A}));
  }
  sb.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_OUT'&&(MODE==='member'||MODE==='admin'))A.toLogin('out');});
  function go(){start().catch(function(err){console.error(err);fail('Could not reach the member database. Check your connection and refresh.');});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go();
})();
