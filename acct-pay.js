/* Jax Vendor Events: Account → Payments (Nov 6 2026). Organizers choose how vendors pay their booth fee:
   PayPal (PayPal.me name or business email), Venmo, Cash App, Zelle, or a pasted Stripe / Square / PayPal payment link
   (table organizer_pay via organizer_pay_set; buttons on listings via payopts.js), plus optional Connect Square (OAuth,
   Edge Functions square-oauth-start / -finish / square-disconnect; the round trip is bound to this account AND this browser).
   Money goes straight to the organizer: Jax Vendor Events takes no cut and never holds it.
   A "Log in with PayPal" connect needs PayPal partner approval, so PayPal works through the organizer's own handle/link. */
(function(){
  'use strict';
  var A=window.JVE_AUTH;if(!A||!A.ready)return;
  var C=window.JVE_SB||{},NK='jve_sq_nonce',P=function(){return window.JVE_PAY;};
  var $=function(id){return document.getElementById(id);};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function msg(t,k,id){var m=$(id||'pyMsg');if(!m)return;m.textContent=t||'';m.className='amsg'+(t?' show '+(k||'info'):'');}
  function call(name,body,ms){
    var ctl=window.AbortController?new AbortController():null,tm=ctl?setTimeout(function(){ctl.abort();},ms||15000):0;
    return A.sb.auth.getSession().then(function(s){
      var tok=s&&s.data&&s.data.session&&s.data.session.access_token;if(!tok)throw new Error('Sign in first.');
      return fetch(C.url+'/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json',apikey:C.key,Authorization:'Bearer '+tok},body:JSON.stringify(body||{}),cache:'no-store',signal:ctl?ctl.signal:undefined});
    }).then(function(r){clearTimeout(tm);return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.message||'Something went wrong. Try again.');return j;});},
      function(e){clearTimeout(tm);throw (e&&e.name==='AbortError')?new Error('timeout'):e;});
  }
  function nonce(){var a=new Uint8Array(32);crypto.getRandomValues(a);var s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  var SQFAIL='Square didn’t open. You can try again, or paste a Square payment link in the box above (Square → Online checkout → Payment links) and vendors pay with that.';
  var ERR={denied:'You cancelled on Square, so nothing was connected.',state:'That Square link expired or was already used. Tap Connect Square again.',expired:'That took too long. Tap Connect Square again.',
    location:'Your Square account has no active location to take payments. Add one in Square, then connect again, or paste a Square payment link above.',currency:'Booth fees here are in US dollars, and that Square account isn’t a US one.',
    square:SQFAIL,server:SQFAIL};
  var conn=null,mine={};
  var F=[['paypal','PayPal','PayPal.me name or PayPal business email','e.g. JaxMarkets or you@business.com','email'],
         ['venmo','Venmo','Your Venmo @username','@yourname','text'],
         ['cashapp','Cash App','Your $cashtag','$yourname','text'],
         ['zelle','Zelle','Email or US phone your Zelle uses. Vendors see it only after they tap “show”.','you@business.com or 904-555-0100','text'],
         ['pay_link','Payment link (card)','Paste your own Stripe, Square or PayPal checkout link (https)','https://buy.stripe.com/… or https://square.link/…','url']];
  function shown(k,v){if(!v)return '';if(k==='venmo')return '@'+v;if(k==='cashapp')return '$'+v;if(k==='zelle'&&/^\d{10}$/.test(v))return v.slice(0,3)+'-'+v.slice(3,6)+'-'+v.slice(6);return v;}
  function render(){
    var b=$('pyBox');if(!b)return;var h='<form id="pyForm" class="pyform" novalidate>';
    F.forEach(function(f){h+='<label class="pyf"><span><b>'+f[1]+'</b><small>'+esc(f[2])+'</small></span><input name="'+f[0]+'" type="'+(f[4]==='url'?'url':'text')+'" inputmode="'+(f[4]==='email'?'email':f[4]==='url'?'url':'text')+'" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="500" placeholder="'+esc(f[3])+'" value="'+esc(shown(f[0],mine[f[0]]))+'"></label>';});
    h+='<div class="btnrow"><button type="submit" class="btn sm" id="pySave">Save payment options</button></div><div class="amsg" id="pyFMsg" role="status"></div></form>';
    h+='<div id="pyPrev"></div>';
    h+='<h4 class="pyh">Card payments with Square <small>(optional)</small></h4>';
    if(conn){
      h+='<p class="pyok"><span class="pydot" aria-hidden="true"></span>Connected: <b>'+esc(conn.merchant_name||'Square')+'</b>'+(conn.sandbox?' <span class="tierpill">TEST MODE</span>':'')+' · <button type="button" class="linkbtn" id="pyDis">Disconnect</button></p>'+
         '<p class="hint" style="margin-top:0">Turn on “Charge booth fees through Square” in your listing’s organizer box. Vendors pay on Square’s own checkout page and the money lands in your Square account.</p>';
    }else{
      h+='<div class="btnrow" style="margin-top:0"><button type="button" class="btn sm ghost" id="pySq">Connect Square</button></div><p class="hint" style="margin-top:.4rem">No Square account to connect? The payment-link box above works with any Square, Stripe or PayPal link.</p>';
    }
    b.innerHTML=h;
    var s=$('pySq');if(s)s.onclick=connect;
    var d=$('pyDis');if(d)d.onclick=disconnect;
    $('pyForm').onsubmit=save;preview();
  }
  function preview(){var p=$('pyPrev'),J=P();if(!p||!J)return;var h=J.html(mine,0,{preview:true});
    p.innerHTML=h?'<p class="hint pyph">How vendors see it on your listings:</p>'+h:'';if(h)J.wireZelle(p,'',A);}
  function save(ev){
    ev.preventDefault();var f=$('pyForm'),o={};F.forEach(function(x){o[x[0]]=(f.elements[x[0]].value||'').trim();});
    if(o.pay_link&&!/^https:\/\//i.test(o.pay_link)){msg('Payment link: it has to start with https://','err','pyFMsg');return;}
    var bt=$('pySave');bt.disabled=true;bt.textContent='Saving…';msg('','info','pyFMsg');
    A.sb.rpc('organizer_pay_set',{p:o}).then(function(r){bt.disabled=false;bt.textContent='Save payment options';
      if(r.error){msg(r.error.message||'Couldn’t save. Try again.','err','pyFMsg');return;}
      mine=r.data||{};var any=F.some(function(x){return mine[x[0]];});
      F.forEach(function(x){f.elements[x[0]].value=shown(x[0],mine[x[0]]);});preview();
      msg(any?'Saved ✓ Vendors with full access now see these pay buttons on your listings.':'Saved. No payment options on your listings.','ok','pyFMsg');
    },function(){bt.disabled=false;bt.textContent='Save payment options';msg('Couldn’t reach the server. Try again.','err','pyFMsg');});
  }
  function load(){
    var a=A.sb.rpc('my_payment_connections').then(function(r){var x=(r&&r.data)||[];conn=null;for(var i=0;i<x.length;i++)if(x[i].provider==='square'&&x[i].status==='active')conn=x[i];},function(){});
    var b=A.sb.from('organizer_pay').select('paypal,venmo,cashapp,zelle,pay_link').eq('user_id',A.user.id).maybeSingle().then(function(r){mine=(r&&r.data)||{};},function(){});
    return Promise.all([a,b]).then(render,render);
  }
  function resetSq(){var s=$('pySq');if(s){s.disabled=false;s.textContent='Connect Square';}}
  function connect(){
    var n=nonce();try{localStorage.setItem(NK,JSON.stringify({n:n,t:Date.now()}));}catch(_){msg('Your browser blocked storage, so Square can’t be connected here. Paste a Square payment link above instead.','err');return;}
    var s=$('pySq');if(s){s.disabled=true;s.textContent='Opening Square…';}msg('');
    call('square-oauth-start',{nonce:n},15000).then(function(j){
      if(!j||!j.url||!/^https:\/\/connect\.square(up|upsandbox)\.com\//.test(j.url))throw new Error('bad');
      /* if Square never takes over the page (in-app browsers, blocked pop-ups), give the button back */
      setTimeout(function(){if(document.visibilityState==='visible'){resetSq();msg(SQFAIL,'err');}},8000);
      location.assign(j.url);
    }).catch(function(e){resetSq();msg(e&&e.message&&e.message!=='timeout'&&e.message!=='bad'&&!/fetch|network/i.test(e.message)?e.message+' Or paste a Square payment link above.':SQFAIL,'err');});
  }
  /* coming back with the Back button shows the page from memory: never leave "Opening Square…" stuck */
  window.addEventListener('pageshow',function(ev){if(ev.persisted)resetSq();});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(resetSq,1500);});
  function disconnect(){
    if(!confirm('Disconnect your Square account? Vendors will no longer be able to pay booth fees on your listings through Square.'))return;
    var d=$('pyDis');if(d)d.disabled=true;
    call('square-disconnect',{}).then(function(j){conn=null;render();msg('Disconnected. Square access was '+(j.revoked_at_square?'revoked':'removed here (Square didn’t confirm the revoke; you can also remove “Jax Vendor Events” under Square Dashboard → Apps)')+(j.listings_off?'; '+j.listings_off+' listing'+(j.listings_off>1?'s':'')+' switched off.':'.'),'ok');})
      .catch(function(e){if(d)d.disabled=false;msg(e.message==='timeout'?'Square didn’t answer. Try again in a minute.':e.message,'err');});
  }
  function finish(ticket){
    var st=null;try{st=JSON.parse(localStorage.getItem(NK)||'null');}catch(_){}
    try{localStorage.removeItem(NK);}catch(_){}
    if(!st||!st.n||Date.now()-st.t>30*60e3){msg('That connection was started in another browser or expired. Tap Connect Square again here.','err');return load();}
    msg('Finishing your Square connection…','info');
    return call('square-oauth-finish',{ticket:ticket,nonce:st.n},20000).then(function(j){msg('Connected ✓ '+(j.merchant_name||'Square')+(j.sandbox?' (test mode)':''),'ok');return load();})
      .catch(function(e){msg(e.message==='timeout'?SQFAIL:e.message,'err');return load();});
  }
  function boot(){
    if(!A.user)return;
    var q=new URLSearchParams(location.search),t=q.get('sq'),e=q.get('sq_err');
    if(t||e){try{history.replaceState(history.state,'',location.pathname+'#payments');}catch(_){}}
    if(t&&/^[0-9a-f-]{36}$/i.test(t))finish(t);
    else{if(e)msg(ERR[e]||ERR.server,'err');load();}
  }
  A.ready.then(boot);
})();
