/* Jax Vendor Events: event-sheet actions for Vendor Pro (index.html), Nov 2026.
   - "Apply with my kit": opens the organizer's apply link in a new tab, copies a ready-to-paste intro (name, category,
     booth needs, private kit link) and offers a mailto: when the listing has an email contact (the vendor's own mail app
     sends it, never us). Adds the event to My applications as "applied".
   - "Track this" / quick status for events already tracked (table app_tracker, owner-only RLS).
   - "Pay booth fee": the organizer's own Square / PayPal / Zettle / Stripe / Venmo / Cash App link (table event_fees,
     readable only with full access). Money goes vendor -> organizer; we never touch it. Then "Did you pay?" marks it paid.
   - Organizer form (organizer link ?t=..., the listing's owner account, or an admin): set that fee link (rpc event_fee_set,
     the server checks the token/owner/admin and the payment domain).
   Free members and visitors see a locked teaser instead (server refuses them the data). Hook: app.js fillSheet -> JVE_TRK.sheet(e,d). */
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
  function proc(u){var h=(String(u).match(/^https:\/\/([^\/?#]+)/)||[])[1]||'';for(var i=0;i<PROC.length;i++)if(PROC[i][0].test(h))return PROC[i][1];return 'their payment link';}
  function toast(t){var el=document.getElementById('toast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2600);}
  function copy(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);return Promise.reject(new Error('no clipboard'));}
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
    var isOrg=(TOK&&e.unlocked_by==='link'&&e.id===TOK_E)||(A.admin)||e.mine;
    if(!full){
      if(!isOrg){box.innerHTML='<button type="button" class="tlock" data-unlock="vendor-pro">'+ico('lock')+'<span>Apply with your kit · track this market</span><small>Unlock · $6/mo</small></button>';body.insertBefore(box,body.firstChild);}
    }else if(!e.locked){
      var t=track[e.id],f=fees[e.id],h='';
      h+='<div class="trow"><button type="button" class="btn" data-kitapply>'+ico('send')+' Apply with my kit</button>'+
        (t?'<select data-trkst aria-label="Application status">'+ST.map(function(s){return '<option value="'+s[0]+'"'+(t.status===s[0]?' selected':'')+'>'+(t.status===s[0]?'Tracking · ':'')+s[1]+'</option>';}).join('')+'</select>'
          :'<button type="button" class="btn ghost" data-track>'+ico('list')+' Track this</button>')+'</div>';
      if(f){var pn=proc(f.pay_url);
        h+='<div class="pay"><button type="button" class="btn" data-pay>'+ico('tag')+' Pay booth fee'+(f.amount_cents?' · '+money(f.amount_cents):'')+'</button>'+(f.covers?'<span class="cov">'+esc(f.covers)+'</span>':'')+
          '<small>Payment goes directly to the organizer via '+esc(pn)+'. Jax Vendor Events doesn’t handle event fees.</small></div>';}
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

  /* organizer: vendor fee payment link */
  function orgForm(e,body){
    var w=document.createElement('section');w.className='orgfee apf';w.setAttribute('aria-labelledby','ofH');
    w.innerHTML='<h3 id="ofH">Vendor fee payment'+(A.admin&&!(TOK&&e.id===TOK_E)?' <small>(admin)</small>':'')+'</h3><p>Vendors see a “Pay booth fee” button on this listing. Use your own Square, PayPal, Zettle, Stripe, Venmo or Cash App link: the money goes straight to you, never through us.</p>'+
      '<div class="row2"><label class="fl" for="ofAmt">Fee ($)<input type="text" id="ofAmt" inputmode="decimal" placeholder="45"></label><label class="fl" for="ofCov">Covers<input type="text" id="ofCov" maxlength="200" placeholder="10x10 booth, both days"></label></div>'+
      '<label class="fl" for="ofUrl">Payment link<input type="url" id="ofUrl" maxlength="500" inputmode="url" placeholder="https://square.link/u/…" autocapitalize="off"></label>'+
      '<div class="apsave"><button type="button" class="btn" id="ofSave">Save</button><button type="button" class="btn ghost" id="ofClear" hidden>Remove</button></div><p class="apmsg" id="ofMsg" role="status" aria-live="polite"></p>';
    var tok=(TOK&&e.id===TOK_E)?TOK:null;
    if(tok)body.insertBefore(w,body.firstChild);else body.appendChild(w);
    var _t=tok,$=function(id){return w.querySelector('#'+id);};
    function fill(r){if(!r)return;$('ofAmt').value=r.amount_cents?String(r.amount_cents/100):'';$('ofCov').value=r.covers||'';$('ofUrl').value=r.pay_url||'';$('ofClear').hidden=!r.pay_url;}
    A.sb.rpc('event_fee_get',{eid:e.id,t:tok}).then(function(r){if(r.data)fill(r.data);});
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
        else{fees[e.id]=r.data;fill(r.data);msg('Saved ✓ Vendors now see “Pay booth fee”.','ok');}
        render();});
    }
    $('ofSave').addEventListener('click',function(){save(false);});$('ofClear').addEventListener('click',function(){if(confirm('Remove the payment link from this listing?'))save(true);});
  }

  document.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('.trk [data-kitapply],.trk [data-track],.trk [data-pay],.trk [data-recopy],.trk [data-paidyes],.trk [data-paidno]');if(!b||!lastE)return;
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
      sb.from('event_fees').select('event_id,amount_cents,covers,pay_url')
    ]).then(function(r){
      (r[0].data||[]).forEach(function(x){track[x.event_id]=x;});
      kit=r[1].data||null;
      share=(r[2].data||[]).filter(function(s){return !s.expires_at||new Date(s.expires_at)>new Date(Date.now()+864e5);}).sort(function(a,b){return (a.expires_at?1:0)-(b.expires_at?1:0);})[0]||null;
      (r[3].data||[]).forEach(function(x){fees[x.event_id]=x;});
      ready=true;render();
    }).catch(function(){ready=true;render();});
  });
})();
