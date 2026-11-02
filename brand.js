/* Jax Vendor Events: branded profiles (shared). Public profile page (profile.html?u=<slug>), directory cards,
   organizer logo on their own approved listings. Everything is drawn with textContent / DOM nodes, never innerHTML,
   image paths are checked against the owner-folder pattern, and links must be http(s) (rel="noopener nofollow"). */
(function(){
  'use strict';
  var CFG=window.JVE_SB||{};
  var BASE=(CFG.url||'https://dvhrkgtozbgeebdlgzuh.supabase.co')+'/storage/v1/object/public/brand/';
  var PATH=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(logo|cover|photo)-[a-z0-9]{6,24}\.(webp|jpg|png)$/;
  function img(p){return PATH.test(p||'')?BASE+p:null;}
  function color(c){return /^#[0-9a-f]{6}$/i.test(c||'')?c.toLowerCase():'#0d6e6e';}
  function rgb(c){c=color(c);return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];}
  function lum(c){var v=rgb(c).map(function(x){x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];}
  function onColor(c){return lum(c)>0.42?'#111418':'#ffffff';}
  function shade(c,f){return '#'+rgb(c).map(function(x){var y=Math.round(f<0?x*(1+f):x+(255-x)*f);return ('0'+Math.max(0,Math.min(255,y)).toString(16)).slice(-2);}).join('');}
  function link(u){u=String(u||'').trim();return /^https?:\/\/[^\s"'<>]+$/i.test(u)?u:null;}
  function el(t,a,kids){var e=document.createElement(t);if(a)Object.keys(a).forEach(function(k){var v=a[k];if(v==null||v===false)return;if(k==='text')e.textContent=v;else if(k==='cls')e.className=v;else if(k==='style')e.setAttribute('style',v);else e.setAttribute(k,v);});
    (kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c);});return e;}
  function ico(n,c){var s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','ico'+(c?' '+c:''));s.setAttribute('aria-hidden','true');var u=document.createElementNS('http://www.w3.org/2000/svg','use');u.setAttribute('href','#i-'+n);s.appendChild(u);return s;}
  function initials(s){var w=String(s||'').replace(/[^A-Za-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase();}
  function sb(){return window.JVE_AUTH&&window.JVE_AUTH.sb;}
  function badges(b){b=b||{};var out=[];
    if(b.featured)out.push(el('span',{cls:'b gold'},[ico('star'),'Featured']));
    if(b.sponsor)out.push(el('span',{cls:'b gold'},[ico('star'),'Sponsor']));
    if(b.pro)out.push(el('span',{cls:'b pro',title:'Vendor Pro member',text:'PRO'}));
    if(b.verified)out.push(el('span',{cls:'b gold'},[ico('shield'),'Verified organizer']));
    return out;}
  function logoEl(p,cls){var u=img(p.logo),c=color(p.color);
    return u?el('img',{src:u,alt:(p.name||'')+' logo',cls:'bl-logo '+(cls||''),loading:'lazy',width:'96',height:'96',style:'--bc:'+c}):
      el('span',{cls:'bl-logo bl-mono '+(cls||''),'aria-hidden':'true',text:initials(p.name),style:'--bc:'+c+';background:'+c+';color:'+onColor(c)});}
  var api={img:img,color:color,onColor:onColor,shade:shade,link:link,badges:badges,logoEl:logoEl,initials:initials,PATH:PATH,BASE:BASE};

  /* directory: listed, not hidden, paid first (the server orders and decides) */
  api.directory=function(){var c=sb();if(!c)return Promise.resolve([]);
    return c.rpc('brand_directory').then(function(r){if(r.error){console.warn('brand directory',r.error.message);return [];}return Array.isArray(r.data)?r.data:[];},function(){return [];});};
  /* a brand as a directory row (same shape the old directory cards use) */
  api.asProfile=function(b,today){var bd=b.badges||{};return {id:'b:'+b.slug,brand:true,slug:b.slug,type:b.kind==='organizer'?'organizer':'vendor',name:b.name,tagline:b.tagline,city:b.city,county:b.region?b.region+' FL':'',
      categories:b.kind==='organizer'?[]:(b.categories||[]),wants_categories:b.kind==='organizer'?(b.categories||[]):[],logo:null,logoUrl:img(b.logo),color:color(b.color),
      pro:!!bd.pro,verified_org:!!bd.verified,sponsor:!!bd.sponsor,featured_until:(bd.featured||bd.sponsor)?today:null,rank:b.rank==null?2:b.rank,href:'profile.html?u='+encodeURIComponent(b.slug)};};

  /* the logged-in member's own brand profile (null if none / logged out). Read path for other pages (e.g. Home):
     resolves {slug,kind,name,tagline,color,bio,categories,what,city,region,links{},logo,cover,photos[],logoUrl,coverUrl,photoUrls[],listed,url} */
  api.mine=function(){var A=window.JVE_AUTH;if(!A||!A.ready)return Promise.resolve(null);
    return A.ready.then(function(){if(!A.user||!A.sb)return null;return A.sb.from('brand_profiles').select('*').eq('user_id',A.user.id).maybeSingle().then(function(r){var d=r&&r.data;if(!d)return null;
      return {slug:d.slug,kind:d.kind,name:d.business_name,tagline:d.tagline,color:color(d.color),bio:d.bio,categories:d.categories||[],what:d.what,city:d.city,region:d.region,
        links:{website:link(d.website),instagram:link(d.instagram),facebook:link(d.facebook),tiktok:link(d.tiktok)},logo:d.logo_path,cover:d.cover_path,photos:d.photos||[],
        logoUrl:img(d.logo_path),coverUrl:img(d.cover_path),photoUrls:(d.photos||[]).map(img).filter(Boolean),listed:d.listed,url:'profile.html?u='+encodeURIComponent(d.slug)};});});};

  /* ---------- public profile page ---------- */
  function lightbox(src,alt){var o=el('div',{cls:'bl-lb',role:'dialog','aria-modal':'true','aria-label':alt||'Photo'},[el('img',{src:src,alt:alt||''}),el('button',{type:'button',cls:'bl-lbx','aria-label':'Close'},[ico('x')])]);
    function close(){o.remove();document.removeEventListener('keydown',key);}function key(e){if(e.key==='Escape')close();}
    o.addEventListener('click',close);document.addEventListener('keydown',key);document.body.appendChild(o);o.querySelector('button').focus();}
  api.renderPage=function(box,slug){
    box.textContent='';box.appendChild(el('p',{cls:'hint',text:'Loading profile…'}));
    var c=sb();if(!c){box.textContent='';box.appendChild(el('p',{cls:'hint',text:'Could not load the profile.'}));return Promise.resolve(null);}
    return c.rpc('brand_public',{s:slug}).then(function(r){
      box.textContent='';var p=r&&!r.error?r.data:null;
      if(!p){document.title='Profile not found — Jax Vendor Events';
        box.appendChild(el('div',{cls:'empty'},[el('div',{cls:'art'},[ico('user','lg')]),el('h1',{cls:'h3',text:'Profile not found'}),el('p',{text:'The link may be old, or the profile is not public right now.'}),el('a',{cls:'btn',href:'profiles.html',text:'Browse vendors & organizers'})]));return null;}
      document.title=p.name+' — Jax Vendor Events';
      var col=color(p.color),on=onColor(col);
      var wrap=el('article',{cls:'bl-page',style:'--bc:'+col+';--bc-on:'+on+';--bc-dk:'+shade(col,-0.35)+';--bc-lt:'+shade(col,0.86)});
      if(p.preview){var pv=el('div',{cls:'bl-prev'},[el('span',{text:p.hidden?'Hidden by the site admin, so only you can see it right now.':(!p.listed?'Only you can see this (not shown in the directory).':'This is your public profile, as everyone sees it.')}),el('a',{cls:'btn sm',href:'account.html#brand',text:'Edit'})]);wrap.appendChild(pv);}
      var cover=img(p.cover);
      var hero=el('header',{cls:'bl-hero'},[el('div',{cls:'bl-cover'+(cover?'':' none')},cover?[el('img',{src:cover,alt:'',loading:'eager'})]:[]),
        el('div',{cls:'bl-id'},[logoEl(p,'xl'),el('div',{cls:'bl-idt'},[el('span',{cls:'bl-kind',text:p.kind==='organizer'?'Organizer':'Vendor'}),el('h1',{text:p.name}),
          el('div',{cls:'ptags'},badges(p.badges))])]),
        p.tagline?el('p',{cls:'bl-tag',text:p.tagline}):null,
        (p.city||p.region)?el('p',{cls:'bl-where'},[ico('pin','sm'),[p.city,p.region?p.region+' Florida':''].filter(Boolean).join(' · ')]):null]);
      wrap.appendChild(hero);
      var L=p.links||{},btns=[];
      [['website','Website','ext'],['instagram','Instagram','share'],['facebook','Facebook','share'],['tiktok','TikTok','share']].forEach(function(k){var u=link(L[k[0]]);if(u)btns.push(el('a',{cls:'bl-btn',href:u,target:'_blank',rel:'noopener nofollow noreferrer'},[ico(k[2],'sm'),k[1]]));});
      var C=p.contact||{};
      if(C.email&&/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(C.email))btns.push(el('a',{cls:'bl-btn ghost',href:'mailto:'+C.email},[ico('mail','sm'),'Email']));
      if(C.phone&&/^[0-9 +().-]{7,20}$/.test(C.phone))btns.push(el('a',{cls:'bl-btn ghost',href:'tel:'+C.phone.replace(/[^0-9+]/g,'')},[ico('send','sm'),'Call']));
      if(btns.length)wrap.appendChild(el('nav',{cls:'bl-btns','aria-label':'Links'},btns));
      function sec(t,kids){return el('section',{cls:'bl-sec'},[el('h2',{text:t})].concat(kids));}
      if(p.bio)wrap.appendChild(sec('About',[el('p',{cls:'bl-bio',text:p.bio})]));
      var cats=(p.categories||[]),k=[];
      if(cats.length)k.push(el('div',{cls:'bl-chips'},cats.map(function(x){return el('span',{text:x});})));
      if(p.what)k.push(el('p',{text:p.what}));
      if(k.length)wrap.appendChild(sec(p.kind==='organizer'?'Events we run':'What we sell',k));
      var ph=(p.photos||[]).map(img).filter(Boolean);
      if(ph.length)wrap.appendChild(sec(p.kind==='organizer'?'Photos':'Products & booth',[el('div',{cls:'bl-photos'},ph.map(function(u,i){var b=el('button',{type:'button',cls:'bl-ph','aria-label':'Open photo '+(i+1)},[el('img',{src:u,alt:p.name+' photo '+(i+1),loading:'lazy'})]);b.addEventListener('click',function(){lightbox(u,p.name+' photo '+(i+1));});return b;}))]));
      var share=el('button',{type:'button',cls:'bl-btn ghost wide'},[ico('share','sm'),'Share this profile']);
      share.addEventListener('click',function(){var u=location.origin+location.pathname+'?u='+encodeURIComponent(p.slug);
        if(navigator.share)navigator.share({title:p.name,url:u}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){share.lastChild.textContent='Link copied';});});
      wrap.appendChild(share);
      if(!p.preview)wrap.appendChild(el('a',{cls:'feat fv slim bl-cta',href:'account.html#brand'},[el('span',{cls:'ft'},[ico('user','sm'),' Vendor or organizer?']),el('p',{text:'Brand your own free profile: logo, colors, photos and links.'}),el('span',{cls:'go'},[ico('arrow')])]));
      box.appendChild(wrap);return p;
    },function(){box.textContent='';box.appendChild(el('p',{cls:'hint',text:'Could not load the profile. Check your connection.'}));return null;});
  };

  /* ---------- organizers' logo on their own approved listings (event sheet on index.html) ---------- */
  function sheetBrand(){
    if(!document.querySelector('link[href^="brand.css"]')&&!document.getElementById('blOrgCss')){var st=document.createElement('style');st.id='blOrgCss';
      st.textContent='.bl-org{display:flex;align-items:center;gap:12px;padding:10px 12px;margin:0 0 12px;border-radius:14px;background:var(--surf);box-shadow:inset 0 0 0 1.5px var(--bc);color:var(--ink);text-decoration:none}.bl-org img{width:40px;height:40px;border-radius:11px;object-fit:cover;flex:none}.bl-org span{display:flex;flex-direction:column;flex:1;min-width:0}.bl-org small{color:var(--mut);font-size:12px}.bl-org b{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
      document.head.appendChild(st);}
    var title=document.getElementById('shTitle'),body=document.getElementById('shBody');if(!title||!body)return;
    var D=window.JVE_DATA||{},by={};(D.events||[]).forEach(function(e){if(e&&e.org_brand&&e.name&&!e.locked)by[e.name]=e.org_brand;});
    if(!Object.keys(by).length)return;
    function paint(){var ob=by[title.textContent];var old=body.querySelector('.bl-org');if(!ob){if(old)old.remove();return;}if(old)return;
      var u=img(ob.logo);if(!u)return;var c=color(ob.color);
      var a=el('a',{cls:'bl-org',href:'profile.html?u='+encodeURIComponent(ob.slug||''),style:'--bc:'+c},[el('img',{src:u,alt:'',width:'40',height:'40'}),el('span',{},[el('small',{text:'Organized by'}),el('b',{text:ob.name||'Organizer'})]),ico('right','sm')]);
      body.insertBefore(a,body.firstChild);}
    new MutationObserver(paint).observe(body,{childList:true});paint();
  }
  if(document.getElementById('shBody'))sheetBrand();
  window.JVE_BRAND=api;
})();
