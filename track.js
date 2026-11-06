/* Jax Vendor Events: event-sheet actions for Vendor Pro (index.html), Nov 2026.
   - "Apply with my kit": opens the organizer's apply link in a new tab, copies a ready-to-paste intro (name, category,
     booth needs, private kit link) and offers a mailto: when the listing has an email contact (the vendor's own mail app
     sends it, never us). Adds the event to My applications as "applied".
   - "Track this" / quick status for events already tracked (table app_tracker, owner-only RLS).
   - "Pay booth fee": the organizer's own Square / PayPal / Zettle / Stripe / Venmo / Cash App link (table event_fees,
     readable only with full access). Money goes vendor -> organizer; we never touch it. Then "Did you pay?" marks it paid.
   - Organizer form: shown on ?t= organizer links and to admins. Writing a fee link needs an admin, or a signed-in account
     whose VERIFIED email matches the listing's organizer email (server-checked in event_fee_set; the ?t= token alone
     grants nothing since Nov 2 2026). Others see "Sign in with j***@… to set a payment link".
   Free members and visitors see a locked teaser instead (server refuses them the data). Hook: app.js fillSheet -> JVE_TRK.sheet(e,d).
   Nov 2 2026 (Connect Square): organizers who connected their own Square account (Account → Payments) can turn on
   "Charge booth fees through Square" on their listing; Pro vendors then get "Pay booth fee · $X with Square", which asks
   the square-booth-checkout Edge Function for a payment link made ON THE ORGANIZER'S Square account (money goes straight
   to the organizer). Paid is set by Square's webhook, with a status check when the vendor comes back (?sqret=). */
