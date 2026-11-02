/* Jax Vendor Events: paid placements on the site (reads window.JVE_PAID from data/paid.js; written by Tab's fulfillment from Stripe).
   Featured events + Deadline spotlights + Verified organizer (Organizer Plus) + Directory sponsor banner/footer/More slot + Featured vendor + Vendor Pro badge.
   Every entry shows only between its "from" and "until" dates (inclusive, local date), so expired spots hide on their own. */
(function(g){
  'use strict';
  var P=g.JVE_PAID||{};
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  var today=iso(new Date());
  function live(x){return !!x&&(!x.from||x.from<=today)&&(!x.until||x.until>=today);}
  function arr(k){return Array.isArray(P[k])?P[k].filter(live):[];}
  function safeUrl(u){return /^https:\/\/[^\s"'<>]+$/i.test(u||'')?u:null;}
  function safeLogo(u){u=String(u||'');return /^(profiles\/logos|sponsors)\/[a-z0-9._-]+\.(png|jpe?g|webp|svg)$/i.test(u)||/^https:\/\/[^\s"'<>]+\.(png|jpe?g|webp|svg)(\?[^\s"'<>]*)?$/i.test(u)?u:null;}
  var featEv={},spot={},vorg={},fv={},pro={},orgP={};
  arr('featured_events').forEach(function(x){if(x.event_id)featEv[x.event_id]=x;});
  arr('deadline_spotlights').forEach(function(x){if(x.event_id)spot[x.event_id]=x;});
  arr('organizer_plus').forEach(function(x){(x.event_ids||[]).forEach(function(id){vorg[id]=x.name||'Organizer';if(x.spotlight_all!==false&&!spot[id])spot[id]={event_id:id,until:x.until,via:'organizer-plus'};});if(x.profile_id)orgP[x.profile_id]=x;});
  arr('featured_vendors').forEach(function(x){if(x.profile_id&&(!fv[x.profile_id]||x.until>fv[x.profile_id]))fv[x.profile_id]=x.until;});
  arr('vendor_pro').forEach(function(x){if(x.profile_id)pro[x.profile_id]=x.until||true;});
  var sp=arr('directory_sponsor').sort(function(a,b){return (a.from||'')<(b.from||'')?-1:1;})[0]||null;
  if(sp&&!sp.name)sp=null;
  var api={
    today:today,
    featured:function(id){return !!featEv[id];},
    spotlight:function(id){return !!spot[id];},
    verifiedOrg:function(id){return vorg[id]||null;},
    pro:function(pid){return !!pro[pid];},
    sponsor:function(){return sp;},
    /* merge into the approved profiles list before the directory draws it */
    profiles:function(list){(list||[]).forEach(function(p){if(!p||!p.id)return;var u=fv[p.id];if(u&&(!p.featured_until||p.featured_until<u))p.featured_until=u;if(pro[p.id])p.pro=true;if(orgP[p.id])p.verified_org=true;});return list;}
  };
  g.JVE_PAIDX=api;
  if(!sp||typeof document==='undefined')return;
  function el(t,cls,kids){var e=document.createElement(t);if(cls)e.className=cls;(kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c);});return e;}
  function link(txt,cls){var u=safeUrl(sp.url);var a=el(u?'a':'span',cls,[txt]);if(u){a.href=u;a.target='_blank';a.rel='sponsored noopener';}return a;}
  function banner(cls){var b=el('aside',cls);b.setAttribute('aria-label','Sponsor');var lg=safeLogo(sp.logo);
    var inner=el(safeUrl(sp.url)?'a':'div','sp-in');if(safeUrl(sp.url)){inner.href=sp.url;inner.target='_blank';inner.rel='sponsored noopener';}
    if(lg){var im=el('img','sp-logo');im.src=lg;im.alt=sp.name+' logo';im.loading='lazy';im.width=44;im.height=44;inner.appendChild(im);}
    else inner.appendChild(el('span','sp-mono',[String(sp.name).trim().charAt(0).toUpperCase()]));
    inner.appendChild(el('span','sp-tx',[el('small','sp-k',['Sponsor']),el('b','sp-n',[sp.name]),sp.line?el('span','sp-l',[sp.line]):null]));
    b.appendChild(inner);return b;}
  function decorate(){
    var L=document.getElementById('list');
    if(L&&!document.getElementById('spBanner')){var b=banner('spons');b.id='spBanner';L.parentNode.insertBefore(b,L);}
    var f=document.querySelector('footer .fb');
    if(f&&!document.querySelector('.fsup')){var p=el('p','fsup',['Supported by ',link(sp.name,'')]);f.parentNode.insertBefore(p,f.nextSibling);}
    var tries=0;(function more(){var s=document.getElementById('moreSheet');if(s){if(!s.querySelector('.spons'))s.appendChild(banner('spons inmore'));return;}if(++tries<40)setTimeout(more,100);})();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate);else decorate();
})(typeof window!=='undefined'?window:globalThis);
