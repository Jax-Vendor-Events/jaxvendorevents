/* Jax Vendor Events: Account → Payments (Nov 2026). Organizers connect their OWN Square business account (OAuth) so vendors
   can pay booth fees on their listings; the money goes straight to the organizer, Jax Vendor Events takes no cut and never
   holds it. PayPal is "coming soon" (needs PayPal partner approval). Edge Functions: square-oauth-start / -finish /
   square-disconnect. The OAuth round trip is bound to this signed-in account AND this browser (a nonce kept here). */
(function(){
  'use strict';
  var A=window.JVE_AUTH;if(!A||!A.ready)return;
  var C=window.JVE_SB||{},NK='jve_sq_nonce';
  var $=function(id){return document.getElementById(id);};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function msg(t,k){var m=$('pyMsg');if(!m)return;m.textContent=t||'';m.className='amsg'+(t?' show '+(k||'info'):'');}
  function call(name,body){
    return A.sb.auth.getSession().then(function(s){
      var tok=s&&s.data&&s.data.session&&s.data.session.access_token;if(!tok)throw new Error('Sign in first.');
      return fetch(C.url+'/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json',apikey:C.key,Authorization:'Bearer '+tok},body:JSON.stringify(body||{}),cache:'no-store'});
    }).then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.message||'Something went wrong. Try again.');return j;});});
  }
  function nonce(){var a=new Uint8Array(32);crypto.getRandomValues(a);var s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  var ERR={denied:'You cancelled on Square, so nothing was connected.',state:'That Square link expired or was already used. Tap Connect Square again.',expired:'That took too long. Tap Connect Square again.',
    location:'Your Square account has no active location to take payments. Add one in Square, then connect again.',currency:'Booth fees here are in US dollars, and that Square account isn’t a US one.',
    square:'Square didn’t finish the connection. Try again in a minute.',server:'Something went wrong on our side. Try again.'};
  var conn=null;
  function render(){
    var b=$('pyBox');if(!b)return;var h='';
    if(conn){
      h+='<p class="pyok"><span class="pydot" aria-hidden="true"></span>Connected: <b>'+esc(conn.merchant_name||'Square')+'</b>'+(conn.sandbox?' <span class="tierpill">TEST MODE</span>':'')+' · <button type="button" class="linkbtn" id="pyDis">Disconnect</button></p>'+
         '<p class="hint" style="margin-top:0">Now open your listing’s organizer link and turn on “Charge booth fees through Square”. Vendors pay on Square’s own checkout page and the money lands in your Square account.</p>';
    }else{
      h+='<div class="btnrow" style="margin-top:0"><button type="button" class="btn sm" id="pySq">Connect Square</button></div>';
    }
    h+='<div class="btnrow"><button type="button" class="btn sm ghost" disabled aria-disabled="true">Connect PayPal — coming soon</button></div>';
    b.innerHTML=h;
    var s=$('pySq');if(s)s.onclick=connect;
    var d=$('pyDis');if(d)d.onclick=disconnect;
  }
  function load(){
    return A.sb.rpc('my_payment_connections').then(function(r){
      var a=(r&&r.data)||[];conn=null;for(var i=0;i<a.length;i++)if(a[i].provider==='square')conn=a[i];render();
    });
  }
  function connect(){
    var n=nonce();try{localStorage.setItem(NK,JSON.stringify({n:n,t:Date.now()}));}catch(_){msg('Your browser blocked storage, so Square can’t be connected here.','err');return;}
    var s=$('pySq');if(s){s.disabled=true;s.textContent='Opening Square…';}msg('');
    call('square-oauth-start',{nonce:n}).then(function(j){location.assign(j.url);}).catch(function(e){if(s){s.disabled=false;s.textContent='Connect Square';}msg(e.message,'err');});
  }
  function disconnect(){
    if(!confirm('Disconnect your Square account? Vendors will no longer be able to pay booth fees on your listings through Square.'))return;
    var d=$('pyDis');if(d)d.disabled=true;
    call('square-disconnect',{}).then(function(j){conn=null;render();msg('Disconnected. Square access was '+(j.revoked_at_square?'revoked':'removed here (Square didn’t confirm the revoke; you can also remove “Jax Vendor Events” under Square Dashboard → Apps)')+(j.listings_off?'; '+j.listings_off+' listing'+(j.listings_off>1?'s':'')+' switched off.':'.'),'ok');})
      .catch(function(e){if(d)d.disabled=false;msg(e.message,'err');});
  }
  function finish(ticket){
    var st=null;try{st=JSON.parse(localStorage.getItem(NK)||'null');}catch(_){}
    try{localStorage.removeItem(NK);}catch(_){}
    if(!st||!st.n||Date.now()-st.t>30*60e3){msg('That connection was started in another browser or expired. Tap Connect Square again here.','err');return load();}
    msg('Finishing your Square connection…','info');
    return call('square-oauth-finish',{ticket:ticket,nonce:st.n}).then(function(j){msg('Connected ✓ '+(j.merchant_name||'Square')+(j.sandbox?' (test mode)':''),'ok');return load();})
      .catch(function(e){msg(e.message,'err');return load();});
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
