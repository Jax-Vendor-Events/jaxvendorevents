/* Jax Vendor Events: Facebook-style shell + feed (owner Nov 8 2026 9:26 AM "make jax vendor events app layout and design like
   facebook from coding to features, app mapping and workflow"; 9:29 AM "add dark mode feature").
   - Top bar on every page: logo, search, icon nav (Home · Events · Map · Saved · Pro), notifications bell, avatar menu
     (profile, Display: Dark / Light / Automatic, shortcuts, log out). Phone: FB Android header + icon tab row under it (no bottom bar).
   - index.html: left shortcut column, Home = a feed of event posts (Interested / Going / Save / Share), right rail
     (Deadlines this week, Sponsored, Organizers to follow), FB-style event page (the event sheet), organizer pages (#o=slug),
     onboarding (areas + event types) into a personalized "For you" feed.
   - account.html: profile header + Interested / Going / Saved lists.
   PAYWALL: this file only renders what get_site already sent (teasers for free/logged-out visitors: no names, venues,
   organizers or links). Organizer pages, organizer names and reviews exist only on full listings / for Pro.
   Interested / Going / Saved persist per account in Supabase table event_reactions (owner-only RLS); counts come from
   event_reaction_counts() (aggregates only). Saved also stays on the device (jve_saved) for logged-out visitors. */
