/* Jax Vendor Events: My account (account.html). Five sections (Profile & branding, Subscription, My stuff, App settings,
   Security) that open and close; the cards inside follow the role the member signed up with (vendor, organizer, business),
   admins see all of them. Everything here is the member's own row; the server (Row Level Security) refuses anything else. */
(function(){
  'use strict';
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function msg(id,t,k){var m=$(id);if(!m)return;m.className='amsg show '+(k||'info');m.textContent=t;}
  function fmt(d){if(!d)return '';var x=new Date(d+(d.length===10?'T12:00:00':''));return x.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
  var html=document.documentElement;
  /* ---------- collapsible sections (open state kept per device) ---------- */
  var KO='jve_acct_open';
  function getOpen(){try{return JSON.parse(localStorage.getItem(KO)||'null');}catch(_){return null;}}
  function setOpen(ids){try{localStorage.setItem(KO,JSON.stringify(ids));}catch(_){}}
  function toggle(sec,on){sec.classList.toggle('open',on);var b=sec.querySelector('.ash');if(b)b.setAttribute('aria-expanded',String(on));}
  var secs=Array.prototype.slice.call(document.querySelectorAll('.asec'));
  var saved=getOpen();if(saved)secs.forEach(function(s){toggle(s,saved.indexOf(s.id)>=0);});
  function openFor(hash){var t=hash&&document.getElementById(hash.replace(/^#/,''));if(!t)return;var s=t.closest('.asec');if(s){toggle(s,true);setTimeout(function(){t.scrollIntoView({behavior:'smooth',block:'start'});},60);}}
  secs.forEach(function(s){s.querySelector('.ash').addEventListener('click',function(){toggle(s,!s.classList.contains('open'));setOpen(secs.filter(function(x){return x.classList.contains('open');}).map(function(x){return x.id;}));});});
  if(location.hash)openFor(location.hash);
  window.addEventListener('hashchange',function(){openFor(location.hash);});
  /* ---------- tier wording (from the pricing page) ---------- */
  var INCL={'vendor-pro':['Email reminders before application deadlines close','The weekly email a day early','Gold PRO badge and higher placement in the directory'],
    'featured-vendor':['Your profile pinned at the top of the Vendors directory','Featured badge on your profile'],
    'organizer-plus':['Every event listed and kept up to date for you','2 featured weeks every month','A deadline spotlight on every event','Verified organizer badge and higher placement'],
    'featured-event':['Your event pinned at the top of the events page','Featured badge and a line in that week\u2019s email'],
    'deadline-spotlight':['Your deadline in \u201cDeadlines coming up\u201d, on the site and in the email'],
    'newsletter-sponsor':['Logo, 2 lines and a link at the top of the weekly email'],
    'directory-sponsor':['Banner on the events page all month','\u201cSupported by\u201d line in the site footer','A mention in every email that month','Sponsor badge and top placement for your profile']};
  var FREE=['Every market in Florida: dates, towns and fees','Save events and set your matches','Your own branded profile in the directory'];
  var BYROLE={vendor:['vendor-pro','featured-vendor'],organizer:['organizer-plus','featured-event','deadline-spotlight'],business:['directory-sponsor','newsletter-sponsor']};
  var BLURB={'vendor-pro':'Deadline reminders, early email, PRO badge','featured-vendor':'Top of the Vendors directory for a week','organizer-plus':'Managed listings, verified badge, spotlights',
    'featured-event':'Pinned at the top of the events page','deadline-spotlight':'Your deadline in the spotlight for a week','directory-sponsor':'Banner on the events page all month','newsletter-sponsor':'Top of one weekly email'};
  window.JVE_AUTH.ready.then(async function(A){
    var sb=A.sb,u=A.user,p=A.profile||{};if(!u)return;
    var role=['vendor','organizer','business'].indexOf(p.account_type)>=0?p.account_type:'vendor';
    function applyRole(r){html.classList.remove('role-vendor','role-organizer','role-business');if(!A.admin)html.classList.add('role-'+r);
      $('pRole').textContent=A.admin?'Admin':(r.charAt(0).toUpperCase()+r.slice(1));
      $('stuffSub').textContent=A.admin?'Every role\u2019s tools (you\u2019re an admin)':r==='organizer'?'Your listings, list an event, get featured':r==='business'?'Sponsor placements and details':'Saved events and your directory listing';}
    applyRole(role);
    if(new URLSearchParams(location.search).get('why')==='admin')msg('topMsg','That page is for admins only.','err');
    /* ---------- account details ---------- */
    $('pEmail').textContent=u.email;
    $('pName').value=p.full_name||'';$('pBiz').value=p.business_name||'';$('pType').value=role;$('pWeb').value=p.website||'';
    $('profileForm').addEventListener('submit',function(e){e.preventDefault();
      var web=$('pWeb').value.trim();if(web&&!/^https:\/\/\S+$/i.test(web))return msg('profileMsg','Website should start with https://','err');
      var nr=$('pType').value;
      sb.from('profiles').update({full_name:$('pName').value.trim().slice(0,120),business_name:$('pBiz').value.trim().slice(0,160),account_type:nr,website:web.slice(0,300)}).eq('id',u.id)
        .then(function(r){if(r.error)throw r.error;p.account_type=nr;role=nr;applyRole(nr);drawUpgrades();msg('profileMsg','Saved.','ok');}).catch(function(err){msg('profileMsg',err.message||'Could not save.','err');});});
    /* ---------- subscription ---------- */
    var links={};try{links=await (await fetch('data/checkout.json?t='+Date.now(),{cache:'no-store'})).json();}catch(_){}
    var tiers={};try{var tr=await sb.from('tiers').select('id,name,price_cents,interval,days');(tr.data||[]).forEach(function(t){tiers[t.id]=t;});}catch(_){}
    var mem=await sb.from('memberships').select('tier,status,until,source,starts_on,stripe_subscription_id').order('created_at',{ascending:false});
    var today=new Date().toISOString().slice(0,10);
    var act=(mem.data||[]).filter(function(m){return m.status==='active'&&(!m.until||m.until>=today)&&m.starts_on<=today;});
    var mine=act.map(function(m){return m.tier;});
    var h='';
    if(!act.length)h='<span class="tierpill free">Free member</span>';
    act.forEach(function(m){h+='<span class="tierpill'+(m.tier==='vendor-pro'?' gold':'')+'">'+esc(A.TIER_NAMES[m.tier]||m.tier)+(m.until?' \u00b7 until '+fmt(m.until):(m.stripe_subscription_id?' \u00b7 renews monthly':''))+'</span>';});
    if(A.admin)h+='<span class="tierpill">Admin \u00b7 full access</span>';
    $('planPills').innerHTML=h;
    var inc=FREE.slice();mine.forEach(function(t){(INCL[t]||[]).forEach(function(x){if(inc.indexOf(x)<0)inc.push(x);});});
    if(A.admin)inc.unshift('Every event name, venue and link (admin)');
    $('planIncl').innerHTML=inc.map(function(x){return '<li>'+esc(x)+'</li>';}).join('');
    function price(t){var x=tiers[t];if(!x)return '';var d='$'+(x.price_cents/100).toFixed(x.price_cents%100?2:0);return d+(x.interval==='month'?'/mo':x.days===7?'/week':'');}
    function buy(t){var l=links[t];return (typeof l==='string'&&/^https:\/\/buy\.stripe\.com\//.test(l))?A.buyUrl(l):'pricing.html?tier='+t+'#get-featured';}
    function drawUpgrades(){var list=A.admin?Object.keys(BLURB):(BYROLE[role]||BYROLE.vendor);
      $('upGrid').innerHTML=list.map(function(t){var have=mine.indexOf(t)>=0;return '<a class="up'+(have?' have':'')+'" href="'+esc(buy(t))+'"'+(have?' aria-disabled="true"':' target="_blank" rel="noopener"')+'><span><b>'+esc(A.TIER_NAMES[t]||t)+'</b><small>'+esc(BLURB[t]||'')+'</small></span><span class="pr">'+(have?'Active':esc(price(t)))+'</span></a>';}).join('');}
    drawUpgrades();
    $('upGrid').addEventListener('click',function(e){var a=e.target.closest('.up.have');if(a)e.preventDefault();});
    Array.prototype.forEach.call(document.querySelectorAll('[data-upgrade]'),function(a){var id=a.getAttribute('data-upgrade');var l=links[id];
      if(typeof l==='string'&&/^https:\/\/buy\.stripe\.com\//.test(l)){a.href=A.buyUrl(l);a.target='_blank';a.rel='noopener';}else a.href='pricing.html?tier='+id+'#get-featured';});
    /* ---------- my stuff ---------- */
    var sv=[];try{sv=JSON.parse(localStorage.getItem('jve_saved')||'[]');}catch(_){}
    var nS=Array.isArray(sv)?sv.length:Object.keys(sv||{}).length;
    $('savedTxt').textContent=nS?('You have '+nS+' saved event'+(nS===1?'':'s')+' on this device.'):'Nothing saved yet. Tap the heart on any event to keep it here.';
    document.addEventListener('jve:brand',function(e){var d=e.detail;$('dirTxt').textContent=d&&d.listed?'You\u2019re listed in the directory as \u201c'+d.business_name+'\u201d.':'Your profile isn\u2019t listed in the directory right now.';});
    sb.from('brand_profiles').select('business_name,listed').eq('user_id',u.id).maybeSingle().then(function(r){var d=r.data;$('dirTxt').textContent=d?(d.listed?'You\u2019re listed in the directory as \u201c'+d.business_name+'\u201d.':'Your profile isn\u2019t listed in the directory right now.'):'Set up your brand profile above and you\u2019re listed in the directory.';});
    var evs=(window.JVE_DATA&&window.JVE_DATA.events)||[];
    var own=await sb.from('event_owners').select('event_id');var ownIds=(own.data||[]).map(function(x){return x.event_id;});
    var reqs=await sb.from('listing_requests').select('id,kind,event_id,status,admin_note,created_at,payload').order('created_at',{ascending:false}).limit(30);
    var byId={};evs.forEach(function(e){byId[e.id]=e;});
    var rowsE=ownIds.map(function(id){var e=byId[id];return '<li><span class="st approved">live</span> <b>'+esc(e&&!e.locked?e.name:id)+'</b><small>'+esc(e?[e.city,(e.dates||[]).filter(function(d){return d>=today;})[0]?'next '+fmt((e.dates||[]).filter(function(d){return d>=today;})[0]):''].filter(Boolean).join(' \u00b7 '):'')+'</small></li>';});
    (reqs.data||[]).filter(function(x){return x.kind==='new_event'&&x.status!=='approved';}).forEach(function(x){rowsE.push('<li><span class="st '+x.status+'">'+x.status+'</span> <b>'+esc((x.payload&&x.payload.name)||'New event')+'</b><small>sent '+fmt(x.created_at.slice(0,10))+(x.admin_note?' \u00b7 '+esc(x.admin_note):'')+'</small></li>');});
    $('myEvents').innerHTML=rowsE.length?rowsE.join(''):'<li><small>No listings yet. List your first event free, it usually goes live within 24 hours.</small></li>';
    var spT=['newsletter-sponsor','directory-sponsor'],spA=act.filter(function(m){return spT.indexOf(m.tier)>=0;});
    $('spLive').innerHTML=spA.length?spA.map(function(m){return '<li><span class="st active">live</span> <b>'+esc(A.TIER_NAMES[m.tier])+'</b><small>'+(m.until?'until '+fmt(m.until):'running')+'</small></li>';}).join(''):'<li><small>No sponsor placement running.</small></li>';
    /* Organizer Plus: manage my listings (requests reviewed by an admin) */
    var sel=$('opEvent');
    if(sel){var bn=(p.business_name||'').toLowerCase();var opts=evs.filter(function(e){return e.verify_status!=='removed'&&e.verify_status!=='past'&&!e.locked;})
        .sort(function(a,b){var am=ownIds.indexOf(a.id)>=0||(bn&&String(a.organizer||'').toLowerCase().indexOf(bn)>=0),bm=ownIds.indexOf(b.id)>=0||(bn&&String(b.organizer||'').toLowerCase().indexOf(bn)>=0);return (bm-am)||String(a.name).localeCompare(String(b.name));});
      sel.innerHTML='<option value="">Pick one of your events\u2026</option>'+opts.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.name)+(e.city?' \u00b7 '+esc(e.city):'')+'</option>';}).join('');
      $('opForm').addEventListener('submit',function(e){e.preventDefault();var id=sel.value;if(!id)return msg('opMsg','Pick the event first.','err');
        var kind=$('opKind').value,pl={};
        [['opDates','dates'],['opFee','fee'],['opDeadline','deadline'],['opApply','apply'],['opNote','description']].forEach(function(f){var v=$(f[0]).value.trim();if(v)pl[f[1]]=f[1]==='dates'?v.split(/[ ,]+/).filter(function(x){return /^\d{4}-\d{2}-\d{2}$/.test(x);}):v;});
        sb.from('listing_requests').insert({user_id:u.id,kind:kind,event_id:id,payload:pl}).then(function(r){if(r.error)throw r.error;msg('opMsg','Sent. An admin checks it against your own page, usually within 24 hours.','ok');$('opForm').reset();loadReqs();})
          .catch(function(err){msg('opMsg',/row-level security/i.test(err.message)?'Managing listings is part of Organizer Plus.':err.message,'err');});});}
    var sf=$('spForm');
    if(sf)sf.addEventListener('submit',function(e){e.preventDefault();var pl={name:$('spName').value.trim(),line:$('spLine').value.trim().slice(0,140),url:$('spUrl').value.trim(),logo:$('spLogo').value.trim()};
      if(pl.url&&!/^https:\/\/\S+$/i.test(pl.url))return msg('spMsg','Link should start with https://','err');
      sb.from('listing_requests').insert({user_id:u.id,kind:'sponsor_details',payload:pl}).then(function(r){if(r.error)throw r.error;msg('spMsg','Got it. Your sponsor details go live after a quick check.','ok');loadReqs();}).catch(function(err){msg('spMsg',err.message,'err');});});
    var RL={new_event:'New event listing',edit_event:'Listing update',remove_event:'Listing removal',vendor_profile:'Vendor profile',sponsor_details:'Sponsor details'};
    function drawReqs(rows){$('reqList').innerHTML=rows.length?rows.map(function(x){return '<li><span class="st '+esc(x.status)+'">'+esc(x.status)+'</span> <b>'+esc(RL[x.kind]||x.kind)+'</b>'+(x.payload&&x.payload.name?' \u00b7 '+esc(x.payload.name):'')+(x.event_id?' \u00b7 '+esc(x.event_id):'')+'<small>'+fmt(x.created_at.slice(0,10))+(x.admin_note?' \u00b7 '+esc(x.admin_note):'')+'</small></li>';}).join(''):'<li><small>Nothing yet. Listings and requests you send show up here.</small></li>';}
    async function loadReqs(){var r=await sb.from('listing_requests').select('id,kind,event_id,status,admin_note,created_at,payload').order('created_at',{ascending:false}).limit(30);drawReqs(r.data||[]);}
    drawReqs(reqs.data||[]);
    var pay=await sb.from('payments').select('tier,amount_cents,created_at').order('created_at',{ascending:false}).limit(30);
    $('payList').innerHTML=(pay.data||[]).length?(pay.data||[]).map(function(x){return '<li><b>'+esc(A.TIER_NAMES[x.tier]||x.tier||'Purchase')+'</b> \u00b7 $'+(x.amount_cents/100).toFixed(2)+'<small>'+fmt(x.created_at.slice(0,10))+'</small></li>';}).join(''):'<li><small>No purchases yet.</small></li>';
    /* ---------- app settings ---------- */
    var TH=window.JVE_THEMES,RG=window.JVE_REGIONS;
    function modeNow(){try{var m=localStorage.getItem('jve_look2');return m==='light'||m==='dark'?m:'auto';}catch(_){return 'auto';}}
    function syncMode(){Array.prototype.forEach.call($('setMode').querySelectorAll('button'),function(b){b.setAttribute('aria-checked',String(b.getAttribute('data-mode')===modeNow()));});}
    $('setMode').addEventListener('click',function(e){var b=e.target.closest('button[data-mode]');if(!b)return;var m=b.getAttribute('data-mode');
      if(TH&&TH.setMode)TH.setMode(m);else{try{localStorage.setItem('jve_look2',m);}catch(_){}location.reload();}syncMode();});
    syncMode();
    var rs=$('setRegion');
    var RL2=RG&&(typeof RG.list==='function'?RG.list():RG.list);
    if(Array.isArray(RL2)&&RL2.length){var cur=RG.get&&RG.get();RL2.forEach(function(r){var id=r.id,label=r.label;var o=document.createElement('option');o.value=id;o.textContent=label;if(id===cur)o.selected=true;rs.appendChild(o);});
      rs.addEventListener('change',function(){RG.set(rs.value);msg('regMsg','Saved. Home and Events open on '+rs.options[rs.selectedIndex].textContent+'.','ok');});}
    else rs.closest('.acard').hidden=true;
    var prefs=p.prefs||{};var rm=$('proRemind');
    if(rm){rm.checked=prefs.reminders!==false;rm.addEventListener('change',function(){prefs.reminders=rm.checked;
      sb.from('profiles').update({prefs:prefs}).eq('id',u.id).then(function(r){msg('proMsg',r.error?(r.error.message):(rm.checked?'Deadline reminders on.':'Deadline reminders off.'),r.error?'err':'ok');});});}
    /* the calendar-link card (another part of the site) goes into App settings wherever it was placed */
    var cal=document.querySelector('[data-acct-card="calendar"],#calCard,#calendarCard');if(cal&&!$('calSlot').contains(cal))$('calSlot').appendChild(cal);
    /* ---------- security ---------- */
    $('pwForm').addEventListener('submit',function(e){e.preventDefault();var a=$('nPw').value,b=$('nPw2').value;
      if(!(a.length>=10&&/[a-z]/i.test(a)&&/\d/.test(a)))return msg('pwMsg','At least 10 characters with letters and numbers.','err');if(a!==b)return msg('pwMsg','The two passwords don\u2019t match.','err');
      sb.auth.updateUser({password:a}).then(function(r){if(r.error)throw r.error;return sb.auth.signOut({scope:'others'});}).then(function(){msg('pwMsg','Password changed. Any other device was logged out.','ok');$('pwForm').reset();}).catch(function(err){msg('pwMsg',err.message,'err');});});
    $('emForm').addEventListener('submit',function(e){e.preventDefault();var em=$('nEm').value.trim();if(!em)return;
      sb.auth.updateUser({email:em},{emailRedirectTo:'https://jaxvendorevents.com/account.html'}).then(function(r){if(r.error)throw r.error;msg('emMsg','Check both inboxes: confirm the change from your old and new email.','ok');}).catch(function(err){msg('emMsg',err.message,'err');});});
  });
})();
