/* Jax Vendor Events: vendor + organizer directory and single profile view. Approved profiles only (data/profiles.json). All text goes in via textContent. */
(function(){
  'use strict';
  var LG=window.JVE_LOGIC,P=window.JVE_PROFILES||{profiles:[]},D=window.JVE_DATA||{events:[]};if(!LG)return;
  if(window.JVE_PAIDX)window.JVE_PAIDX.profiles(P.profiles); /* paid Featured vendor / Vendor Pro / Organizer Plus (data/paid.json) */
  function $(id){return document.getElementById(id);}
  function el(t,a,kids){var e=document.createElement(t);if(a)Object.keys(a).forEach(function(k){if(a[k]==null||a[k]===false)return;if(k==='text')e.textContent=a[k];else if(k==='cls')e.className=a[k];else e.setAttribute(k,a[k]);});(kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c);});return e;}
  function ico(n,c){var s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','ico'+(c?' '+c:''));s.setAttribute('aria-hidden','true');var u=document.createElementNS('http://www.w3.org/2000/svg','use');u.setAttribute('href','#i-'+n);s.appendChild(u);return s;}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  var today=iso(new Date());
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function pd(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  var TL={};LG.TYPES.forEach(function(t){TL[t[0]]=t[1];});var AL={link:'Apply through their application link',email:'Apply by email',facebook:'Message them on Facebook',instagram:'Send them a DM on Instagram',other:'See their note below'};
  var all=LG.publicProfiles(P.profiles);
  function logo(p,cls){if(p.brand&&window.JVE_BRAND)return window.JVE_BRAND.logoEl({logo:p.logoPath,name:p.name,color:p.color},cls||'');var u=LG.safeLogo(p.logo);return u?el('img',{src:u,alt:p.name+' logo',cls:cls||'plogo',loading:'lazy',width:'96',height:'96'}):el('span',{cls:'pmono '+(cls||''),'aria-hidden':'true',text:LG.initials(p.name)});}
  function place(p){return [p.city,p.county&&p.county!=='Other'?p.county+' County':''].filter(Boolean).join(', ');}
  function cats(p){return p.type==='vendor'?(p.categories||[]):(p.wants_categories||[]);}
  function badges(p){var b=[];if(p.sample)b.push(el('span',{cls:'b unv',text:'Sample'}));if(p.pro)b.push(el('span',{cls:'b pro',title:'Vendor Pro member',text:'PRO'}));if(p.sponsor)b.push(el('span',{cls:'b gold'},[ico('star'),'Sponsor']));if(p.verified_org)b.push(el('span',{cls:'b gold'},[ico('shield'),'Verified organizer']));if(LG.featuredNow(p,today))b.push(el('span',{cls:'b gold'},[ico('star'),'Featured']));return b;}
  function card(p){var cs=cats(p);
    return el('a',{cls:'pcard'+(LG.featuredNow(p,today)?' isfeat':'')+(p.brand?' isbrand':''),href:p.href||'profile.html?id='+encodeURIComponent(p.id),style:p.brand?'--bc:'+p.color:null},[logo(p),el('span',{cls:'pc-b'},[el('span',{cls:'pc-k',text:p.type==='vendor'?'Vendor':'Organizer'}),el('b',{cls:'pc-n',text:p.name}),p.tagline?el('span',{cls:'pc-t',text:p.tagline}):null,place(p)?el('span',{cls:'pc-m'},[ico('pin','sm'),place(p)]):null,
      el('span',{cls:'ptags'},badges(p).concat(cs.slice(0,2).map(function(c){return el('span',{cls:'b',text:c});})))]),ico('right','chev')]);}

  /* ---------- directory ---------- */
  function rank(p){if(p.sample)return 9;if(LG.featuredNow(p,today))return 0;if(p.pro||p.verified_org)return 1;return 2;}
  function directory(){
    var t='vendor';var nV=all.filter(function(p){return p.type==='vendor';}).length,nO=all.length-nV;$('nVend').textContent=nV;$('nOrg').textContent=nO;
    if(location.hash==='#organizers')t='organizer';
    var feat=all.filter(function(p){return p.type==='vendor'&&LG.featuredNow(p,today);}).sort(function(a,b){return (a.brand?0:1)-(b.brand?0:1);});
    var fb=$('pFeat');
    if(feat.length)feat.slice(0,3).forEach(function(p){fb.appendChild(card(p));});
    else fb.appendChild(el('a',{cls:'feat fv',href:'pricing.html?tier=featured-vendor#get-featured','data-buy':'featured-vendor'},[el('span',{cls:'ft'},[ico('star','sm'),' Featured vendor']),el('h3',{text:'Your business here'}),el('p',{text:'Top of the vendor directory for a week, with a Featured badge. $10.'}),el('span',{cls:'go'},[ico('arrow')])]));
    function draw(){var qv=$('pQ').value.trim().toLowerCase(),c=$('pCat').value;
      document.querySelectorAll('.pseg button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.t===t));});
      var rows=all.filter(function(p){return p.type===t&&(!c||cats(p).indexOf(c)>-1)&&(!qv||[p.name,p.tagline,p.products,p.city,p.county,cats(p).join(' ')].join(' ').toLowerCase().indexOf(qv)>-1);});
      rows.sort(function(a,b){var ra=rank(a),rb=rank(b);if(ra!==rb)return ra-rb;if(!!a.brand!==!!b.brand)return a.brand?-1:1;return a.name.localeCompare(b.name);});
      var L=$('pList');L.textContent='';
      if(!rows.length){var any=all.some(function(p){return p.type===t;});
        L.appendChild(el('div',{cls:'empty'},[el('div',{cls:'art'},[ico('user','lg')]),el('h3',{text:any?'No profiles match':'No '+(t==='vendor'?'vendor':'organizer')+' profiles yet'}),el('p',{text:any?'Try another search or category.':'Be the first. Profiles are reviewed and then listed here.'}),any?el('button',{cls:'btn ghost',type:'button',id:'pClr',text:'Clear search'}):el('a',{cls:'btn',href:'account.html#brand',text:'Create your profile'})]));
        var cl=$('pClr');if(cl)cl.addEventListener('click',function(){$('pQ').value='';$('pCat').value='';draw();});}
      else rows.forEach(function(p){L.appendChild(card(p));});
      $('pCount').textContent=rows.length+' '+(t==='vendor'?'vendor':'organizer')+(rows.length===1?'':'s');$('pCat').parentNode.classList.toggle('on',!!c);}
    document.querySelectorAll('.pseg button').forEach(function(b){b.addEventListener('click',function(){t=b.dataset.t;try{history.replaceState(null,'',t==='organizer'?'#organizers':location.pathname);}catch(_){}draw();});});
    $('pQ').addEventListener('input',draw);$('pCat').addEventListener('change',draw);draw();
    /* the visitor's own profile, sent from this device and still waiting for review */
    var mine=null;try{mine=JSON.parse(localStorage.getItem('jve_my_profile')||'null');}catch(e){}
    if(mine&&mine.status==='pending'&&mine.name&&!all.some(function(p){return LG.slug(p.name)===LG.slug(mine.name);})){var m=$('mine');m.hidden=false;m.className='minebar';
      m.appendChild(el('span',{cls:'mb-t'},[el('b',{text:'Your profile is waiting for review'}),el('span',{text:mine.name+' · sent from this device. It appears here once approved.'})]));m.appendChild(el('a',{cls:'btn ghost',href:'join.html',text:'Edit'}));}
  }

  if($('pList')){
    var BRd=window.JVE_BRAND;
    (BRd?BRd.directory():Promise.resolve([])).then(function(list){
      var rows=list.map(function(b){var x=BRd.asProfile(b,today);x.logoPath=b.logo;return x;});
      all=all.filter(function(p){return !p.sample;}); /* no sample profiles on the public site */
      all=rows.concat(all);directory();});
  }

  /* ---------- single profile ---------- */
  var bslug=(location.search.match(/[?&]u=([^&]+)/)||[])[1];
  if($('pv')&&bslug&&window.JVE_BRAND){window.JVE_BRAND.renderPage($('pv'),decodeURIComponent(bslug));return;}
  if($('pv')){
    var id=(location.search.match(/[?&]id=([^&]+)/)||[])[1];id=id?decodeURIComponent(id):'';
    var p=all.filter(function(x){return x.id===id;})[0],box=$('pv');box.textContent='';
    if(!p){document.title='Profile not found — Jax Vendor Events';box.appendChild(el('div',{cls:'empty'},[el('div',{cls:'art'},[ico('user','lg')]),el('h1',{cls:'h3',text:'Profile not found'}),el('p',{text:'It may still be waiting for review, or the link is old.'}),el('a',{cls:'btn',href:'profiles.html',text:'Browse vendors & organizers'})]));return;}
    document.title=p.name+' — Jax Vendor Events';
    var L2=p.links||{},links=[];
    [['website','Website','link'],['shop','Shop online','tag'],['instagram','Instagram','user'],['facebook','Facebook','user'],['tiktok','TikTok','user']].forEach(function(k){var u=LG.socialUrl(k[0],L2[k[0]]);if(!u)return;
      links.push(p.sample?el('span',{cls:'plink is-sample','aria-disabled':'true',title:'Sample link'},[ico(k[2],'sm'),k[1]]):el('a',{cls:'plink',href:u,target:'_blank',rel:'noopener noreferrer'},[ico(k[2],'sm'),k[1],ico('ext','sm')]));});
    if(p.contact_email&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.contact_email))links.push(el('a',{cls:'plink',href:'mailto:'+p.contact_email},[ico('mail','sm'),'Email']));
    var head=el('section',{cls:'phero'},[logo(p,'plogo xl'),el('div',{cls:'ph-b'},[el('span',{cls:'pc-k',text:p.type==='vendor'?'Vendor':'Organizer'}),el('h1',{text:p.name}),p.tagline?el('p',{cls:'lead',text:p.tagline}):null,
      place(p)?el('p',{cls:'pc-m'},[ico('pin','sm'),place(p)]):null,el('div',{cls:'ptags'},badges(p))]),links.length?el('div',{cls:'plinks'},links):null]);
    box.appendChild(head);
    var body=el('div',{cls:'pbody'});box.appendChild(body);
    function sec(title,icon,kids){return el('section',{cls:'panel psec'},[el('h2',{},[ico(icon),title])].concat(kids));}
    if(p.bio)body.appendChild(sec('About','info',[el('p',{text:p.bio})]));
    if(p.type==='vendor'){
      var k=[];if((p.categories||[]).length)k.push(el('div',{cls:'ptags'},p.categories.map(function(c){return el('span',{cls:'b',text:c});})));if(p.products)k.push(el('p',{text:p.products}));
      if(k.length)body.appendChild(sec('What they sell','tag',k));
      var lf=p.looking_for||{},rows=[];
      if((p.service_counties||[]).length)rows.push(el('li',{},[el('b',{text:'Counties'}),el('span',{text:p.service_counties.join(', ')})]));
      if((lf.types||[]).length)rows.push(el('li',{},[el('b',{text:'Events'}),el('span',{text:lf.types.map(function(x){return TL[x]||x;}).join(', ')})]));
      if((lf.days||[]).length)rows.push(el('li',{},[el('b',{text:'Days'}),el('span',{text:[1,2,3,4,5,6,0].filter(function(d){return lf.days.indexOf(d)>-1;}).map(function(d){return WD[d];}).join(', ')})]));
      if(lf.setting&&lf.setting!=='any')rows.push(el('li',{},[el('b',{text:'Setting'}),el('span',{text:lf.setting==='indoor'?'Indoor':'Outdoor'})]));
      if(rows.length)body.appendChild(sec('Looking for','filter',[el('ul',{cls:'kvl'},rows),el('p',{cls:'hint',text:'Organizers: invite them to your next market.'})]));
    }else{
      var byId={};(D.events||[]).forEach(function(e){byId[e.id]=e;});
      var evs=(p.event_ids||[]).map(function(x){return byId[x];}).filter(function(e){return e&&['past','cancelled','removed'].indexOf(e.verify_status)<0;}).map(function(e){var d=(e.dates||[]).filter(function(x){return x>=today;})[0]||null;return {e:e,d:d};}).filter(function(r){return r.d||(!r.e.dates.length&&r.e.schedule);}).sort(function(a,b){return (a.d||'9')<(b.d||'9')?-1:1;});
      var list=evs.length?el('div',{cls:'pevs'},evs.map(function(r){var dt=r.d?pd(r.d):null;return el('a',{cls:'pev',href:'index.html#e='+encodeURIComponent(r.e.id)},[dt?el('span',{cls:'dt','aria-hidden':'true'},[el('span',{cls:'m',text:MO[dt.getMonth()].toUpperCase()}),el('span',{cls:'d',text:String(dt.getDate())}),el('span',{cls:'w',text:WD[dt.getDay()]})]):el('span',{cls:'dt rec','aria-hidden':'true'},[el('span',{cls:'m',text:'ONGOING'})]),el('span',{cls:'cb'},[el('span',{cls:'ct',text:r.e.name}),el('span',{cls:'meta',text:[r.e.city,r.e.county+' County'].filter(Boolean).join(', ')+(r.d?' · '+WD[dt.getDay()]+', '+MO[dt.getMonth()]+' '+dt.getDate():'')})]),ico('right','chev')]);})):el('p',{cls:'hint',text:'No upcoming events listed yet.'});
      body.appendChild(sec('Upcoming events','cal',[list].concat(p.sample?[el('p',{cls:'hint',text:'Sample: these are real listings, shown only to demonstrate the layout.'})]:[])));
      var w=[];if((p.wants_categories||[]).length)w.push(el('div',{cls:'ptags'},p.wants_categories.map(function(c){return el('span',{cls:'b',text:c});})));
      if(w.length)body.appendChild(sec('Vendors wanted','user',w));
      var ap=[el('p',{text:AL[p.apply_method]||'Contact the organizer'}),p.apply_note?el('p',{cls:'hint',text:p.apply_note}):null];var au=LG.socialUrl('website',p.apply_url);if(au&&!p.sample)ap.push(el('a',{cls:'btn',href:au,target:'_blank',rel:'noopener noreferrer'},['Apply to vend ',ico('ext','sm')]));
      body.appendChild(sec('How to apply','send',ap));
    }
    if(!p.sample&&LG.featuredNow(p,today)===false&&p.type==='vendor')body.appendChild(el('a',{cls:'feat fv slim',href:'pricing.html?tier=featured-vendor#get-featured','data-buy':'featured-vendor'},[el('span',{cls:'ft'},[ico('star','sm'),' Is this your business?']),el('p',{text:'Feature it at the top of the directory for a week, $10.'}),el('span',{cls:'go'},[ico('arrow')])]));
  }
})();