(function(){
  'use strict';
  var d=document,root=d.documentElement,W=window;
  if(root.classList.contains('fbx-on'))return;root.classList.add('fbx','fbx-on');
  var pg=(location.pathname.split('/').pop()||'index.html').toLowerCase();if(pg==='')pg='index.html';
  var isIndex=pg==='index.html';if(isIndex)root.classList.add('fbx-index');
  function $(id){return d.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function get(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function put(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  function jget(k,def){try{var v=JSON.parse(get(k)||'null');return v==null?def:v;}catch(e){return def;}}
  function svg(p,extra){return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"'+(extra?' '+extra:'')+'>'+p+'</svg>';}
  var I={
    home:'<path d="M3.5 11.2L12 4l8.5 7.2"/><path d="M5.5 9.8V20h4.8v-5.6h3.4V20h4.8V9.8"/>',
    events:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3v3H8z"/>',
    map:'<path d="M9 4.5L3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8z"/><path d="M9 4.5v12.7M15 6.8v12.7"/>',
    saved:'<path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z"/>',
    pro:'<path d="M12 3.8l2.5 5.2 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    star:'<path d="M12 3.8l2.5 5.2 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/>',
    check:'<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.6 2.6 4.9-5.4"/>',
    share:'<path d="M14 5l6 6-6 6"/><path d="M20 11H11a7 7 0 0 0-7 7v1"/>',
    pin:'<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    tag:'<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.4"/>',
    lock:'<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5z"/>',
    user:'<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/>',
    users:'<circle cx="9" cy="9" r="3.3"/><path d="M3 19.5c.9-3.2 3.2-4.8 6-4.8s5.1 1.6 6 4.8"/><path d="M15.5 5.9a3.2 3.2 0 0 1 0 6.2M17.6 14.9c1.7.6 2.9 2.1 3.4 4.6"/>',
    book:'<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    card:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.5M12 17.2v.2"/>',
    moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    out:'<path d="M14 4.5h4.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    shield:'<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>',
    send:'<path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>',
    grid:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    leaf:'<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    brush:'<path d="M14.5 4.5l5 5-8 8-5-5z"/><path d="M6.5 12.5L4 20l7.5-2.5"/>',
    party:'<path d="M4 20l5-14 9 9z"/><path d="M14 4l1 2M19 9l2 1M17 3l-1 3"/>',
    gift:'<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S12 9 12 9zM12 9c2-4 6-4 6-1.5S12 9 12 9z"/>',
    city:'<path d="M4 20V9l5-3v14M9 20V4l7 4v12M16 20v-8l4 2v6M3 20h18"/>',
    cap:'<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3v-4.5"/>',
    tent:'<path d="M12 4L3 20h18z"/><path d="M12 4v16M9 20l3-6 3 6"/>',
    back:'<path d="M15 5l-7 7 7 7"/>',
    dir:'<path d="M12 3l9 9-9 9-9-9z"/><path d="M9 13v-2h5l-1.5-1.5M14 11l-1.5 1.5"/>'
  };
  function ic(n,ex){return svg(I[n]||'',ex);}
  var STAR='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 3.8l2.5 5.2 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/></svg>';

  /* ---------------- Display: Dark / Light / Automatic ---------------- */
  var LK='jve_look3',mql=W.matchMedia?matchMedia('(prefers-color-scheme: light)'):null;
  function lookPref(){var v=get(LK);return v==='light'||v==='auto'||v==='dark'?v:'dark';}
  function lookEff(){var p=lookPref();return p==='auto'?(mql&&mql.matches?'light':'dark'):p;}
  function applyLook(){var e=lookEff(),was=root.getAttribute('data-look');root.setAttribute('data-look',e);root.style.colorScheme=e;
    var ms=d.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<ms.length;i++){ms[i].removeAttribute('media');ms[i].setAttribute('content',e==='light'?'#FFFFFF':'#17191C');}
    var cs=d.querySelector('meta[name="color-scheme"]');if(cs)cs.setAttribute('content',e==='light'?'light':'dark');
    if(was!==e){try{d.dispatchEvent(new CustomEvent('jve:look',{detail:e}));}catch(_){}}}
  function setLook(v,local){put(LK,v);applyLook();syncLookUI();if(!local)savePrefs({look:v});}
  if(mql&&mql.addEventListener)mql.addEventListener('change',function(){if(lookPref()==='auto')applyLook();});
  applyLook();

  /* ---------------- account + prefs ---------------- */
  function auth(){return W.JVE_AUTH||null;}
  function user(){var A=auth();return A&&A.user||null;}
  function fullAccess(){var A=auth();return !!(A&&(A.admin||(A.has&&(A.has('vendor-pro')||A.has('organizer-plus')||A.has('directory-sponsor')))));}
  function myName(){var A=auth();if(!A||!A.user)return '';var p=A.profile||{};return (p.full_name||p.business_name||A.user.email||'').trim();}
  function initials(s){var w=String(s||'').replace(/@.*/,'').replace(/[^A-Za-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase();}
  function avatar(cls){return '<span class="fb-av'+(cls?' '+cls:'')+'" aria-hidden="true">'+esc(initials(myName()))+'</span>';}
  function prefs(){var A=auth();var p=A&&A.profile&&A.profile.prefs;return (p&&typeof p==='object'&&!Array.isArray(p))?p:{};}
  function savePrefs(patch){var A=auth();if(!A||!A.user||!A.sb)return Promise.resolve(false);
    var p=Object.assign({},prefs(),patch);if(A.profile)A.profile.prefs=p;
    return A.sb.from('profiles').update({prefs:p}).eq('id',A.user.id).then(function(r){return !r.error;},function(){return false;});}
  var FK='jve_follow';
  function follow(){var f=prefs().follow;if(!(f&&typeof f==='object'))f=jget(FK,null);f=(f&&typeof f==='object')?f:{};
    return {regions:Array.isArray(f.regions)?f.regions:[],types:Array.isArray(f.types)?f.types:[],orgs:Array.isArray(f.orgs)?f.orgs:[]};}
  function setFollow(f){put(FK,JSON.stringify(f));return savePrefs({follow:f,fb_onboarded:true});}

  /* ---------------- reactions: Interested / Going / Saved ---------------- */
  var SK='jve_saved';
  var R={interested:{},going:{},saved:{},counts:{},loaded:false};
  function localSaved(){var a=jget(SK,[]);return Array.isArray(a)?a.filter(function(x){return typeof x==='string';}):[];}
  function readLocalSaved(){R.saved={};localSaved().forEach(function(id){R.saved[id]=1;});}
  readLocalSaved();
  function rLoad(){var A=auth();if(!A||!A.user||!A.sb){R.loaded=true;paintAll();notes();return Promise.resolve();}
    return A.sb.from('event_reactions').select('event_id,kind').limit(2000).then(function(r){
      if(r.error){R.loaded=true;return;}
      var srv={interested:{},going:{},saved:{}};(r.data||[]).forEach(function(x){if(srv[x.kind])srv[x.kind][x.event_id]=1;});
      R.interested=srv.interested;R.going=srv.going;
      /* saved: union of this device and the account (hearts made before logging in are kept) */
      var loc=localSaved(),add=[];loc.forEach(function(id){if(!srv.saved[id])add.push({user_id:A.user.id,event_id:id,kind:'saved'});});
      var merged=loc.slice();Object.keys(srv.saved).forEach(function(id){if(merged.indexOf(id)<0)merged.push(id);});
      if(merged.length!==loc.length){put(SK,JSON.stringify(merged));if(W.JVE_APP&&JVE_APP.resync)JVE_APP.resync();}
      readLocalSaved();
      if(add.length)A.sb.from('event_reactions').upsert(add.slice(0,200),{onConflict:'user_id,event_id,kind',ignoreDuplicates:true}).then(function(){},function(){});
      R.loaded=true;paintAll();notes();mineList();},function(){R.loaded=true;});}
  var cntQ={},cntT=null;
  function wantCounts(ids){ids.forEach(function(id){if(!(id in R.counts))cntQ[id]=1;});clearTimeout(cntT);cntT=setTimeout(flushCounts,150);}
  function flushCounts(){var ids=Object.keys(cntQ).slice(0,400);cntQ={};if(!ids.length)return;var A=auth();if(!A||!A.sb)return;
    ids.forEach(function(id){if(!R.counts[id])R.counts[id]={interested:0,going:0};});
    A.sb.rpc('event_reaction_counts',{ids:ids}).then(function(r){(r.data||[]).forEach(function(x){R.counts[x.event_id]={interested:x.interested||0,going:x.going||0};});ids.forEach(paintOne);},function(){});}
  function isOn(kind,id){return !!R[kind][id];}
  function nextPath(){return (location.pathname.split('/').pop()||'index.html')+location.search+location.hash;}
  function toggle(kind,id,name){
    if(kind==='saved'){if(W.JVE_APP&&JVE_APP.toggleSave){JVE_APP.toggleSave(id);}else{var a=localSaved(),i=a.indexOf(id);if(i>-1)a.splice(i,1);else a.push(id);put(SK,JSON.stringify(a));onSaved({detail:{id:id,on:i<0}});}return;}
    var A=auth();if(!A||!A.user){toast('Create a free account to mark events you’re '+(kind==='going'?'going to':'interested in'));setTimeout(function(){location.href='login.html?mode=signup&next='+encodeURIComponent(nextPath());},1100);return;}
    var on=!R[kind][id],other=kind==='going'?'interested':'going',c=R.counts[id]||(R.counts[id]={interested:0,going:0}),hadOther=!!R[other][id];
    if(on){R[kind][id]=1;c[kind]++;if(hadOther){delete R[other][id];c[other]=Math.max(0,c[other]-1);}}
    else{delete R[kind][id];c[kind]=Math.max(0,c[kind]-1);}
    paintOne(id);try{if(navigator.vibrate)navigator.vibrate(on?12:6);}catch(_){}
    var p=on?A.sb.from('event_reactions').upsert({user_id:A.user.id,event_id:id,kind:kind},{onConflict:'user_id,event_id,kind',ignoreDuplicates:true}).then(function(r){if(r.error)throw r.error;return hadOther?A.sb.from('event_reactions').delete().eq('user_id',A.user.id).eq('event_id',id).eq('kind',other):r;})
            :A.sb.from('event_reactions').delete().eq('user_id',A.user.id).eq('event_id',id).eq('kind',kind);
    p.then(function(r){if(r&&r.error)throw r.error;if(on)toast(kind==='going'?'You’re going':'Marked interested');notes();mineList();},
      function(){toast('Couldn’t save that. Check your connection.');if(on)delete R[kind][id];else R[kind][id]=1;paintOne(id);});}
  function onSaved(ev){var x=ev&&ev.detail||{};readLocalSaved();paintOne(x.id);var A=auth();if(!A||!A.user||!x.id)return;
    var q=A.sb.from('event_reactions');(x.on?q.upsert({user_id:A.user.id,event_id:x.id,kind:'saved'},{onConflict:'user_id,event_id,kind',ignoreDuplicates:true}):q.delete().eq('user_id',A.user.id).eq('event_id',x.id).eq('kind','saved')).then(function(){},function(){});notes();mineList();}
  d.addEventListener('jve:saved',onSaved);
  function cntText(id){var c=R.counts[id];if(!c)return '';var a=[];if(c.interested)a.push(c.interested+' interested');if(c.going)a.push(c.going+' going');return a.join(' · ');}
  function paintOne(id){if(!id)return;var sel=W.CSS&&CSS.escape?CSS.escape(id):id;
    d.querySelectorAll('[data-r][data-id="'+sel+'"]').forEach(function(b){var k=b.getAttribute('data-r'),on=isOn(k,id);b.setAttribute('aria-pressed',String(on));
      var lab=b.querySelector('.lb');if(lab)lab.textContent=k==='saved'?(on?'Saved':'Save'):k==='going'?'Going':'Interested';
      var n=b.querySelector('.n');if(n){var c=R.counts[id]||{};n.textContent=c[k]?' · '+c[k]:'';}});
    d.querySelectorAll('[data-cnt="'+sel+'"]').forEach(function(el){el.textContent=cntText(id);});}
  function paintAll(){var ids={};d.querySelectorAll('[data-r][data-id]').forEach(function(b){ids[b.getAttribute('data-id')]=1;});Object.keys(ids).forEach(paintOne);}
  function actRow(e){var id=esc(e.id),nm=esc(e.name||'');
    return '<div class="fb-acts" role="group" aria-label="Actions">'+
      '<button type="button" class="fb-act" data-r="interested" data-id="'+id+'" data-name="'+nm+'" aria-pressed="false">'+ic('star')+'<span class="lb">Interested</span></button>'+
      '<button type="button" class="fb-act" data-r="going" data-id="'+id+'" data-name="'+nm+'" aria-pressed="false">'+ic('check')+'<span class="lb">Going</span></button>'+
      '<button type="button" class="fb-act" data-r="saved" data-id="'+id+'" data-name="'+nm+'" aria-pressed="false">'+ic('saved')+'<span class="lb">Save</span></button>'+
      '<button type="button" class="fb-act" data-share="'+id+'">'+ic('share')+'<span class="lb">Share</span></button></div>';}
  function share(id,title){var url=location.origin+'/index.html#e='+encodeURIComponent(id);var t=title||'Vendor event on Jax Vendor Events';
    if(navigator.share){navigator.share({title:t,url:url}).catch(function(){});return;}
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(function(){toast('Link copied');},function(){prompt('Copy this link',url);});else prompt('Copy this link',url);}
  d.addEventListener('click',function(ev){var t=ev.target;if(!t||!t.closest)return;
    var b=t.closest('[data-r][data-id]');if(b){ev.preventDefault();toggle(b.getAttribute('data-r'),b.getAttribute('data-id'),b.getAttribute('data-name'));return;}
    var s=t.closest('[data-share]');if(s){ev.preventDefault();var e0=evById(s.getAttribute('data-share'));share(s.getAttribute('data-share'),e0&&e0.name);return;}
    var o=t.closest('[data-open]');if(o){ev.preventDefault();closePop();openEv(o.getAttribute('data-open'),o.getAttribute('data-a'));return;}
    var f=t.closest('[data-follow]');if(f){ev.preventDefault();followOrg(f.getAttribute('data-follow'));return;}
    var ob=t.closest('[data-fbob]');if(ob){ev.preventDefault();onboard(true);return;}
  });

  /* ---------------- data helpers ---------------- */
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],WDL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function pd(s){var p=String(s).split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function iso(x){return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');}
  function addD(s,n){var x=pd(s);x.setDate(x.getDate()+n);return iso(x);}
  var today=iso(new Date());
  function days(a,b){return Math.round((pd(b)-pd(a))/864e5);}
  function fmtLong(s){var x=pd(s);return WDL[x.getDay()]+', '+MO[x.getMonth()]+' '+x.getDate();}
  function fmt(s){var x=pd(s);return WD[x.getDay()]+', '+MO[x.getMonth()]+' '+x.getDate();}
  var _ev=null;
  function evs(){if(W.JVE_APP&&JVE_APP.events)return JVE_APP.events();if(_ev)return _ev;var D=W.JVE_DATA;var a=(D&&D.events)||[];
    if(!a.length)return a;var LG=W.JVE_LOGIC;_ev=a.map(function(e){return Object.assign({},e,{up:(e.dates||[]).filter(function(x){return x>=today;}),types:LG?LG.eventTypes(e):['popup']});}).filter(function(e){return ['past','cancelled','removed'].indexOf(e.verify_status)<0;});return _ev;}
  function evById(id){var a=evs();for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
  function next(e){var u=e.up||(e.dates||[]).filter(function(x){return x>=today;});return u[0]||null;}
  var KIND={farmers:['Farmers market','leaf'],craft:['Craft & art fair','brush'],festival:['Festival','party'],holiday:['Holiday market','gift'],city:['City event','city'],popup:['Pop-up market','tent']};
  function kind(e){if(e.campus||e.category==='campus')return 'campus';var LG=W.JVE_LOGIC,t=e.types||(LG?LG.eventTypes(e):['popup']);var k=t.filter(function(x){return x!=='city';})[0]||t[0]||'popup';if(k==='popup'&&t.indexOf('city')>-1)k='city';return KIND[k]?k:'popup';}
  function kindLabel(k){return k==='campus'?'Campus market':KIND[k][0];}
  function kindIcon(k){return k==='campus'?'cap':KIND[k][1];}
  function feeLabel(e){if(e.fee_bucket==='free')return 'Free to vend';if(e.fee){var f=String(e.fee);return f.length>26?f.slice(0,24)+'…':f;}return 'Fee not listed';}
  function org(e){return e.locked?null:(e.organizer||e.host_agency||null);}
  function slug(s){var LG=W.JVE_LOGIC;return LG&&LG.slug?LG.slug(s):String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
  function PX(){return W.JVE_PAIDX||{featured:function(){return false;},spotlight:function(){return false;},verifiedOrg:function(){return null;},sponsor:function(){return null;}};}
  function regionOf(e){var RG=W.JVE_REGIONS;return e.rg||(RG?RG.of(e):'ne');}
  function regionLabel(r){var RG=W.JVE_REGIONS;return RG?RG.label(r):r;}
  function updated(e){var v=e.verified_on||e.last_checked;if(!v)return 'Listed';var n=days(v,today);return (e.verified?'Checked ':'Updated ')+(n<=0?'today':n===1?'yesterday':n<7?n+' days ago':MO[pd(v).getMonth()]+' '+pd(v).getDate());}
  function cover(e,a,attr,noText){var k=kind(e),x=a?pd(a):null;
    return '<span class="fb-cov k-'+k+'"'+(attr?' '+attr:'')+'><span class="fb-cic">'+ic(kindIcon(k))+'</span>'+(noText?'':
      (x?'<span class="fb-cd"><i>'+MO[x.getMonth()]+'</i><b>'+x.getDate()+'</b><small>'+WD[x.getDay()]+'</small></span>':'<span class="fb-cd"><i>Open</i><b>∞</b><small>dates</small></span>')+
      '<span class="fb-ck">'+esc(kindLabel(k))+'<b>'+esc(e.city||e.county||'Florida')+'</b></span>')+'</span>';}
  function openEv(id,a){if(W.JVE_APP&&JVE_APP.open){JVE_APP.open(id,a||undefined);return;}location.href='index.html#e='+encodeURIComponent(id);}
  function toast(t){var el=$('toast');if(!el){el=d.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');d.body.appendChild(el);}
    el.textContent=t;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2400);}

  /* ---------------- top bar ---------------- */
  var TABS=[['home','Home','index.html'],['events','Events','index.html#events'],['map','Map','index.html#map'],['saved','Saved','index.html#saved'],['pro','Pro','pro.html']];
  function tabHref(t){if(!isIndex)return t[2];return t[0]==='home'?'#':t[0]==='pro'?'pro.html':t[2].replace('index.html','');}
  function tabsHtml(menu){return TABS.map(function(t){return '<a class="fb-tab" data-fbtab="'+t[0]+'" href="'+tabHref(t)+'" aria-label="'+t[1]+'" title="'+t[1]+'"><span class="fb-ti">'+ic(t[0])+'</span><span class="fb-tl">'+t[1]+'</span></a>';}).join('')+
    (menu?'<a class="fb-tab" href="#" data-fbmenu aria-label="Menu" title="Menu" role="button"><span class="fb-ti">'+ic('menu')+'</span><span class="fb-tl">Menu</span></a>':'');}
  function logo(){return d.getElementById('logo')?'<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><use href="#logo"/></svg>':'<img class="mark" src="icons/logo.svg" width="40" height="40" alt="">';}
  function buildTop(){if($('fbTop'))return;
    var top=d.createElement('header');top.className='fb-top';top.id='fbTop';
    top.innerHTML='<div class="fb-row"><div class="fb-l"><a class="fb-logo" href="index.html" aria-label="Jax Vendor Events home">'+logo()+'<b>Jax Vendor Events</b></a>'+
      '<label class="fb-search">'+ic('search')+'<span class="fb-sr">Search events</span><input type="search" id="fbQ" placeholder="Search events, towns" autocomplete="off" enterkeyhint="search"></label></div>'+
      '<nav class="fb-c" aria-label="Main">'+tabsHtml(false)+'</nav>'+
      '<div class="fb-r"><button type="button" class="fb-ib fb-srch" id="fbSrchBtn" aria-label="Search">'+ic('search')+'</button>'+
      '<button type="button" class="fb-ib" id="fbBell" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">'+ic('bell')+'<span class="fb-dot" id="fbDot" hidden></span></button>'+
      '<span id="fbMeSlot" style="display:flex;align-items:center;gap:6px"></span></div></div>'+
      '<nav class="fb-tabs" aria-label="Sections">'+tabsHtml(true)+'</nav>';
    var old=d.querySelector('header.top');if(old)old.parentNode.insertBefore(top,old);else d.body.insertBefore(top,d.body.firstChild);
    ['fbMenu','fbNotes','fbSearchPop'].forEach(function(id){var p=d.createElement('div');p.className='fb-pop';p.id=id;p.setAttribute('role','dialog');p.setAttribute('aria-label',id==='fbMenu'?'Menu':id==='fbNotes'?'Notifications':'Search');p.hidden=true;d.body.appendChild(p);});
    $('fbBell').addEventListener('click',function(ev){ev.stopPropagation();togglePop('fbNotes',this);});
    $('fbSrchBtn').addEventListener('click',function(ev){ev.stopPropagation();var p=$('fbSearchPop');p.innerHTML='<div class="fb-msearch"><label class="fb-search">'+ic('search')+'<span class="fb-sr">Search events</span><input type="search" id="fbQ2" placeholder="Search events, towns" autocomplete="off" enterkeyhint="search"></label></div>';
      togglePop('fbSearchPop',this);var q=$('fbQ2');wireSearch(q);setTimeout(function(){q.focus();},30);});
    top.addEventListener('click',function(ev){var m=ev.target.closest('[data-fbmenu]');if(m){ev.preventDefault();ev.stopPropagation();togglePop('fbMenu',m);}});
    d.addEventListener('click',function(ev){if(!openPop)return;var p=$(openPop);if(p&&!p.contains(ev.target)&&!(openBtn&&openBtn.contains(ev.target)))closePop();});
    d.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&openPop)closePop();});
    wireSearch($('fbQ'));meSlot();markTabs();
    var lastY=W.scrollY;W.addEventListener('scroll',function(){var y=W.scrollY;if(W.innerWidth>=860){root.classList.remove('fbx-hide');lastY=y;return;}
      if(y>lastY+8&&y>140)root.classList.add('fbx-hide');else if(y<lastY-8||y<60)root.classList.remove('fbx-hide');lastY=y;},{passive:true});}
  var openPop=null,openBtn=null;
  function togglePop(id,btn){if(openPop===id){closePop();return;}closePop();openPop=id;openBtn=btn;var p=$(id);
    if(id==='fbMenu')menuHtml();if(id==='fbNotes')notesHtml();
    p.hidden=false;if(btn&&btn.setAttribute)btn.setAttribute('aria-expanded','true');}
  function closePop(){if(!openPop)return;var p=$(openPop);if(p)p.hidden=true;if(openBtn&&openBtn.setAttribute)openBtn.setAttribute('aria-expanded','false');openPop=null;openBtn=null;}
  function wireSearch(q){if(!q)return;
    function go(){var v=q.value.trim();if(!isIndex){try{sessionStorage.setItem('fb_q',v);}catch(_){}location.href='index.html#events';return;}
      var f=$('fQ');if(f){f.value=v;f.dispatchEvent(new Event('input',{bubbles:true}));}
      if(!/^#(events|deadlines|saved)/.test(location.hash))location.hash='#events';closePop();}
    q.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();go();q.blur();}});
    q.addEventListener('search',function(){if(!q.value&&isIndex){var f=$('fQ');if(f&&f.value){f.value='';f.dispatchEvent(new Event('input',{bubbles:true}));}}});}
  function curTab(){if(!isIndex)return pg==='pro.html'?'pro':null;var v=d.body.getAttribute('data-view')||'home';return v==='deadlines'?'events':v;}
  function markTabs(){var c=curTab(),v=d.body.getAttribute('data-view')||'home';
    d.querySelectorAll('[data-fbtab]').forEach(function(a){if(a.getAttribute('data-fbtab')===c)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    d.querySelectorAll('[data-fbsc]').forEach(function(a){var k=a.getAttribute('data-fbsc');if(isIndex&&(k===v||(k==='home'&&v==='home')))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
  d.addEventListener('jve:view',markTabs);W.addEventListener('hashchange',markTabs);
  function meSlot(){var s=$('fbMeSlot');if(!s)return;var A=auth();
    if(A&&A.user)s.innerHTML='<button type="button" class="fb-me" id="fbMe" aria-label="Account menu" aria-haspopup="true" aria-expanded="false">'+avatar()+'</button>';
    else s.innerHTML='<a class="fb-login" href="login.html">Log in</a><button type="button" class="fb-ib" id="fbMe" aria-label="Menu" aria-haspopup="true" aria-expanded="false">'+ic('menu')+'</button>';
    $('fbMe').addEventListener('click',function(ev){ev.stopPropagation();togglePop('fbMenu',this);});}
  function mi(href,icon,label,sub){return '<a class="fb-mi" href="'+href+'"><span class="fb-mic">'+ic(icon)+'</span><span>'+label+(sub?'<small>'+sub+'</small>':'')+'</span></a>';}
  function menuHtml(){var A=auth(),u=A&&A.user,p=lookPref(),h='';
    if(u)h+='<a class="fb-mcard" href="account.html">'+avatar()+'<span><b>'+esc(myName()||'Your account')+'</b><small>'+(fullAccess()?'Vendor Pro · ':'Free member · ')+'See your profile</small></span></a>';
    else h+='<div style="display:flex;gap:8px;padding:6px 6px 10px"><a class="fb-btn" href="login.html" style="flex:1">Log in</a><a class="fb-btn ghost" href="login.html?mode=signup" style="flex:1">Create account</a></div>';
    h+='<div class="fb-hr"></div>'+mi(isIndex?'#saved':'index.html#saved','saved','Saved');
    if(u)h+=mi('account.html#fb-mine','star','Interested & going');
    h+=mi(isIndex?'#deadlines':'index.html#deadlines','clock','Deadlines')+mi('guides.html','book','Vendor Guide')+
      mi('pro.html','pro','Vendor Pro',fullAccess()?'You’re a member':'$6/month · every name, place and apply link');
    if(u)h+=mi('account.html#sec-payments','card','Payments & plan');
    h+=mi('list.html','send','List your event','Organizers · free')+mi('profiles.html','users','Directory');
    h+='<div class="fb-hr"></div><div class="fb-disp" role="radiogroup" aria-labelledby="fbDispH"><h4 id="fbDispH" style="margin:6px 0 2px;display:flex;align-items:center;gap:8px">'+ic('moon','style="width:18px;height:18px"')+'Dark mode</h4><p>Adjust how Jax Vendor Events looks. Automatic matches your phone or computer.</p>'+
      [['dark','On'],['light','Off'],['auto','Automatic']].map(function(o){return '<button type="button" class="fb-radio" role="radio" data-look="'+o[0]+'" aria-checked="'+(p===o[0])+'">'+o[1]+'<i></i></button>';}).join('')+'</div>';
    h+='<div class="fb-hr"></div>'+mi('about.html','help','Help & about')+(d.querySelector('[data-open-more]')?'<button type="button" class="fb-mi" data-fbmore><span class="fb-mic">'+ic('grid')+'</span><span>More tools</span></button>':'');
    if(u)h+='<button type="button" class="fb-mi" data-fbout><span class="fb-mic">'+ic('out')+'</span><span>Log out</span></button>';
    var m=$('fbMenu');m.innerHTML=h;
    m.querySelectorAll('[data-look]').forEach(function(b){b.addEventListener('click',function(){setLook(b.getAttribute('data-look'));});});
    var mo=m.querySelector('[data-fbmore]');if(mo)mo.addEventListener('click',function(){closePop();var b=d.querySelector('[data-open-more]');if(b)b.click();});
    var lo=m.querySelector('[data-fbout]');if(lo)lo.addEventListener('click',function(){var A2=auth();if(A2&&A2.signOut)A2.signOut();});
    m.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setTimeout(closePop,10);});});}
  function syncLookUI(){var p=lookPref();d.querySelectorAll('.fb-radio[data-look]').forEach(function(b){b.setAttribute('aria-checked',String(b.getAttribute('data-look')===p));});}

  /* ---------------- notifications: deadlines + event days for the events you marked ---------------- */
  function noteList(){var out=[];function mine(id){return R.going[id]?'going':R.interested[id]?'interested':R.saved[id]?'saved':null;}
    evs().forEach(function(e){var m=mine(e.id);if(!m)return;var n=next(e);
      if(e.deadline&&e.deadline>=today&&days(today,e.deadline)<=7){var dn=days(today,e.deadline);out.push({w:dn,hot:dn<=2,ic:'clock',id:e.id,t:'Applications for <b>'+esc(e.name)+'</b> close '+(dn===0?'today':dn===1?'tomorrow':'in '+dn+' days'),s:'Apply by '+fmt(e.deadline)});}
      if(n&&days(today,n)<=2&&(m==='going'||m==='interested'))out.push({w:days(today,n)-.5,ic:'events',id:e.id,a:n,t:'<b>'+esc(e.name)+'</b> is '+(n===today?'today':days(today,n)===1?'tomorrow':fmt(n)),s:m==='going'?'You’re going':'You’re interested'});});
    out.sort(function(a,b){return a.w-b.w;});return out.slice(0,20);}
  function notes(){var dot=$('fbDot');if(!dot)return;var has=evs().length,L=has?noteList():null,n=has?L.length:+(get('jve_fb_notes')||0);if(has)put('jve_fb_notes',String(n));
    var key=has?L.map(function(x){return x.id+x.w;}).join('|'):get('jve_fb_notes_key');if(has)put('jve_fb_notes_key',key);
    dot.hidden=!n||key===get('jve_fb_notes_seen');dot.textContent=n>9?'9+':String(n);
    var b=$('fbBell');if(b)b.setAttribute('aria-label','Notifications'+(dot.hidden?'':' ('+n+' new)'));}
  function notesHtml(){var p=$('fbNotes'),L=noteList(),h='<h3>Notifications</h3>';
    if(!evs().length)h+='<div class="fb-empty">Open <a href="index.html">Home</a> to see reminders for the events you marked.</div>';
    else if(!L.length)h+='<div class="fb-empty">No reminders right now. Mark events <b>Interested</b> or <b>Going</b>, or <b>Save</b> them, and their deadlines and event days show up here.</div>';
    else h+=L.map(function(x){return '<a class="fb-note" href="index.html#e='+encodeURIComponent(x.id)+'" data-open="'+esc(x.id)+'"'+(x.a?' data-a="'+x.a+'"':'')+'><span class="fb-nic'+(x.hot?' hot':'')+'">'+ic(x.ic)+'</span><span>'+x.t+'<small>'+esc(x.s)+'</small></span></a>';}).join('');
    p.innerHTML=h;put('jve_fb_notes_seen',get('jve_fb_notes_key')||'');var dot=$('fbDot');if(dot)dot.hidden=true;}

  /* ---------------- left shortcuts + right rail (index) ---------------- */
  function sc(key,href,icon,label){return '<a class="fb-sc" data-fbsc="'+key+'" href="'+href+'"><span class="fb-sci">'+ic(icon)+'</span><span>'+label+'</span></a>';}
  function buildLeft(){if(!isIndex||$('fbLeft'))return;var el=d.createElement('nav');el.className='fb-left';el.id='fbLeft';el.setAttribute('aria-label','Shortcuts');d.body.appendChild(el);paintLeft();}
  function paintLeft(){var el=$('fbLeft');if(!el)return;var u=user(),h='';
    h+=u?'<a class="fb-sc" href="account.html">'+avatar()+'<span><b>'+esc(myName()||'Your account')+'</b></span></a>':'<a class="fb-sc" href="login.html"><span class="fb-sci">'+ic('user')+'</span><span>Log in or sign up</span></a>';
    h+=sc('home','#','home','Feed')+sc('events','#events','events','Events calendar')+sc('deadlines','#deadlines','clock','Deadlines')+sc('map','#map','map','Map')+sc('saved','#saved','saved','Saved');
    if(u)h+=sc('mine','account.html#fb-mine','star','Interested & going');
    h+=sc('guides','guides.html','book','Vendor Guide')+sc('city','city.html','shield','City & county signup')+sc('pro','pro.html','pro',fullAccess()?'Vendor Pro · member':'Vendor Pro')+
      (u?sc('acct','account.html#sec-payments','card','Account & payments'):'')+sc('dir','profiles.html','users','Directory')+sc('help','about.html','help','Help');
    var f=follow();h+='<h5>Your feed</h5>'+(f.regions.length?f.regions.map(function(r){return '<span class="fb-sc" style="cursor:default"><span class="fb-sci">'+ic('pin')+'</span><span>'+esc(regionLabel(r))+'</span></span>';}).join(''):'')+
      '<button type="button" class="fb-sc" data-fbob style="width:100%;border:0;background:none;cursor:pointer;text-align:left"><span class="fb-sci">'+ic('grid')+'</span><span>'+(f.regions.length||f.types.length?'Edit what you follow':'Pick areas + event types')+'</span></button>';
    h+='<div class="fb-foot"><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a> · <a href="about.html">About</a> · <a href="newsletter.html">Weekly email</a> · <a href="list.html">List your event</a> · <a href="pricing.html">Advertise</a><br>Jax Vendor Events © 2026</div>';
    el.innerHTML=h;markTabs();}
  function buildRight(){if(!isIndex||$('fbRight'))return;var el=d.createElement('aside');el.className='fb-right';el.id='fbRight';el.setAttribute('aria-label','Deadlines, sponsored and organizers');d.body.appendChild(el);paintRight();}
  function dlWeek(){var regs=follow().regions;return evs().filter(function(e){return e.deadline&&e.deadline>=today&&days(today,e.deadline)<=7&&(!regs.length||regs.indexOf(regionOf(e))>-1);}).sort(function(a,b){return a.deadline<b.deadline?-1:1;});}
  function riDl(e){var x=pd(e.deadline);return '<button type="button" class="fb-ri" data-open="'+esc(e.id)+'"><span class="fb-dd"><i>'+MO[x.getMonth()]+'</i><b>'+x.getDate()+'</b></span><span style="min-width:0"><b>'+esc(e.name)+'</b><small>Apply by '+fmt(e.deadline)+' · '+esc(e.city||e.county||'')+'</small></span></button>';}
  function orgList(){var m={};evs().forEach(function(e){var o=org(e);if(!o||!next(e))return;var k=slug(o);(m[k]=m[k]||{name:o,slug:k,n:0}).n++;});return Object.keys(m).map(function(k){return m[k];}).sort(function(a,b){return b.n-a.n||(a.name<b.name?-1:1);});}
  function followOrg(sl){var f=follow(),i=f.orgs.indexOf(sl);if(i>-1)f.orgs.splice(i,1);else f.orgs.push(sl);if(user())setFollow(f);else put(FK,JSON.stringify(f));
    d.querySelectorAll('[data-follow="'+sl+'"]').forEach(function(b){var on=f.orgs.indexOf(sl)>-1;b.setAttribute('aria-pressed',String(on));b.textContent=on?'Following':'Follow';});toast(i>-1?'Unfollowed':'Following · their events show first in your feed');}
  function paintRight(){var el=$('fbRight');if(!el)return;var h='';
    var dl=dlWeek().slice(0,5);h+='<section class="fb-rs"><div class="fb-rh"><h5>Deadlines this week</h5><a href="#deadlines">See all</a></div>'+(dl.length?dl.map(riDl).join(''):'<p class="fb-lockbox" style="border-style:solid">No application deadlines in the next 7 days'+(follow().regions.length?' in the areas you follow':'')+'.</p>')+'</section>';
    var sp=evs().filter(function(e){return PX().featured(e.id)&&next(e);}).slice(0,3),dsp=PX().sponsor&&PX().sponsor();
    h+='<section class="fb-rs"><div class="fb-rh"><h5>Sponsored</h5></div>';
    if(dsp)h+='<a class="fb-spon" '+(/^https:\/\//.test(dsp.url||'')?'href="'+esc(dsp.url)+'" target="_blank" rel="sponsored noopener"':'href="#"')+'><b>'+esc(dsp.name)+'</b>'+(dsp.line?'<small style="display:block;color:var(--c-muted)">'+esc(dsp.line)+'</small>':'')+'</a>';
    h+=sp.map(function(e){var a=next(e);return '<button type="button" class="fb-spon fb-ri" style="display:block" data-open="'+esc(e.id)+'" data-a="'+(a||'')+'">'+cover(e,a,'style="height:96px;aspect-ratio:auto;border-radius:8px;margin-bottom:8px;display:block"')+'<b>'+esc(e.name)+'</b><small>'+(a?fmt(a)+' · ':'')+esc(e.city||'')+'</small></button>';}).join('');
    if(!sp.length&&!dsp)h+='<p class="fb-lockbox">Run a market? <a href="pricing.html#get-featured">Feature it here</a> and in the feed, from $20/week.</p>';
    h+='</section><section class="fb-rs"><div class="fb-rh"><h5>Organizers to follow</h5></div>';
    if(fullAccess()){var f=follow(),ol=orgList().slice(0,6);h+=ol.length?ol.map(function(o){var on=f.orgs.indexOf(o.slug)>-1;return '<div class="fb-ri" style="cursor:default"><span class="fb-av sm" aria-hidden="true">'+esc(initials(o.name))+'</span><a href="#o='+esc(o.slug)+'" style="min-width:0;color:inherit;text-decoration:none"><b>'+esc(o.name)+'</b><small>'+o.n+' upcoming event'+(o.n===1?'':'s')+'</small></a><button type="button" class="fb-follow" data-follow="'+esc(o.slug)+'" aria-pressed="'+on+'">'+(on?'Following':'Follow')+'</button></div>';}).join(''):'<p class="fb-lockbox">No organizers on file yet.</p>';}
    else h+='<p class="fb-lockbox">'+ic('lock','style="width:15px;height:15px;vertical-align:-2px"')+' Organizer names and pages are part of <a href="pro.html" data-unlock="vendor-pro">Vendor Pro</a> ($6/month).</p>';
    h+='</section>';el.innerHTML=h;}

  /* ---------------- feed (index Home) ---------------- */
  var FT=[['foryou','For you'],['all','All Florida'],['weekend','This weekend'],['free','Free to vend'],['deadlines','Deadlines']];
  var feedTab=get('jve_fb_tab')||'foryou',shown=12,io=null,homeEl=null;
  function weekendRange(){var x=pd(today),wd=x.getDay();if(wd===6)return [addD(today,-1),addD(today,1)];if(wd===0)return [today,today];var fri=addD(today,5-wd);return [fri,addD(fri,2)];}
  function inWeekend(e){var w=weekendRange();return (e.up||[]).filter(function(x){return x>=w[0]&&x<=w[1];})[0]||null;}
  function feedRows(){var all=evs().filter(function(e){return next(e)||(!(e.dates||[]).length&&e.schedule);}),f=follow(),RG=W.JVE_REGIONS;
    var regs=f.regions.length?f.regions:[RG?RG.get():'ne'],types=f.types,orgs=f.orgs,rows=all.slice();
    if(feedTab==='foryou'){rows=rows.filter(function(e){return regs.indexOf(regionOf(e))>-1;});
      if(types.length){var t=rows.filter(function(e){var k=e.types||[];return types.some(function(x){return k.indexOf(x)>-1||(x==='campus'&&kind(e)==='campus');});});if(t.length>=4)rows=t;}}
    else if(feedTab==='weekend')rows=rows.filter(inWeekend);
    else if(feedTab==='free')rows=rows.filter(function(e){return e.fee_bucket==='free';});
    else if(feedTab==='deadlines')rows=rows.filter(function(e){return e.deadline&&e.deadline>=today;});
    function fo(e){return org(e)&&orgs.indexOf(slug(org(e)))>-1?0:1;}
    rows.sort(function(a,b){
      if(feedTab==='deadlines')return a.deadline<b.deadline?-1:a.deadline>b.deadline?1:0;
      if(feedTab==='foryou'&&fo(a)!==fo(b))return fo(a)-fo(b);
      var x=(feedTab==='weekend'?inWeekend(a):next(a))||'9999',y=(feedTab==='weekend'?inWeekend(b):next(b))||'9999';return x<y?-1:x>y?1:0;});
    /* Sponsored = the paid Featured events, placed in the feed like FB and labelled */
    var spon=all.filter(function(e){return PX().featured(e.id);});
    rows=rows.filter(function(e){return !PX().featured(e.id);});
    spon.slice(0,2).forEach(function(e,i){rows.splice(Math.min(rows.length,1+i*5),0,Object.assign({},e,{_spon:true}));});
    return rows;}
  function postHtml(e){var a=feedTab==='weekend'?(inWeekend(e)||next(e)):next(e),o=org(e),k=kind(e);
    var who=o?'<a href="#o='+esc(slug(o))+'">'+esc(o)+'</a>':e.locked?'Organizer hidden <span class="fb-lk">· '+ic('lock','style="width:12px;height:12px"')+'Pro</span>':'Jax Vendor Events';
    var av=o?'<span class="fb-av" aria-hidden="true">'+esc(initials(o))+'</span>':'<span class="fb-av" aria-hidden="true" style="background:var(--c-raised);color:var(--c-muted)">'+ic(e.locked?'lock':kindIcon(k),'style="width:18px;height:18px"')+'</span>';
    var sub=(e._spon?'Sponsored · ':'')+esc(updated(e))+' · '+esc(regionLabel(regionOf(e)));
    var meta='<span>'+ic('events')+(a?(a<today&&e.end_date&&e.end_date>=today?'Happening now · through '+esc(fmt(e.end_date)):esc(fmtLong(a))+(e.end_date&&e.end_date>a&&(e.up||[]).length<=1?' – '+esc(fmt(e.end_date)):''))+(e.time&&!e.locked?' · '+esc(e.time):''):esc(e.schedule||'Dates on the organizer page'))+'</span><span>'+ic('pin')+esc([e.city,e.county?e.county+' County':''].filter(Boolean).join(', '))+'</span>';
    var tags='<span class="fb-tag'+(e.fee_bucket==='free'?' free':'')+'">'+ic('tag')+esc(feeLabel(e))+'</span>';
    if(e.deadline&&e.deadline>=today){var dn=days(today,e.deadline);tags+='<span class="fb-tag'+(dn<=7?' hot':'')+'">'+ic('clock')+(dn===0?'Apply today':dn===1?'Apply by tomorrow':'Apply by '+MO[pd(e.deadline).getMonth()]+' '+pd(e.deadline).getDate())+'</span>';}
    if(e.verified)tags+='<span class="fb-tag ok">'+ic('check')+'Checked</span>';
    if(e.schedule&&e.schedule.length<30&&(e.recurring||/weekly|monthly|every/i.test(e.schedule)))tags+='<span class="fb-tag">'+esc(e.schedule)+'</span>';
    if(PX().verifiedOrg(e.id))tags+='<span class="fb-tag">'+ic('shield')+'Verified organizer</span>';
    return '<article class="fb-card fb-post" data-pid="'+esc(e.id)+'"><div class="fb-ph">'+av+'<div class="fb-pn"><b>'+who+'</b><small>'+sub+' '+ic('globe')+'</small></div></div>'+
      '<div class="fb-pb"><h3 class="fb-pt"><button type="button" data-open="'+esc(e.id)+'" data-a="'+(a||'')+'">'+esc(e.name)+'</button></h3><div class="fb-pm">'+meta+'</div><div class="fb-tags">'+tags+'</div></div>'+
      '<button type="button" data-open="'+esc(e.id)+'" data-a="'+(a||'')+'" aria-label="Open '+esc(e.name)+'" style="all:unset;display:block;width:100%;cursor:pointer">'+cover(e,a)+'</button>'+
      '<div class="fb-cnt" data-cnt="'+esc(e.id)+'"></div>'+actRow(e)+'</article>';}
  function feedHtml(){var rows=feedRows(),f=follow(),u=user(),h='';
    h+='<div class="fb-card fb-comp"><div class="fb-comp-row">'+(u?avatar():'<span class="fb-av" aria-hidden="true">'+ic('user','style="width:20px;height:20px"')+'</span>')+'<button type="button" class="fb-comp-in" data-fbfind>Search markets, towns, venues…</button></div>'+
      '<div class="fb-comp-acts"><a class="fb-qa" href="#events" data-chip="weekend"><span class="q1">'+ic('events')+'</span>This weekend</a><a class="fb-qa" href="#deadlines"><span class="q3">'+ic('clock')+'</span>Deadlines</a><a class="fb-qa" href="#map"><span class="q4">'+ic('map')+'</span>Map</a><a class="fb-qa" href="#events" data-chip="free"><span class="q2">'+ic('tag')+'</span>Free</a></div></div>';
    h+='<div class="fb-ftabs" role="group" aria-label="Feed">'+FT.map(function(t){return '<button type="button" class="fb-ft" data-ft="'+t[0]+'" aria-pressed="'+(feedTab===t[0])+'">'+t[1]+'</button>';}).join('')+'</div>';
    if(feedTab==='foryou'){var regs=f.regions.length?f.regions:[W.JVE_REGIONS?JVE_REGIONS.get():'ne'];
      h+='<p class="fb-fhint">'+ic('pin','style="width:14px;height:14px"')+' '+esc(regs.map(regionLabel).join(', '))+(f.types.length?' · '+esc(f.types.map(function(t){return t==='campus'?'Campus':(KIND[t]?KIND[t][0]:t);}).join(', ')):'')+' <button type="button" data-fbob>'+(f.regions.length||f.types.length?'Edit':'Personalize your feed')+'</button></p>';}
    if(!rows.length)h+='<div class="fb-card fb-empty" style="padding:28px 16px">Nothing here right now. <button type="button" class="fb-ft" data-ft="all">See all of Florida</button></div>';
    rows.slice(0,shown).forEach(function(e,i){h+=postHtml(e);
      if(i===2){var dl=dlWeek().slice(0,3);if(dl.length)h+='<section class="fb-card fb-inl fb-narrow"><h5>Deadlines this week</h5>'+dl.map(riDl).join('')+'</section>';}
      if(i===5&&!fullAccess())h+='<section class="fb-card fb-pro"><span class="fb-av" aria-hidden="true">'+ic('lock','style="width:20px;height:20px"')+'</span><div><b>See who runs each market</b><p>Vendor Pro shows every event name, organizer, venue and apply link.</p></div><a class="fb-login" href="pro.html" data-unlock="vendor-pro">Get Pro</a></section>';
      if(i===8&&!u&&!get(FK))h+='<section class="fb-card fb-pro"><span class="fb-av" aria-hidden="true">'+ic('grid','style="width:20px;height:20px"')+'</span><div><b>Make this feed yours</b><p>Pick the areas you sell in and the kinds of events you want.</p></div><button type="button" class="fb-login" data-fbob>Personalize</button></section>';});
    if(rows.length>shown)h+='<div class="fb-more"><button type="button" data-fbmore-feed>See more events</button></div>';
    return '<div class="fb-feed">'+h+'</div>';}
  function renderFeed(H){homeEl=H;H.innerHTML=feedHtml();H.classList.add('fbready');paintAll();
    wantCounts(feedRows().slice(0,shown).map(function(e){return e.id;}));
    H.querySelectorAll('[data-ft]').forEach(function(b){b.addEventListener('click',function(){feedTab=b.getAttribute('data-ft');put('jve_fb_tab',feedTab);shown=12;renderFeed(H);});});
    var fi=H.querySelector('[data-fbfind]');if(fi)fi.addEventListener('click',function(){if(W.innerWidth<860)$('fbSrchBtn').click();else $('fbQ').focus();});
    H.querySelectorAll('[data-chip]').forEach(function(a){a.addEventListener('click',function(){var c=a.getAttribute('data-chip');setTimeout(function(){var b=d.querySelector('.xchip[data-f="'+c+'"]');if(b&&b.getAttribute('aria-pressed')!=='true')b.click();},90);});});
    var mb=H.querySelector('[data-fbmore-feed]');if(io){io.disconnect();io=null;}
    if(mb){mb.addEventListener('click',more);if('IntersectionObserver' in W){io=new IntersectionObserver(function(en){if(en[0].isIntersecting)more();},{rootMargin:'500px'});io.observe(mb);}}}
  function more(){if(io){io.disconnect();io=null;}var y=W.scrollY;shown+=12;if(homeEl){renderFeed(homeEl);W.scrollTo(0,y);}}

  /* ---------------- organizer page (#o=slug), full listings only ---------------- */
  function orgPage(H,sl){var o=null;orgList().forEach(function(x){if(x.slug===sl)o=x;});
    var h='<button type="button" class="fb-back" data-fbback>'+ic('back','style="width:18px;height:18px"')+'Back to feed</button>';
    if(!o){h+='<div class="fb-card fb-page" style="padding:24px">'+(fullAccess()?'<b>Organizer not found.</b><p class="fb-spl">They may have no upcoming events right now.</p>':'<b>'+ic('lock','style="width:16px;height:16px;vertical-align:-2px"')+' Organizer pages are part of Vendor Pro</b><p class="fb-spl">Pro shows who runs each market, every event they run and how to apply.</p><a class="fb-btn" href="pro.html" data-unlock="vendor-pro">Get Vendor Pro · $6/mo</a>')+'</div>';H.innerHTML='<div class="fb-orgp">'+h+'</div>';H.classList.add('fbready');wireBack(H);return;}
    var es=evs().filter(function(e){return org(e)&&slug(org(e))===sl;}).sort(function(a,b){return (next(a)||'9')<(next(b)||'9')?-1:1;});
    var counties={};es.forEach(function(e){if(e.county)counties[e.county]=1;});var on=follow().orgs.indexOf(sl)>-1;
    h+='<div class="fb-card fb-page" style="overflow:hidden">'+cover(es[0],null,'style="display:block;height:180px;aspect-ratio:auto;cursor:default;border-radius:0"',true)+
      '<div class="fb-phd"><span class="fb-av" aria-hidden="true">'+esc(initials(o.name))+'</span><div style="min-width:0;flex:1"><h1>'+esc(o.name)+'</h1><p>Market organizer · '+es.length+' upcoming event'+(es.length===1?'':'s')+' · '+esc(Object.keys(counties).join(', '))+(PX().verifiedOrg(es[0].id)?' · Verified organizer':'')+'</p></div>'+
      '<div class="fb-pbtns"><button type="button" class="fb-btn" data-follow="'+esc(sl)+'" aria-pressed="'+on+'">'+(on?'Following':'Follow')+'</button><button type="button" class="fb-btn ghost" data-shareorg>'+ic('share','style="width:16px;height:16px"')+'Share</button></div></div></div>';
    h+='<h2 style="font:700 19px/1.2 var(--f-sans);margin:18px 12px 10px">Upcoming events</h2><div class="fb-feed" style="padding-top:0">'+es.map(postHtml).join('')+'</div>';
    H.innerHTML='<div class="fb-orgp">'+h+'</div>';H.classList.add('fbready');paintAll();wantCounts(es.map(function(e){return e.id;}));wireBack(H);
    var so=H.querySelector('[data-shareorg]');if(so)so.addEventListener('click',function(){var url=location.origin+'/index.html#o='+sl;if(navigator.share)navigator.share({title:o.name+' on Jax Vendor Events',url:url}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(url).then(function(){toast('Link copied');});});
    try{W.scrollTo(0,0);}catch(_){}}
  function wireBack(H){var b=H.querySelector('[data-fbback]');if(b)b.addEventListener('click',function(){location.hash='#';});}
  var FB={home:function(H){if(!W.JVE_APP||!H)return false;var m=location.hash.match(/^#o=(.+)$/);if(m){orgPage(H,decodeURIComponent(m[1]));return true;}renderFeed(H);return true;}};

  /* ---------------- event page (the event sheet, FB Event layout) ---------------- */
  var curId=null;
  FB.sheet=function(e,a){var sh=$('sheet');if(!sh||!e)return;curId=e.id;
    if(!$('fbScroll')){var head=sh.querySelector('.sh-head'),body=$('shBody');if(!head||!body)return;var sc=d.createElement('div');sc.className='fb-scroll';sc.id='fbScroll';
      head.parentNode.insertBefore(sc,head);
      var cv=d.createElement('div');cv.className='fb-ecov';cv.id='fbECov';sc.appendChild(cv);
      var wh=d.createElement('div');wh.className='fb-ehead';wh.id='fbEWhen';sc.appendChild(wh);
      sc.appendChild(head);
      var ac=d.createElement('div');ac.className='fb-eacts';ac.id='fbEActs';sc.appendChild(ac);
      var tb=d.createElement('div');tb.className='fb-etabs';tb.setAttribute('role','tablist');tb.innerHTML='<button type="button" class="fb-etab" role="tab" data-etab="about" aria-selected="true">About</button><button type="button" class="fb-etab" role="tab" data-etab="reviews" aria-selected="false">Reviews</button><button type="button" class="fb-etab" role="tab" data-etab="similar" aria-selected="false">Similar</button>';sc.appendChild(tb);
      var pa=d.createElement('div');pa.className='fb-epane';pa.id='fbPAbout';sc.appendChild(pa);pa.appendChild(body);var ex=d.createElement('div');ex.id='fbAboutX';pa.appendChild(ex);
      var pr=d.createElement('div');pr.className='fb-epane';pr.id='fbPReviews';pr.hidden=true;sc.appendChild(pr);
      var ps=d.createElement('div');ps.className='fb-epane';ps.id='fbPSimilar';ps.hidden=true;sc.appendChild(ps);
      tb.addEventListener('click',function(ev){var t=ev.target.closest('[data-etab]');if(t)etab(t.getAttribute('data-etab'));});}
    etab('about');var sc2=$('fbScroll');if(sc2)sc2.scrollTop=0;
    $('fbECov').innerHTML=cover(e,a,'',false);
    $('fbEWhen').innerHTML='<div class="fb-ewhen">'+(a?esc(fmtLong(a))+(e.time&&!e.locked?' · '+esc(e.time):''):esc(e.schedule||'Dates on the organizer page'))+'</div>';
    $('fbEActs').innerHTML='<button type="button" class="fb-eb" data-r="interested" data-id="'+esc(e.id)+'" data-name="'+esc(e.name)+'" aria-pressed="false">'+ic('star')+'<span class="lb">Interested</span><span class="n"></span></button>'+
      '<button type="button" class="fb-eb" data-r="going" data-id="'+esc(e.id)+'" data-name="'+esc(e.name)+'" aria-pressed="false">'+ic('check')+'<span class="lb">Going</span><span class="n"></span></button>'+
      '<button type="button" class="fb-eb" data-r="saved" data-id="'+esc(e.id)+'" aria-pressed="false">'+ic('saved')+'<span class="lb">Save</span></button>'+
      '<button type="button" class="fb-eb" data-share="'+esc(e.id)+'">'+ic('share')+'Share</button>';
    var o=org(e),x='';
    x+='<div class="fb-ecard"><h4>Location</h4><div class="fb-mapbox"><span>'+ic('pin','style="width:14px;height:14px;vertical-align:-2px"')+' '+esc(e.city||e.county||'Florida')+'</span></div>'+
      (!e.locked&&e.address?'<p>'+esc(e.address)+'</p><p style="display:flex;gap:8px;flex-wrap:wrap"><a class="fb-btn ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(e.address)+'">'+ic('dir','style="width:16px;height:16px"')+'Directions</a><a class="fb-btn ghost" href="#map" data-fbgo>See on map</a></p>'
        :'<p>'+esc([e.city,e.county?e.county+' County':''].filter(Boolean).join(', '))+(e.locked?' · exact venue with Vendor Pro':'')+'</p><p><a class="fb-btn ghost" href="#map" data-fbgo>See on map</a></p>')+'</div>';
    if(o){var ol=orgList().filter(function(z){return z.slug===slug(o);})[0];x+='<div class="fb-ecard"><h4>Organizer</h4><div class="fb-orow"><span class="fb-av" aria-hidden="true">'+esc(initials(o))+'</span><div style="min-width:0;flex:1"><b>'+esc(o)+'</b><small>'+(ol?ol.n+' upcoming event'+(ol.n===1?'':'s'):'Market organizer')+'</small></div><a class="fb-btn ghost" href="#o='+esc(slug(o))+'" data-fbgo>View page</a></div></div>';}
    else if(e.locked)x+='<div class="fb-ecard"><h4>Organizer</h4><div class="fb-orow"><span class="fb-av" aria-hidden="true" style="background:var(--c-surface);color:var(--c-muted)">'+ic('lock','style="width:18px;height:18px"')+'</span><div style="flex:1"><b>Hidden on free accounts</b><small>Vendor Pro shows who runs it and how to apply</small></div></div></div>';
    $('fbAboutX').innerHTML=x;
    $('fbAboutX').querySelectorAll('[data-fbgo]').forEach(function(l){l.addEventListener('click',function(ev){ev.preventDefault();var to=l.getAttribute('href'),cl=$('shClose');if(cl)cl.click();setTimeout(function(){location.hash=to;},80);});});
    var k=kind(e),rg=regionOf(e),sim=evs().filter(function(z){return z.id!==e.id&&next(z)&&kind(z)===k&&regionOf(z)===rg;}).slice(0,6);
    if(sim.length<4)sim=sim.concat(evs().filter(function(z){return z.id!==e.id&&next(z)&&regionOf(z)===rg&&sim.indexOf(z)<0;}).slice(0,6-sim.length));
    $('fbPSimilar').innerHTML=sim.length?'<div class="fb-sim">'+sim.map(function(z){var n=next(z);return '<button type="button" class="fb-simc" data-open="'+esc(z.id)+'" data-a="'+(n||'')+'">'+cover(z,n)+'<div class="t"><b>'+esc(z.name)+'</b><small>'+(n?fmt(n)+' · ':'')+esc(z.city||'')+'</small></div></button>';}).join('')+'</div>':'<p class="fb-spl">No similar events in this area right now.</p>';
    $('fbPReviews').setAttribute('data-for','');$('fbPReviews').innerHTML='';
    paintOne(e.id);wantCounts([e.id]);};
  function etab(t){d.querySelectorAll('[data-etab]').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-etab')===t));});
    ['About','Reviews','Similar'].forEach(function(k){var p=$('fbP'+k);if(p)p.hidden=k.toLowerCase()!==t;});if(t==='reviews')reviews();}
  /* reviews: Vendor Pro members read + write (event_reviews, RLS full_access); free + logged-out see a lock */
  function stars(n){var s='';for(var i=1;i<=5;i++)s+='<span style="opacity:'+(i<=n?1:.25)+'">'+STAR+'</span>';return '<span class="fb-stars" role="img" aria-label="'+n+' of 5 stars">'+s+'</span>';}
  function reviews(){var p=$('fbPReviews'),id=curId;if(!p||!id||p.getAttribute('data-for')===id)return;p.setAttribute('data-for',id);var A=auth();
    if(!A||!A.user){p.innerHTML='<p>Reviews come from vendors who worked this market: foot traffic, sales, how it’s run.</p><p><a class="fb-btn" href="login.html?next='+encodeURIComponent(nextPath())+'">Log in</a></p>';return;}
    if(!fullAccess()){p.innerHTML='<div class="fb-lockbox" style="margin:0">'+ic('lock','style="width:15px;height:15px;vertical-align:-2px"')+' <b>Vendor reviews are part of Vendor Pro.</b> Read what other vendors say about foot traffic, sales and how the market is run, and leave your own.<p style="margin:10px 0 0"><a class="fb-btn" href="pro.html" data-unlock="vendor-pro">Get Vendor Pro · $6/mo</a></p></div>';return;}
    p.innerHTML='<p class="fb-spl">Loading reviews…</p>';
    A.sb.from('event_reviews').select('id,user_id,rating,body,author,created_at').eq('event_id',id).order('created_at',{ascending:false}).limit(50).then(function(r){
      if(curId!==id)return;if(r.error){p.innerHTML='<p class="fb-spl">Reviews couldn’t load right now.</p>';return;}
      var rows=r.data||[],mine=null;rows.forEach(function(x){if(x.user_id===A.user.id)mine=x;});
      var avg=rows.length?rows.reduce(function(s,x){return s+x.rating;},0)/rows.length:0,h='';
      h+=rows.length?'<p style="display:flex;gap:8px;align-items:center;margin:0 0 12px">'+stars(Math.round(avg))+' <b>'+avg.toFixed(1)+'</b> <span class="fb-spl">· '+rows.length+' review'+(rows.length===1?'':'s')+' from vendors</span></p>':'<p class="fb-spl" style="margin:0 0 12px">No reviews yet. Worked this market? Be the first.</p>';
      var val=mine?mine.rating:0;
      h+='<form class="fb-rform" id="fbRForm"><b>'+(mine?'Your review':'Write a review')+'</b><div class="fb-rate" role="group" aria-label="Rating">'+[1,2,3,4,5].map(function(n){return '<button type="button" data-rate="'+n+'" aria-pressed="'+(n<=val)+'" aria-label="'+n+' star'+(n>1?'s':'')+'">'+STAR+'</button>';}).join('')+'</div>'+
        '<label class="fb-sr" for="fbRBody">Review</label><textarea id="fbRBody" maxlength="600" placeholder="Foot traffic, sales, setup, how it was run…">'+esc(mine?mine.body:'')+'</textarea><div style="display:flex;gap:8px"><button class="fb-btn" type="submit">'+(mine?'Update':'Post review')+'</button>'+(mine?'<button class="fb-btn ghost" type="button" data-rdel>Delete</button>':'')+'</div></form>';
      h+='<div class="fb-rev" style="margin-top:14px">'+rows.map(function(x){var dt=new Date(x.created_at);return '<div class="fb-ritem"><span class="fb-av sm" aria-hidden="true">'+esc(initials(x.author))+'</span><div style="min-width:0"><div class="fb-bub"><b>'+esc(x.author||'Vendor')+'</b> '+stars(x.rating)+(x.body?'<p>'+esc(x.body)+'</p>':'')+'</div><small>'+MO[dt.getMonth()]+' '+dt.getDate()+'</small></div></div>';}).join('')+'</div>';
      p.innerHTML=h;var f=$('fbRForm');
      f.querySelectorAll('[data-rate]').forEach(function(b){b.addEventListener('click',function(){val=+b.getAttribute('data-rate');f.querySelectorAll('[data-rate]').forEach(function(c){c.setAttribute('aria-pressed',String(+c.getAttribute('data-rate')<=val));});});});
      f.addEventListener('submit',function(ev){ev.preventDefault();if(!val){toast('Pick 1 to 5 stars');return;}var body=$('fbRBody').value.trim().slice(0,600),nm=(myName().split(/[\s@]/)[0]||'Vendor').slice(0,40);
        A.sb.from('event_reviews').upsert({user_id:A.user.id,event_id:id,rating:val,body:body,author:nm,updated_at:new Date().toISOString()},{onConflict:'user_id,event_id'}).then(function(r2){if(r2.error){toast('Couldn’t post that review.');return;}toast('Review posted');p.setAttribute('data-for','');reviews();});});
      var del=f.querySelector('[data-rdel]');if(del)del.addEventListener('click',function(){A.sb.from('event_reviews').delete().eq('user_id',A.user.id).eq('event_id',id).then(function(){toast('Review deleted');p.setAttribute('data-for','');reviews();});});
    },function(){p.innerHTML='<p class="fb-spl">Reviews couldn’t load. Check your connection.</p>';});}

  /* ---------------- onboarding: follow areas + event types → personalized feed ---------------- */
  function onboard(){var old=$('fbOb');if(old)old.remove();closePop();var RG=W.JVE_REGIONS,f=follow(),regs=f.regions.slice(),types=f.types.slice();
    if(!regs.length&&RG)regs=[RG.get()];
    var TY=[['farmers','Farmers markets'],['craft','Craft & art fairs'],['festival','Festivals & fairs'],['holiday','Holiday markets'],['popup','Pop-ups'],['city','City & county events'],['campus','Campus markets']];
    var el=d.createElement('div');el.className='fb-ob';el.id='fbOb';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','fbObT');
    var step=1;
    function paint(){var h='<div class="fb-obc">';
      if(step===1)h+='<h2 id="fbObT">Where do you sell?</h2><p>Pick the areas you want in your feed. You can change this anytime.</p><div class="fb-chips">'+(RG?RG.list:[]).map(function(r){return '<button type="button" class="fb-chip" data-reg="'+r.id+'" aria-pressed="'+(regs.indexOf(r.id)>-1)+'">'+esc(r.label)+'</button>';}).join('')+'</div>';
      else h+='<h2 id="fbObT">What kind of events?</h2><p>These go first in your feed. Leave them all off to see everything.</p><div class="fb-chips">'+TY.map(function(t){return '<button type="button" class="fb-chip" data-ty="'+t[0]+'" aria-pressed="'+(types.indexOf(t[0])>-1)+'">'+t[1]+'</button>';}).join('')+'</div>';
      h+='<div class="fb-obf"><div class="fb-steps" aria-hidden="true"><i class="'+(step===1?'on':'')+'"></i><i class="'+(step===2?'on':'')+'"></i></div><div style="display:flex;gap:8px"><button type="button" class="fb-btn ghost" data-ob="skip">'+(step===1?'Not now':'Back')+'</button><button type="button" class="fb-btn" data-ob="next"'+(step===1&&!regs.length?' disabled':'')+'>'+(step===1?'Next':'Show my feed')+'</button></div></div></div>';
      el.innerHTML=h;var nb=el.querySelector('[data-ob=next]');if(nb)nb.focus();}
    el.addEventListener('click',function(ev){var c=ev.target.closest('[data-reg],[data-ty],[data-ob]');if(!c){if(ev.target===el)close(false);return;}
      if(c.hasAttribute('data-reg')){var r=c.getAttribute('data-reg'),i=regs.indexOf(r);if(i>-1)regs.splice(i,1);else regs.push(r);paint();return;}
      if(c.hasAttribute('data-ty')){var t=c.getAttribute('data-ty'),j=types.indexOf(t);if(j>-1)types.splice(j,1);else types.push(t);paint();return;}
      if(c.getAttribute('data-ob')==='skip'){if(step===2){step=1;paint();}else close(false);return;}
      if(step===1){step=2;paint();return;}close(true);});
    el.addEventListener('keydown',function(ev){if(ev.key==='Escape')close(false);});
    function close(save){var nf={regions:regs,types:types,orgs:f.orgs};
      if(save){put(FK,JSON.stringify(nf));if(user())setFollow(nf);if(RG&&regs[0]&&regs.indexOf(RG.get())<0)RG.set(regs[0]);feedTab='foryou';put('jve_fb_tab','foryou');toast('Your feed is ready');}
      else if(user())savePrefs({fb_onboarded:true});
      if(user())put('jve_fb_ob_'+user().id,'1');el.remove();paintLeft();paintRight();
      if(isIndex){if(location.hash&&location.hash!=='#')location.hash='#';else if(homeEl)FB.home(homeEl);}}
    paint();d.body.appendChild(el);}
  function maybeOnboard(){var u=user();if(!u||!isIndex)return;if(prefs().fb_onboarded||get('jve_fb_ob_'+u.id))return;if(/^#(e|o)=/.test(location.hash))return;setTimeout(onboard,800);}

  /* ---------------- account page = profile + Interested / Going / Saved ---------------- */
  function profile(){if(pg!=='account.html'||$('fbProf'))return;var A=auth();if(!A||!A.user)return;var main=$('main');if(!main)return;
    var full=fullAccess(),n=myName();
    var el=d.createElement('section');el.className='fb-card fb-prof';el.id='fbProf';
    el.innerHTML='<span class="fb-cov k-popup fb-pcov" style="display:block;aspect-ratio:auto;cursor:default"><span class="fb-cic">'+ic('tent')+'</span></span>'+
      '<div class="fb-phd">'+avatar('lg')+'<div style="min-width:0;flex:1"><h1>'+esc(n||'Your account')+(full?'<span class="fb-badge">PRO</span>':'<span class="fb-badge free">Free</span>')+'</h1><p>'+esc(A.user.email||'')+'</p></div>'+
      '<div class="fb-pbtns"><a class="fb-btn ghost" href="#sec-brand">Edit profile</a>'+(full?'':'<a class="fb-btn" href="pro.html" data-unlock="vendor-pro">Get Pro</a>')+'</div></div>'+
      '<nav class="fb-ptabs" aria-label="Profile sections"><a class="fb-etab" href="#fb-mine">Interested & going</a><a class="fb-etab" href="#sec-stuff">Saved & listings</a><a class="fb-etab" href="#sec-plan">Plan</a><a class="fb-etab" href="#sec-payments">Payments</a><a class="fb-etab" href="#sec-brand">Profile</a></nav>';
    var first=main.querySelector('section');main.insertBefore(el,first||main.firstChild);
    var mine=d.createElement('section');mine.className='fb-card fb-mine';mine.id='fb-mine';el.parentNode.insertBefore(mine,el.nextSibling);mineList();
    if(location.hash==='#fb-mine')setTimeout(function(){mine.scrollIntoView();},300);}
  function mineList(){var el=$('fb-mine');if(!el)return;var a=evs(),h='<h3>Interested & going</h3>';
    var g=a.filter(function(e){return R.going[e.id];}),i=a.filter(function(e){return R.interested[e.id];}),s=a.filter(function(e){return R.saved[e.id];});
    function li(e){var n=next(e);return '<a class="fb-ri" href="index.html#e='+encodeURIComponent(e.id)+'">'+(n?'<span class="fb-dd"><i>'+MO[pd(n).getMonth()]+'</i><b>'+pd(n).getDate()+'</b></span>':'<span class="fb-dd"><i>Open</i><b>∞</b></span>')+'<span style="min-width:0"><b>'+esc(e.name)+'</b><small>'+esc([e.city,e.county].filter(Boolean).join(' · '))+'</small></span></a>';}
    if(!R.loaded){el.innerHTML=h+'<p class="fb-spl">Loading…</p>';return;}
    if(!g.length&&!i.length&&!s.length){el.innerHTML=h+'<p class="fb-spl">Nothing yet. Tap <b>Interested</b>, <b>Going</b> or <b>Save</b> on any event in your <a href="index.html">feed</a>.</p>';return;}
    if(g.length)h+='<h4 style="margin:10px 0 4px">Going · '+g.length+'</h4>'+g.map(li).join('');
    if(i.length)h+='<h4 style="margin:10px 0 4px">Interested · '+i.length+'</h4>'+i.map(li).join('');
    if(s.length)h+='<h4 style="margin:10px 0 4px">Saved · '+s.length+'</h4>'+s.map(li).join('');
    el.innerHTML=h;}

  /* ---------------- boot ---------------- */
  W.JVE_FB=FB;
  FB.paintAll=paintAll;FB.counts=wantCounts;
  function boot(){buildTop();buildLeft();buildRight();notes();
    if(isIndex){try{var q=sessionStorage.getItem('fb_q');if(q){sessionStorage.removeItem('fb_q');var f=$('fQ');if(f){f.value=q;f.dispatchEvent(new Event('input',{bubbles:true}));}var t=$('fbQ');if(t)t.value=q;}}catch(_){}}}
  if(d.body)boot();else d.addEventListener('DOMContentLoaded',boot);
  function afterAuth(){meSlot();paintLeft();paintRight();rLoad();profile();maybeOnboard();var pl=prefs().look;if(pl&&!get(LK)&&(pl==='light'||pl==='dark'||pl==='auto'))setLook(pl,true);}
  var A0=auth();if(A0&&A0.ready&&A0.ready.then)A0.ready.then(function(){if(d.body)afterAuth();else d.addEventListener('DOMContentLoaded',afterAuth);});
  else d.addEventListener('DOMContentLoaded',function(){rLoad();});
  d.addEventListener('jve:app',function(){paintLeft();paintRight();notes();mineList();var H=homeEl||$('home');if(H&&W.JVE_APP.view()==='home')FB.home(H);});
  d.addEventListener('jve:region',function(){paintRight();if(homeEl&&W.JVE_APP&&JVE_APP.view()==='home')FB.home(homeEl);});
})();
