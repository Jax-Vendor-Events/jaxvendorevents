/* Jax Vendor Events: "Pay booth fee" buttons from the organizer's own payout handles (Nov 6 2026).
   The organizer saves PayPal / Venmo / Cash App / Zelle / a pasted Stripe-Square-PayPal link once in Account → Payments
   (table organizer_pay, RLS: only that organizer reads or writes their row; writes go through organizer_pay_set).
   Vendors get the buttons through listing_pay_options(eid), which follows the listing paywall: only full listings
   (Vendor Pro / admin) or the organizer's own. Zelle is shown only after a tap (listing_pay_zelle, logged).
   Money goes straight to the organizer. Jax Vendor Events takes no cut and never holds it. */
(function(){
  'use strict';
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function amt(c){if(!c||c<100)return '';var v=c/100;return v%1?v.toFixed(2):String(v);}
  function feeCents(e,o){if(o&&o.amount_cents)return o.amount_cents;var f=e&&e.fee;if(typeof f==='number')return Math.round(f*100);
    var m=String(f||'').trim().match(/^\$?\s*(\d{1,5}(?:\.\d{1,2})?)\s*(?:\/?\s*(?:booth|space|day|event|fee))?$/i);return m?Math.round(parseFloat(m[1])*100):0;}
  function okLink(u){try{var x=new URL(u);return x.protocol==='https:'&&/^(buy\.stripe\.com|checkout\.stripe\.com|donate\.stripe\.com|square\.link|checkout\.square\.site|(www\.)?paypal\.com|(www\.)?paypal\.me)$/i.test(x.hostname);}catch(_){return false;}}
  /* o = {paypal, venmo, cashapp, zelle(bool|string), pay_link}; cents = booth fee or 0 */
  function links(o,cents){
    var a=amt(cents),out=[],note=encodeURIComponent('Booth fee');
    if(o.paypal){var em=o.paypal.indexOf('@')>0;
      out.push({k:'paypal',label:'Pay booth fee with PayPal',href:em?'https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business='+encodeURIComponent(o.paypal)+'&item_name='+note+'&currency_code=USD'+(a?'&amount='+a:'')
        :'https://paypal.me/'+encodeURIComponent(o.paypal)+(a?'/'+a+'USD':'')});}
    if(o.venmo)out.push({k:'venmo',label:'Pay with Venmo',sub:'@'+o.venmo,href:'https://venmo.com/'+encodeURIComponent(o.venmo)+'?txn=pay&note='+note+(a?'&amount='+a:'')});
    if(o.cashapp)out.push({k:'cashapp',label:'Pay with Cash App',sub:'$'+o.cashapp,href:'https://cash.app/$'+encodeURIComponent(o.cashapp)+(a?'/'+a:'')});
    if(o.pay_link&&okLink(o.pay_link)){var h=new URL(o.pay_link).hostname.replace(/^www\./,''),n=/stripe/.test(h)?'Stripe':/square/.test(h)?'Square':'PayPal';
      out.push({k:'link',label:'Pay with card ('+n+')',sub:h,href:o.pay_link});}
    if(o.zelle)out.push({k:'zelle',label:'Pay with Zelle',sub:typeof o.zelle==='string'?o.zelle:'',zelle:true});
    return out;
  }
  function html(o,cents,opt){
    opt=opt||{};var L=links(o,cents);if(!L.length)return '';var a=amt(cents);
    var h='<div class="payopts"><p class="po-h"><b>Pay the booth fee'+(a?' · $'+esc(a):'')+'</b><small>Goes straight to the organizer. Jax Vendor Events takes no cut and never holds your money.</small></p><div class="po-btns">';
    L.forEach(function(x){
      if(x.zelle){h+='<div class="po-z"><button type="button" class="btn ghost po-b" data-zelle'+(opt.preview?' data-preview="'+esc(x.sub||'')+'"':'')+'>Pay with Zelle <small>tap to show</small></button><span class="po-zv" hidden></span></div>';}
      else h+='<a class="btn'+(x.k==='paypal'?'':' ghost')+' po-b" href="'+esc(x.href)+'" target="_blank" rel="noopener noreferrer nofollow">'+esc(x.label)+(x.sub?' <small>'+esc(x.sub)+'</small>':'')+'</a>';
    });
    h+='</div><small class="po-f">Check the name on the payment page before you pay.'+(a?'':' Enter the amount the organizer asked for.')+'</small></div>';
    return h;
  }
  function wireZelle(root,eid,A){
    var b=root.querySelector('[data-zelle]');if(!b)return;
    b.onclick=function(){var v=root.querySelector('.po-zv');
      function show(z){if(!z){v.textContent='The organizer hasn’t shared Zelle details.';v.hidden=false;return;}
        v.innerHTML='Send with Zelle to <b>'+esc(/^\d{10}$/.test(z)?'('+z.slice(0,3)+') '+z.slice(3,6)+'-'+z.slice(6):z)+'</b> <button type="button" class="linkbtn" data-zcopy>Copy</button>';v.hidden=false;b.hidden=true;
        var c=v.querySelector('[data-zcopy]');if(c)c.onclick=function(){try{navigator.clipboard.writeText(z);c.textContent='Copied';}catch(_){}};}
      if(b.hasAttribute('data-preview'))return show(b.getAttribute('data-preview'));
      b.disabled=true;A.sb.rpc('listing_pay_zelle',{eid:eid}).then(function(r){b.disabled=false;show(r&&r.data);},function(){b.disabled=false;});};
  }
  var cache={};
  function sheet(e){
    var A=window.JVE_AUTH,body=document.getElementById('shBody');if(!body||!e)return;
    var old=body.querySelectorAll('.payopts-w');for(var i=0;i<old.length;i++)old[i].remove();
    if(e.locked||!A||!A.user||!A.sb)return;
    var id=e.id;
    var go=function(o){if(!o)return;var cur=document.getElementById('shBody');if(!cur||cur.querySelector('.payopts-w'))return;
      if(window.JVE_PAY._cur!==id)return;var h=html(o,feeCents(e,o));if(!h)return;
      var w=document.createElement('div');w.className='payopts-w';w.innerHTML=h;var trk=cur.querySelector('.trk');
      if(trk&&trk.nextSibling)cur.insertBefore(w,trk.nextSibling);else if(trk)cur.appendChild(w);else cur.insertBefore(w,cur.firstChild);wireZelle(w,id,A);};
    window.JVE_PAY._cur=id;
    if(id in cache)return go(cache[id]);
    A.sb.rpc('listing_pay_options',{eid:id}).then(function(r){cache[id]=(r&&!r.error&&r.data)||null;go(cache[id]);},function(){});
  }
  window.JVE_PAY={links:links,html:html,wireZelle:wireZelle,feeCents:feeCents,sheet:sheet,_cur:null};
  /* hook the event sheet without touching app.js/track.js: run after their sheet renderer */
  function hook(){var T=window.JVE_TRK;
    if(T&&T.sheet&&!T.sheet._po){var o=T.sheet;T.sheet=function(e){var r=o.apply(this,arguments);try{sheet(e);}catch(_){}return r;};T.sheet._po=1;}
    else if(!T){var C=window.JVE_CAL;if(C&&C.sheet&&!C.sheet._po){var oc=C.sheet;C.sheet=function(e){var r=oc.apply(this,arguments);try{sheet(e);}catch(_){}return r;};C.sheet._po=1;}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
  if(window.JVE_AUTH&&window.JVE_AUTH.ready)window.JVE_AUTH.ready.then(hook,function(){});
})();
