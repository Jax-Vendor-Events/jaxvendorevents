/* Jax Vendor Events: home + events (with deadlines) + saved as one page. Views switch by #hash without reloads; the back button closes the event sheet and returns to the previous view. */
(function(){
  'use strict';
  var D=window.JVE_DATA||{events:[]};
  var LG=window.JVE_LOGIC;
  var PX=window.JVE_PAIDX||{featured:function(){return false;},spotlight:function(){return false;},verifiedOrg:function(){return null;}};
  var SK='jve_saved';function getSaved(){try{return LG.parseSaved(localStorage.getItem(SK));}catch(e){return [];}}
  var saved=getSaved();function isSaved(id){return saved.indexOf(id)>-1;}
  var PK='jve_prefs';function getPrefs(){try{return LG.parsePrefs(localStorage.getItem(PK));}catch(e){return null;}}
  var prefs=getPrefs();
  var HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
  var me=null,meSrc='';
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MOL=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function $(id){return document.getElementById(id);}
  function pd(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function add(s,n){var d=pd(s);d.setDate(d.getDate()+n);return iso(d);}
  var today=iso(new Date());
  var floor=today<D.updated?D.updated:today;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function ico(n,c){return '<svg class="ico'+(c?' '+c:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
  function fmt(s){var d=pd(s);return WD[d.getDay()]+', '+MO[d.getMonth()]+' '+d.getDate();}
  function short(s){var d=pd(s);return MO[d.getMonth()]+' '+d.getDate();}
  function days(a,b){return Math.round((pd(b)-pd(a))/864e5);}
  function safeUrl(u){return /^https?:\/\//i.test(u||'')?u:null;}
  var ev=D.events.map(function(e){
    var ds=(e.dates||[]).filter(function(x){return x>=floor||(e.end_date&&e.end_date>=floor&&x===e.dates[0]);});
    return Object.assign({},e,{up:ds,types:LG.eventTypes(e)});
  }).filter(function(e){if(e.verify_status==='past'||e.verify_status==='cancelled'||e.verify_status==='removed')return false;return e.up.length||(!(e.dates||[]).length&&e.schedule);});
  var byId={};ev.forEach(function(e){byId[e.id]=e;});
  function hasDl(e){return e.deadline&&e.deadline>=floor;}
  function dlSoon(e){return hasDl(e)&&days(floor,e.deadline)<=30;}
  var fd=pd(floor),isSun=fd.getDay()===0,sun=isSun?add(floor,7):add(floor,(7-fd.getDay())%7),fri=add(sun,-2);var wkStart=fri<floor?floor:fri;
  (function(){var b=document.querySelector('.xchip[data-f="weekend"]');if(b&&isSun)b.textContent='Next weekend';})();
  var twoWk=add(floor,14);
  function inRange(e,a,b){return e.up.some(function(x){return x>=a&&x<=b;})||(e.end_date&&e.up.length&&e.up[0]<=b&&e.end_date>=a);}
  function feeLabel(e){if(e.fee_bucket==='free')return 'Free';if(!e.fee)return 'Fee not listed';if(e.fee.length<=14)return e.fee;var m=e.fee.match(/\$[\d.,]*\d/);return m?m[0]+'+':'Fee: see details';}
  function applyUrl(e){return safeUrl(e.signup_url)||safeUrl(e.apply);}
  /* Florida regions (theme.js JVE_REGIONS) + campus events */
  var RG=window.JVE_REGIONS||{of:function(){return 'ne';},get:function(){return 'all';},set:function(){},label:function(){return 'All Florida';},list:[{id:'all',label:'All Florida',counties:[]}]};
  /* Nov 8 2026: 'all' (All Florida) is the default view and matches every event */
  function inReg(e){return region==='all'||e.rg===region;}
  var region=RG.get();
  var CAMPUS_RE=/\b(college|university|campus|student union|UNF|FSCJ|UF|FSU|UCF|USF|FIU|FAU|FGCU|FAMU|UWF)\b/i;
  function isCampus(e){return e.campus===true||/campus/i.test(String(e.category||e.type||''))||(e.types||[]).indexOf('campus')>-1||CAMPUS_RE.test([e.name,e.venue,e.organizer,e.host_agency].join(' '));}
  ev.forEach(function(e){e.rg=RG.of(e);});
  // category options from the listings' own names
  var catN={};ev.forEach(function(e){e.types.forEach(function(t){catN[t]=(catN[t]||0)+1;});});
  LG.TYPES.forEach(function(t){if(!catN[t[0]])return;var o=document.createElement('option');o.value=t[0];o.textContent=t[1];$('fCat').appendChild(o);});
  // "Updated X min ago" from the hourly refresh stamp (scripts/refresh.py)
  (function(){var el=$('updTxt');if(!el)return;var t=Date.parse(D.checked_at||D.updated_at||'');if(isNaN(t))return;
    function rel(){var m=Math.max(0,Math.round((Date.now()-t)/6e4));
      el.textContent='Updated '+(m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' days ago')+' · refreshes hourly';
      $('updBadge').title='Last refresh '+new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET';}
    rel();setInterval(rel,60000);})();
  /* ---- state ---- */
  var view='home',F={matches:false,weekend:false,'2wk':false,free:false,campus:false,dl:false,day:false};
  var fC=$('fCounty'),fK=$('fCat'),fS=$('fSort'),fQ=$('fQ');
  var VIEWS={home:['Find your next market','Markets, craft fairs, pop-ups and campus events across Florida.'],events:['Find Events','Search, filter and apply. Pick a region to see what’s near you.'],deadlines:['Deadlines','Apply before these close. Soonest first.'],saved:['My Saved Events','Events you hearted. Saved on this phone.'],map:['Event Map','Every market in your region by town. Tap a pin to see what’s on.']};
  function chipsOn(){return Object.keys(F).some(function(k){return F[k];})||!!fC.value||!!fK.value||!!fQ.value.trim();}
  function badges(e,full,mode){
    var b=[];var cd=hasDl(e)?LG.countdown(floor,e.deadline):null;
    if(PX.featured(e.id)&&mode!=='dl') b.push('<span class="b gold">'+ico('star')+'Featured</span>');
    if(PX.spotlight(e.id)&&hasDl(e)&&(mode==='dl'||full)) b.push('<span class="b gold">'+ico('clock')+'Spotlight</span>');
    if(cd&&mode!=='dl'&&(dlSoon(e)||full)) b.push('<span class="b hot'+(cd.urgent?' urgent':'')+'" title="Apply by '+short(e.deadline)+'">'+ico('clock')+cd.text+'</span>');
    b.push('<span class="b fee'+(e.fee_bucket==='free'?' free':'')+'">'+esc(feeLabel(e))+'</span>');
    if(e.verified) b.push('<span class="b ok">'+ico('check')+'Checked</span>');
    if(full){b.push('<span class="b county">'+esc(e.county)+' County</span>');if(e.recurring)b.push('<span class="b rec">'+ico('repeat')+'Recurring</span>');if(e.host_type)b.push('<span class="b city">'+ico('shield')+(e.host_type==='county'?'County event':'City event')+'</span>');if(PX.verifiedOrg(e.id))b.push('<span class="b gold">'+ico('shield')+'Verified organizer</span>');if(!e.verified)b.push('<span class="b unv">Not checked yet</span>');}
    return b.join('');
  }
  function distOf(e){if(!me)return null;var p=LG.place(e);return p?LG.miles(me,p):null;}
  function card(e,anchor,i,mode){
    var dt=anchor?pd(anchor):null;
    var dbox=dt?'<span class="xd" aria-hidden="true"><span class="m">'+MO[dt.getMonth()]+'</span><span class="d">'+dt.getDate()+'</span><span class="w">'+WD[dt.getDay()]+'</span></span>':'<span class="xd on" aria-hidden="true"><span class="m">Open</span><span class="d">∞</span><span class="w">dates</span></span>';
    if(mode==='dl'&&hasDl(e)){var n=days(floor,e.deadline);dbox='<span class="xd xdl'+(n<=3?' urgent':'')+'" aria-hidden="true"><span class="m">Apply</span><span class="d">'+(n<=0?'!':n)+'</span><span class="w">'+(n<=0?'today':n===1?'day':'days')+'</span></span>';}
    var place=esc([e.city,e.county].filter(Boolean).join(' · '));var dist=distOf(e);
    if(dist!=null) place='≈'+(dist<1?'<1':Math.round(dist))+' mi · '+place;
    var when=anchor?(mode==='dl'?'Event '+fmt(anchor):'')+(e.time&&mode!=='dl'?esc(e.time):''):esc(e.schedule||'');
    var sv=isSaved(e.id),ap=applyUrl(e);
    var label=esc(e.name)+(anchor?', '+fmt(anchor):'')+', '+esc(e.city||e.county);
    var pc=(PX.featured(e.id)&&mode!=='dl'?' isfeat':'')+(PX.spotlight(e.id)&&mode==='dl'&&hasDl(e)?' isspot':'');
    return '<article class="xc'+pc+'" style="--i:'+Math.min(i,10)+'"><button class="xhit" type="button" data-id="'+esc(e.id)+'" data-a="'+(anchor||'')+'" aria-label="'+label+': details"></button>'+dbox+
      '<div class="xb"><h3>'+esc(e.name)+'</h3><p class="xm">'+ico('pin','sm')+'<span>'+place+'</span></p>'+(when?'<p class="xw">'+when+'</p>':'')+'</div>'+
      '<button class="heart'+(sv?' on':'')+'" type="button" data-save="'+esc(e.id)+'" aria-pressed="'+sv+'" aria-label="'+(sv?'Remove from saved: ':'Save: ')+esc(e.name)+'">'+HEART+'</button>'+
      '<div class="xf"><div class="xt">'+badges(e,false,mode)+'</div>'+(ap?'<a class="xapply" href="'+esc(ap)+'" target="_blank" rel="noopener" aria-label="Apply: '+esc(e.name)+' (opens organizer page)">Apply'+ico('ext','sm')+'</a>':'<button class="xapply ghost" type="button" data-id="'+esc(e.id)+'" data-a="'+(anchor||'')+'">Details</button>')+'</div>'+'</article>';
  }
  function filtered(){
    var c=fC.value,k=fK.value,q=fQ.value.trim().toLowerCase(),rows=[];
    ev.forEach(function(e){
      if(view==='saved'&&!isSaved(e.id)) return;
      if(view==='deadlines'&&!hasDl(e)) return;
      if(view!=='saved'&&!inReg(e)) return;
      if(F.campus&&!isCampus(e)) return;
      if(c&&e.county!==c) return;
      if(k&&e.types.indexOf(k)<0) return;
      if(F.free&&e.fee_bucket!=='free') return;
      if(F.dl&&!dlSoon(e)) return;
      if(q&&[e.name,e.city,e.venue,e.county,e.organizer,e.host_agency].join(' ').toLowerCase().indexOf(q)<0) return;
      var a=e.up;
      if(F.day){if(!inRange(e,F.day,F.day))return;a=[F.day];} /* My calendar: tap a day */
      if(F.matches&&LG.hasPrefs(prefs)){var mm=LG.matchDates(e,prefs,e.up);if(!mm)return;if(mm.length)a=mm;}
      if(F.weekend){if(!inRange(e,wkStart,sun))return;var w=a.filter(function(x){return x>=wkStart&&x<=sun;});a=w.length?w:a;}
      else if(F['2wk']){if(!inRange(e,floor,twoWk))return;var w2=a.filter(function(x){return x<=twoWk;});a=w2.length?w2:a;}
      rows.push({e:e,a:a[0]||null});
    });
    var s=view==='deadlines'?'deadline':fS.value;
    function bydate(x,y){return (x.a||'9999')<(y.a||'9999')?-1:(x.a||'9999')>(y.a||'9999')?1:x.e.name.localeCompare(y.e.name);}
    var FR={free:0,under50:1,'50plus':2,unknown:3};
    rows.sort(function(x,y){
      if(s==='deadline'){var dx=hasDl(x.e)?x.e.deadline:'9999',dy=hasDl(y.e)?y.e.deadline:'9999';if(dx!==dy)return dx<dy?-1:1;}
      if(s==='free'){var fx=FR[x.e.fee_bucket],fy=FR[y.e.fee_bucket];if(fx!==fy)return fx-fy;}
      if(s==='near'&&me){var mx=distOf(x.e),my=distOf(y.e);mx=mx==null?1e9:mx;my=my==null?1e9:my;if(Math.abs(mx-my)>0.5)return mx-my;}
      return bydate(x,y);});
    return rows;
  }
  function weekLabel(a){if(!a)return 'Ongoing: dates on the organizer page';if(a>=wkStart&&a<=sun)return 'This weekend';var n=days(floor,a);if(n<=6)return 'This week';if(n<=13)return 'Next week';return MOL[pd(a).getMonth()]+(a.slice(0,4)!==floor.slice(0,4)?' '+a.slice(0,4):'');}
  function dlLabel(e){var n=days(floor,e.deadline);return n<=6?'Closing this week':n<=13?'Closing next week':n<=30?'Closing this month':'Later';}
  function group(rows,keyf,mode){
    var out='',cur=null,buf=[],i=0;
    function flush(){if(cur!==null){out+='<h2 class="xgh"><span>'+esc(cur)+'</span><small>'+buf.length+'</small></h2><div class="xgrid">'+buf.join('')+'</div>';}}
    rows.forEach(function(r){var k=keyf(r);if(k!==cur){flush();cur=k;buf=[];}buf.push(card(r.e,r.a,i++,mode));});
    flush();return out;
  }
  function empty(art,h,p,btn){return '<div class="empty"><div class="art'+(art==='heart'?' heartart':'')+'">'+(art==='heart'?HEART:ico(art,'lg'))+'</div><h3>'+h+'</h3><p>'+p+'</p>'+(btn||'')+'</div>';}
  function render(anim){
    var rows=filtered(),html='',s=fS.value,on=chipsOn();
    $('fClear').hidden=!on;
    Object.keys(F).forEach(function(k){var b=document.querySelector('.xchip[data-f="'+k+'"]');if(b)b.setAttribute('aria-pressed',String(F[k]));});
    $('cCounty').classList.toggle('on',!!fC.value);$('cCounty').querySelector('.xl').textContent=fC.value||'County';
    $('cCat').classList.toggle('on',!!fK.value);$('cCat').querySelector('.xl').textContent=fK.value?fK.options[fK.selectedIndex].text:'Category';
    $('fQx').hidden=!fQ.value;
    var mb=document.querySelector('.xchip[data-f="matches"]');if(mb)mb.hidden=!LG.hasPrefs(prefs);
    if(!rows.length){
      if(view==='saved'&&!saved.length)html=empty('heart','No saved events yet','Tap the heart on any event to keep it here.','<a class="btn ghost" href="#events">Browse events</a>');
      else if(view!=='saved'&&!regionCount())html=emptyRegion();
      else if(view==='deadlines'&&!on)html=empty('clock','No deadlines on file','Most markets take vendors on a rolling basis. Check each event for how to apply.','<a class="btn ghost" href="#events">Browse events</a>');
      else html=empty('search','Nothing matches','Try fewer filters or another search.','<button class="btn ghost" type="button" data-clear>Clear filters</button>');
    }else if(view==='deadlines'){
      var sp=rows.filter(function(r){return PX.spotlight(r.e.id);}),rest=sp.length?rows.filter(function(r){return !PX.spotlight(r.e.id);}):rows;
      html=(sp.length?group(sp,function(){return 'Spotlight';},'dl').replace('<h2 class="xgh">','<h2 class="xgh xpin">'):'')+group(rest,function(r){return dlLabel(r.e);},'dl');
    }else{
      /* paid Featured events are pinned at the top of the events list (data/paid.json) */
      var ft=view==='events'?rows.filter(function(r){return PX.featured(r.e.id);}):[],rr=ft.length?rows.filter(function(r){return !PX.featured(r.e.id);}):rows;
      html=ft.length?group(ft,function(){return 'Featured';}).replace('<h2 class="xgh">','<h2 class="xgh xpin">'):'';
      if(s==='soon') html+=group(rr,function(r){return weekLabel(r.a);});
      else{var lab=s==='deadline'?'By application deadline':s==='near'?(me?'Nearest first · from '+meSrc:'Nearest first'):'Free to vend first';
        html+=group(rr,function(){return lab;});}
    }
    if(view==='saved'&&rows.length) html='<div class="savedbar"><span><b>'+rows.length+'</b> saved</span><button class="btn" type="button" id="icsAll">'+ico('cal','sm')+'Add all to calendar</button></div>'+html;
    var L=$('list');L.innerHTML=html;
    if(anim){L.classList.remove('xfade');void L.offsetWidth;L.classList.add('xfade');}
    $('count').innerHTML='<b>'+rows.length+'</b> '+(view==='deadlines'?'with deadlines':view==='saved'?'saved':'event'+(rows.length===1?'':'s'))+(view==='saved'?'':' in '+esc(RG.label(region)))+(F.weekend?' · '+short(wkStart)+(wkStart!==sun?'–'+short(sun):''):F['2wk']?' · through '+short(twoWk):F.day?' · '+fmt(F.day):'');
    document.dispatchEvent(new CustomEvent('jve:list',{detail:{view:view,day:F.day||null}}));
    $('fSort').parentNode.hidden=view==='deadlines';
  }
  function setView(v,fromNav){
    if(!VIEWS[v])v='home';var changed=v!==view;view=v;
    document.body.setAttribute('data-view',v);
    $('vTitle').textContent=VIEWS[v][0];$('vSub').textContent=VIEWS[v][1];
    document.querySelectorAll('[data-seg]').forEach(function(a){if(a.getAttribute('data-seg')===v)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
    if(v==='home')renderHome();else render(changed);
    try{document.dispatchEvent(new CustomEvent('jve:view',{detail:v}));}catch(_){}
    if(changed&&fromNav){var top=$('main').getBoundingClientRect().top+scrollY-8;if(scrollY>top)window.scrollTo({top:Math.max(0,top),behavior:'auto'});}
  }
  /* ---- Home: this weekend near you, applications closing soon, Pro + organizer cards (newsletter section follows) ---- */
  function regionCount(){var n=0;ev.forEach(function(e){if(inReg(e))n++;});return n;}
  function emptyRegion(){return empty('pin','We’re just getting started in '+esc(RG.label(region)),'Know a market or campus event here? Organizers can list it free, and it shows up for every vendor in the region.','<a class="btn" href="list.html">List an event · free</a> <button class="btn ghost" type="button" data-region-pick>Change region</button>');}
  function proUser(){var A=window.JVE_AUTH;return !!(A&&(A.admin||(A.has&&(A.has('vendor-pro')||A.has('organizer-plus')||A.has('directory-sponsor')))));}
  function hsec(title,sub,go,goLabel,body){return '<section class="hsec"><div class="hsh"><h2>'+title+(sub?' <small>'+sub+'</small>':'')+'</h2>'+(go?'<button type="button" class="hall" data-go="'+go+'">'+goLabel+ico('right','sm')+'</button>':'')+'</div>'+body+'</section>';}
  /* Home is a dashboard (Events is the full list): greeting hero, 3 stat tiles, a swipe row for the weekend,
     a deadline countdown strip, category tiles, Pro + organizer cards; the weekly email section follows. */
  var HI={farmers:'<path d="M5 19c0-7.5 5-12.5 14-14-.6 9-5.6 14-13 14z"/><path d="M5 19c3-4 6-6.5 10-8.5"/>',
    craft:'<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.9-.8 1.9-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.9-1.8h2.2a4 4 0 0 0 4-4C20.5 7 16.7 3.5 12 3.5z"/><circle cx="7.5" cy="11.5" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15.5" cy="8" r="1.2"/>',
    holiday:'<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7M12 8.5v12M12 8.5S10.5 4 8 4.5 7 8.5 12 8.5zM12 8.5s1.5-4.5 4-4 1 4-4 4z"/>',
    campus:'<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.3c1.5 1.5 3.4 2.2 5.5 2.2s4-.7 5.5-2.2v-4.3M21.5 9.5v5"/>',
    free:'<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.4"/>',
    festival:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
    cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    chev:'<path d="M9.5 6l6 6-6 6"/>'};
  function hi(k,c){return '<svg class="hico'+(c?' '+c:'')+'" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(HI[k]||HI.cal)+'</svg>';}
  function kindOf(e){if(isCampus(e))return 'campus';var t=e.types||[];return t.indexOf('holiday')>-1?'holiday':t.indexOf('farmers')>-1?'farmers':t.indexOf('craft')>-1?'craft':t.indexOf('festival')>-1?'festival':'cal';}
  function hello(){var h=new Date().getHours(),g=h<5?'Good evening':h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    var A=window.JVE_AUTH,n=A&&A.user&&A.profile&&String(A.profile.full_name||'').trim().split(/\s+/)[0];return g+(n?', '+n:'');}
  function renderHome(){
    var H=$('home');if(!H)return;
    if(window.JVE_FB&&JVE_FB.home&&JVE_FB.home(H))return; /* Nov 8 2026: Facebook-style feed (fb.js) */
    var mine=ev.filter(inReg),lab=esc(RG.label(region)),html='';
    var locked=mine.filter(function(e){return e.locked;}).length;
    $('vTitle').textContent=hello();$('vSub').textContent=mine.length?'Your vendor week '+(region==='all'?'across Florida':'in '+RG.label(region))+'.':'Pick a region to see what’s near you.';
    if(!mine.length){html+=emptyRegion();}
    else{
      var wk=[];mine.forEach(function(e){if(inRange(e,wkStart,sun)){var w=e.up.filter(function(x){return x>=wkStart&&x<=sun;});wk.push({e:e,a:w[0]||e.up[0]||null});}});
      var wkT=isSun?'Next weekend':'This weekend',wkGo='weekend',wkL=isSun?'next weekend':'this weekend';
      if(!wk.length){mine.forEach(function(e){if(inRange(e,floor,twoWk))wk.push({e:e,a:e.up[0]||null});});wkT='Coming up';wkGo='2wk';wkL='next 2 weeks';}
      wk.sort(function(x,y){var fx=PX.featured(x.e.id)?0:1,fy=PX.featured(y.e.id)?0:1;if(fx!==fy)return fx-fy;return (x.a||'9999')<(y.a||'9999')?-1:(x.a||'9999')>(y.a||'9999')?1:0;});
      var soon=mine.filter(dlSoon).sort(function(a,b){return a.deadline<b.deadline?-1:a.deadline>b.deadline?1:0;});
      var camp=mine.filter(isCampus).length;
      function tile(cls,go,ic,n,l){return '<button type="button" class="hst '+cls+'" data-go="'+go+'"><span class="hst-ic">'+hi(ic)+'</span><b>'+n+'</b><span>'+l+'</span></button>';}
      html+='<div class="hstats" role="group" aria-label="At a glance">'+tile('t1',wkGo,'cal',wk.length,wkL)+tile('t2','dl','clock',soon.length,'deadlines soon')+tile('t3','campus','campus',camp,'campus events')+'</div>';
      if(wk.length){var top=wk.slice(0,10);
        html+=hsec(wkT,lab,wkGo,'See all','<div class="hrail" role="list">'+top.map(function(r){var e=r.e,d=r.a?pd(r.a):null,k=kindOf(e);
          return '<button type="button" role="listitem" class="hw k-'+k+(PX.featured(e.id)?' isfeat':'')+'" data-id="'+esc(e.id)+'" data-a="'+(r.a||'')+'" aria-label="'+esc(e.name)+(r.a?', '+fmt(r.a):'')+', '+esc(e.city||e.county)+': details">'+
            '<span class="hw-top"><span class="hw-d">'+(d?'<small>'+WD[d.getDay()]+'</small>'+MO[d.getMonth()]+' '+d.getDate():'<small>Open</small>dates')+'</span>'+hi(k)+'</span>'+
            '<span class="hw-n">'+esc(e.name)+'</span><span class="hw-p">'+ico('pin','sm')+esc(e.city||e.county||'')+'</span>'+
            '<span class="hw-f'+(e.fee_bucket==='free'?' free':'')+'">'+esc(feeLabel(e))+'</span></button>';}).join('')+
          (wk.length>top.length?'<button type="button" class="hw hw-more" data-go="'+wkGo+'"><b>+'+(wk.length-top.length)+'</b><span>more '+wkL+'</span>'+hi('chev')+'</button>':'')+'</div>');}
      var next=mine.filter(hasDl).sort(function(a,b){return a.deadline<b.deadline?-1:a.deadline>b.deadline?1:0;});
      if(next.length){
        html+=hsec('Apply soon','next applications to close','','','<div class="hdl">'+next.slice(0,4).map(function(e){var n=days(floor,e.deadline);
          return '<button type="button" class="hdr" data-id="'+esc(e.id)+'" data-a="'+(e.up[0]||'')+'" aria-label="'+esc(e.name)+', apply by '+fmt(e.deadline)+': details"><span class="hdn'+(n<=3?' urgent':n<=10?' warm':'')+'">'+(n<=0?'<b>!</b><small>today</small>':'<b>'+n+'</b><small>'+(n===1?'day':'days')+'</small>')+'</span>'+
            '<span class="hdt"><b>'+esc(e.name)+'</b><small>Apply by '+short(e.deadline)+(e.up[0]?' · event '+short(e.up[0]):'')+(e.city?' · '+esc(e.city):'')+'</small></span>'+hi('chev','hch')+'</button>';}).join('')+
          '<button type="button" class="hdall" data-go="deadlines">See all '+next.length+' deadlines'+hi('chev')+'</button></div>');}
      var cats=[['farmers','Farmers','cat:farmers'],['craft','Craft fairs','cat:craft'],['holiday','Holiday','cat:holiday'],['campus','Campus','campus'],['free','Free to vend','free']];
      html+=hsec('Browse by type','','','','<div class="hcats" role="group" aria-label="Browse by type">'+cats.map(function(c){
        var n=c[0]==='campus'?camp:c[0]==='free'?mine.filter(function(e){return e.fee_bucket==='free';}).length:mine.filter(function(e){return e.types.indexOf(c[0])>-1;}).length;
        return '<button type="button" class="hct k-'+c[0]+'" data-go="'+c[2]+'"><span class="hct-ic">'+hi(c[0])+'</span><b>'+c[1]+'</b><small>'+n+'</small></button>';}).join('')+'</div>');
    }
    if(!proUser())html+='<section class="hcard hpro"><span class="hpro-badge" aria-hidden="true">'+ico('star')+'</span><span class="hk">Vendor Pro · $6/mo</span><h3>'+(locked?'Unlock the '+locked+' market'+(locked===1?'':'s')+' near you':'Never miss an application deadline')+'</h3>'+
      '<ul><li>'+ico('check','sm')+'Event names, exact places and organizers</li><li>'+ico('check','sm')+'One-tap apply links</li><li>'+ico('check','sm')+'Deadline reminders by email</li></ul>'+
      '<a class="btn" href="pro.html">See Vendor Pro</a></section>';
    html+='<section class="horg2"><span class="horg-ic" aria-hidden="true">'+ico('mega')+'</span><div class="horg-t"><span class="hk">For organizers</span><h3>Run a market?</h3><p>List it free so vendors across Florida find it. Want more applicants? Get featured.</p>'+
      '<div class="hbtns"><a class="btn sm" href="list.html">List it free</a><a class="btn ghost sm" href="pricing.html#organizers">Get featured</a></div></div></section>';
    H.innerHTML=html;
    /* logged in: their own dashboard on top (dash.js) */
    if(window.JVE_DASH&&window.JVE_DASH.on())window.JVE_DASH.mount(H,{ev:ev,mine:mine,floor:floor,byId:byId,PX:PX,inRange:inRange,hasDl:hasDl,days:days,go:go,getSaved:getSaved,regionLabel:region==='all'?'Florida':RG.label(region)});
  }
  function go(k){
    Object.keys(F).forEach(function(x){F[x]=false;});fC.value=fK.value='';fQ.value='';
    var t='events';if(k==='deadlines')t='deadlines';else if(/^cat:/.test(k)){var cv=k.slice(4);if(![].some.call(fK.options,function(o){return o.value===cv;})){var lo=(LG.TYPES.filter(function(x){return x[0]===cv;})[0]||[cv,cv]);var op=document.createElement('option');op.value=cv;op.textContent=lo[1];fK.appendChild(op);}fK.value=cv;}else if(F.hasOwnProperty(k))F[k]=true;
    try{history.pushState({v:t},'',location.pathname+location.search+'#'+t);}catch(_){location.hash=t;}
    setView(t,true);markNav();window.scrollTo({top:0,behavior:'auto'});
    if(k==='search')setTimeout(function(){fQ.focus();},60);
  }
  /* region picker (Events + Home share it; the Account sheet's copy stays in sync through theme.js) */
  function fillCounties(){var keep=fC.value,have={};ev.forEach(function(e){if(inReg(e)&&e.county)have[e.county]=(have[e.county]||0)+1;});
    var names=Object.keys(have).sort();fC.innerHTML='<option value="">All counties</option>'+names.map(function(c){return '<option>'+esc(c)+'</option>';}).join('');
    fC.value=names.indexOf(keep)>-1?keep:'';}
  function regionChanged(v){if(!v||v===region)return;region=v;var rs=$('fRegion');if(rs)rs.value=v;var rl=$('regLbl');if(rl)rl.textContent=RG.label(v);fillCounties();if(view==='home')renderHome();else render(true);}
  (function(){var rs=$('fRegion');if(rs){rs.innerHTML=RG.list.map(function(r){return '<option value="'+r.id+'">'+esc(r.label)+'</option>';}).join('');rs.value=region;
      rs.addEventListener('change',function(){RG.set(rs.value);regionChanged(rs.value);});}
    var rl=$('regLbl');if(rl)rl.textContent=RG.label(region);fillCounties();
    document.addEventListener('jve:region',function(e2){regionChanged(e2.detail);});})();
  /* ---- filters ---- */
  document.querySelectorAll('.xchip[data-f]').forEach(function(b){b.addEventListener('click',function(){var k=b.dataset.f;F[k]=!F[k];if(k==='weekend'&&F[k])F['2wk']=false;if(k==='2wk'&&F[k])F.weekend=false;render(true);});});
  function clearAll(){Object.keys(F).forEach(function(k){F[k]=false;});fC.value=fK.value='';fQ.value='';render(true);}
  [fC,fK].forEach(function(x){x.addEventListener('change',function(){render(true);});});
  fS.addEventListener('change',function(){if(fS.value==='near')nearMe();else render(true);});
  var qt;fQ.addEventListener('input',function(){clearTimeout(qt);qt=setTimeout(render,110);});
  fQ.addEventListener('keydown',function(k){if(k.key==='Enter')fQ.blur();});
  $('fQx').addEventListener('click',function(){fQ.value='';render(true);fQ.focus();});
  $('fClear').addEventListener('click',clearAll);
  var disc=$('disc'),sent=document.createElement('div');sent.style.height='1px';disc.parentNode.insertBefore(sent,disc);
  if('IntersectionObserver' in window){new IntersectionObserver(function(en){disc.classList.toggle('stuck',!en[0].isIntersecting);},{rootMargin:'0px 0px 0px 0px'}).observe(sent);}
  /* ---- detail sheet (back button closes it) ---- */
  var sheet=$('sheet'),scrim=$('scrim'),curE=null,curA=null,lastFocus=null,sheetPushed=false;
  function row(ic,k,v){return v?'<dl class="kv">'+ico(ic)+'<dt>'+k+'</dt><dd>'+v+'</dd></dl>':'';}
  function lnk(u,t){var s=safeUrl(u);return s?'<a href="'+esc(s)+'" target="_blank" rel="noopener">'+esc(t||s.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])+'</a>':esc(u);}
  function fillSheet(e){
    $('shBadges').innerHTML=badges(e,true);
    $('shTitle').textContent=e.name;
    $('shSub').innerHTML=ico('pin','sm')+esc([e.city,e.county+' County'].filter(Boolean).join(', '));
    var when=curA?'<b>'+fmt(curA)+'</b>'+(e.end_date&&e.end_date!==curA&&e.up.length===1?' – '+fmt(e.end_date):''):'';
    var more=e.up.filter(function(x){return x!==curA;});
    var extra=[];if(e.schedule) extra.push(esc(e.schedule));
    if(more.length) extra.push((e.projected?'Next: ':'Also ')+more.slice(0,5).map(short).join(', ')+(more.length>5?' +'+(more.length-5)+' more':''));
    if(e.projected) extra.push('dates projected from the published schedule');
    var apply=applyUrl(e);
    var appl=[];if(hasDl(e)) appl.push('<b>Apply by '+fmt(e.deadline)+'</b> ('+days(floor,e.deadline)+' days)');if(e.deadline_note) appl.push(esc(e.deadline_note));
    var contact=[];if(e.apply) contact.push(lnk(e.apply,apply?'Application / vendor info':null));if(e.contact) contact.push(/@/.test(e.contact)&&!/\s/.test(e.contact)?'<a href="mailto:'+esc(e.contact)+'">'+esc(e.contact)+'</a>':esc(e.contact));
    var src=e.source_url?lnk(e.source_url):e.source?lnk(e.source):'';
    $('shBody').innerHTML=
      row('cal','When',[when,e.time?esc(e.time):'',extra.join(' · ')].filter(Boolean).join('<br>')||'See organizer page')+
      row('tag','Vendor fee',e.fee?esc(e.fee):(e.fee_bucket==='free'?'Free':'Fee not listed'))+
      row('clock','Applications',appl.join('<br>'))+
      row('pin','Where',esc([e.venue,e.city,e.county+' County'].filter(Boolean).join(', ')))+
      (e.verify_note?row('info','What we found',esc(e.verify_note)):'')+
      (e.host_type?row('shield',e.host_type==='county'?'County event':'City event',esc(e.host_agency||'')+'<br><a href="city.html'+(e.agency_id?'#'+encodeURIComponent(e.agency_id):'')+'">Permits, fees + steps to sign up</a>'):'')+
      row('link','Apply / contact',contact.join('<br>')||'Link not on file yet')+
      row('user','Organizer',esc(e.organizer))+
      row('ext','Source',src)+
      (e.verified?'<p class="sh-note ok">'+ico('shield')+'<span>Checked'+(e.verified_on?' '+short(e.verified_on):'')+' against the '+(e.host_type?'official':'organizer\'s own')+' page. Still confirm details before you pay.</span></p>':'<p class="sh-note">'+ico('info')+'<span>Not checked yet: from a public post or web scan. Confirm with the organizer before you pay.</span></p>')+'<p class="sh-own">'+ico('star','sm')+'<span>Run this market? <a data-buy="featured-event" href="pricing.html?tier=featured-event&amp;event='+encodeURIComponent(e.name||'')+'#get-featured">Get it featured, from $20/week</a></span></p>';
    var ap=$('shApply'),ext=ap.querySelector('svg'),dest=apply||safeUrl(e.source_url)||safeUrl(e.source);ap.classList.toggle('off',!dest);ext.style.display=dest?'':'none';
    if(dest){ap.href=dest;ap.removeAttribute('aria-disabled');ap.removeAttribute('tabindex');ap.firstChild.textContent=apply?(e.host_type?'How to sign up ':'Apply '):'Organizer page ';}
    else{ap.removeAttribute('href');ap.setAttribute('aria-disabled','true');ap.setAttribute('tabindex','-1');ap.firstChild.textContent=e.contact?'Contact organizer (see above)':'Apply link not on file yet';}
    if(e.locked){ /* teaser for free/anonymous visitors: the server never sent name, venue, organizer or links */
      $('shBody').innerHTML=row('cal','When',[when,extra.join(' · ')].filter(Boolean).join('<br>')||'See dates above')+
        row('tag','Vendor fee',e.fee?esc(e.fee):(e.fee_bucket==='free'?'Free':'Fee not listed'))+row('clock','Applications',appl.join('<br>'))+
        row('pin','Area',esc([e.city,e.county?e.county+' County':''].filter(Boolean).join(', ')))+
        '<div class="locked-card"><b>🔒 Event name, exact place, organizer and apply link</b> are part of Vendor Pro ($6/month). Every market in Florida, with the links to apply.</div>';
      ap.href='#';ap.setAttribute('data-unlock','vendor-pro');ap.classList.remove('off');ap.removeAttribute('aria-disabled');ap.removeAttribute('tabindex');ext.style.display='none';ap.firstChild.textContent='Unlock · $6/mo ';
    } else ap.removeAttribute('data-unlock');
    /* Nov 9 2026: let anyone flag a wrong, cancelled or fishy listing (idea from studying VendorsMap's trust features) */
    $('shBody').insertAdjacentHTML('beforeend','<p class="sh-own sh-rep">'+ico('alert','sm')+'<span>Something wrong with this listing? <a href="mailto:admin@jaxvendorevents.com?subject='+encodeURIComponent('Listing report: '+e.id)+'&amp;body='+encodeURIComponent('What looks wrong (date, fee, cancelled, not a real event)?\n\n\nListing: https://jaxvendorevents.com/#e='+e.id)+'">Report it</a> and we check it.</span></p>');
    $('shIcs').disabled=!curA;syncSheetSave();if(window.JVE_CAL&&JVE_CAL.sheet)JVE_CAL.sheet(e,curA);if(window.JVE_TRK&&JVE_TRK.sheet)JVE_TRK.sheet(e,curA);if(window.JVE_FB&&JVE_FB.sheet)JVE_FB.sheet(e,curA);
  }
  function showSheet(id,anchor){var e=byId[id];if(!e)return false;curE=e;curA=anchor||e.up[0]||null;fillSheet(e);
    if(!sheet.classList.contains('open')){lastFocus=document.activeElement;sheet.setAttribute('aria-hidden','false');sheet.classList.add('open');scrim.classList.add('open');document.body.classList.add('noscroll');}
    $('shBody').scrollTop=0;setTimeout(function(){$('shClose').focus({preventScroll:true});},60);return true;}
  function hideSheet(){if(!sheet.classList.contains('open'))return;sheet.classList.remove('open');scrim.classList.remove('open');sheet.setAttribute('aria-hidden','true');sheet.style.transform='';document.body.classList.remove('noscroll');if(lastFocus&&lastFocus.focus)lastFocus.focus({preventScroll:true});}
  function openSheet(id,anchor){if(!showSheet(id,anchor))return;try{history.pushState({jveSheet:id,a:curA,v:view},'',location.pathname+location.search+'#e='+encodeURIComponent(id));sheetPushed=true;}catch(_){}}
  function closeSheet(){if(!sheet.classList.contains('open'))return;if(sheetPushed){sheetPushed=false;history.back();}else{hideSheet();try{history.replaceState(null,'',location.pathname+location.search+(view==='home'?'':'#'+view));}catch(_){}}}
  function saveToggle(id){saved=LG.toggleSaved(getSaved(),id);try{localStorage.setItem(SK,JSON.stringify(saved));}catch(_){}
    var on=isSaved(id);try{if(navigator.vibrate)navigator.vibrate(on?12:6);}catch(_){}
    document.querySelectorAll('.heart[data-save="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]').forEach(function(h){h.classList.toggle('on',on);h.setAttribute('aria-pressed',String(on));h.classList.remove('pop');void h.offsetWidth;h.classList.add('pop');});
    syncSheetSave();toast(on?'Saved ♥':'Removed from saved');badge();
    if(view==='saved')render();
    try{document.dispatchEvent(new CustomEvent('jve:saved',{detail:{id:id,on:on}}));}catch(_){} /* fb.js syncs it to the account */}
  function badge(){document.querySelectorAll('[data-nav="saved"]').forEach(function(a){var n=a.querySelector('.nb');if(!n){n=document.createElement('i');n.className='nb';a.appendChild(n);}n.textContent=saved.length||'';n.hidden=!saved.length;});}
  function syncSheetSave(){var b=$('shSave');if(!b||!curE)return;var on=isSaved(curE.id);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));b.lastChild.textContent=on?' Saved':' Save';}
  document.addEventListener('click',function(ev2){
    var hv=ev2.target.closest('[data-save]');if(hv){ev2.preventDefault();saveToggle(hv.getAttribute('data-save'));return;}
    if(ev2.target.closest('#icsAll')){icsAll();return;}
    var t=ev2.target.closest('[data-id]');if(t&&!t.closest('.sheet')){openSheet(t.dataset.id,t.dataset.a);return;}
    if(ev2.target.closest('[data-clear]')){clearAll();return;}
    var gb=ev2.target.closest('[data-go]');if(gb){ev2.preventDefault();go(gb.getAttribute('data-go'));return;}
    if(ev2.target.closest('[data-region-pick]')){var rp=$('fRegion');if(rp){rp.focus();if(rp.showPicker)try{rp.showPicker();}catch(_){}}return;}
    var nv=ev2.target.closest('a[data-nav]');if(nv&&/index\.html/.test(nv.getAttribute('href')||'')){var hh=(nv.getAttribute('href').split('#')[1]||'');ev2.preventDefault();
      if(sheet.classList.contains('open')){sheetPushed=false;hideSheet();}
      var target=hh||'home';if(target===view&&!location.hash.match(/^#e=/)){window.scrollTo({top:0,behavior:'smooth'});return;}
      try{history.pushState({v:target},'',location.pathname+location.search+(hh?'#'+hh:''));}catch(_){location.hash=hh;}
      setView(target,true);markNav();return;}
  });
  function markNav(){var a=document.querySelectorAll('[data-nav]'),k=view==='home'?'':view==='saved'?'saved':view==='map'?'map':'events';for(var i=0;i<a.length;i++){if(a[i].getAttribute('data-nav')===k)a[i].setAttribute('aria-current','page');else a[i].removeAttribute('aria-current');}}
  scrim.addEventListener('click',closeSheet);$('shClose').addEventListener('click',closeSheet);
  document.addEventListener('keydown',function(k){if(k.key==='Escape') closeSheet();
    if(k.key==='Tab'&&sheet.classList.contains('open')){var f=sheet.querySelectorAll('a[href],button:not([disabled])');if(!f.length)return;var a=f[0],z=f[f.length-1];if(k.shiftKey&&document.activeElement===a){z.focus();k.preventDefault();}else if(!k.shiftKey&&document.activeElement===z){a.focus();k.preventDefault();}}});
  var y0=null,dy=0;sheet.addEventListener('touchstart',function(t){if(t.target.closest('.sh-body')&&$('shBody').scrollTop>0)return;y0=t.touches[0].clientY;dy=0;},{passive:true});
  sheet.addEventListener('touchmove',function(t){if(y0===null)return;dy=Math.max(0,t.touches[0].clientY-y0);if(dy>0){sheet.style.transition='none';sheet.style.transform='translateY('+dy+'px)';}},{passive:true});
  sheet.addEventListener('touchend',function(){if(y0===null)return;sheet.style.transition='';y0=null;if(dy>110)closeSheet();else sheet.style.transform='';});
  function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('show');},2200);}
  function icsEsc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/([,;])/g,'\\$1');}
  function fold(l){var o='';while(l.length>74){o+=l.slice(0,74)+'\r\n ';l=l.slice(74);}return o+l;}
  function vevent(e,d){
    var end=(e.end_date&&e.end_date>d&&e.up.length===1)?add(e.end_date,1):add(d,1);
    var desc=['Vendor fee: '+(e.fee||'fee not listed'),hasDl(e)?'Apply by: '+fmt(e.deadline):'',e.apply?'Apply: '+e.apply:'',e.source?'Source: '+e.source:'',e.verified?'Verified':'Unverified, confirm with the organizer'].filter(Boolean).join('\n');
    var stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
    var L=['BEGIN:VEVENT','UID:'+e.id+'-'+d+'@jaxvendorevents','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d.replace(/-/g,''),'DTEND;VALUE=DATE:'+end.replace(/-/g,''),
      'SUMMARY:'+icsEsc(e.name),'LOCATION:'+icsEsc([e.venue,e.city,e.county+' County, FL'].filter(Boolean).join(', ')),'DESCRIPTION:'+icsEsc(desc)];
    if(safeUrl(e.apply||e.source)) L.push('URL:'+safeUrl(e.apply||e.source));
    L.push('END:VEVENT');return L;}
  function download(lines,name){
    var all=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Jax Vendor Events//Events//EN','CALSCALE:GREGORIAN'].concat(lines,['END:VCALENDAR']);
    var blob=new Blob([all.map(fold).join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},800);}
  $('shIcs').addEventListener('click',function(){
    var e=curE;if(window.JVE_CAL&&JVE_CAL.icon&&JVE_CAL.icon(e))return;if(!e||!curA)return;
    download(vevent(e,curA),e.name.replace(/[^\w]+/g,'-').replace(/^-|-$/g,'').slice(0,50)+'-'+curA+'.ics');toast('Calendar file downloaded');
  });
  function icsAll(){var L=[],n=0;saved.forEach(function(id){var e=byId[id];if(e&&e.up[0]){L=L.concat(vevent(e,e.up[0]));n++;}});
    if(!n){toast('No dated saved events yet');return;}download(L,'jax-vendor-events-saved.ics');toast(n+' event'+(n===1?'':'s')+' added to one calendar file');}
  function copyText(t){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t);
    return new Promise(function(ok,no){try{var x=document.createElement('textarea');x.value=t;x.setAttribute('readonly','');x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();var r=document.execCommand('copy');x.remove();r?ok():no();}catch(err){no(err);}});}
  function shareText(e,d){var cd=hasDl(e)?LG.countdown(floor,e.deadline):null;
    return [e.name,d?'\uD83D\uDDD3 '+fmt(d)+(e.recurring&&e.schedule?' · '+e.schedule:''):(e.schedule?'\uD83D\uDDD3 '+e.schedule:''),'\uD83D\uDCCD '+[e.city,e.county+' County'].filter(Boolean).join(', '),'\uD83D\uDCB5 '+(e.fee||(e.fee_bucket==='free'?'Free to vend':'Fee not listed')),cd?'⏳ '+cd.text+' (by '+short(e.deadline)+')':'',(e.verified?'✅ Verified':'Unverified, confirm with organizer')+' · via Jax Vendor Events'].filter(Boolean).join('\n');}
  $('shShare').addEventListener('click',function(){
    var e=curE;if(!e)return;var url=location.origin+location.pathname+'#e='+encodeURIComponent(e.id);
    var text=shareText(e,curA);
    if(window.JVEShare){JVEShare.open({url:url,title:(e.name||'Vendor event')+' | Jax Vendor Events'});return;}
    if(navigator.share){navigator.share({title:e.name,text:text,url:url}).catch(function(){});}
    else copyText(text+'\n'+url).then(function(){toast('Details + link copied');},function(){toast(url);});
  });
  var shS=$('shSave');if(shS)shS.addEventListener('click',function(){if(curE)saveToggle(curE.id);});
  // near me: device location only (stays on this phone); no settings needed
  function nearMe(){
    if(me){render(true);return;}
    function off(){fS.value='soon';render();toast('Location is off. Use the County filter instead');}
    if(!navigator.geolocation){off();return;}
    toast('Finding events near you…');
    navigator.geolocation.getCurrentPosition(function(p){me=[p.coords.latitude,p.coords.longitude];meSrc='your location';render(true);toast('Sorted by distance');},off,{enableHighAccuracy:false,timeout:8000,maximumAge:600000});}
  /* ---- routing: #deadlines, #saved, #matches, #e=<id> ---- */
  function route(){var h=location.hash;var m=h.match(/^#e=(.+)$/);
    if(m){var st=history.state||{};if(st.v&&st.v!==view)setView(st.v);if(!showSheet(decodeURIComponent(m[1]),st.a))hideSheet();markNav();return;}
    if(sheet.classList.contains('open')){sheetPushed=false;hideSheet();}
    if(h==='#matches'){F.matches=true;setView('events');}
    else setView(h==='#map'?'map':h==='#deadlines'?'deadlines':h==='#saved'?'saved':h==='#events'?'events':'home');
    markNav();}
  window.addEventListener('popstate',route);
  window.addEventListener('hashchange',function(){if(!history.state||!history.state.jveSheet)route();});
  window.addEventListener('pageshow',function(){var np=getPrefs();if(JSON.stringify(np)!==JSON.stringify(prefs)){prefs=np;render();}saved=getSaved();badge();var rg=RG.get();if(rg!==region)regionChanged(rg);});
  window.addEventListener('storage',function(ev2){if(ev2.key===PK){prefs=getPrefs();render();}});
  /* hooks for mycal.js (My calendar strip + Add to my calendar) */
  window.JVE_APP={toggleSave:function(id){saveToggle(id);},isSaved:function(id){return isSaved(id);},resync:function(){saved=getSaved();badge();if(view==='saved')render();},events:function(){return ev;},rows:function(){return filtered();},open:function(id,a){openSheet(id,a);},region:function(){return region;},regionLabel:function(){return RG.label(region);},view:function(){return view;},
    setDay:function(d){F.day=d||false;if(d){F.weekend=false;F['2wk']=false;}if(view!=='events'&&view!=='deadlines'){setView('events');markNav();}render(true);},
    ics:function(e,d){download(vevent(e,d),String(e.name||'event').replace(/[^\w]+/g,'-').replace(/^-|-$/g,'').slice(0,50)+'-'+d+'.ics');toast('Calendar file downloaded');}};
  document.dispatchEvent(new Event('jve:app'));
  document.body.setAttribute('data-view',view);
  badge();
  var h0=location.hash.match(/^#e=(.+)$/);
  if(h0){render();renderHome();var id0=decodeURIComponent(h0[1]);setTimeout(function(){if(showSheet(id0)){try{history.replaceState(null,'',location.pathname+location.search);history.pushState({jveSheet:id0},'',location.pathname+location.search+'#e='+encodeURIComponent(id0));sheetPushed=true;}catch(_){}}},120);}
  else route();
})();
