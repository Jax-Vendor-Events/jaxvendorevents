/* Jax Vendor Events: create-your-profile form. Posts a normal multipart form to FormSubmit (that is what carries the logo file);
   preferences are also saved on this device and drive "My matches" on the events page. Nothing is published until approved. */
(function(){
  'use strict';
  var LG=window.JVE_LOGIC,D=window.JVE_DATA||{events:[]};
  var f=document.getElementById('profileForm');if(!f||!LG)return;
  var PK='jve_prefs',MK='jve_my_profile';
  function $(id){return document.getElementById(id);}
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function el(t,a,kids){var e=document.createElement(t);if(a)Object.keys(a).forEach(function(k){if(k==='text')e.textContent=a[k];else if(k==='cls')e.className=a[k];else e.setAttribute(k,a[k]);});(kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c);});return e;}
  function svgIco(n){var s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','ico sm');s.setAttribute('aria-hidden','true');var u=document.createElementNS('http://www.w3.org/2000/svg','use');u.setAttribute('href','#i-'+n);s.appendChild(u);return s;}
  function store(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}
  function load(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}}
  function type(){var r=q('input[name=profile_type]:checked');return r?r.value:'vendor';}
  function group(g){return qa('[data-group="'+g+'"] input:checked').map(function(i){return i.value;});}
  function setGroup(g,vals){vals=(vals||[]).map(String);qa('[data-group="'+g+'"] input').forEach(function(i){i.checked=vals.indexOf(i.value)>-1;});}
  function v(id){var e=$(id);return e?String(e.value||'').trim():'';}
  function radio(n){var r=q('input[name='+n+']:checked');return r?r.value:'';}
  var msg=$('pMsg');
  function say(t,err){msg.querySelector('span').textContent=t;msg.classList.toggle('show',!!t);msg.classList.toggle('err',!!err);if(t)msg.scrollIntoView({behavior:'smooth',block:'nearest'});}

  /* vendor / organizer switch */
  function applyType(){var t=type();qa('[data-v]').forEach(function(e){e.hidden=t!=='vendor';});qa('[data-o]').forEach(function(e){e.hidden=t!=='organizer';});
    $('pSubject').value='New profile: '+t;$('pName').placeholder=t==='vendor'?'e.g. Tidewater Candle Co.':'e.g. Riverside Holiday Market';preview();}
  qa('input[name=profile_type]').forEach(function(r){r.addEventListener('change',applyType);});

  /* organizer: pick events from the directory */
  var picked=[];var byId={};(D.events||[]).forEach(function(e){if(e.verify_status!=='removed'&&e.verify_status!=='past'&&e.verify_status!=='cancelled')byId[e.id]=e;});
  function evLabel(e){var d=(e.dates||[])[0];return e.name+(d?' · '+d.slice(5).replace('-','/'):'')+' · '+(e.city||e.county);}
  function drawPicked(){var s=$('evSel');s.textContent='';picked.forEach(function(id){var e=byId[id];if(!e)return;
      var b=el('button',{type:'button',cls:'evchip','aria-label':'Remove '+e.name},[el('span',{text:evLabel(e)}),svgIco('x')]);b.addEventListener('click',function(){picked=picked.filter(function(x){return x!==id;});drawPicked();});s.appendChild(b);});
    $('pEvIds').value=picked.join(',');preview();}
  $('evQ').addEventListener('input',function(){var t=this.value.trim().toLowerCase(),r=$('evRes');r.textContent='';if(t.length<2)return;
    var hits=Object.keys(byId).map(function(k){return byId[k];}).filter(function(e){return picked.indexOf(e.id)<0&&[e.name,e.organizer,e.city].join(' ').toLowerCase().indexOf(t)>-1;}).slice(0,6);
    if(!hits.length){r.appendChild(el('p',{cls:'hint',text:'No listing matches. Add it under “Other events you run”.'}));return;}
    hits.forEach(function(e){var b=el('button',{type:'button',cls:'evhit'},[svgIco('calplus'),el('span',{text:evLabel(e)})]);b.addEventListener('click',function(){picked.push(e.id);$('evQ').value='';r.textContent='';drawPicked();$('evQ').focus();});r.appendChild(b);});});

  /* logo preview + checks */
  var logoURL=null;
  function logoOk(){var fl=$('pLogo').files&&$('pLogo').files[0];if(!fl)return '';if(!/^image\/(png|jpeg|webp|svg\+xml)$/.test(fl.type))return 'Logo must be a PNG, JPG, WebP or SVG image.';if(fl.size>2*1024*1024)return 'Logo is over 2 MB. Please pick a smaller file.';return '';}
  $('pLogo').addEventListener('change',function(){if(logoURL){URL.revokeObjectURL(logoURL);logoURL=null;}var e=logoOk();if(e){say(e,true);this.value='';}else{say('');var fl=this.files[0];if(fl)logoURL=URL.createObjectURL(fl);}preview();});

  /* live preview card (text only via textContent) */
  function mono(name){return el('span',{cls:'pmono','aria-hidden':'true',text:LG.initials(name||'?')});}
  function preview(){var box=$('pvCard');if(!box)return;box.textContent='';var t=type(),name=v('pName')||(t==='vendor'?'Your business':'Your organization');
    var lg=logoURL||(/^https:\/\//.test(v('pLogoUrl'))?v('pLogoUrl'):null);
    var img=lg?el('img',{src:lg,alt:'',cls:'plogo',loading:'lazy'}):mono(name);
    var lp=$('logoPrev');if(lp){lp.classList.toggle('has',!!lg);lp.style.backgroundImage=lg?'url("'+String(lg).replace(/["\\()]/g,encodeURIComponent)+'")':'';}
    var cats=t==='vendor'?group('categories'):group('wants_categories');
    var tags=el('span',{cls:'ptags'},cats.slice(0,3).map(function(c){return el('span',{cls:'b',text:c});}));
    var place=[v('pCity'),v('pCounty')&&v('pCounty')!=='Other'?v('pCounty')+' County':''].filter(Boolean).join(', ');
    box.appendChild(el('div',{cls:'pcard pv'},[img,el('span',{cls:'pc-b'},[el('span',{cls:'pc-k',text:t==='vendor'?'Vendor':'Organizer'}),el('b',{cls:'pc-n',text:name}),el('span',{cls:'pc-t',text:v('pTag')||(t==='vendor'?'Your tagline':'Your tagline')}),place?el('span',{cls:'pc-m'},[svgIco('pin'),place]):null,tags]),el('span',{cls:'b pend',text:'Pending review'})]));}
  ['pName','pTag','pCity','pCounty','pLogoUrl'].forEach(function(id){$(id).addEventListener('input',preview);$(id).addEventListener('change',preview);});
  qa('[data-group] input').forEach(function(i){i.addEventListener('change',preview);});
  $('pBio').addEventListener('input',function(){$('bioN').textContent=this.value.length;});

  /* preferences */
  function prefsFromForm(){return LG.parsePrefs({counties:group('service_counties'),types:group('event_types'),days:group('days').map(Number),max_fee:v('pMaxFee')===''?null:+v('pMaxFee'),unknown_fee:$('pUnknownFee').checked,setting:radio('io')||'any',alerts:radio('al')==='yes'});}
  function fillPrefs(p){if(!p)return;setGroup('service_counties',p.counties);setGroup('event_types',p.types);setGroup('days',p.days);$('pMaxFee').value=p.max_fee===null?'':String(p.max_fee);
    if($('pMaxFee').value!==(p.max_fee===null?'':String(p.max_fee)))$('pMaxFee').value='';$('pUnknownFee').checked=p.unknown_fee!==false;
    var io=q('input[name=io][value="'+p.setting+'"]');if(io)io.checked=true;var al=q('input[name=al][value="'+(p.alerts?'yes':'no')+'"]');if(al)al.checked=true;}
  function savePrefs(){var p=prefsFromForm();return store(PK,p)?p:null;}

  /* everything the reviewer needs, as one JSON block (tools/add_profile.py reads it) */
  function build(){var t=type(),fl=$('pLogo').files&&$('pLogo').files[0];
    var o={v:1,type:t,name:v('pName'),tagline:v('pTag'),bio:v('pBio'),logo_file:fl?fl.name:null,logo_url:v('pLogoUrl')||null,city:v('pCity'),county:v('pCounty'),
      links:{website:v('pWeb'),shop:v('pShop'),instagram:v('pIg'),facebook:v('pFb'),tiktok:v('pTt')},email:v('pEmail'),show_email:$('pShowEmail').checked,
      spotlight_interest:$('pSpot').checked,submitted_at:new Date().toISOString()};
    if(t==='vendor'){o.categories=group('categories');o.products=v('pProducts');o.service_counties=group('service_counties');o.prefs=prefsFromForm();}
    else{o.event_ids=picked.slice();o.events_run=v('pEvOther');o.wants_categories=group('wants_categories');o.apply_method=v('pApply');o.apply_url=v('pApplyUrl')||null;o.apply_note=v('pApplyNote');}
    return o;}
  var RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  f.addEventListener('submit',function(e){
    var bad=null;qa('[aria-invalid]',f).forEach(function(x){x.removeAttribute('aria-invalid');});
    if(!v('pName'))bad=['pName','Please add your '+(type()==='vendor'?'business':'organization')+' name.'];
    else if(!RE.test(v('pEmail')))bad=['pEmail','Please enter a valid email so we can reach you about your profile.'];
    else if(v('pLogoUrl')&&!/^https:\/\//i.test(v('pLogoUrl')))bad=['pLogoUrl','The logo link should start with https://'];
    else if(logoOk())bad=['pLogo',logoOk()];
    else if(!$('pOk').checked)bad=['pOk','Please tick the box to confirm this is your business and it can be shown once approved.'];
    if(bad){e.preventDefault();var x=$(bad[0]);x.setAttribute('aria-invalid','true');x.focus();say(bad[1],true);return;}
    if(q('input[name=_honey]').value){e.preventDefault();return;}
    var o=build();
    // readable copies of the grouped answers for the email table; inactive type's fields are not sent
    qa('input[data-join]',f).forEach(function(h){h.value=group(h.getAttribute('data-join')).map(function(x){return h.getAttribute('data-join')==='days'?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][+x]:x;}).join(', ');});
    if(o.prefs){$('hMaxFee').value=o.prefs.max_fee===null?'any':'$'+o.prefs.max_fee;$('hIo').value=o.prefs.setting;$('hAl').value=o.prefs.alerts?'yes':'no';}
    qa('[data-v] input,[data-v] select,[data-v] textarea,#hMaxFee,#hIo,#hAl,input[data-join=categories],input[data-join=service_counties],input[data-join=event_types],input[data-join=days]',f).forEach(function(i){i.disabled=o.type!=='vendor';});
    qa('[data-o] input,[data-o] select,[data-o] textarea,input[data-join=wants_categories]',f).forEach(function(i){i.disabled=o.type!=='organizer';});
    qa('input[name=io],input[name=al]',f).forEach(function(i){i.disabled=true;});
    $('pJson').value=JSON.stringify(o);
    if(o.prefs)store(PK,o.prefs);
    var mine=Object.assign({},o);delete mine.email;mine.status='pending';store(MK,mine);
    $('pSend').disabled=true;$('pSend').textContent='Sending\u2026';
    // the browser now posts the form (multipart, with the logo file) and FormSubmit sends it back to join.html?sent=1
  });
  $('pSavePrefs').addEventListener('click',function(){var p=savePrefs();if(!p){say('Couldn\u2019t save on this device (private browsing?).',true);return;}
    if(!LG.hasPrefs(p)){say('Pick at least one county, event type, day or fee first.',true);return;}location.href='index.html#matches';});

  /* restore: saved preferences and the last profile sent from this device */
  fillPrefs(LG.parsePrefs(load(PK)));
  var mine=load(MK);
  if(mine&&typeof mine==='object'){var r=q('input[name=profile_type][value="'+(mine.type==='organizer'?'organizer':'vendor')+'"]');if(r)r.checked=true;
    [['pName','name'],['pTag','tagline'],['pBio','bio'],['pLogoUrl','logo_url'],['pCity','city'],['pCounty','county'],['pProducts','products'],['pEvOther','events_run'],['pApply','apply_method'],['pApplyUrl','apply_url'],['pApplyNote','apply_note']].forEach(function(p){if(mine[p[1]]&&$(p[0]))$(p[0]).value=mine[p[1]];});
    var L=mine.links||{};[['pWeb','website'],['pShop','shop'],['pIg','instagram'],['pFb','facebook'],['pTt','tiktok']].forEach(function(p){if(L[p[1]])$(p[0]).value=L[p[1]];});
    $('pShowEmail').checked=!!mine.show_email;setGroup('categories',mine.categories);setGroup('wants_categories',mine.wants_categories);
    if(Array.isArray(mine.event_ids))picked=mine.event_ids.filter(function(id){return byId[id];});drawPicked();$('bioN').textContent=$('pBio').value.length;}
  applyType();
  window.addEventListener('pageshow',function(ev){if(ev.persisted){qa('input,select,textarea',f).forEach(function(i){i.disabled=false;});$('pSend').disabled=false;$('pSend').innerHTML='Send my profile for review <svg class="ico sm" aria-hidden="true"><use href="#i-arrow"/></svg>';}});

  /* after FormSubmit sends the visitor back */
  if(/[?&]sent=1/.test(location.search)){$('pfWrap').hidden=true;var dn=$('done');dn.hidden=false;var p=LG.parsePrefs(load(PK));
    if(!(mine&&mine.type==='vendor'&&LG.hasPrefs(p)))$('doneMatches').hidden=true;
    setTimeout(function(){dn.focus();},50);
    $('editAgain').addEventListener('click',function(){dn.hidden=true;$('pfWrap').hidden=false;try{history.replaceState(null,'','join.html');}catch(_){}$('pName').focus();});}
  if(location.hash==='#prefs'){setTimeout(function(){var h=$('prefs');if(h){h.scrollIntoView({block:'start'});h.focus({preventScroll:true});}},80);}
})();
