/* Jax Vendor Events: the logged-in Home is the member's own dashboard (dash.js, Nov 2026).
   app.js draws the public Home (stat tiles, weekend row, deadlines, types); for a logged-in member this file adds,
   on top of it: their brand header (brand_profiles: logo, business name, color, tagline; initials + the site accent
   when a field is empty), one plan line, "My schedule" for the next 14 days (their linked calendar through the
   my-calendar function + the events they saved), and a block for the role they chose at sign-up
   (vendor / organizer / business; admins also get a quick admin summary).
   Everything is drawn from data this login is already allowed to read; free members still get teasers only
   (no names, venues or links are fetched here). Text is escaped; images must match the owner-folder pattern. */
(function(){
  'use strict';
  var A=window.JVE_AUTH;
  var CFG=window.JVE_SB||{};
  var IMG_BASE=(CFG.url||'https://dvhrkgtozbgeebdlgzuh.supabase.co')+'/storage/v1/object/public/brand/';
  var IMG_PATH=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/logo-[a-z0-9]{6,24}\.(webp|jpg|png)$/;
  var WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var ROLE={vendor:'Vendor',organizer:'Organizer',business:'Business'};
  var TN={'featured-event':'Featured event','deadline-spotlight':'Deadline spotlight','organizer-plus':'Organizer Plus','newsletter-sponsor':'Newsletter sponsor',
    'directory-sponsor':'Directory sponsor','featured-vendor':'Featured vendor','vendor-pro':'Vendor Pro'};
  var S={brand:undefined,mem:undefined,reqs:undefined,cal:undefined,adm:undefined},started=false,H=null,ctx=null;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function ico(n,c){return '<svg class="ico'+(c?' '+c:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
  function pd(s){var p=String(s).split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function add(s,n){var d=pd(s);d.setDate(d.getDate()+n);return iso(d);}
  function short(s){var d=pd(s);return MO[d.getMonth()]+' '+d.getDate();}
  function hex(c){return /^#[0-9a-f]{6}$/i.test(c||'')?c.toLowerCase():null;}
  function lum(c){return [1,3,5].map(function(i){var x=parseInt(c.substr(i,2),16)/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);}).reduce(function(a,x,i){return a+x*[0.2126,0.7152,0.0722][i];},0);}
  function onColor(c){return lum(c)>0.42?'#111418':'#ffffff';}
  function initials(s){var w=String(s||'').replace(/[^A-Za-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase();}
  function t12(s){if(!s)return '';var p=s.split(':'),h=+p[0],m=p[1];if(h===24)return '12am';return (h%12||12)+(m!=='00'?':'+m:'')+(h<12?'am':'pm');}
  function role(){var t=A&&A.profile&&A.profile.account_type;return ROLE[t]?t:'vendor';}
  function full(){return !!(A&&(A.admin||A.access==='full'));}
  function on(){return !!(A&&A.user);}
  function skel(n,cls){var o='';for(var i=0;i<(n||1);i++)o+='<span class="lx-skel '+(cls||'')+'"></span>';return o;}

  /* ---------- reads (each one once per page; re-renders reuse them) ---------- */
  function load(){
    if(started||!on())return;started=true;var sb=A.sb,uid=A.user.id;
    /* brand: d936f1d9's brand_profiles row (owner can read their own). Missing table/row = initials + default accent. */
    function direct(){return sb.from('brand_profiles').select('business_name,tagline,color,logo_path,slug,kind').eq('user_id',uid).maybeSingle()
      .then(function(r){return (r&&!r.error&&r.data)||null;});}
    var BR=window.JVE_BRAND;   /* brand.js read path (auth/URLS.md) when it is on the page; the same row read directly otherwise */
    (BR&&BR.mine?BR.mine().then(function(m){return m?{business_name:m.name,tagline:m.tagline,color:m.color,logo_path:m.logo,slug:m.slug,kind:m.kind}:null;},direct):direct())
      .then(function(b){S.brand=b;paint();},function(){S.brand=null;paint();});
    sb.from('memberships').select('tier,status,until,source').eq('user_id',uid).order('created_at',{ascending:false}).limit(20)
      .then(function(r){S.mem=(r&&!r.error&&r.data)||[];paint();},function(){S.mem=[];paint();});
    sb.from('listing_requests').select('id,kind,event_id,status,created_at,payload').eq('user_id',uid).order('created_at',{ascending:false}).limit(20)
      .then(function(r){S.reqs=(r&&!r.error&&r.data)||[];paint();},function(){S.reqs=[];paint();});
    /* calendar: cc1afdea's my-calendar Edge Function returns only this member's own busy blocks */
    var tz='America/New_York';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||tz;}catch(_){}
    var done=false,tm=setTimeout(function(){if(!done){done=true;S.cal={linked:null,busy:[],err:true};paint();}},9000);
    try{sb.functions.invoke('my-calendar',{body:{action:'busy',tz:tz}}).then(function(r){if(done)return;done=true;clearTimeout(tm);
        var d=r&&r.data;S.cal=(d&&typeof d==='object'&&!r.error)?{linked:!!d.linked,busy:Array.isArray(d.busy)?d.busy:[],err:!!d.error,label:d.label||d.provider||''}:{linked:null,busy:[],err:true};paint();},
      function(){if(done)return;done=true;clearTimeout(tm);S.cal={linked:null,busy:[],err:true};paint();});}catch(_){done=true;clearTimeout(tm);S.cal={linked:null,busy:[],err:true};}
    if(A.admin){var since=new Date(Date.now()-30*864e5).toISOString(),wk=Date.now()-7*864e5;
      Promise.all([sb.rpc('admin_users'),sb.from('payments').select('amount_cents,created_at').gte('created_at',since).limit(1000),
        sb.from('listing_requests').select('id',{count:'exact',head:true}).eq('status','pending')]).then(function(r){
        var u=(r[0]&&r[0].data)||[],p=(r[1]&&r[1].data)||[];
        S.adm={users:u.length,newUsers:u.filter(function(x){return x.created_at&&Date.parse(x.created_at)>wk;}).length,
          pro:u.filter(function(x){return (x.tiers||[]).indexOf&&(x.tiers||[]).indexOf('vendor-pro')>-1;}).length,
          sales:p.length,cents:p.reduce(function(a,x){return a+(+x.amount_cents||0);},0),pending:(r[2]&&r[2].count)||0,err:!!(r[0]&&r[0].error)};paint();
      },function(){S.adm={err:true};paint();});}
  }

  /* ---------- pieces ---------- */
  function brandHead(){
    var p=A.profile||{},b=S.brand,name=(b&&b.business_name)||p.business_name||p.full_name||(A.user.email||'').split('@')[0];
    var first=String(p.full_name||'').trim().split(/\s+/)[0];
    var c=hex(b&&b.color),style=c?' style="--bc:'+c+';--bc-on:'+onColor(c)+'"':'';
    var logo=b&&IMG_PATH.test(b.logo_path||'')?'<img class="dh-logo" src="'+IMG_BASE+esc(b.logo_path)+'" alt="" width="64" height="64" decoding="async">'
      :'<span class="dh-logo dh-mono" aria-hidden="true">'+esc(initials(name))+'</span>';
    var h=new Date().getHours(),g=h<5?'Good evening':h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    var badges='<span class="dh-pill">'+esc(ROLE[role()])+'</span>'+(A.admin?'<span class="dh-pill gold">Admin</span>':A.has&&A.has('vendor-pro')?'<span class="dh-pill gold">PRO</span>':'');
    var edit=b===undefined?'':'<a class="dh-edit" href="account.html#brand">'+(b&&(b.logo_path||b.color)?'Edit brand':'Add logo &amp; color')+'</a>';
    return '<section class="dh'+(c?' branded':'')+'"'+style+' aria-label="Your dashboard">'+
      '<div class="dh-row">'+(b===undefined?'<span class="dh-logo lx-skel"></span>':logo)+
      '<div class="dh-t"><span class="dh-hi">'+g+(first?', '+esc(first):'')+'</span><h2>'+esc(name)+'</h2>'+
      ((b&&b.tagline)?'<p class="dh-tag">'+esc(b.tagline)+'</p>':'')+'<div class="dh-pills">'+badges+edit+'</div></div></div>'+planLine()+'</section>';
  }
  function planLine(){
    if(A.admin)return '<div class="dh-plan"><span class="dh-pdot full"></span><span><b>Admin</b> · every event and feature, never billed</span><a href="admin.html">Admin</a></div>';
    var t=(A.tiers||[]).slice();
    if(t.length){var m=(S.mem||[]).filter(function(x){return x.status==='active'&&t.indexOf(x.tier)>-1&&x.until;}).sort(function(a,b){return a.until<b.until?-1:1;})[0];
      return '<div class="dh-plan"><span class="dh-pdot full"></span><span><b>'+esc(t.map(function(x){return TN[x]||x;}).join(' + '))+'</b>'+(m?' · through '+short(String(m.until).slice(0,10)):' · active')+'</span><a href="account.html#sec-plan">Manage</a></div>';}
    var up=role()==='organizer'?['organizer-plus','Organizer Plus']:role()==='business'?['newsletter-sponsor','Sponsor']:['vendor-pro','Vendor Pro'];
    return '<div class="dh-plan"><span class="dh-pdot"></span><span><b>Free plan</b> · '+(role()==='vendor'?'names, places and apply links locked':'listing is free')+'</span><a href="#" data-unlock="'+up[0]+'">Upgrade</a></div>';
  }
  function marketsOn(day){var n=0;ctx.mine.forEach(function(e){if(ctx.inRange(e,day,day))n++;});return n;}
  function savedIn(a,b){var out=[];(ctx.getSaved()||[]).forEach(function(id){var e=ctx.byId[id];if(!e)return;
      var d=(e.up||[]).filter(function(x){return x>=a&&x<=b;})[0]||(ctx.inRange(e,a,b)?a:null);if(d)out.push({d:d,e:e});});return out;}
  function schedule(){
    var a=ctx.floor,b=add(a,13),cal=S.cal,busy={},items=[];
    if(cal&&cal.busy)cal.busy.forEach(function(x){if(x&&x.d>=a&&x.d<=b){(busy[x.d]=busy[x.d]||[]).push(x);items.push({d:x.d,k:'cal',s:x.a?'':x.s||'',t:x.t||'Busy',e2:x.e||''});}});
    var sv=savedIn(a,b),sd={};sv.forEach(function(r){sd[r.d]=1;items.push({d:r.d,k:'saved',e:r.e,s:'',t:r.e.name});});
    items.sort(function(x,y){return x.d<y.d?-1:x.d>y.d?1:(x.k==='saved'?1:0)-(y.k==='saved'?1:0)||(x.s<y.s?-1:1);});
    var strip='';for(var i=0;i<14;i++){var d=add(a,i),dt=pd(d),wd=dt.getDay(),n=marketsOn(d),bz=busy[d]&&busy[d].length,we=wd===0||wd===6,lk=cal&&cal.linked;
      strip+='<button type="button" class="ds-day'+(we?' we':'')+(i===0?' today':'')+(lk&&!bz&&we&&n?' free':'')+'" data-dsday="'+d+'" aria-label="'+WD[wd]+' '+short(d)+': '+n+' market'+(n===1?'':'s')+(bz?', '+bz+' on your calendar':'')+(sd[d]?', saved event':'')+'">'+
        '<small>'+(i===0?'Today':WD[wd])+'</small><b>'+dt.getDate()+'</b><span class="ds-dots">'+(bz?'<i class="c"></i>':'')+(sd[d]?'<i class="s"></i>':'')+'</span>'+
        '<span class="ds-n">'+(lk&&!bz&&we&&n?'Free':n?n+'<span class="lx-vh"> markets</span>':'·')+'</span></button>';}
    var body='<div class="ds-strip" role="group" aria-label="Next 14 days">'+strip+'</div>';
    if(cal===undefined)body+='<div class="ds-list">'+skel(3,'row')+'</div>';
    else{
      if(items.length){var lastD='',rows='',shown=items.slice(0,7);
        shown.forEach(function(it){var hd=it.d!==lastD?'<span class="ds-dh">'+(it.d===a?'Today':it.d===add(a,1)?'Tomorrow':WD[pd(it.d).getDay()]+', '+short(it.d))+'</span>':'';lastD=it.d;
          if(it.k==='saved')rows+=hd+'<button type="button" class="ds-it sv" data-id="'+esc(it.e.id)+'" data-a="'+it.d+'"><i class="ds-k"></i><span class="ds-tt"><b>'+esc(it.t)+'</b><small>Saved · '+esc(it.e.city||it.e.county||'')+'</small></span>'+ico('right','sm')+'</button>';
          else rows+=hd+'<div class="ds-it cl"><i class="ds-k"></i><span class="ds-tt"><b>'+esc(it.t)+'</b><small>'+(it.s?t12(it.s)+(it.e2&&it.e2!==it.s?'–'+t12(it.e2):''):'All day')+' · your calendar</small></span></div>';});
        if(items.length>shown.length)rows+='<p class="ds-more">+'+(items.length-shown.length)+' more in the next 14 days</p>';
        body+='<div class="ds-list">'+rows+'</div>';}
      else body+='<div class="ds-empty"><b>Nothing on the books yet</b><span>Save events with the heart and they land here'+(cal&&cal.linked?'.':', next to your own calendar.')+'</span></div>';
      if(cal&&cal.linked===false)body+='<a class="ds-link" href="account.html#calCard">'+ico('calplus')+'<span><b>Link your calendar</b><small>Google, Apple or Outlook: see your busy days next to the markets</small></span>'+ico('right','sm')+'</a>';
      else if(cal&&cal.err&&cal.linked!==true)body+='<a class="ds-link" href="account.html#calCard">'+ico('calplus')+'<span><b>Link your calendar</b><small>See your busy days and free weekends here</small></span>'+ico('right','sm')+'</a>';
    }
    return '<section class="hsec dsec"><div class="hsh"><h2>My schedule <small>next 14 days</small></h2><a class="hall" href="#saved">Saved'+ico('right','sm')+'</a></div><div class="lx-sheet ds">'+body+'</div></section>';
  }
  function deadlines(){
    var sv=ctx.getSaved()||[],L=ctx.mine.filter(ctx.hasDl).sort(function(a,b){var sa=sv.indexOf(a.id)>-1?0:1,sb2=sv.indexOf(b.id)>-1?0:1;if(ctx.days(ctx.floor,a.deadline)<=14&&sa!==sb2)return sa-sb2;return a.deadline<b.deadline?-1:a.deadline>b.deadline?1:0;}).slice(0,4);
    if(!L.length)return '';
    return '<div class="dr-blk"><h3 class="dr-h">Deadlines closing</h3><div class="hdl">'+L.map(function(e){var n=ctx.days(ctx.floor,e.deadline);
      return '<button type="button" class="hdr" data-id="'+esc(e.id)+'" data-a="'+(e.up[0]||'')+'"><span class="hdn'+(n<=3?' urgent':n<=10?' warm':'')+'">'+(n<=0?'<b>!</b><small>today</small>':'<b>'+n+'</b><small>'+(n===1?'day':'days')+'</small>')+'</span>'+
        '<span class="hdt"><b>'+esc(e.name)+'</b><small>Apply by '+short(e.deadline)+(sv.indexOf(e.id)>-1?' · saved':'')+(e.city?' · '+esc(e.city):'')+'</small></span>'+ico('right','sm hch')+'</button>';}).join('')+
      '<button type="button" class="hdall" data-go="deadlines">All deadlines'+ico('right','sm')+'</button></div></div>';
  }
  function freeWeekends(){
    var cal=S.cal,lk=cal&&cal.linked,busy={};if(cal&&cal.busy)cal.busy.forEach(function(x){busy[x.d]=1;});
    var d0=pd(ctx.floor),sat=new Date(d0);sat.setDate(d0.getDate()+((6-d0.getDay()+7)%7));var out=[];
    for(var w=0;w<8&&out.length<4;w++){var s=new Date(sat);s.setDate(sat.getDate()+7*w);var si=iso(s),su=add(si,1);
      var n=0;ctx.mine.forEach(function(e){if(ctx.inRange(e,si,su))n++;});if(!n)continue;
      var free=!busy[si]||!busy[su];if(lk&&!free)continue;
      out.push('<button type="button" class="fw" data-dsday="'+si+'"><span class="fw-d">'+short(si)+'–'+pd(su).getDate()+'</span><b>'+n+'</b><small>market'+(n===1?'':'s')+'</small>'+(lk?'<span class="fw-f">'+(!busy[si]&&!busy[su]?'You’re free':'Partly free')+'</span>':'')+'</button>');}
    if(!out.length)return '';
    return '<div class="dr-blk"><h3 class="dr-h">'+(lk?'Free weekends with markets':'Weekends with markets')+'</h3><div class="fwrow">'+out.join('')+'</div>'+(lk?'':'<p class="dr-note">Link your calendar and we’ll show only the weekends you’re free.</p>')+'</div>';
  }
  function proCard(){
    if(full()||(A.has&&A.has('vendor-pro')))return '';
    var locked=ctx.mine.filter(function(e){return e.locked;}).length;
    return '<div class="dr-pro"><span class="dr-pk">Vendor Pro · $6/mo</span><b>'+(locked?'See the names and apply links for '+locked+' market'+(locked===1?'':'s')+' near you':'Never miss an application deadline')+'</b>'+
      '<span class="dr-pl">Names, exact places, one-tap apply, deadline reminders</span><a class="btn sm" href="#" data-unlock="vendor-pro">Go Pro</a></div>';
  }
  function organizer(){
    var own=ctx.ev.filter(function(e){return e.mine;}),rq=(S.reqs||[]).filter(function(r){return r.kind==='new_event'||r.kind==='edit_event';});
    var rows=own.slice(0,5).map(function(e){var nx=(e.up||[]).filter(function(x){return x>=ctx.floor;})[0];
      return '<button type="button" class="ol" data-id="'+esc(e.id)+'" data-a="'+(nx||'')+'"><span class="ol-t"><b>'+esc(e.name)+'</b><small>'+(nx?short(nx):'Dates on file')+(e.city?' · '+esc(e.city):'')+'</small></span><span class="st live">'+(ctx.PX.featured(e.id)?'Featured':'Live')+'</span></button>';}).join('');
    rows+=rq.filter(function(r){return r.status!=='approved';}).slice(0,4).map(function(r){var nm=(r.payload&&(r.payload.name||r.payload.event_name))||(r.kind==='edit_event'?'Listing update':'New listing');
      return '<div class="ol"><span class="ol-t"><b>'+esc(String(nm).slice(0,80))+'</b><small>Sent '+short(String(r.created_at).slice(0,10))+'</small></span><span class="st '+esc(r.status)+'">'+(r.status==='pending'?'In review':r.status==='rejected'?'Not approved':esc(r.status))+'</span></div>';}).join('');
    if(S.reqs===undefined&&!own.length)rows=skel(2,'row');
    else if(!rows)rows='<div class="ds-empty"><b>No listings yet</b><span>List your market free and vendors across Florida can find it.</span></div>';
    return '<div class="dr-blk"><h3 class="dr-h">Your listings</h3><div class="lx-sheet ol-list">'+rows+'</div>'+
      '<div class="hbtns"><a class="btn sm" href="list.html">List another event</a><a class="btn ghost sm" href="pricing.html?tier=featured-event#t-featured-event">Get featured</a></div></div>';
  }
  function business(){
    var P=['newsletter-sponsor','directory-sponsor','featured-vendor','featured-event','deadline-spotlight'];
    var m=(S.mem||[]).filter(function(x){return P.indexOf(x.tier)>-1;});
    var rows=S.mem===undefined?skel(2,'row'):m.length?m.slice(0,5).map(function(x){var live=x.status==='active';
      return '<div class="ol"><span class="ol-t"><b>'+esc(TN[x.tier]||x.tier)+'</b><small>'+(x.until?(live?'Runs through ':'Ended ')+short(String(x.until).slice(0,10)):live?'Active':'')+'</small></span><span class="st '+(live?'live':'off')+'">'+(live?'Live':'Ended')+'</span></div>';}).join('')
      :'<div class="ds-empty"><b>No placements yet</b><span>Sponsor the weekly email or the directory and reach vendors across Florida.</span></div>';
    return '<div class="dr-blk"><h3 class="dr-h">Your placements</h3><div class="lx-sheet ol-list">'+rows+'</div>'+
      '<div class="hbtns"><a class="btn sm" href="pricing.html?tier=newsletter-sponsor#get-featured">Sponsor form</a><a class="btn ghost sm" href="sponsor.html">Media kit</a></div></div>';
  }
  function admin(){
    var d=S.adm;
    function tile(n,l,sub,href){return '<a class="adt" href="'+href+'"><b>'+n+'</b><span>'+l+'</span>'+(sub?'<small>'+sub+'</small>':'')+'</a>';}
    var body=!d?'<div class="adts">'+skel(3,'tile')+'</div>':d.err?'<p class="dr-note">Couldn’t load the admin numbers. <a href="admin.html">Open admin</a></p>':
      '<div class="adts">'+tile(d.users,'members',(d.newUsers?'+'+d.newUsers+' this week':'')+(d.pro?(d.newUsers?' · ':'')+d.pro+' Pro':''),'admin.html')+
      tile('$'+(d.cents/100).toLocaleString('en-US',{maximumFractionDigits:0}),'sales · 30 days',d.sales+' payment'+(d.sales===1?'':'s'),'admin.html')+
      tile(d.pending,'to approve',d.pending?'listings & requests':'all clear','admin.html')+'</div>';
    return '<section class="hsec dadm"><div class="hsh"><h2>Admin <small>at a glance</small></h2><a class="hall" href="admin.html">Open'+ico('right','sm')+'</a></div>'+body+'</section>';
  }
  function roleBlock(){
    var r=role(),t=r==='organizer'?'Your events':r==='business'?'Your sponsorship':'For your booth',x='';
    if(r==='organizer')x=organizer();else if(r==='business')x=business();else x=deadlines()+freeWeekends()+proCard();
    if(!x)return '';
    return '<section class="hsec drole"><div class="hsh"><h2>'+t+'</h2></div>'+x+'</section>';
  }
  function build(){return '<div class="dash" id="dash">'+brandHead()+(A.admin?admin():'')+schedule()+roleBlock()+'<h2 class="dash-around"><span>Around '+esc(ctx.regionLabel)+'</span></h2></div>';}

  function paint(){
    if(!H||!ctx||!on())return;
    var old=H.querySelector('#dash');if(!old)return;
    var y=window.scrollY,tmp=document.createElement('div');tmp.innerHTML=build();old.replaceWith(tmp.firstChild);
    if(Math.abs(window.scrollY-y)>2)window.scrollTo(0,y);
  }
  function mount(el,c){
    if(!on()||!el)return;H=el;ctx=c;load();
    var tmp=document.createElement('div');tmp.innerHTML=build();el.insertBefore(tmp.firstChild,el.firstChild);
    el.classList.add('dash-on');document.body.classList.add('lx-dash');el.setAttribute('data-role',role());
    /* the role block replaces the public Pro / organizer cards; vendors get deadlines in their block */
    Array.prototype.forEach.call(el.querySelectorAll(':scope>.hpro,:scope>.horg2'),function(n){n.remove();});
    if(role()==='vendor')Array.prototype.forEach.call(el.querySelectorAll(':scope>.hsec'),function(n){if(n.querySelector(':scope>.hdl'))n.remove();});
    var t=document.getElementById('vTitle'),s=document.getElementById('vSub');
    if(t)t.textContent='Home';if(s)s.textContent='Your week, your events and your plan, in one place.';
  }
  /* a day in the strip or a weekend tile opens Events for that date (the Events calendar strip's filter when it is there) */
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-dsday]');if(!b)return;e.preventDefault();
    var d=b.getAttribute('data-dsday'),P=window.JVE_APP;
    if(P&&typeof P.setDay==='function'){try{try{history.pushState({v:'events'},'',location.pathname+location.search+'#events');}catch(_){}P.setDay(d);window.scrollTo({top:0,behavior:'auto'});return;}catch(_){}}
    if(ctx)ctx.go('2wk');});
  window.JVE_DASH={mount:mount,on:on,_state:S};
})();
