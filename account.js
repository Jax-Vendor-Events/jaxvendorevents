/* Jax Vendor Events: My account (account.html). Everything here is the member's own row; the server (RLS) refuses anything else. */
(function(){
  'use strict';
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function msg(id,t,k){var m=$(id);if(!m)return;m.className='amsg show '+(k||'info');m.textContent=t;}
  function fmt(d){if(!d)return '';var x=new Date(d+(d.length===10?'T12:00:00':''));return x.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
  window.JVE_AUTH.ready.then(async function(A){
    var sb=A.sb,u=A.user,p=A.profile||{};
    if(new URLSearchParams(location.search).get('why')==='admin')msg('topMsg','That page is for admins only.','err');
    /* profile */
    $('pEmail').textContent=u.email;
    $('pName').value=p.full_name||'';$('pBiz').value=p.business_name||'';$('pType').value=p.account_type||'vendor';$('pWeb').value=p.website||'';
    $('profileForm').addEventListener('submit',function(e){e.preventDefault();
      var web=$('pWeb').value.trim();if(web&&!/^https:\/\/\S+$/i.test(web))return msg('profileMsg','Website should start with https://','err');
      sb.from('profiles').update({full_name:$('pName').value.trim().slice(0,120),business_name:$('pBiz').value.trim().slice(0,160),account_type:$('pType').value,website:web.slice(0,300)}).eq('id',u.id)
        .then(function(r){if(r.error)throw r.error;msg('profileMsg','Saved.','ok');}).catch(function(err){msg('profileMsg',err.message||'Could not save.','err');});});
    /* plan */
    var links={};try{links=await (await fetch('data/checkout.json?t='+Date.now(),{cache:'no-store'})).json();}catch(_){}
    var mem=await sb.from('memberships').select('tier,status,until,source,starts_on,stripe_subscription_id').order('created_at',{ascending:false});
    var rows=(mem.data||[]);
    var today=new Date().toISOString().slice(0,10);
    var act=rows.filter(function(m){return m.status==='active'&&(!m.until||m.until>=today)&&m.starts_on<=today;});
    var h='';
    if(!act.length)h='<span class="tierpill free">Free member</span>';
    act.forEach(function(m){h+='<span class="tierpill'+(m.tier==='vendor-pro'?' gold':'')+'">'+esc(A.TIER_NAMES[m.tier]||m.tier)+(m.until?' · until '+fmt(m.until):'')+'</span>';});
    if(A.admin)h+='<span class="tierpill">Admin</span>';
    $('planPills').innerHTML=h;
    Array.prototype.forEach.call(document.querySelectorAll('[data-upgrade]'),function(a){var id=a.getAttribute('data-upgrade');var l=links[id];
      if(typeof l==='string'&&/^https:\/\/buy\.stripe\.com\//.test(l)){a.href=A.buyUrl(l);a.target='_blank';a.rel='noopener';}else a.href='pricing.html?tier='+id+'#get-featured';});
    /* Vendor Pro: deadline reminders preference */
    var prefs=p.prefs||{};var rm=$('proRemind');
    if(rm){rm.checked=prefs.reminders!==false;rm.addEventListener('change',function(){prefs.reminders=rm.checked;
      sb.from('profiles').update({prefs:prefs}).eq('id',u.id).then(function(r){msg('proMsg',r.error?(r.error.message):(rm.checked?'Deadline reminders on.':'Deadline reminders off.'),r.error?'err':'ok');});});}
    /* Organizer Plus: manage my listings (requests reviewed by an admin) */
    var evs=(window.JVE_DATA&&window.JVE_DATA.events)||[];
    var sel=$('opEvent');
    if(sel){var mine=(p.business_name||'').toLowerCase();var opts=evs.filter(function(e){return e.verify_status!=='removed'&&e.verify_status!=='past';})
        .sort(function(a,b){var am=mine&&String(a.organizer||'').toLowerCase().indexOf(mine)>=0,bm=mine&&String(b.organizer||'').toLowerCase().indexOf(mine)>=0;return (bm-am)||String(a.name).localeCompare(String(b.name));});
      sel.innerHTML='<option value="">Pick one of your events…</option>'+opts.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.name)+(e.city?' · '+esc(e.city):'')+'</option>';}).join('');
      $('opForm').addEventListener('submit',function(e){e.preventDefault();var id=sel.value;if(!id)return msg('opMsg','Pick the event first.','err');
        var kind=$('opKind').value,pl={};
        [['opDates','dates'],['opFee','fee'],['opDeadline','deadline'],['opApply','apply'],['opNote','description']].forEach(function(f){var v=$(f[0]).value.trim();if(v)pl[f[1]]=f[1]==='dates'?v.split(/[ ,]+/).filter(function(x){return /^\d{4}-\d{2}-\d{2}$/.test(x);}):v;});
        sb.from('listing_requests').insert({user_id:u.id,kind:kind,event_id:id,payload:pl}).then(function(r){if(r.error)throw r.error;msg('opMsg','Sent. An admin checks it against your own page, usually within 24 hours.','ok');$('opForm').reset();loadReqs();})
          .catch(function(err){msg('opMsg',/row-level security/i.test(err.message)?'Managing listings is part of Organizer Plus.':err.message,'err');});});}
    /* sponsors */
    var sf=$('spForm');
    if(sf)sf.addEventListener('submit',function(e){e.preventDefault();var pl={name:$('spName').value.trim(),line:$('spLine').value.trim().slice(0,140),url:$('spUrl').value.trim(),logo:$('spLogo').value.trim()};
      if(pl.url&&!/^https:\/\/\S+$/i.test(pl.url))return msg('spMsg','Link should start with https://','err');
      sb.from('listing_requests').insert({user_id:u.id,kind:'sponsor_details',payload:pl}).then(function(r){if(r.error)throw r.error;msg('spMsg','Got it. Your sponsor details go live after a quick check.','ok');loadReqs();}).catch(function(err){msg('spMsg',err.message,'err');});});
    /* my requests + purchases */
    async function loadReqs(){var r=await sb.from('listing_requests').select('id,kind,event_id,status,admin_note,created_at,payload').order('created_at',{ascending:false}).limit(30);
      var L={new_event:'New event listing',edit_event:'Listing update',remove_event:'Listing removal',vendor_profile:'Vendor profile',sponsor_details:'Sponsor details'};
      $('reqList').innerHTML=(r.data||[]).length?(r.data||[]).map(function(x){return '<li><span class="st '+x.status+'">'+x.status+'</span> <b>'+esc(L[x.kind]||x.kind)+'</b>'+(x.payload&&x.payload.name?' · '+esc(x.payload.name):'')+(x.event_id?' · '+esc(x.event_id):'')+'<small>'+fmt(x.created_at.slice(0,10))+(x.admin_note?' · '+esc(x.admin_note):'')+'</small></li>';}).join(''):'<li><small>Nothing yet. Listings you send and profile requests show up here.</small></li>';}
    loadReqs();
    var pay=await sb.from('payments').select('tier,amount_cents,created_at').order('created_at',{ascending:false}).limit(30);
    $('payList').innerHTML=(pay.data||[]).length?(pay.data||[]).map(function(x){return '<li><b>'+esc(A.TIER_NAMES[x.tier]||x.tier||'Purchase')+'</b> · $'+(x.amount_cents/100).toFixed(2)+'<small>'+fmt(x.created_at.slice(0,10))+'</small></li>';}).join(''):'<li><small>No purchases yet.</small></li>';
    /* security */
    $('pwForm').addEventListener('submit',function(e){e.preventDefault();var a=$('nPw').value,b=$('nPw2').value;
      if(!(a.length>=10&&/[a-z]/i.test(a)&&/\d/.test(a)))return msg('pwMsg','At least 10 characters with letters and numbers.','err');if(a!==b)return msg('pwMsg','The two passwords don\u2019t match.','err');
      sb.auth.updateUser({password:a}).then(function(r){if(r.error)throw r.error;return sb.auth.signOut({scope:'others'});}).then(function(){msg('pwMsg','Password changed. Any other device was logged out.','ok');$('pwForm').reset();}).catch(function(err){msg('pwMsg',err.message,'err');});});
    $('emForm').addEventListener('submit',function(e){e.preventDefault();var em=$('nEm').value.trim();if(!em)return;
      sb.auth.updateUser({email:em},{emailRedirectTo:'https://jaxvendorevents.com/account.html'}).then(function(r){if(r.error)throw r.error;msg('emMsg','Check both inboxes: confirm the change from your old and new email.','ok');}).catch(function(err){msg('emMsg',err.message,'err');});});
  });
})();
