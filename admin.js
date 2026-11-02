/* Jax Vendor Events: admin (admin.html). The page is hidden from non-admins, and every call below is
   refused by the server unless the logged-in account is in the admins table (set server-side only). */
(function(){
  'use strict';
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function msg(t,k){var m=$('admMsg');m.className='amsg show '+(k||'info');m.textContent=t;clearTimeout(msg.t);msg.t=setTimeout(function(){m.className='amsg';},6000);}
  function fmt(d){if(!d)return '—';var x=new Date(d);return x.toLocaleDateString('en-US',{month:'short',day:'numeric'})+(d.length>10?' '+x.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'');}
  window.JVE_AUTH.ready.then(function(A){
    if(!A.admin){location.replace('account.html?why=admin');return;}
    var sb=A.sb,T=A.TIER_NAMES,users=[];
    var tabs=document.querySelectorAll('.adm-tabs button');
    function show(n){Array.prototype.forEach.call(tabs,function(b){var on=b.getAttribute('data-p')===n;b.setAttribute('aria-selected',on);$('p-'+b.getAttribute('data-p')).hidden=!on;});LOAD[n]&&LOAD[n]();}
    Array.prototype.forEach.call(tabs,function(b){b.addEventListener('click',function(){show(b.getAttribute('data-p'));});});
    function tierOpts(){return Object.keys(T).map(function(k){return '<option value="'+k+'">'+esc(T[k])+'</option>';}).join('');}
    var brands=[];
    var LOAD={
      brands:async function(){var r=await sb.rpc('admin_brands');if(r.error)return msg(r.error.message,'err');var rows=r.data||[],BR=window.JVE_BRAND;brands=rows;
        $('bCount').textContent=rows.length+' profiles \u00b7 '+rows.filter(function(x){return x.hidden;}).length+' hidden';
        function im(p,label,hid){var u=BR&&BR.img(p);if(!u)return '';var off=hid.indexOf(p)>=0;return '<div class="bm-img'+(off?' off':'')+'" data-path="'+esc(p)+'"><img src="'+esc(u)+'" alt="'+esc(label)+'" loading="lazy"><small>'+esc(label)+'</small><button type="button" data-act="bimg">'+(off?'Unhide':'Hide')+'</button></div>';}
        $('bList').innerHTML=rows.length?rows.map(function(x){var hid=x.hidden_paths||[];var imgs=[im(x.raw_logo,'logo',hid),im(x.raw_cover,'cover',hid)].concat((x.raw_photos||[]).map(function(p,i){return im(p,'photo '+(i+1),hid);})).join('');
          return '<div class="bm-row" data-uid="'+esc(x.user_id)+'"><div class="bm-head">'+(BR&&BR.img(x.raw_logo)?'<img class="bl-logo" src="'+esc(BR.img(x.raw_logo))+'" alt="" style="--bc:'+esc(BR.color(x.color))+'">':'<span class="bl-logo bl-mono" style="background:'+esc(BR?BR.color(x.color):'#0d6e6e')+';color:#fff">'+esc((x.name||'?').charAt(0).toUpperCase())+'</span>')+
            '<div><div class="who">'+esc(x.name)+(x.hidden?' <span class="st rejected">hidden</span>':'')+(x.listed?'':' <span class="st">not listed</span>')+'</div><div class="meta">'+esc(x.kind)+' \u00b7 '+esc(x.email||'')+' \u00b7 <a href="profile.html?u='+encodeURIComponent(x.slug)+'" target="_blank" rel="noopener">/'+esc(x.slug)+'</a></div></div></div>'+
            (x.tagline?'<div class="meta">'+esc(x.tagline)+'</div>':'')+(imgs?'<div class="bm-imgs">'+imgs+'</div>':'')+
            '<div class="btnrow"><button class="btn sm '+(x.hidden?'':'ghost')+'" data-act="bhide">'+(x.hidden?'Unhide profile':'Hide profile')+'</button></div></div>';}).join(''):'<p class="meta">No brand profiles yet.</p>';},
      users:async function(){var r=await sb.rpc('admin_users');if(r.error)return msg(r.error.message,'err');users=r.data||[];
        var f=($('uFind').value||'').toLowerCase();
        var list=users.filter(function(x){return !f||(x.email+' '+x.full_name+' '+x.business_name).toLowerCase().indexOf(f)>=0;});
        $('uCount').textContent=users.length+' accounts · '+users.filter(function(x){return (x.tiers||[]).length;}).length+' paying';
        $('uList').innerHTML=list.map(function(x){return '<div class="urow" data-uid="'+x.id+'"><div class="who">'+esc(x.full_name||'(no name)')+(x.is_admin?' <span class="st">admin</span>':'')+'</div>'+
          '<div class="meta">'+esc(x.email)+(x.business_name?' · '+esc(x.business_name):'')+' · '+esc(x.account_type)+'<br>joined '+fmt(x.created_at)+' · last login '+fmt(x.last_sign_in_at)+(x.email_confirmed_at?'':' · <b>email not confirmed</b>')+'</div>'+
          '<div class="meta">'+((x.tiers||[]).length?(x.tiers||[]).map(function(t){return '<span class="tierpill'+(t==='vendor-pro'?' gold':'')+'">'+esc(T[t]||t)+'</span>';}).join(''):'<span class="tierpill free">Free</span>')+'</div>'+
          '<div class="ctl"><select aria-label="Tier">'+tierOpts()+'</select><input type="date" aria-label="Until (optional)"><button class="btn sm" data-act="give">Give tier</button><button class="btn sm ghost" data-act="take">Remove tier</button></div></div>';}).join('')||'<p class="meta">No accounts match.</p>';},
      sales:async function(){var r=await sb.from('payments').select('*').order('created_at',{ascending:false}).limit(200);if(r.error)return msg(r.error.message,'err');
        var rows=r.data||[],tot=0,month=0,m0=new Date().toISOString().slice(0,7);rows.forEach(function(x){tot+=x.amount_cents;if(String(x.created_at).slice(0,7)===m0)month+=x.amount_cents;});
        if(!users.length){var u=await sb.rpc('admin_users');users=u.data||[];}
        var uopts='<option value="">Assign to account…</option>'+users.map(function(x){return '<option value="'+x.id+'">'+esc(x.email)+'</option>';}).join('');
        $('sStats').innerHTML='<div><b>$'+(month/100).toFixed(0)+'</b><small>this month</small></div><div><b>$'+(tot/100).toFixed(0)+'</b><small>all time</small></div><div><b>'+rows.filter(function(x){return !x.user_id;}).length+'</b><small>unmatched</small></div>';
        $('sList').innerHTML=rows.length?rows.map(function(x){var who=users.filter(function(u){return u.id===x.user_id;})[0];
          return '<li data-pay="'+esc(x.id)+'"><b>'+esc(T[x.tier]||x.tier||'?')+'</b> · $'+(x.amount_cents/100).toFixed(2)+(x.livemode===false?' <span class="st">test</span>':'')+'<small>'+fmt(x.created_at)+' · '+esc(x.email)+(x.name_field?' · “'+esc(x.name_field)+'”':'')+' · '+(who?'account: '+esc(who.email):'<b>not attached to an account</b>')+'</small>'+
            (x.user_id?'':'<div class="ctl" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><select class="asg">'+uopts+'</select><button class="btn sm" data-act="assign">Attach</button></div>')+'</li>';}).join(''):'<li><small>No sales yet.</small></li>';},
      reqs:async function(){var r=await sb.from('listing_requests').select('*').order('created_at',{ascending:false}).limit(100);if(r.error)return msg(r.error.message,'err');
        if(!users.length){var u=await sb.rpc('admin_users');users=u.data||[];}
        var L={new_event:'New event listing',edit_event:'Listing update',remove_event:'Remove listing',vendor_profile:'Vendor profile',sponsor_details:'Sponsor details'};
        var rows=r.data||[];$('rCount').textContent=rows.filter(function(x){return x.status==='pending';}).length+' waiting';
        $('rList').innerHTML=rows.length?rows.map(function(x){var who=users.filter(function(u){return u.id===x.user_id;})[0];
          return '<li data-req="'+x.id+'"><span class="st '+x.status+'">'+x.status+'</span> <b>'+esc(L[x.kind]||x.kind)+'</b>'+(x.event_id?' · '+esc(x.event_id):'')+'<small>'+fmt(x.created_at)+' · '+esc(who?who.email:'?')+(x.admin_note?' · '+esc(x.admin_note):'')+'</small><pre class="payload">'+esc(JSON.stringify(x.payload,null,1))+'</pre>'+
            (x.status==='pending'?'<div class="btnrow"><button class="btn sm" data-act="approve">Approve</button><button class="btn sm ghost" data-act="reject">Reject</button></div>':'')+'</li>';}).join(''):'<li><small>No requests yet.</small></li>';},
      paid:async function(){var r=await sb.from('site_data').select('doc').eq('key','paid').maybeSingle();if(r.error)return msg(r.error.message,'err');
        var d=(r.data&&r.data.doc)||{},keys=['featured_events','deadline_spotlights','organizer_plus','newsletter_sponsors','directory_sponsor','featured_vendors','vendor_pro'],h='';
        keys.forEach(function(k){(d[k]||[]).forEach(function(x,i){h+='<li data-list="'+k+'" data-idx="'+i+'"><b>'+esc(k.replace(/_/g,' '))+'</b> · '+esc(x.name||x.event_id||x.profile_id||'')+'<small>'+esc((x.from||'')+' → '+(x.until||'open'))+(x.order?' · order '+esc(String(x.order).slice(-8)):'')+'</small><div class="btnrow"><button class="btn sm ghost" data-act="unpaid">Remove</button></div></li>';});});
        $('pList').innerHTML=h||'<li><small>No paid placements running.</small></li>';},
      log:async function(){var r=await sb.from('audit_log').select('*').order('created_at',{ascending:false}).limit(60);if(r.error)return msg(r.error.message,'err');
        $('lList').innerHTML=(r.data||[]).map(function(x){return '<li><b>'+esc(x.action)+'</b><small>'+fmt(x.created_at)+' · '+esc(JSON.stringify(x.detail))+'</small></li>';}).join('')||'<li><small>Empty.</small></li>';}
    };
    $('uFind').addEventListener('input',function(){LOAD.users();});
    document.addEventListener('click',async function(e){var b=e.target.closest&&e.target.closest('[data-act]');if(!b)return;var act=b.getAttribute('data-act');e.preventDefault();
      try{
        if(act==='give'||act==='take'){var row=b.closest('.urow'),uid=row.getAttribute('data-uid'),t=row.querySelector('select').value,until=row.querySelector('input[type=date]').value||null;
          var who=users.filter(function(x){return x.id===uid;})[0];
          if(!confirm((act==='give'?'Give ':'Remove ')+(T[t]||t)+(act==='give'?' to ':' from ')+(who?who.email:'this account')+'?'))return;
          var r=await sb.rpc('admin_set_tier',{target:uid,t:t,on_off:act==='give',until_date:until,why:'admin page'});if(r.error)throw r.error;msg('Done.','ok');LOAD.users();}
        else if(act==='approve'||act==='reject'){var li=b.closest('li'),id=+li.getAttribute('data-req');var note=act==='reject'?(prompt('Reason (the member sees this):','')||''):'';
          var r2=await sb.rpc('admin_review_request',{req:id,approve:act==='approve',why:note});if(r2.error)throw r2.error;msg(act==='approve'?'Approved and live.':'Rejected.','ok');LOAD.reqs();}
        else if(act==='assign'){var li2=b.closest('li'),uid2=li2.querySelector('select').value;if(!uid2)return msg('Pick the account first.','err');
          var r3=await sb.rpc('admin_assign_payment',{pay:li2.getAttribute('data-pay'),target:uid2});if(r3.error)throw r3.error;msg('Attached; the tier is on that account now.','ok');users=[];LOAD.sales();}
        else if(act==='bhide'||act==='bimg'){var row5=b.closest('.bm-row'),uid5=row5.getAttribute('data-uid'),x5=brands.filter(function(z){return z.user_id===uid5;})[0];if(!x5)return;
          var hid5=(x5.hidden_paths||[]).slice(),hide5=!!x5.hidden;
          if(act==='bhide'){hide5=!hide5;if(hide5&&!confirm('Hide '+x5.name+' from the directory and its public page?'))return;}
          else{var pth=b.closest('.bm-img').getAttribute('data-path');var k5=hid5.indexOf(pth);if(k5>=0)hid5.splice(k5,1);else hid5.push(pth);}
          var r5=await sb.rpc('admin_brand_moderate',{uid:uid5,hide:hide5,hidden_paths:hid5,note:null});if(r5.error)throw r5.error;msg(act==='bhide'?(hide5?'Profile hidden.':'Profile visible again.'):'Image updated.','ok');LOAD.brands();}
        else if(act==='unpaid'){var li3=b.closest('li');if(!confirm('Take this placement down now?'))return;
          var r4=await sb.rpc('admin_paid_remove',{list:li3.getAttribute('data-list'),idx:+li3.getAttribute('data-idx'),why:'admin page'});if(r4.error)throw r4.error;msg('Removed.','ok');LOAD.paid();}
      }catch(err){msg(err.message||String(err),'err');}});
    show('users');
  });
})();
