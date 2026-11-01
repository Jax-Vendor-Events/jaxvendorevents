(function(){
  'use strict';
  var D=window.JVE_DATA||{events:[]};
  var LG=window.JVE_LOGIC;
  var SK='jve_saved';function getSaved(){try{return LG.parseSaved(localStorage.getItem(SK));}catch(e){return [];}}
  var saved=getSaved();function isSaved(id){return saved.indexOf(id)>-1;}
  var PK='jve_prefs';function getPrefs(){try{return LG.parsePrefs(localStorage.getItem(PK));}catch(e){return null;}}
  var prefs=getPrefs();
  var HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
  var me=null,meSrc='';
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MOL=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var COUNTIES=['Duval','St. Johns','Clay','Nassau','Baker','Flagler','Putnam'];
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
  var hiddenN=0;
  var ev=D.events.map(function(e){
    var ds=(e.dates||[]).filter(function(x){return x>=floor||(e.end_date&&e.end_date>=floor&&x===e.dates[0]);});
    return Object.assign({},e,{up:ds});
  }).filter(function(e){if(e.verify_status==='past'||e.verify_status==='cancelled'||e.verify_status==='removed'){hiddenN++;return false;}return e.up.length||(!e.dates.length&&e.schedule);});
  var byId={};ev.forEach(function(e){byId[e.id]=e;});
  function hasDl(e){return e.deadline&&e.deadline>=floor;}
  function dlSoon(e){return hasDl(e)&&days(floor,e.deadline)<=30;}
  // this weekend: Fri..Sun around the next Sunday on/after floor
  var fd=pd(floor),sun=add(floor,(7-fd.getDay())%7),fri=add(sun,-2);var wkStart=fri<floor?floor:fri;
  function inWeekend(e){return e.up.some(function(x){return x>=wkStart&&x<=sun;})||(e.end_date&&e.up.length&&e.up[0]<=sun&&e.end_date>=wkStart);}
  function feeLabel(e){if(e.fee_bucket==='free')return 'Free to vend';if(!e.fee)return 'Fee not listed';if(e.fee.length<=14)return e.fee;var m=e.fee.match(/\$[\d.,]*\d/);return m?m[0]+'+':'See details';}
  // months
  var months={};ev.forEach(function(e){e.up.forEach(function(x){months[x.slice(0,7)]=1;});});
  var fM=$('fMonth'),fC=$('fCounty'),fF=$('fFee'),fS=$('fSort'),fQ=$('fQ');
  Object.keys(months).sort().forEach(function(m){var o=document.createElement('option');o.value=m;o.textContent=MOL[+m.slice(5)-1]+' '+m.slice(0,4);fM.appendChild(o);});
  $('stTotal').textContent=ev.length;
  $('stDl').textContent=ev.filter(dlSoon).length;
  $('nAll').textContent=ev.length;$('nWk').textContent=ev.filter(inWeekend).length;$('nFree').textContent=ev.filter(function(e){return e.fee_bucket==='free';}).length;$('nDl').textContent=ev.filter(dlSoon).length;
  function countMatches(){var nm=$('nMatch');if(nm)nm.textContent=LG.hasPrefs(prefs)?ev.filter(function(e){return !!LG.matchDates(e,prefs,e.up);}).length:'';}countMatches();
  var nV=$('nVer'),nCi=$('nCity');if(nV)nV.textContent=ev.filter(function(e){return e.verified;}).length;if(nCi)nCi.textContent=ev.filter(function(e){return e.host_type;}).length;var sV=$('stVer');if(sV)sV.textContent=ev.filter(function(e){return e.verified;}).length;
  // "Updated X min ago" from the hourly refresh stamp (scripts/refresh.py)
  (function(){var el=$('updTxt');if(!el)return;var t=Date.parse(D.checked_at||D.updated_at||'');if(isNaN(t))return;
    function rel(){var m=Math.max(0,Math.round((Date.now()-t)/6e4));
      el.textContent='Updated '+(m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' days ago')+' · refreshes hourly';
      $('updBadge').title='Last refresh '+new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET';}
    rel();setInterval(rel,60000);})();
  // deadline strip
  var dls=ev.filter(hasDl).sort(function(a,b){return a.deadline<b.deadline?-1:1;}).slice(0,10);
  $('dlStrip').innerHTML=dls.map(function(e){var n=days(floor,e.deadline);
    return '<button class="dl" type="button" data-id="'+esc(e.id)+'"><span class="cd"><b>'+(n<=0?'!':n)+'</b><small>'+(n<=0?'today':n===1?'day':'days')+'</small></span><span class="t"><b>'+esc(e.name)+'</b><span>Apply by '+short(e.deadline)+' · '+esc(e.county)+'</span></span></button>';}).join('');
  if(!dls.length) $('dlStrip').closest('section').hidden=true;
  var quick='',view='list';
  function badges(e,full){
    var b=[];
    var cd=hasDl(e)?LG.countdown(floor,e.deadline):null;
    if(cd&&(dlSoon(e)||full)) b.push('<span class="b hot'+(cd.urgent?' urgent':'')+'" title="Apply by '+short(e.deadline)+'">'+ico('clock')+cd.text+'</span>');
    b.push('<span class="b county">'+esc(e.county)+'</span>');
    b.push('<span class="b fee'+(e.fee_bucket==='free'?' free':'')+'">'+ico('tag')+esc(feeLabel(e))+'</span>');
    if(e.recurring) b.push('<span class="b rec">'+ico('repeat')+'Recurring</span>');
    if(e.handmade&&full) b.push('<span class="b">Handmade / juried</span>');
    if(e.host_type) b.push('<span class="b city">'+ico('shield')+(e.host_type==='county'?'County event':'City event')+'</span>');
    b.push(e.verified?'<span class="b ok">'+ico('check')+(e.verified_on?'Verified '+short(e.verified_on):'Verified')+'</span>':'<span class="b unv">Unverified</span>');
    return b.join('');
  }
  function card(e,anchor,i){
    var dt=anchor?pd(anchor):null;
    var dbox=dt?'<span class="dt'+(e.recurring?' rec':'')+'" aria-hidden="true"><span class="m">'+MO[dt.getMonth()].toUpperCase()+'</span><span class="d">'+dt.getDate()+'</span><span class="w">'+WD[dt.getDay()]+'</span></span>':'<span class="dt rec" aria-hidden="true"><span class="m">ONGOING</span><span class="d">∞</span><span class="w">see page</span></span>';
    var place=[e.city,e.venue].filter(Boolean).map(esc).join(' · ')||esc(e.county)+' County';
    var cd=hasDl(e)?LG.countdown(floor,e.deadline):null,dist=distOf(e);
    if(dist!=null) place='<b class="mi">≈'+(dist<1?'<1':Math.round(dist))+' mi</b> · '+place;
    var sv=isSaved(e.id),how=e.host_type?howTo(e):null;
    return '<div class="cw'+(how?' city':'')+'"><button class="card'+(cd&&cd.urgent?' closing':'')+'" type="button" data-id="'+esc(e.id)+'" data-a="'+(anchor||'')+'" style="animation-delay:'+Math.min(i,12)*30+'ms">'+dbox+'<span class="cb"><span class="ct">'+esc(e.name)+'</span><span class="meta">'+ico('pin','sm')+'<span>'+place+'</span></span><span class="bd">'+badges(e)+'</span></span>'+ico('right','chev')+'</button><button class="heart'+(sv?' on':'')+'" type="button" data-save="'+esc(e.id)+'" aria-pressed="'+sv+'" aria-label="'+(sv?'Remove from saved: ':'Save: ')+esc(e.name)+'">'+HEART+'</button>'+(how?'<a class="howto" href="'+esc(how.u)+'"'+(how.ext?' target="_blank" rel="noopener"':'')+' aria-label="How to sign up: '+esc(e.name)+'">'+ico('send','sm')+'How to sign up'+ico('right','sm')+'</a>':'')+'</div>';
  }
  // city/county events: the event's own official vendor application, else our agency signup guide
  function howTo(e){var u=safeUrl(e.signup_url)||safeUrl(e.apply);if(u)return {u:u,ext:true};return {u:'city.html'+(e.agency_id?'#'+encodeURIComponent(e.agency_id):''),ext:false};}
  function distOf(e){if(!me)return null;var p=LG.place(e);return p?LG.miles(me,p):null;}
  function filtered(){
    var m=fM.value,c=fC.value,f=fF.value,q=fQ.value.trim().toLowerCase(),rows=[];
    ev.forEach(function(e){
      if(c&&e.county!==c) return;
      if(f&&e.fee_bucket!==f) return;
      if(quick==='free'&&e.fee_bucket!=='free') return;
      if(quick==='deadline'&&!dlSoon(e)) return;
      if(quick==='weekend'&&!inWeekend(e)) return;
      if(quick==='saved'&&!isSaved(e.id)) return;
      if(quick==='verified'&&!e.verified) return;
      if(quick==='city'&&!e.host_type) return;
      if(q&&[e.name,e.city,e.venue,e.county,e.organizer,e.host_agency].join(' ').toLowerCase().indexOf(q)<0) return;
      var a=e.up;
      if(quick==='matches'){if(!LG.hasPrefs(prefs))return;var mm=LG.matchDates(e,prefs,e.up);if(!mm)return;if(mm.length)a=mm;}
      if(quick==='weekend'){var w=a.filter(function(x){return x>=wkStart&&x<=sun;});a=w.length?w:a;}
      if(m){a=a.filter(function(x){return x.slice(0,7)===m;}); if(!a.length) return;}
      rows.push({e:e,a:a[0]||null});
    });
    var s=fS.value;
    function bydate(x,y){return (x.a||'9999')<(y.a||'9999')?-1:(x.a||'9999')>(y.a||'9999')?1:x.e.name.localeCompare(y.e.name);}
    var FR={free:0,under50:1,'50plus':2,unknown:3};
    rows.sort(function(x,y){
      if(s==='deadline'){var dx=hasDl(x.e)?x.e.deadline:'9999',dy=hasDl(y.e)?y.e.deadline:'9999';if(dx!==dy)return dx<dy?-1:1;}
      if(s==='free'){var fx=FR[x.e.fee_bucket],fy=FR[y.e.fee_bucket];if(fx!==fy)return fx-fy;}
      if(s==='near'&&me){var mx2=distOf(x.e),my2=distOf(y.e);mx2=mx2==null?1e9:mx2;my2=my2==null?1e9:my2;if(Math.abs(mx2-my2)>0.5)return mx2-my2;}
      return bydate(x,y);});
    return rows;
  }
  function group(rows,keyf,labelf){
    var out='',cur=null,buf=[],i=0;
    function flush(){if(cur!==null){out+='<h2 class="month">'+labelf(cur)+' <small>'+buf.length+' event'+(buf.length===1?'':'s')+'</small></h2><div class="grid">'+buf.join('')+'</div>';}}
    rows.forEach(function(r){var k=keyf(r);if(k!==cur){flush();cur=k;buf=[];}buf.push(card(r.e,r.a,i++));});
    flush();return out;
  }
  function render(){
    var rows=filtered(),html='';
    var active=!!(fM.value||fC.value||fF.value||fQ.value.trim()||quick||fS.value!=='soon');
    $('fClear').hidden=!active;
    [fM,fC,fF].forEach(function(x){x.parentNode.classList.toggle('on',!!x.value);});
    if(quick==='matches'&&!LG.hasPrefs(prefs)){
      html='<div class="empty"><div class="art">'+ico('user','lg')+'</div><h3>Set your preferences</h3><p>Pick your counties, event types, days and max booth fee once. Only events that fit show here. Saved on this device.</p><a class="btn" href="join.html#prefs">'+ico('filter','sm')+'Set my preferences</a></div>';
    }else if(!rows.length&&quick==='matches'){
      html='<div class="empty"><div class="art">'+ico('user','lg')+'</div><h3>No events fit your preferences yet</h3><p>'+esc(LG.prefsSummary(prefs))+'</p><a class="btn ghost" href="join.html#prefs">Edit preferences</a></div>';
    }else if(!rows.length&&quick==='saved'){
      html='<div class="empty"><div class="art heartart">'+HEART+'</div><h3>No saved events yet</h3><p>Tap the heart on any event to keep it here. Saved on this device.</p><button class="btn ghost" type="button" data-clear>Browse all events</button></div>';
    }else if(!rows.length){
      html='<div class="empty"><div class="art">'+ico('search','lg')+'</div><h3>No events match</h3><p>Try another month, county or fee, or clear the filters.</p><button class="btn ghost" type="button" data-clear>Clear filters</button></div>';
    }else if(view==='county'){
      var cnt={};rows.forEach(function(r){cnt[r.e.county]=(cnt[r.e.county]||0)+1;});
      var mx=Math.max.apply(null,COUNTIES.map(function(c){return cnt[c]||0;}));
      html='<div class="cgrid">'+COUNTIES.filter(function(c){return cnt[c];}).map(function(c){return '<button class="cty" type="button" data-county="'+esc(c)+'"><b>'+cnt[c]+'</b><span>'+esc(c)+'</span><span class="bar"><i style="width:'+Math.round(cnt[c]/mx*100)+'%"></i></span></button>';}).join('')+'</div>';
      var ordered=rows.slice().sort(function(x,y){var a=COUNTIES.indexOf(x.e.county),b=COUNTIES.indexOf(y.e.county);return a-b;});
      html+=group(ordered,function(r){return r.e.county;},function(k){return '<span id="cty-'+esc(k.replace(/\W/g,''))+'">'+esc(k)+' County</span>';});
    }else if(fS.value==='soon'){
      html=group(rows,function(r){return r.a?r.a.slice(0,7):'ongoing';},function(k){return k==='ongoing'?'Ongoing — dates on organizer page':MOL[+k.slice(5)-1]+' '+k.slice(0,4);});
    }else{
      var lab=fS.value==='deadline'?'Sorted by application deadline':fS.value==='near'?(me?'Nearest first · from '+esc(meSrc):'Nearest first'):'Free to vend first';
      html=group(rows,function(){return 'all';},function(){return lab;});
    }
    if(quick==='matches'&&rows.length) html='<div class="matchbar"><span class="mb-t"><b>My matches</b><span>'+esc(LG.prefsSummary(prefs))+'</span></span><a class="btn ghost" href="join.html#prefs">'+ico('filter','sm')+'Edit</a></div>'+html;
    if(quick==='saved'&&rows.length) html='<div class="savedbar"><span><b>'+rows.length+'</b> saved</span><button class="btn" type="button" id="icsAll">'+ico('cal','sm')+'Add all to calendar</button></div>'+html;
    $('list').innerHTML=html;
    document.querySelectorAll('.tabbar a[data-saved]').forEach(function(t){if(quick==='saved')t.setAttribute('aria-current','page');else t.removeAttribute('aria-current');});
    document.querySelectorAll('.tabbar a[href="index.html"]').forEach(function(t){if(quick==='saved')t.removeAttribute('aria-current');else t.setAttribute('aria-current','page');});
    var ns=$('nSaved');if(ns)ns.textContent=saved.length||'';
    $('count').innerHTML='<b>'+rows.length+'</b> event'+(rows.length===1?'':'s')+' shown'+(hiddenN?' <span class="hidn">· '+hiddenN+' hidden (past, duplicate or out of area)</span>':'');
    $('countSub').textContent=quick==='weekend'?(short(wkStart)+(wkStart!==sun?' – '+short(sun):'')):'';
  }
  function setQuick(q){quick=q;if(q!=='saved'&&location.hash==='#saved'){try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}}document.querySelectorAll('.tab').forEach(function(t){t.setAttribute('aria-pressed',String(t.dataset.q===q));});render();}
  function clearAll(){fM.value=fC.value=fF.value='';fS.value='soon';fQ.value='';setQuick('');}
  document.querySelectorAll('.tab').forEach(function(t){t.addEventListener('click',function(){setQuick(t.dataset.q===quick?'':t.dataset.q);});});
  document.querySelectorAll('.seg button').forEach(function(b){b.addEventListener('click',function(){view=b.dataset.v;document.querySelectorAll('.seg button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});render();});});
  [fM,fC,fF,fS].forEach(function(x){x.addEventListener('change',render);});
  var qt;fQ.addEventListener('input',function(){clearTimeout(qt);qt=setTimeout(render,120);});
  $('fClear').addEventListener('click',clearAll);
  // sticky shadow
  var disc=$('disc'),sent=document.createElement('div');sent.style.height='1px';disc.parentNode.insertBefore(sent,disc);
  if('IntersectionObserver' in window){new IntersectionObserver(function(en){disc.classList.toggle('stuck',!en[0].isIntersecting);},{rootMargin:'-70px 0px 0px 0px'}).observe(sent);}
  // detail sheet
  var sheet=$('sheet'),scrim=$('scrim'),curE=null,curA=null,lastFocus=null;
  function row(ic,k,v){return v?'<dl class="kv">'+ico(ic)+'<dt>'+k+'</dt><dd>'+v+'</dd></dl>':'';}
  function lnk(u,t){var s=safeUrl(u);return s?'<a href="'+esc(s)+'" target="_blank" rel="noopener">'+esc(t||s.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])+'</a>':esc(u);}
  function openSheet(id,anchor){
    var e=byId[id];if(!e) return;curE=e;curA=anchor||e.up[0]||null;lastFocus=document.activeElement;
    $('shBadges').innerHTML=badges(e,true);
    $('shTitle').textContent=e.name;
    $('shSub').innerHTML=ico('pin','sm')+esc([e.city,e.county+' County'].filter(Boolean).join(', '));
    var when=curA?'<b>'+fmt(curA)+'</b>'+(e.end_date&&e.end_date!==curA&&e.up.length===1?' – '+fmt(e.end_date):''):'';
    var more=e.up.filter(function(x){return x!==curA;});
    var extra=[];if(e.schedule) extra.push(esc(e.schedule));
    if(more.length) extra.push((e.projected?'Next: ':'Also ')+more.slice(0,5).map(short).join(', ')+(more.length>5?' +'+(more.length-5)+' more':''));
    if(e.projected) extra.push('dates projected from the published schedule');
    var apply=safeUrl(e.signup_url)||safeUrl(e.apply);
    var appl=[];if(hasDl(e)) appl.push('<b>Apply by '+fmt(e.deadline)+'</b> ('+days(floor,e.deadline)+' days)');if(e.deadline_note) appl.push(esc(e.deadline_note));
    var contact=[];if(e.apply) contact.push(lnk(e.apply,apply?'Application / vendor info':null));if(e.contact) contact.push(/@/.test(e.contact)&&!/\s/.test(e.contact)?'<a href="mailto:'+esc(e.contact)+'">'+esc(e.contact)+'</a>':esc(e.contact));
    var src=e.source_url?lnk(e.source_url):e.source?lnk(e.source)+(e.source_kind==='scan'?' <span style="color:var(--mut)">(web match)</span>':e.source_kind==='database'?' <span style="color:var(--mut)">(vendor database)</span>':''):'';
    $('shBody').innerHTML=
      row('cal','When',[when,e.time?esc(e.time):'',extra.join(' · ')].filter(Boolean).join('<br>')||'See organizer page')+
      (e.verify_note?row('info','What we found',esc(e.verify_note)):'')+
      (e.host_type?row('shield',e.host_type==='county'?'County event':'City event',esc(e.host_agency||'')+'<br><a href="city.html'+(e.agency_id?'#'+encodeURIComponent(e.agency_id):'')+'">Permits, fees + steps to sign up</a>'):'')+
      row('pin','Where',esc([e.venue,e.city,e.county+' County'].filter(Boolean).join(', ')))+
      row('tag','Vendor fee',e.fee?esc(e.fee):(e.fee_bucket==='free'?'Free':'Fee not listed'))+
      row('clock','Applications',appl.join('<br>'))+
      row('link','Apply / contact',contact.join('<br>')||'Link not on file yet')+
      row('user','Organizer',esc(e.organizer))+
      row('ext','Source',src)+
      row('check','Last checked',e.verified_on?fmt(e.verified_on)+', '+e.verified_on.slice(0,4)+' (live web)':e.last_checked?fmt(e.last_checked)+', '+e.last_checked.slice(0,4):'Not yet re-checked')+
      (e.verified?'<p class="sh-note ok">'+ico('shield')+'<span>Verified'+(e.verified_on?' '+short(e.verified_on):'')+' against the '+(e.host_type?'official':'organizer\'s own')+' page. Still confirm details before you pay.</span></p>':'<p class="sh-note">'+ico('info')+'<span>Unverified: from a public post or web scan, not re-checked yet. Confirm with the organizer before you pay.</span></p>');
    var ap=$('shApply'),ext=ap.querySelector('svg'),dest=apply||safeUrl(e.source);ap.classList.toggle('off',!dest);ext.style.display=dest?'':'none';
    if(dest){ap.href=dest;ap.removeAttribute('aria-disabled');ap.removeAttribute('tabindex');ap.firstChild.textContent=apply?(e.host_type?'How to sign up ':'Apply / vendor info '):'View source ';}
    else{ap.removeAttribute('href');ap.setAttribute('aria-disabled','true');ap.setAttribute('tabindex','-1');ap.firstChild.textContent=e.contact?'Contact organizer (see above)':'Apply link not on file yet';}
    $('shIcs').disabled=!curA;syncSheetSave();
    sheet.setAttribute('aria-hidden','false');sheet.classList.add('open');scrim.classList.add('open');document.body.style.overflow='hidden';
    $('shBody').scrollTop=0;setTimeout(function(){$('shClose').focus({preventScroll:true});},60);
    try{history.replaceState(null,'','#e='+encodeURIComponent(e.id));}catch(_){}
  }
  function closeSheet(){if(!sheet.classList.contains('open'))return;sheet.classList.remove('open');scrim.classList.remove('open');sheet.setAttribute('aria-hidden','true');sheet.style.transform='';document.body.style.overflow='';
    try{history.replaceState(null,'',location.pathname+location.search);}catch(_){} if(lastFocus&&lastFocus.focus) lastFocus.focus({preventScroll:true});}
  function saveToggle(id){saved=LG.toggleSaved(getSaved(),id);try{localStorage.setItem(SK,JSON.stringify(saved));}catch(_){}
    var on=isSaved(id);try{if(navigator.vibrate)navigator.vibrate(on?12:6);}catch(_){}
    document.querySelectorAll('.heart[data-save="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]').forEach(function(h){h.classList.toggle('on',on);h.setAttribute('aria-pressed',String(on));h.classList.remove('pop');void h.offsetWidth;h.classList.add('pop');});
    syncSheetSave();toast(on?'Saved ♥':'Removed from saved');
    if(quick==='saved')render();else{var ns=$('nSaved');if(ns)ns.textContent=saved.length||'';}}
  function syncSheetSave(){var b=$('shSave');if(!b||!curE)return;var on=isSaved(curE.id);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));b.lastChild.textContent=on?' Saved':' Save';}
  document.addEventListener('click',function(ev2){
    var hv=ev2.target.closest('[data-save]');if(hv){ev2.preventDefault();saveToggle(hv.getAttribute('data-save'));return;}
    if(ev2.target.closest('#icsAll')){icsAll();return;}
    var t=ev2.target.closest('[data-id]');if(t&&!t.closest('.sheet')){openSheet(t.dataset.id,t.dataset.a);return;}
    if(ev2.target.closest('[data-clear]')){clearAll();return;}
    var c=ev2.target.closest('[data-county]');if(c){var el=$('cty-'+c.dataset.county.replace(/\W/g,''));if(el) el.scrollIntoView({behavior:'smooth',block:'start'});}
  });
  scrim.addEventListener('click',closeSheet);$('shClose').addEventListener('click',closeSheet);
  document.addEventListener('keydown',function(k){if(k.key==='Escape') closeSheet();
    if(k.key==='Tab'&&sheet.classList.contains('open')){var f=sheet.querySelectorAll('a[href],button:not([disabled])');if(!f.length)return;var a=f[0],z=f[f.length-1];if(k.shiftKey&&document.activeElement===a){z.focus();k.preventDefault();}else if(!k.shiftKey&&document.activeElement===z){a.focus();k.preventDefault();}}});
  // swipe down to close (mobile)
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
    var all=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Jax Vendor Events//Draft//EN','CALSCALE:GREGORIAN'].concat(lines,['END:VCALENDAR']);
    var blob=new Blob([all.map(fold).join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},800);}
  $('shIcs').addEventListener('click',function(){
    var e=curE;if(!e||!curA)return;
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
    if(navigator.share){navigator.share({title:e.name,text:text,url:url}).catch(function(){});}
    else copyText(text+'\n'+url).then(function(){toast('Details + link copied');},function(){toast(url);});
  });
  var shS=$('shSave');if(shS)shS.addEventListener('click',function(){if(curE)saveToggle(curE.id);});
  // near me: device location (stays on this phone) or the home county from Settings
  function homeCounty(){try{return localStorage.getItem('jve_home')||'';}catch(_){return '';}}
  function useHome(){var h=homeCounty();if(h&&LG.COUNTY[h]){me=LG.COUNTY[h].slice();meSrc=h+' County';return true;}return false;}
  function nearMe(){
    if(me){render();return;}
    if(!navigator.geolocation){if(useHome())render();else{toast('Pick your home county in Settings');fS.value='soon';render();}return;}
    toast('Finding events near you…');
    navigator.geolocation.getCurrentPosition(function(p){me=[p.coords.latitude,p.coords.longitude];meSrc='your location';render();toast('Sorted by distance');},
      function(){if(useHome()){render();toast('Using '+meSrc+' (location off)');}else{fS.value='soon';render();toast('Location off: pick a home county in Settings');if(window.JVE_THEMES&&JVE_THEMES.open)setTimeout(JVE_THEMES.open,500);}},{enableHighAccuracy:false,timeout:8000,maximumAge:600000});}
  fS.addEventListener('change',function(){if(fS.value==='near')nearMe();});
  window.addEventListener('jve:home',function(){if(fS.value==='near'){me=null;if(useHome())render();}});
  function hashRoute(){if(location.hash==='#verified'||location.hash==='#city'){setQuick(location.hash.slice(1));return;}if(location.hash==='#saved'||location.hash==='#matches'){setQuick(location.hash.slice(1));var l=$('list');if(l)setTimeout(function(){window.scrollTo({top:Math.max(0,l.getBoundingClientRect().top+scrollY-250),behavior:'smooth'});},60);}}
  window.addEventListener('hashchange',hashRoute);
  window.addEventListener('pageshow',function(){var np=getPrefs();if(JSON.stringify(np)!==JSON.stringify(prefs)){prefs=np;countMatches();render();}});
  window.addEventListener('storage',function(ev2){if(ev2.key===PK){prefs=getPrefs();countMatches();render();}});
  render();
  hashRoute();
  var h=location.hash.match(/^#e=(.+)$/);if(h){var id=decodeURIComponent(h[1]);setTimeout(function(){openSheet(id);},150);}
})();
