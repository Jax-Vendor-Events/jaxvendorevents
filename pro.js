/* Jax Vendor Events: the Pro tab (pro.html, Nov 2026).
   Free / logged-out: Vendor Pro upgrade page. Live numbers come from the listings this visitor already gets from get_site()
   (teasers for free/anon: no names, venues, organizers or links, and nothing here asks for more). The "free" preview card is
   a real teaser; the "Pro" card is a made-up sample. Checkout uses auth.js (data-unlock / data-buy -> Stripe Payment Link
   with client_reference_id + prefilled_email for a logged-in member; logged-out visitors go to sign up first).
   Vendor Pro members and admins get "Your Pro" instead: status, what's active, reminders toggle, quick links. No upsell. */
(function(){
  'use strict';
  var html=document.documentElement;
  function $(id){return document.getElementById(id);}
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function pd(s){var p=String(s).split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  var today=iso(new Date()),in30=(function(){var d=new Date();d.setDate(d.getDate()+30);return iso(d);})();
  var CAMPUS_RE=/\b(college|university|campus|student union|UNF|FSCJ|UF|FSU|UCF|USF|FIU|FAU|FGCU|FAMU|UWF)\b/i;
  function isCampus(e){return e.campus===true||/campus/i.test(String(e.category||e.type||''))||(e.types||[]).indexOf('campus')>-1||CAMPUS_RE.test([e.name,e.venue,e.organizer,e.host_agency].join(' '));}
  function live(e){return e&&e.verify_status!=='removed'&&e.verify_status!=='past';}
  function next(e){var ds=(e.dates||[]).filter(function(d){return d>=today;}).sort();if(ds.length)return ds[0];if(e.end_date&&e.end_date>=today)return today;return null;}
  function stats(){
    var L=((window.JVE_DATA&&window.JVE_DATA.events)||[]).filter(live);
    var up=L.filter(function(e){return !!next(e);});
    return {list:up,markets:up.length,deadlines:L.filter(function(e){return e.deadline&&e.deadline>=today&&e.deadline<=in30;}).length,campus:up.filter(isCampus).length};
  }
  function countUp(el,n){
    if(!el)return;var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce||!n||n<4){el.textContent=String(n);return;}
    var t0=null,dur=700;function step(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/dur);el.textContent=String(Math.round(n*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);
  }
  function fillStats(S){
    Array.prototype.forEach.call(document.querySelectorAll('[data-stat]'),function(b){countUp(b,S[b.getAttribute('data-stat')]||0);});
  }
  /* the free card: one real teaser (type + town + date only; teasers carry no name, venue or links) */
  function teaser(S){
    var c=S.list.filter(function(e){return e.locked;}).sort(function(a,b){return (next(a)<next(b)?-1:1);});
    var e=c.filter(function(x){return x.deadline&&x.deadline>=today;})[0]||c[0];
    if(!e)return;
    var d=pd(next(e)),dt=$('tzDate');
    dt.querySelector('small').textContent=MO[d.getMonth()];dt.querySelector('b').textContent=String(d.getDate());
    $('tzName').textContent=String(e.name||'Vendor market').slice(0,60);
    $('tzMeta').textContent=[e.county?e.county+' County':'',e.schedule&&e.schedule.length<28?e.schedule:''].filter(Boolean).join(' \u00b7 ')||'Florida';
  }
  /* preview toggle */
  function seg(){
    var pair=$('prPair');if(!pair)return;var bs=document.querySelectorAll('.prseg [data-show]');
    function set(v){pair.setAttribute('data-show',v);Array.prototype.forEach.call(bs,function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-show')===v));});}
    Array.prototype.forEach.call(bs,function(b){b.addEventListener('click',function(){set(b.getAttribute('data-show'));});});
    set('pro');
  }
  /* sticky CTA: shows once the hero's button has scrolled away, hides near the bottom CTA */
  function sticky(){
    var s=$('prSticky'),h=$('heroCta'),end=$('prEnd');if(!s||!h||!('IntersectionObserver' in window))return;
    var heroGone=false,endIn=false;
    function upd(){var on=heroGone&&!endIn;s.classList.toggle('on',on);s.setAttribute('aria-hidden',String(!on));var a=s.querySelector('a');if(a)a.tabIndex=on?0:-1;}
    new IntersectionObserver(function(es){es.forEach(function(x){heroGone=!x.isIntersecting&&x.boundingClientRect.top<0;});upd();}).observe(h);
    if(end)new IntersectionObserver(function(es){es.forEach(function(x){endIn=x.isIntersecting;});upd();}).observe(end);
  }
  function savedCount(){var sv=[];try{sv=JSON.parse(localStorage.getItem('jve_saved')||'[]');}catch(_){}return Array.isArray(sv)?sv.length:Object.keys(sv||{}).length;}
  function fmt(d){var x=pd(d);return MO[x.getMonth()]+' '+x.getDate()+', '+x.getFullYear();}

  function mine(A){
    $('getPro').hidden=true;$('yourPro').hidden=false;
    document.title='Your Pro \u2014 Jax Vendor Events';
    var S=stats();fillStats(S);$('mineSaved').textContent=String(savedCount());
    if(A.admin){$('qkAdmin').hidden=false;$('qkDir').hidden=true;}
    var sb=A.sb,u=A.user;
    sb.from('memberships').select('tier,status,until,starts_on,stripe_subscription_id').eq('tier','vendor-pro').order('created_at',{ascending:false}).then(function(r){
      var m=(r.data||[]).filter(function(x){return x.status==='active'&&(!x.until||x.until>=today)&&(!x.starts_on||x.starts_on<=today);})[0];
      if(m){$('mineState').textContent=m.until?'Active until '+fmt(m.until):(m.stripe_subscription_id?'Active \u00b7 renews monthly':'Active');}
      else if(A.admin){$('minePlan').textContent='Admin';$('mineState').textContent='Full access';$('mineLine').textContent='You see every name, venue, organizer contact and apply link as an admin.';}
    }).catch(function(){});
    var p=A.profile||{},prefs=(p.prefs&&typeof p.prefs==='object')?p.prefs:{},rm=$('remT'),msg=$('remMsg');
    rm.checked=prefs.reminders!==false;$('remS').textContent=rm.checked?'On: email before applications close':'Off';
    rm.addEventListener('change',function(){prefs.reminders=rm.checked;rm.disabled=true;
      sb.from('profiles').update({prefs:prefs}).eq('id',u.id).then(function(r){rm.disabled=false;
        if(r.error){rm.checked=!rm.checked;prefs.reminders=rm.checked;msg.textContent='Could not save. Try again.';return;}
        $('remS').textContent=rm.checked?'On: email before applications close':'Off';msg.textContent=rm.checked?'Deadline reminders on.':'Deadline reminders off.';});});
    if(window.JVE_BRAND&&window.JVE_BRAND.mine){window.JVE_BRAND.mine().then(function(b){
      if(b&&b.url&&/^profile\.html\?u=[A-Za-z0-9_-]+$/.test(b.url)){$('qkBrand').href=b.url;$('qkBrand').querySelector('small').textContent='View your public page';$('badgeS').textContent='Showing on '+String(b.name||'your profile').slice(0,40);}
    }).catch(function(){});}
  }
  function free(A){
    var S=stats();fillStats(S);teaser(S);seg();sticky();
    var role=A&&A.profile&&A.profile.account_type;
    if(A&&A.user&&(role==='organizer'||role==='business')){$('prOrg').hidden=false;$('prOrgLink').hidden=true;}
  }
  var done=false;
  function go(A){if(done)return;done=true;
    var pro=!!(A&&A.user&&(A.admin||(A.has&&A.has('vendor-pro'))));
    try{if(pro){mine(A);var role=A.profile&&A.profile.account_type;if(!A.admin&&(role==='organizer'||role==='business')){var o=$('prOrg');o.hidden=false;$('yourPro').appendChild(o);}}else free(A);}
    catch(err){console.warn('pro:',err&&err.message);}
    html.classList.remove('pro-wait');
  }
  var A=window.JVE_AUTH;
  if(A&&A.ready)A.ready.then(go);
  setTimeout(function(){go(window.JVE_AUTH&&window.JVE_AUTH.user!==undefined?window.JVE_AUTH:null);},9000);
})();
