/* Jax Vendor Events: buy buttons. Every [data-buy="<tier id>"] link reads data/checkout.json.
   A tier with an https checkout URL (a Stripe Payment Link) opens it in a new tab.
   A tier with an empty URL opens the "Book your spot" request form (pricing.html#get-featured) with that tier picked,
   so no button is ever dead. Paste links into data/checkout.json; nothing else needs to change. */
(function(){
  'use strict';
  var T={
    'featured-event':['Featured event','$20/week'],
    'deadline-spotlight':['Deadline spotlight','$10'],
    'organizer-plus':['Organizer Plus','$29/month'],
    'newsletter-sponsor':['Newsletter sponsor','$35/issue'],
    'directory-sponsor':['Directory sponsor','$75/month'],
    'featured-vendor':['Featured vendor','$10/week'],
    'vendor-pro':['Vendor Pro','$5/month'],
    'not-sure':['Not sure yet','']
  };
  var map=null,waiting=[];
  function url(id){var u=map&&map[id];return (typeof u==='string'&&/^https:\/\/\S+$/.test(u.trim()))?u.trim():'';}
  function q(k){var m=new RegExp('[?&]'+k+'=([^&#]*)').exec(location.search);return m?decodeURIComponent(m[1]):'';}
  function each(sel,fn){Array.prototype.forEach.call(document.querySelectorAll(sel),fn);}
  function mark(){
    each('[data-buy]',function(a){var id=a.getAttribute('data-buy'),u=url(id);
      if(u){a.setAttribute('href',u);a.setAttribute('target','_blank');a.setAttribute('rel','noopener');a.classList.add('live');}
      else{a.setAttribute('href','pricing.html?tier='+encodeURIComponent(id)+(a.getAttribute('data-offer')?'&offer='+a.getAttribute('data-offer'):'')+'#get-featured');a.removeAttribute('target');a.classList.remove('live');}});
    each('[data-buynote]',function(n){var u=url(n.getAttribute('data-buynote')),s=n.querySelector('span');
      if(s)s.textContent=u?'Secure card checkout · opens in a new tab':'Pick your dates, we email a secure payment link';n.classList.toggle('live',!!u);});
    document.documentElement.classList.add('ck-ready');
  }
  function load(){
    return fetch('data/checkout.json?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():{};}).catch(function(){return {};})
      .then(function(j){map=(j&&typeof j==='object')?j:{};mark();var w=waiting;waiting=[];w.forEach(function(f){f();});});
  }
  /* ---- request form (pricing.html only) ---- */
  var form=document.getElementById('reqForm');
  function pick(id,offer,scroll){
    if(!form)return false;
    if(!T[id])id='not-sure';
    var sel=document.getElementById('gWhat'),hid=document.getElementById('gTier');
    if(sel){for(var i=0;i<sel.options.length;i++)if(sel.options[i].getAttribute('data-tier')===id){sel.selectedIndex=i;break;}} if(hid)hid.value=id;
    var t=T[id],p=document.getElementById('picked');
    if(p){p.hidden=(id==='not-sure');document.getElementById('pickedName').textContent=t[0];document.getElementById('pickedPrice').textContent=t[1]?'· '+t[1]:'';}
    var tt=document.getElementById('reqTitle');if(tt)tt.textContent=id==='not-sure'?'Book your spot':'Book: '+t[0];
    form.setAttribute('data-fs','Get featured request: Jax Vendor Events'+(id==='not-sure'?'':' ('+t[0]+')'));
    if(offer){var o=document.getElementById('gOffer');if(o)o.checked=true;}
    if(scroll){var panel=document.getElementById('reqPanel')||form;
      panel.classList.remove('flash');void panel.offsetWidth;panel.classList.add('flash');
      panel.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(function(){var f=form.querySelector('input:not([type=hidden]):not([type=checkbox]):not([tabindex="-1"])');
        for(var i=0,els=form.querySelectorAll('input[required]');i<els.length;i++){if(!els[i].value){f=els[i];break;}}
        if(f)try{f.focus({preventScroll:true});}catch(_){f.focus();}},450);}
    return true;
  }
  function grpOf(id){var c=document.getElementById('t-'+id);var g=c&&c.closest('[data-grp]');return g?g.getAttribute('data-grp'):'';}
  /* ---- clicks: live link opens Stripe (native <a target=_blank>), empty link opens the form ---- */
  document.addEventListener('click',function(e){
    var rq=e.target.closest&&e.target.closest('[data-req]');
    if(rq&&form){e.preventDefault();pick(rq.getAttribute('data-req'),rq.getAttribute('data-offer')==='launch',true);return;} /* offers that need a reply first always use the request form */
    if(rq)return;
    var a=e.target.closest&&e.target.closest('[data-buy]');if(!a)return;
    var id=a.getAttribute('data-buy');
    if(map&&url(id)){if(a.getAttribute('href')!==url(id)){e.preventDefault();window.open(url(id),'_blank','noopener');}return;} /* real checkout link opens in a new tab */
    if(!map){e.preventDefault();waiting.push(function(){var u=url(id);if(u)location.href=u;else if(!pick(id,a.getAttribute('data-offer')==='launch',true))location.href=a.getAttribute('href');});return;}
    if(form){e.preventDefault();pick(id,a.getAttribute('data-offer')==='launch',true);try{history.replaceState(null,'','?tier='+encodeURIComponent(id)+'#get-featured');}catch(_){}}
  });
  /* ---- audience switcher on pricing.html: show one group at a time ---- */
  var tabs=document.querySelectorAll('.aud [data-aud]');
  function show(g){
    if(!tabs.length||!g)return;
    each('[data-grp]',function(x){x.hidden=x.getAttribute('data-grp')!==g;});
    each('.aud [data-aud]',function(x){var on=x.getAttribute('data-aud')===g;x.setAttribute('aria-selected',String(on));x.classList.toggle('on',on);});
  }
  if(tabs.length){
    document.documentElement.classList.add('aud-on');
    each('.aud [data-aud]',function(x){x.addEventListener('click',function(e){e.preventDefault();var g=x.getAttribute('data-aud');show(g);try{history.replaceState(null,'','#'+g);}catch(_){}});});
    var h=(location.hash||'').slice(1),fromTier=q('tier')&&grpOf(q('tier'));
    show(fromTier||(['organizers','businesses','vendors'].indexOf(h)>=0?h:'organizers'));
    if(['organizers','businesses','vendors'].indexOf(h)>=0){var el=document.querySelector('.aud');if(el)setTimeout(function(){el.scrollIntoView({block:'start'});},50);}
  }
  if(form){
    var sel=document.getElementById('gWhat');
    if(sel)sel.addEventListener('change',function(){var o=sel.options[sel.selectedIndex];pick(o?o.getAttribute('data-tier'):'not-sure',false,false);});
    var t0=q('tier');pick(t0||'not-sure',q('offer')==='launch',!!t0);
    var ev=q('event'),org=document.getElementById('gOrg');if(ev&&org&&!org.value)org.value=ev.replace(/\+/g,' ');
    if(t0&&T[t0])show(grpOf(t0));
  }
  load();
})();
