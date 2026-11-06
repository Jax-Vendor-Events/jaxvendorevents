/* Jax Vendor Events: organizer booth-fee setup on the Account page (Account -> Payments), Nov 6 2026.
   Owner Nov 6 2026 8:14 AM: the "Vendor fee payment" box no longer sits inside every event listing; it lives here, on the
   organizer's own account, and it is optional. Same server rules as before (event_fee_get / event_fee_set / event_fee_square):
   only an admin, or a signed-in account whose VERIFIED email matches the listing's organizer email, can write a fee link.
   Vendors still see "Pay booth fee" on a listing when its organizer set one up (track.js). Opened from an organizer
   link as account.html?fee=<event id>[&t=<token>]#payments it preselects that listing. */
(function(){
  'use strict';
  var A=window.JVE_AUTH;if(!A||!A.ready)return;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function ico(n){return '<svg class="ico" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
  function money(c){var v=c/100;return '$'+(v%1?v.toFixed(2):String(v));}
  function payee(u){return ((String(u).match(/^https:\/\/([^\/?#]+)/)||[])[1]||'').toLowerCase().replace(/^www\./,'');}
  var Q=new URLSearchParams(location.search),TOK=Q.get('t'),TOK_E=Q.get('fee')||'';
  /* organizer: vendor fee payment link.
     Nov 2 2026 lock-down: the ?t= organizer link alone can NOT set a fee link any more. The server (event_fee_get / event_fee_set)
     only lets an admin, or a signed-in account whose VERIFIED email equals the listing's organizer email, write it. Everyone
     else holding the link sees a sign-in prompt with the masked email (or the contact line when the listing has no email). */
  function orgForm(e,body){
    var tok=(TOK&&e.id===TOK_E)?TOK:null;
    var w=document.createElement('section');w.className='orgfee apf';w.setAttribute('aria-labelledby','ofH');
    w.innerHTML='<h3 id="ofH">Vendor fee payment</h3><p>Checking…</p>';
    if(tok)body.insertBefore(w,body.firstChild);else body.appendChild(w);
    A.sb.rpc('event_fee_get',{eid:e.id,t:tok}).then(function(r){
      var d=r&&r.data;if(r.error||!d){w.remove();return;}
      if(d.can_edit)editForm(w,e,tok,d);else signGate(w,e,d);
    },function(){w.remove();});
  }
  function backUrl(){var p=location.pathname.split('/').pop()||'index.html';return p+location.search+location.hash;}
  function signGate(w,e,d){
    var nx=encodeURIComponent(backUrl()),h='<h3 id="ofH">Vendor fee payment</h3>';
    if(d.has_email&&d.email_hint){
      h+='<p>To keep vendors safe, only the organizer signed in with the email on this listing can add a “Pay booth fee” link.</p>';
      if(d.signed_in){
        var me=(A.user&&A.user.email)||'another email';
        h+='<p class="ofwho">You’re signed in as <b>'+esc(me)+'</b>, which isn’t the email on this listing.</p>'+
          '<div class="apsave"><button type="button" class="btn" id="ofSwitch">Sign in with '+esc(d.email_hint)+' to set a payment link</button></div>';
      }else{
        h+='<div class="apsave"><a class="btn" id="ofSignin" href="login.html?next='+nx+'">Sign in with '+esc(d.email_hint)+' to set a payment link</a></div>'+
          '<p class="ofnew">No account yet? <a href="login.html?mode=signup&amp;next='+nx+'">Create a free one</a> with that same email, confirm it from your inbox, then open this link again.</p>';
      }
    }else{
      h+='<p class="ofnone">Email hello@jaxvendorevents.com to add a payment link.</p>';
    }
    w.innerHTML=h;
    var sw=w.querySelector('#ofSwitch');
    if(sw)sw.addEventListener('click',function(){sw.disabled=true;A.signOut('local').then(function(){location.href='login.html?next='+nx;});});
  }
  function editForm(w,e,tok,d){
    if(d.sq_connected||d.square_on){sqForm(w,e,tok,d);return;}
    linkForm(w,e,tok,d);
  }
  /* Square mode: the fee is charged on the connected organizer's own Square account (Account → Payments). */
  function sqForm(w,e,tok,d){
    var other=d.square_on&&!d.square_mine;
    w.innerHTML='<h3 id="ofH">Vendor fee payment'+(d.via==='admin'?' <small>(admin)</small>':'')+'</h3>'+
      '<p>Vendors with Pro pay your booth fee on Square’s own checkout and the money lands in '+(d.sq_connected?'your Square account <b>'+esc(d.sq_merchant)+'</b>'+(d.sq_sandbox?' <small>(test mode)</small>':''):'the connected Square account')+'. Jax Vendor Events takes no cut and never holds it.</p>'+
      (other?'<p class="ofwho">Right now this listing charges through <b>'+esc(d.square_merchant||'another Square account')+'</b>, set up from another account.'+(d.sq_connected?' Saving with Square ON switches it to yours.':'')+'</p>':'')+
      '<label class="sqtog" for="sqOn"><input type="checkbox" id="sqOn" role="switch"'+(d.sq_connected||d.square_on?'':' disabled')+'><span>Charge booth fees through Square: <b id="sqSt">OFF</b></span></label>'+
      '<div class="row2"><label class="fl" for="ofAmt">Booth fee ($)<input type="text" id="ofAmt" inputmode="decimal" placeholder="45"></label><label class="fl" for="ofCov">Covers<input type="text" id="ofCov" maxlength="200" placeholder="10x10 booth, both days"></label></div>'+
      '<div class="apsave"><button type="button" class="btn" id="ofSave">Save</button></div><p class="apmsg" id="ofMsg" role="status" aria-live="polite"></p>'+
      (d.sq_connected?'':'<p class="ofnew"><a href="account.html#payments">Connect your Square</a> to charge vendors here.</p>');
    var $=function(id){return w.querySelector('#'+id);};
    function st(){$('sqSt').textContent=$('sqOn').checked?'ON':'OFF';}
    /* ON = this listing charges through Square on the caller's own account (or, for someone without a connection, through whichever one) */
    function fill(r,first){var on=!!(r.square_on&&(r.square_mine||!d.sq_connected));if(first&&!r.square_on&&d.sq_connected)on=true;
      $('sqOn').checked=on;$('ofAmt').value=r.amount_cents?String(r.amount_cents/100):'';$('ofCov').value=r.covers||'';st();}
    fill(d,true);
    $('sqOn').addEventListener('change',st);
    function msg(t,c){$('ofMsg').textContent=t;$('ofMsg').className='apmsg'+(c?' '+c:'');}
    $('ofSave').addEventListener('click',function(){
      var on=$('sqOn').checked,amt=$('ofAmt').value.replace(/[^0-9.]/g,''),c=amt?Math.round(parseFloat(amt)*100):null;
      if(on&&!d.sq_connected){msg('Connect your Square account first (Account → Payments).','err');return;}
      if(on&&!(c>=100)){msg('Enter the booth fee, at least $1 (like 45).','err');return;}
      if(!on&&!d.square_on){msg('Square is off for this listing. Turn it ON to charge vendors here.','');return;}
      if(!on&&!confirm('Turn off Square booth fees for this listing? Vendors will no longer see the Pay button.'))return;
      $('ofSave').disabled=true;msg('Saving…');
      A.sb.rpc('event_fee_square',{eid:e.id,turn_on:on,amount_cents:on?c:null,covers:$('ofCov').value}).then(function(r){$('ofSave').disabled=false;
        if(r.error){msg(r.error.message||'Couldn’t save.','err');return;}
        var x=r.data||{};d=x;
        if(x.square_on&&x.status==='live'){
          msg('Saved ✓ Square is ON. Vendors now see “Pay booth fee · '+money(x.amount_cents)+' with Square”.','ok');}
        else if(x.square_on){msg('Saved. It’s pending review and vendors won’t see it yet.','ok');}
        else{msg('Square is OFF for this listing. Vendors no longer see a Pay button.','ok');}
        other=false;fill(x,false);});
    });
  }
  function linkForm(w,e,tok,d){
    w.innerHTML='<h3 id="ofH">Vendor fee payment'+(d.via==='admin'?' <small>(admin)</small>':'')+'</h3><p>Vendors see a “Pay booth fee” button on this listing, with your link’s address shown under it. Use your own Square, PayPal, Zettle, Stripe, Venmo or Cash App link: the money goes straight to you, never through us.</p>'+
      '<div class="row2"><label class="fl" for="ofAmt">Fee ($)<input type="text" id="ofAmt" inputmode="decimal" placeholder="45"></label><label class="fl" for="ofCov">Covers<input type="text" id="ofCov" maxlength="200" placeholder="10x10 booth, both days"></label></div>'+
      '<label class="fl" for="ofUrl">Payment link<input type="url" id="ofUrl" maxlength="500" inputmode="url" placeholder="https://square.link/u/…" autocapitalize="off"></label>'+
      '<div class="apsave"><button type="button" class="btn" id="ofSave">Save</button><button type="button" class="btn ghost" id="ofClear" hidden>Remove</button></div><p class="apmsg" id="ofMsg" role="status" aria-live="polite"></p>'+
      '<p class="ofnew">Use Square? <a href="account.html#payments">Connect your Square account</a> and vendors pay you right here.</p>';
    var $=function(id){return w.querySelector('#'+id);};
    function fill(r){if(!r)return;$('ofAmt').value=r.amount_cents?String(r.amount_cents/100):'';$('ofCov').value=r.covers||'';$('ofUrl').value=r.pay_url||'';$('ofClear').hidden=!r.pay_url;}
    fill(d);
    function msg(t,c){$('ofMsg').textContent=t;$('ofMsg').className='apmsg'+(c?' '+c:'');}
    function save(clear){
      var amt=$('ofAmt').value.replace(/[^0-9.]/g,''),url=clear?'':$('ofUrl').value.trim();
      if(!clear&&!url){msg('Paste your payment link first.','err');return;}
      if(!clear&&!/^https:\/\//i.test(url)){msg('The link must start with https://','err');return;}
      var c=amt?Math.round(parseFloat(amt)*100):null;if(amt&&!(c>0)){msg('Fee should be a number, like 45.','err');return;}
      $('ofSave').disabled=true;msg('Saving…');
      A.sb.rpc('event_fee_set',{eid:e.id,t:tok,amount_cents:c,covers:$('ofCov').value,pay_url:url}).then(function(r){$('ofSave').disabled=false;
        if(r.error){msg(r.error.message||'Couldn’t save.','err');return;}
        if(clear||!r.data||r.data.cleared){fill({amount_cents:null,covers:'',pay_url:''});msg('Removed.','ok');}
        else if(r.data.status==='live'){fill(r.data);msg('Saved ✓ Vendors now see “Pay booth fee” (pays '+payee(r.data.pay_url)+').','ok');}
        else{fill(r.data);msg('Saved. It’s pending review and vendors won’t see it yet.','ok');}
        });
    }
    $('ofSave').addEventListener('click',function(){save(false);});$('ofClear').addEventListener('click',function(){if(confirm('Remove the payment link from this listing?'))save(true);});
  }


  function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  A.ready.then(async function(){
    var box=document.getElementById('feeSetup');if(!box||!A.user)return;
    var sel=document.getElementById('feeEvent'),out=document.getElementById('feeEdit');
    var evs=((window.JVE_DATA&&window.JVE_DATA.events)||[]).filter(function(e){return !e.locked&&e.verify_status!=='removed'&&e.verify_status!=='past';});
    var t=today();evs=evs.filter(function(e){var ds=e.dates||[];return !ds.length||ds.some(function(x){return x>=t;});});
    var ownIds=[];try{var own=await A.sb.from('event_owners').select('event_id');ownIds=(own.data||[]).map(function(x){return x.event_id;});}catch(_){}
    var mine=evs.filter(function(e){return ownIds.indexOf(e.id)>=0||e.mine||e.id===TOK_E;});
    var list=A.admin?evs:mine;
    if(!list.length&&!TOK_E){box.querySelector('.hint').textContent='Optional. When you have a listing here, you can add a “Pay booth fee” link to it from this spot. Skip it if you collect fees another way.';sel.hidden=true;return;}
    list.sort(function(a,b){return (ownIds.indexOf(b.id)>=0)-(ownIds.indexOf(a.id)>=0)||String(a.name).localeCompare(String(b.name));});
    sel.innerHTML='<option value="">Pick a listing\u2026</option>'+list.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.name)+(e.city?' \u00b7 '+esc(e.city):'')+'</option>';}).join('');
    function show(id){out.innerHTML='';if(!id)return;orgForm({id:id},out);}
    sel.addEventListener('change',function(){show(sel.value);});
    if(TOK_E&&list.some(function(e){return e.id===TOK_E;})){sel.value=TOK_E;show(TOK_E);}
    else if(TOK_E){show(TOK_E);}
  });
})();