(function(){
  'use strict';
  var A=window.JVE_AUTH;if(!A||!A.ready)return;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function ico(n){return '<svg class="ico" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
  function safe(u){return /^https?:\/\/[^\s<>"]+$/i.test(u||'')?u:'';}
  var ST=[['interested','Interested'],['applied','Applied'],['waitlist','Waitlist'],['approved','Approved'],['paid','Paid'],['done','Done'],['declined','Declined']];
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function nice(s){var p=String(s).split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);return DW[d.getDay()]+', '+MO[d.getMonth()]+' '+d.getDate();}
  function money(c){var v=c/100;return '$'+(v%1?v.toFixed(2):String(v));}
  function feeCents(f){var m=String(f||'').trim().match(/^\$?\s*(\d{1,5}(?:\.\d{1,2})?)\s*(?:\/?\s*(?:booth|space|day|event|fee))?$/i);return m?Math.round(parseFloat(m[1])*100):null;}
  var PROC=[[/square/,'Square'],[/paypal/,'PayPal'],[/zettle/,'Zettle'],[/stripe/,'Stripe'],[/venmo/,'Venmo'],[/cash\.app/,'Cash App']];
  function payee(u){return ((String(u).match(/^https:\/\/([^\/?#]+)/)||[])[1]||'').toLowerCase().replace(/^www\./,'');}
  function proc(u){var h=(String(u).match(/^https:\/\/([^\/?#]+)/)||[])[1]||'';for(var i=0;i<PROC.length;i++)if(PROC[i][0].test(h))return PROC[i][1];return 'their payment link';}
  function toast(t){var el=document.getElementById('toast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2600);}
  function copy(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);return Promise.reject(new Error('no clipboard'));}
  function fn(name,body){
    var C=window.JVE_SB||{};
    return A.sb.auth.getSession().then(function(s){
      var tk=s&&s.data&&s.data.session&&s.data.session.access_token;if(!tk)throw new Error('Sign in first.');
      return fetch(C.url+'/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json',apikey:C.key,Authorization:'Bearer '+tk},body:JSON.stringify(body||{}),cache:'no-store'});
    }).then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.message||'Something went wrong. Try again.');return j;});});
  }
  function markPaidLocal(id){var t=track[id];if(t){t.paid=true;if(t.status!=='done')t.status='paid';}else track[id]={event_id:id,status:'paid',paid:true};}
  /* back from Square's checkout: index.html?sqret=<checkout id>. The webhook usually marked it paid already; ask once or twice to be sure. */
  function sqReturn(){
    var q=new URLSearchParams(location.search),k=q.get('sqret');if(!k||!/^[0-9a-f-]{36}$/i.test(k))return;
    q.delete('sqret');['checkoutId','orderId','referenceId','transactionId'].forEach(function(x){q.delete(x);});
    var qs=q.toString();try{history.replaceState(history.state,'',location.pathname+(qs?'?'+qs:'')+location.hash);}catch(_){}
    sb.from('square_checkouts').select('id,event_id,status').eq('id',k).maybeSingle().then(function(r){
      var row=r&&r.data;if(!row)return;var eid=row.event_id,n=0;
      function done(){markPaidLocal(eid);toast('Booth fee paid ✓ Marked in My applications');render();if(!location.hash||location.hash.indexOf('#e=')!==0)location.hash='e='+encodeURIComponent(eid);}
      if(row.status==='paid'){done();return;}
      toast('Checking your Square payment…');
      (function poll(){fn('square-booth-checkout',{action:'status',event_id:eid}).then(function(j){
        if(j.paid){done();return;}
        if(++n<4){setTimeout(poll,2500);return;}
        toast('Square hasn’t confirmed the payment yet. It will show as paid once it does.');if(!location.hash)location.hash='e='+encodeURIComponent(eid);
      }).catch(function(){});})();
    });
  }
  var sb=null,full=false,ready=false,track={},kit=null,share=null,fees={},lastE=null,lastD=null,panel=null;
  var TOK=new URLSearchParams(location.search).get('t'),TOK_E=decodeURIComponent((location.hash.match(/^#e=([^&]+)/)||[])[1]||'');

  function intro(e,d){
    var k=kit||{},parts=[];
    var booth=k.booth_size==='other'?(k.booth_other||'custom size'):(k.booth_size||'10x10');
    var needs=[booth+' booth',k.electricity?'needs electricity':'no electricity needed',k.tent?'I bring my own tent':'no tent'];
    parts.push('Hi! I’d like to apply as a vendor for '+(e.name||'your event')+(d?' ('+nice(d)+')':'')+'.');
    parts.push('');
    parts.push((k.business_name||'My business')+(k.category?' · '+k.category:''));
    if(k.description)parts.push(String(k.description).split(/\n/)[0].slice(0,220));
    parts.push('Booth: '+needs.join(', ')+'.');
    if(k.price_range)parts.push('Price range: '+k.price_range);
    var links=[];if(k.website)links.push(k.website);if(k.instagram)links.push('Instagram '+k.instagram);if(links.length)parts.push(links.join(' · '));
    parts.push('');
    parts.push(share?'My vendor kit (photos, insurance, tax certificate, license): '+new URL('kit.html#k='+share.token,location.href).href:'I can send my photos, insurance and tax certificate on request.');
    parts.push('');parts.push('Thank you!');parts.push(k.business_name||'');
    return parts.join('\n').trim();
  }
  function email(e){var c=String(e.contact||'').trim();return /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(c)?c:'';}
  function dest(e){return safe(e.apply)||safe(e.signup_url)||safe(e.source_url)||safe(e.source);}

  function upsertTrack(e,d,patch){
    var cur=track[e.id];
    if(cur){return sb.from('app_tracker').update(patch).eq('id',cur.id).select('id,event_id,status,paid,fee_cents').then(function(x){if(x.error)throw x.error;track[e.id]=x.data[0];return x.data[0];});}
    var row=Object.assign({event_id:e.id,event_name:String(e.name||'').slice(0,140),event_date:d||null,deadline:/^\d{4}-\d{2}-\d{2}$/.test(e.deadline||'')?e.deadline:null,fee_cents:feeCents(e.fee),status:'interested',source:'track'},patch);
    return sb.from('app_tracker').insert(row).select('id,event_id,status,paid,fee_cents').then(function(x){
      if(x.error&&/duplicate|unique/i.test(x.error.message||''))return sb.from('app_tracker').update(patch).eq('event_id',e.id).select('id,event_id,status,paid,fee_cents').then(function(y){if(y.error)throw y.error;track[e.id]=y.data[0];return y.data[0];});
      if(x.error)throw x.error;track[e.id]=x.data[0];return x.data[0];});
  }

  function render(){if(lastE)sheet(lastE,lastD,true,true);}
  function sheet(e,d,keepPanel,keepOrg){
    var body=document.getElementById('shBody');if(!body||!e)return;
    var same=!!(lastE&&lastE.id===e.id);if(!keepPanel||!same)panel=null;
    lastE=e;lastD=d||null;
    var keep=!!(keepOrg&&same&&body.querySelector('.orgfee'));var old=body.querySelectorAll(keep?'.trk':'.trk,.orgfee');for(var i=0;i<old.length;i++)old[i].remove();
    var box=document.createElement('div');box.className='trk';
    var isOrg=(TOK&&e.id===TOK_E)||(A.admin)||e.mine; /* the server decides what the fee box may show (event_fee_get) */
    if(!full){
      if(!isOrg){box.innerHTML='<button type="button" class="tlock" data-unlock="vendor-pro">'+ico('lock')+'<span>Apply with your kit · track this market</span><small>Unlock · $6/mo</small></button>';body.insertBefore(box,body.firstChild);}
    }else if(!e.locked){
      var t=track[e.id],f=fees[e.id],h='';
      h+='<div class="trow"><button type="button" class="btn" data-kitapply>'+ico('send')+' Apply with my kit</button>'+
        (t?'<select data-trkst aria-label="Application status">'+ST.map(function(s){return '<option value="'+s[0]+'"'+(t.status===s[0]?' selected':'')+'>'+(t.status===s[0]?'Tracking · ':'')+s[1]+'</option>';}).join('')+'</select>'
          :'<button type="button" class="btn ghost" data-track>'+ico('list')+' Track this</button>')+'</div>';
      if(f&&f.square_on){var paidSq=!!(t&&t.paid);
        h+='<div class="pay sq">'+(paidSq?'<p class="paidok">'+ico('check')+' Booth fee paid'+(f.amount_cents?' · '+money(f.amount_cents):'')+'</p>':
          '<button type="button" class="btn" data-sqpay>'+ico('tag')+' Pay booth fee'+(f.amount_cents?' · '+money(f.amount_cents):'')+' with Square</button>')+(f.covers?'<span class="cov">'+esc(f.covers)+'</span>':'')+
          (paidSq?'<small class="payee">Paid to <b>'+esc(f.square_merchant||'the organizer')+'</b> on Square</small>':
          '<small class="payee">Pays <b>'+esc(f.square_merchant||'the organizer')+'</b> on Square · goes straight to the organizer</small><small>You pay on Square’s own checkout page. Jax Vendor Events never handles event fees.</small>')+'</div>';}
      else if(f&&f.pay_url){var pn=proc(f.pay_url);
        h+='<div class="pay"><button type="button" class="btn" data-pay>'+ico('tag')+' Pay booth fee'+(f.amount_cents?' · '+money(f.amount_cents):'')+'</button>'+(f.covers?'<span class="cov">'+esc(f.covers)+'</span>':'')+
          '<small class="payee">Pays <b>'+esc(payee(f.pay_url))+'</b> · goes straight to the organizer'+(pn!=='their payment link'?' ('+esc(pn)+')':'')+'</small><small>Check that’s the organizer’s link before you pay. Jax Vendor Events never handles event fees.</small></div>';}
      if(panel==='kit'){var txt=intro(e,d),em=email(e);
        h+='<div class="tpanel" role="status"><b>Intro copied ✓ Paste it into the application.</b><textarea readonly aria-label="Intro text">'+esc(txt)+'</textarea><div class="trow"><button type="button" class="btn ghost" data-recopy>Copy again</button>'+
          (em?'<a class="btn ghost" href="mailto:'+esc(em)+'?subject='+encodeURIComponent('Vendor application: '+(e.name||''))+'&body='+encodeURIComponent(txt)+'">'+ico('mail')+' Email it</a>':'<a class="btn ghost" href="apps.html#tracker">My applications</a>')+'</div>'+
          '<p class="tnote">'+(dest(e)?'The application opened in a new tab. ':'')+'Added to My applications as Applied.'+(em?' “Email it” opens your own mail app.':'')+'</p></div>';}
      if(panel==='paid')h+='<div class="ask"><b>Did you pay the booth fee?</b><div class="trow"><button type="button" class="btn" data-paidyes>Yes, I paid</button><button type="button" class="btn ghost" data-paidno>Not yet</button></div></div>';
      if(panel==='paiddone')h+='<p class="tnote">Marked paid in My applications ✓</p>';
      if(!ready)h+='<p class="tnote">Loading your applications…</p>';
      box.innerHTML=h;body.insertBefore(box,body.firstChild);
    }
    if(isOrg&&!keep)orgForm(e,body);
  }

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
        if(x.square_on&&x.status==='live'){fees[e.id]={event_id:e.id,amount_cents:x.amount_cents,covers:x.covers,pay_url:'',square_on:true,square_merchant:x.square_merchant};
          msg('Saved ✓ Square is ON. Vendors now see “Pay booth fee · '+money(x.amount_cents)+' with Square”.','ok');}
        else if(x.square_on){msg('Saved. It’s pending review and vendors won’t see it yet.','ok');}
        else{delete fees[e.id];msg('Square is OFF for this listing. Vendors no longer see a Pay button.','ok');}
        other=false;fill(x,false);render();});
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
        if(clear||!r.data||r.data.cleared){delete fees[e.id];fill({amount_cents:null,covers:'',pay_url:''});msg('Removed.','ok');}
        else if(r.data.status==='live'){fees[e.id]=r.data;fill(r.data);msg('Saved ✓ Vendors now see “Pay booth fee” (pays '+payee(r.data.pay_url)+').','ok');}
        else{fill(r.data);msg('Saved. It’s pending review and vendors won’t see it yet.','ok');}
        render();});
    }
    $('ofSave').addEventListener('click',function(){save(false);});$('ofClear').addEventListener('click',function(){if(confirm('Remove the payment link from this listing?'))save(true);});
  }

  document.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('.trk [data-kitapply],.trk [data-track],.trk [data-pay],.trk [data-recopy],.trk [data-paidyes],.trk [data-paidno],.trk [data-sqpay]');if(!b||!lastE)return;
    var e=lastE,d=lastD;
    if(b.hasAttribute('data-kitapply')){
      if(!ready){toast('One sec, loading your kit…');return;}
      if(!kit){toast('Set up your apply kit first');setTimeout(function(){location.href='apps.html#kit';},700);return;}
      var u=dest(e);if(u)window.open(u,'_blank','noopener');
      var txt=intro(e,d);copy(txt).then(function(){toast('Intro copied');},function(){});
      panel='kit';render();
      var st=track[e.id]&&track[e.id].status;
      upsertTrack(e,d,(!st||st==='interested')?{status:'applied',source:track[e.id]?undefined:'kit'}:{}).then(render).catch(function(){toast('Couldn’t add it to My applications');});
      if(!share)A.sb.rpc('kit_share_create',{days:null,label:'Main link'}).then(function(r){if(r.data){share=r.data;render();}});
    }else if(b.hasAttribute('data-track')){
      b.disabled=true;upsertTrack(e,d,{status:'interested'}).then(function(){toast('Added to My applications');render();}).catch(function(x){b.disabled=false;toast('Couldn’t add it: '+((x&&x.message)||'try again'));});
    }else if(b.hasAttribute('data-pay')){
      var f=fees[e.id];if(!f)return;window.open(f.pay_url,'_blank','noopener');panel='paid';render();
    }else if(b.hasAttribute('data-recopy')){
      var ta=b.closest('.tpanel').querySelector('textarea');copy(ta.value).then(function(){toast('Copied');},function(){ta.focus();ta.select();toast('Press and hold to copy');});
    }else if(b.hasAttribute('data-paidyes')){
      var fe=fees[e.id]||{};var p={status:'paid',paid:true};if(fe.amount_cents)p.fee_cents=fe.amount_cents;
      upsertTrack(e,d,Object.assign({source:track[e.id]?undefined:'fee'},p)).then(function(){panel='paiddone';render();toast('Marked paid');}).catch(function(){toast('Couldn’t save. Try again.');});
    }else if(b.hasAttribute('data-paidno')){panel=null;render();}
    else if(b.hasAttribute('data-sqpay')){
      b.disabled=true;var lbl=b.innerHTML;b.textContent='Opening Square checkout…';
      fn('square-booth-checkout',{action:'create',event_id:e.id}).then(function(j){
        if(j.paid){markPaidLocal(e.id);toast('Already paid ✓');render();return;}
        try{sessionStorage.setItem('jve_sq_ev',e.id);}catch(_){}
        location.assign(j.url);
      }).catch(function(x){b.disabled=false;b.innerHTML=lbl;toast((x&&x.message)||'Couldn’t open Square. Try again.');});
    }
  });
  document.addEventListener('change',function(ev){
    var s=ev.target.closest&&ev.target.closest('.trk [data-trkst]');if(!s||!lastE)return;var e=lastE,p={status:s.value};if(s.value==='paid')p.paid=true;
    upsertTrack(e,lastD,p).then(function(){toast('Status saved');render();}).catch(function(){toast('Couldn’t save. Try again.');render();});
  });

  function clean(o){Object.keys(o).forEach(function(k){if(o[k]===undefined)delete o[k];});return o;}
  var _up=upsertTrack;upsertTrack=function(e,d,p){return _up(e,d,clean(p));};

  window.JVE_TRK={sheet:sheet};
  A.ready.then(function(){
    sb=A.sb;full=!!(A.user&&(A.access==='full'||A.admin));
    if(!full){ready=true;render();return;}
    Promise.all([
      sb.from('app_tracker').select('id,event_id,status,paid,fee_cents').not('event_id','is',null),
      sb.from('apply_kits').select('business_name,category,description,website,instagram,booth_size,booth_other,electricity,tent,price_range').maybeSingle(),
      sb.from('kit_shares').select('id,token,expires_at,revoked_at,created_at').is('revoked_at',null).order('created_at',{ascending:false}),
      sb.from('event_fees').select('event_id,amount_cents,covers,pay_url,square_on,square_merchant')
    ]).then(function(r){
      (r[0].data||[]).forEach(function(x){track[x.event_id]=x;});
      kit=r[1].data||null;
      share=(r[2].data||[]).filter(function(s){return !s.expires_at||new Date(s.expires_at)>new Date(Date.now()+864e5);}).sort(function(a,b){return (a.expires_at?1:0)-(b.expires_at?1:0);})[0]||null;
      (r[3].data||[]).forEach(function(x){fees[x.event_id]=x;});
      ready=true;render();sqReturn();
    }).catch(function(){ready=true;render();});
  });
})();
