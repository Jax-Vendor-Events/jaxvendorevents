/* Jax Vendor Events: "My applications" + "Apply kit" (Vendor Pro). apps.html.
   Data lives in the member database with Row Level Security (owner only, Pro only):
     app_tracker (one row per tracked event), apply_kits (one row per member), kit_shares (share links, via rpc
     kit_share_create / kit_share_revoke), private Storage bucket "kits" (<user id>/photo-RANDOM.jpg, coi-|tax-|license-RANDOM.pdf/jpg/png).
   Free members and visitors get a teaser with the Vendor Pro button; the server refuses them the data anyway. */
(function(){
  'use strict';
  var A=window.JVE_AUTH;if(!A||!A.ready)return;
  var $=function(id){return document.getElementById(id);};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function ico(n){return '<svg class="ico" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
  var ST=[['interested','Interested'],['applied','Applied'],['waitlist','Waitlist'],['approved','Approved'],['paid','Paid'],['done','Done'],['declined','Declined']];
  var STL={};ST.forEach(function(s){STL[s[0]]=s[1];});
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function todayNY(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());}catch(_){var d=new Date();return d.toISOString().slice(0,10);}}
  function pd(s){var p=String(s).split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function days(a,b){return Math.round((pd(b)-pd(a))/864e5);}
  function nice(s){var d=pd(s);return DW[d.getDay()]+', '+MO[d.getMonth()]+' '+d.getDate();}
  function short(s){var d=pd(s);return MO[d.getMonth()]+' '+d.getDate();}
  function money(c){if(c==null)return '';var v=c/100;return '$'+(v%1?v.toFixed(2):String(v));}
  function cents(v){v=String(v||'').replace(/[^0-9.]/g,'');if(!v)return null;var n=Math.round(parseFloat(v)*100);return isFinite(n)&&n>=0?n:null;}
  function rid(){var a=new Uint8Array(10),s='',c='abcdefghijklmnopqrstuvwxyz0123456789';crypto.getRandomValues(a);for(var i=0;i<a.length;i++)s+=c[a[i]%36];return s;}
  function toast(t){var el=$('apToast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){el.classList.remove('show');},2600);}
  var sb,uid,T=todayNY(),rows=[],evById={};

  /* ---------------- tabs ---------------- */
  function tab(name,push){
    ['track','kit'].forEach(function(n){var b=$('tb-'+n),p=$('tab-'+n);var on=n===name;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;p.hidden=!on;});
    if(push){try{history.replaceState(null,'',name==='kit'?'#kit':'#tracker');}catch(_){}}
    if(name==='kit')loadKit();
  }

  /* ---------------- tracker ---------------- */
  function evName(r){var e=r.event_id&&evById[r.event_id];return r.event_name||(e&&e.name)||'Event';}
  function load(){
    return sb.from('app_tracker').select('*').order('updated_at',{ascending:false}).then(function(r){
      if(r.error){$('tkList').innerHTML='<div class="tkempty"><b>Couldn’t load your applications</b>'+esc(r.error.message)+'</div>';return;}
      rows=r.data||[];draw();});
  }
  function counts(){
    var c={approved:0,waiting:0,due:0,dueN:0};
    rows.forEach(function(r){if(r.status==='approved')c.approved++;if(r.status==='applied'||r.status==='waitlist')c.waiting++;
      if(!r.paid&&r.fee_cents&&(r.status==='approved'||(r.fee_due&&r.status!=='declined'&&r.status!=='done'&&r.status!=='interested'))){c.due+=r.fee_cents;c.dueN++;}});
    return c;
  }
  function meta(r){
    var m=[];
    if(r.event_date)m.push('<span>'+ico('cal')+' '+esc(nice(r.event_date))+'</span>');
    var open=r.status==='interested'||r.status==='applied'||r.status==='waitlist';
    if(r.deadline&&r.status==='interested'){var dd=days(T,r.deadline);m.push('<span class="chip'+(dd>=0&&dd<=3?' hot':'')+'">'+(dd<0?'Deadline passed '+short(r.deadline):dd===0?'Apply today':'Apply by '+short(r.deadline)+(dd<=7?' · '+dd+'d':''))+'</span>');}
    else if(r.deadline&&open&&days(T,r.deadline)>=0)m.push('<span class="chip">Deadline '+short(r.deadline)+'</span>');
    if(r.fee_cents!=null){
      if(r.paid)m.push('<span class="chip ok">'+money(r.fee_cents)+' paid</span>');
      else if(r.fee_due&&r.status!=='declined'&&r.status!=='done'){var fd=days(T,r.fee_due);m.push('<span class="chip'+(fd<=3?' hot':'')+'">'+money(r.fee_cents)+' due '+(fd<0?'(late) ':'')+short(r.fee_due)+'</span>');}
      else m.push('<span class="chip">'+money(r.fee_cents)+' fee</span>');
    }
    if(r.notes)m.push('<span>'+ico('list')+' note</span>');
    return m.join('');
  }
  function draw(){
    var c=counts();
    $('tkCount').innerHTML=rows.length?('<span><b>'+c.approved+'</b> approved</span><i>·</i><span><b>'+c.waiting+'</b> waiting</span><i>·</i><span class="'+(c.due?'due':'')+'"><b>'+money(c.due)+'</b> due</span>'):'';
    if(!rows.length){$('tkList').innerHTML='<div class="tkempty"><b>Nothing tracked yet</b>Tap <em>Track this</em> or <em>Apply with my kit</em> on any event, or add a market that isn’t on the site.</div>';return;}
    var h='';
    ST.forEach(function(s){
      var g=rows.filter(function(r){return r.status===s[0];});if(!g.length)return;
      g.sort(function(a,b){return String(a.event_date||a.deadline||'9999').localeCompare(String(b.event_date||b.deadline||'9999'));});
      h+='<section class="tkgroup st-'+s[0]+'"><h3><span class="dot"></span>'+s[1]+' <b>'+g.length+'</b></h3><div class="tklist">'+g.map(function(r){
        return '<article class="tki" data-id="'+esc(r.id)+'"><div class="tkm" data-edit tabindex="0" role="button" aria-label="Edit '+esc(evName(r))+'"><b>'+esc(evName(r))+'</b><small>'+meta(r)+'</small></div>'+
          '<div class="tkr"><select class="tks" aria-label="Status for '+esc(evName(r))+'">'+ST.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===r.status?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+
          '<button type="button" class="tkx" data-edit aria-label="Edit details">'+ico('right')+'</button></div></article>';}).join('')+'</div></section>';
    });
    $('tkList').innerHTML=h;
  }
  function byId(id){for(var i=0;i<rows.length;i++)if(rows[i].id===id)return rows[i];return null;}
  function setStatus(id,st){
    var r=byId(id);if(!r)return;var patch={status:st};if(st==='paid')patch.paid=true;
    sb.from('app_tracker').update(patch).eq('id',id).select().then(function(x){
      if(x.error||!x.data||!x.data.length){toast('Couldn’t save. Try again.');draw();return;}
      Object.assign(r,x.data[0]);draw();toast('Moved to '+STL[st]);});
  }
  /* editor sheet */
  var cur=null;
  function openSheet(r){
    cur=r||null;var f=$('tkForm');f.reset();
    $('edTitle').textContent=r?'Edit application':'Add a market';
    var linked=!!(r&&r.event_id);$('edName').readOnly=linked;$('edLinked').hidden=!linked;
    if(linked){$('edView').href='index.html#e='+encodeURIComponent(r.event_id);}
    $('edName').value=r?evName(r):'';$('edDate').value=r&&r.event_date||'';$('edStatus').value=r?r.status:'interested';
    $('edDeadline').value=r&&r.deadline||'';$('edFee').value=r&&r.fee_cents!=null?(r.fee_cents/100):'';$('edFeeDue').value=r&&r.fee_due||'';
    $('edPaid').checked=!!(r&&r.paid);$('edNotes').value=r&&r.notes||'';
    $('edDel').hidden=!r;$('edIcs').hidden=!r;$('edMsg').textContent='';
    $('apScrim').classList.add('open');var s=$('apSheet');s.hidden=false;requestAnimationFrame(function(){s.classList.add('open');});
    setTimeout(function(){(r?$('edStatus'):$('edName')).focus();},260);
  }
  function closeSheet(){var s=$('apSheet');s.classList.remove('open');$('apScrim').classList.remove('open');setTimeout(function(){s.hidden=true;},260);cur=null;}
  function saveSheet(ev){
    ev.preventDefault();
    var name=$('edName').value.trim();if(!name&&!(cur&&cur.event_id)){$('edMsg').textContent='Give it a name.';$('edMsg').className='apmsg err';return;}
    var fee=$('edFee').value.trim();var fc=fee?cents(fee):null;if(fee&&fc==null){$('edMsg').textContent='Fee should be a number, like 45.';$('edMsg').className='apmsg err';return;}
    var row={event_name:name,event_date:$('edDate').value||null,status:$('edStatus').value,deadline:$('edDeadline').value||null,fee_cents:fc,fee_due:$('edFeeDue').value||null,paid:$('edPaid').checked,notes:$('edNotes').value.slice(0,2000)};
    if(row.status==='paid')row.paid=true;
    var q=cur?sb.from('app_tracker').update(row).eq('id',cur.id).select():sb.from('app_tracker').insert(Object.assign({source:'manual'},row)).select();
    $('edSave').disabled=true;
    q.then(function(x){$('edSave').disabled=false;
      if(x.error||!x.data||!x.data.length){$('edMsg').textContent='Couldn’t save: '+(x.error?x.error.message:'try again');$('edMsg').className='apmsg err';return;}
      if(cur)Object.assign(cur,x.data[0]);else rows.unshift(x.data[0]);draw();closeSheet();toast('Saved');});
  }
  function delCur(){
    if(!cur||!confirm('Delete “'+evName(cur)+'” from your applications?'))return;var id=cur.id;
    sb.from('app_tracker').delete().eq('id',id).then(function(x){if(x.error){$('edMsg').textContent='Couldn’t delete. Try again.';return;}
      rows=rows.filter(function(r){return r.id!==id;});draw();closeSheet();toast('Deleted');});
  }
  /* calendar file (.ics) for tracker dates: deadlines, fee due dates, event dates */
  function icsEsc(s){return String(s||'').replace(/[\\;,]/g,function(c){return '\\'+c;}).replace(/\n/g,'\\n');}
  function addDay(s){var d=pd(s);d.setDate(d.getDate()+1);return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');}
  function vevents(r){
    var n=evName(r),out=[],stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
    function one(kind,date,title){out.push(['BEGIN:VEVENT','UID:jve-'+r.id+'-'+kind+'@jaxvendorevents.com','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+date.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDay(date),'SUMMARY:'+icsEsc(title),'DESCRIPTION:'+icsEsc('From My applications on Jax Vendor Events'+(r.notes?'\n'+r.notes:'')),'TRANSP:TRANSPARENT','END:VEVENT'].join('\r\n'));}
    if(r.deadline)one('deadline',r.deadline,'Apply by: '+n);
    if(r.fee_due&&!r.paid)one('fee',r.fee_due,'Fee due'+(r.fee_cents!=null?' ('+money(r.fee_cents)+')':'')+': '+n);
    if(r.event_date&&r.status!=='declined')one('event',r.event_date,n);
    return out;
  }
  function ics(list,file){
    var ev=[];list.forEach(function(r){ev=ev.concat(vevents(r));});
    if(!ev.length){toast('No dates to add yet');return;}
    var body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Jax Vendor Events//My applications//EN','CALSCALE:GREGORIAN'].concat(ev).concat(['END:VCALENDAR']).join('\r\n');
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([body],{type:'text/calendar'}));a.download=file;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},800);
    toast('Calendar file downloaded');
  }

  /* ---------------- apply kit ---------------- */
  var kit=null,kitLoaded=false,shares=[],DOCS=[['coi','Liability insurance (COI)'],['tax','Florida sales-tax certificate'],['license','Business license']];
  var KF=['business_name','category','description','website','instagram','booth_other','price_range','contact_email','contact_phone'];
  function loadKit(force){
    if(kitLoaded&&!force)return Promise.resolve();
    kitLoaded=true;
    return Promise.all([sb.from('apply_kits').select('*').maybeSingle(),sb.from('kit_shares').select('*').order('created_at',{ascending:false})]).then(function(r){
      if(r[0].error){$('kMsg').textContent='Couldn’t load your kit: '+r[0].error.message;$('kMsg').className='apmsg err';return;}
      kit=r[0].data||null;shares=r[1].data||[];fillKit();drawPhotos();drawDocs();drawShares();});
  }
  function fillKit(){
    var k=kit||{};KF.forEach(function(f){var el=$('k_'+f);if(el)el.value=k[f]||'';});
    if(!kit){var p=A.profile||{};$('k_business_name').value=p.business_name||'';$('k_website').value=p.website||'';}
    var bs=k.booth_size||'10x10';Array.prototype.forEach.call(document.querySelectorAll('input[name=k_booth]'),function(x){x.checked=x.value===bs;});
    $('k_boothOtherRow').hidden=bs!=='other';$('k_electricity').checked=!!k.electricity;$('k_tent').checked=!!k.tent;
    $('kDescN').textContent=String(($('k_description').value||'').length);
  }
  function formKit(){
    var o={};KF.forEach(function(f){o[f]=($('k_'+f).value||'').trim();});
    var b=document.querySelector('input[name=k_booth]:checked');o.booth_size=b?b.value:'10x10';if(o.booth_size!=='other')o.booth_other='';
    o.electricity=$('k_electricity').checked;o.tent=$('k_tent').checked;
    if(o.website&&!/^https?:\/\//i.test(o.website))o.website='https://'+o.website;
    o.instagram=o.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i,'').replace(/\/.*$/,'').replace(/^@?/,o.instagram?'@':'');
    return o;
  }
  function upsertKit(patch){
    return sb.from('apply_kits').upsert(Object.assign({user_id:uid},patch),{onConflict:'user_id'}).select().single().then(function(x){
      if(x.error)throw x.error;var first=!kit;kit=x.data;
      if(first&&!shares.some(live))return sb.rpc('kit_share_create',{days:null,label:'Main link'}).then(function(s){if(!s.error&&s.data){shares.unshift(s.data);drawShares();}return kit;});
      return kit;});
  }
  function saveKit(ev){
    ev.preventDefault();var o=formKit();
    if(!o.business_name){$('kMsg').textContent='Add your business name first.';$('kMsg').className='apmsg err';$('k_business_name').focus();return;}
    if(o.website&&!/^https?:\/\/[^\s<>"]+\.[^\s<>"]+$/i.test(o.website)){$('kMsg').textContent='That website doesn’t look right.';$('kMsg').className='apmsg err';return;}
    $('kSave').disabled=true;$('kMsg').textContent='Saving…';$('kMsg').className='apmsg';
    upsertKit(o).then(function(){$('kSave').disabled=false;fillKit();$('kMsg').textContent='Saved ✓';$('kMsg').className='apmsg ok';})
      .catch(function(e){$('kSave').disabled=false;$('kMsg').textContent='Couldn’t save: '+(e&&e.message||'try again');$('kMsg').className='apmsg err';});
  }
  var urlCache={};
  function signed(paths){
    var need=paths.filter(function(p){var c=urlCache[p];return !c||c.t<Date.now()-50*60e3;});
    if(!need.length)return Promise.resolve();
    return sb.storage.from('kits').createSignedUrls(need,3600).then(function(r){(r.data||[]).forEach(function(x){if(x.signedUrl)urlCache[x.path]={u:x.signedUrl,t:Date.now()};});});
  }
  function drawPhotos(){
    var ph=(kit&&kit.photos)||[];var g=$('kPhotos');
    signed(ph).then(function(){
      g.innerHTML=ph.map(function(p,i){var c=urlCache[p];return '<div class="ph">'+(c?'<img src="'+esc(c.u)+'" alt="Product photo '+(i+1)+'" loading="lazy">':'')+'<button type="button" data-rmph="'+esc(p)+'" aria-label="Remove photo '+(i+1)+'">'+ico('x')+'</button></div>';}).join('')+
        (ph.length<6?'<button type="button" class="phadd" id="kAddPh">'+ico('spark')+'<span>Add photo</span><small>'+(6-ph.length)+' left</small></button>':'');
    });
  }
  function shrink(file){
    /* phone photos: resize to max 1600 px JPEG so uploads stay small and fast */
    return new Promise(function(res){
      if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)&&!/\.(heic|heif)$/i.test(file.name)){res(file);return;}
      var img=new Image(),u=URL.createObjectURL(file);
      img.onload=function(){var m=1600,w=img.naturalWidth,h=img.naturalHeight,s=Math.min(1,m/Math.max(w,h));var c=document.createElement('canvas');c.width=Math.round(w*s);c.height=Math.round(h*s);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(function(b){res(b||file);},'image/jpeg',.86);};
      img.onerror=function(){URL.revokeObjectURL(u);res(file);};img.src=u;});
  }
  function pickPhoto(){
    var inp=$('kPhotoIn');inp.value='';inp.click();
  }
  function onPhoto(){
    var files=Array.prototype.slice.call($('kPhotoIn').files||[]);if(!files.length)return;
    var have=((kit&&kit.photos)||[]).slice();files=files.slice(0,6-have.length);
    var b=$('kAddPh');if(b)b.setAttribute('aria-busy','true');$('kPhMsg').textContent='Uploading…';$('kPhMsg').className='apmsg';
    var chain=Promise.resolve(),added=[];
    files.forEach(function(f){chain=chain.then(function(){return shrink(f);}).then(function(blob){
      if(blob.size>5*1024*1024)throw new Error('“'+f.name+'” is over 5 MB.');
      var t=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
      if(!/^image\/(jpeg|png|webp)$/.test(blob.type))throw new Error('Use a JPG, PNG or WebP photo.');
      var path=uid+'/photo-'+rid()+'.'+t;
      return sb.storage.from('kits').upload(path,blob,{contentType:blob.type,upsert:false}).then(function(r){if(r.error)throw r.error;added.push(path);});});});
    chain.then(function(){return upsertKit({photos:have.concat(added)});}).then(function(){$('kPhMsg').textContent=added.length+' photo'+(added.length===1?'':'s')+' added ✓';$('kPhMsg').className='apmsg ok';drawPhotos();})
      .catch(function(e){$('kPhMsg').textContent=(e&&e.message)||'Upload failed. Try again.';$('kPhMsg').className='apmsg err';
        if(added.length)upsertKit({photos:have.concat(added)}).then(drawPhotos).catch(function(){});else drawPhotos();});
  }
  function rmPhoto(p){
    var ph=((kit&&kit.photos)||[]).filter(function(x){return x!==p;});
    upsertKit({photos:ph}).then(function(){sb.storage.from('kits').remove([p]);drawPhotos();toast('Photo removed');}).catch(function(){toast('Couldn’t remove. Try again.');});
  }
  function drawDocs(){
    var d=(kit&&kit.docs)||{};
    $('kDocs').innerHTML=DOCS.map(function(x){var v=d[x[0]];
      return '<div class="doc'+(v?' has':'')+'"><span class="di">'+ico(v?'check':'shield')+'</span><span><b>'+x[1]+'</b><small>'+(v?esc(v.name||'Uploaded')+' ✓':'PDF, JPG or PNG · up to 5 MB')+'</small></span><span class="dact">'+
        (v?'<button type="button" data-viewdoc="'+x[0]+'">View</button><button type="button" data-rmdoc="'+x[0]+'" aria-label="Remove '+x[1]+'">'+ico('x')+'</button>':'<button type="button" data-updoc="'+x[0]+'">Upload</button>')+'</span></div>';}).join('');
  }
  var docKind=null;
  function pickDoc(kind){docKind=kind;var inp=$('kDocIn');inp.value='';inp.click();}
  function onDoc(){
    var f=($('kDocIn').files||[])[0];if(!f||!docKind)return;var kind=docKind;
    var t=f.type==='application/pdf'||/\.pdf$/i.test(f.name)?'pdf':f.type==='image/png'?'png':/^image\/jpe?g$/.test(f.type)?'jpg':'';
    if(!t){$('kDocMsg').textContent='Use a PDF, JPG or PNG.';$('kDocMsg').className='apmsg err';return;}
    if(f.size>5*1024*1024){$('kDocMsg').textContent='That file is over 5 MB. Try a smaller scan or a PDF.';$('kDocMsg').className='apmsg err';return;}
    var path=uid+'/'+kind+'-'+rid()+'.'+t,old=kit&&kit.docs&&kit.docs[kind];
    $('kDocMsg').textContent='Uploading…';$('kDocMsg').className='apmsg';
    sb.storage.from('kits').upload(path,f,{contentType:t==='pdf'?'application/pdf':t==='png'?'image/png':'image/jpeg',upsert:false}).then(function(r){
      if(r.error)throw r.error;var docs=Object.assign({},(kit&&kit.docs)||{});docs[kind]={path:path,name:String(f.name||kind).slice(0,120),uploaded_at:new Date().toISOString()};
      return upsertKit({docs:docs});}).then(function(){if(old&&old.path)sb.storage.from('kits').remove([old.path]);drawDocs();$('kDocMsg').textContent='Uploaded ✓';$('kDocMsg').className='apmsg ok';})
      .catch(function(e){$('kDocMsg').textContent='Upload failed: '+((e&&e.message)||'try again');$('kDocMsg').className='apmsg err';});
  }
  function viewDoc(kind){
    var v=kit&&kit.docs&&kit.docs[kind];if(!v)return;var w=window.open('about:blank','_blank');
    sb.storage.from('kits').createSignedUrl(v.path,300).then(function(r){if(r.data&&r.data.signedUrl){if(w)w.location=r.data.signedUrl;else location.href=r.data.signedUrl;}else{if(w)w.close();toast('Couldn’t open the file.');}});
  }
  function rmDoc(kind){
    var v=kit&&kit.docs&&kit.docs[kind];if(!v||!confirm('Remove this document from your kit?'))return;
    var docs=Object.assign({},kit.docs);delete docs[kind];
    upsertKit({docs:docs}).then(function(){sb.storage.from('kits').remove([v.path]);drawDocs();toast('Removed');}).catch(function(){toast('Couldn’t remove. Try again.');});
  }
  function live(s){return !s.revoked_at&&(!s.expires_at||new Date(s.expires_at)>new Date());}
  function shareUrl(s){return new URL('kit.html#k='+s.token,location.href).href;}
  function drawShares(){
    var el=$('kLinks');
    if(!shares.length){el.innerHTML='<p class="apmsg">'+(kit?'No links yet.':'Save your kit first, then share it.')+'</p>';return;}
    el.innerHTML=shares.map(function(s){var on=live(s);var st=s.revoked_at?'Revoked':(!on?'Expired':(s.expires_at?'Until '+short(String(s.expires_at).slice(0,10)):'Active'));
      return '<div class="lnk'+(on?'':' off')+'"><div class="lt"><span>'+esc(s.label||'Share link')+'</span><i>'+st+'</i></div><input type="text" readonly value="'+esc(shareUrl(s))+'" aria-label="Share link">'+
        '<small>Opened '+(s.open_count||0)+'×'+(s.last_opened_at?' · last '+short(String(s.last_opened_at).slice(0,10)):'')+'</small>'+
        (on?'<div class="dact"><button type="button" class="btn sm" data-copylink="'+esc(s.id)+'">Copy link</button><details class="cm-lm"><summary aria-label="More for this link"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></summary><div><button type="button" data-openlink="'+esc(s.id)+'">Preview</button><button type="button" data-revoke="'+esc(s.id)+'">Revoke</button></div></details></div>':'')+'</div>';}).join('');
  }
  function copy(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);return Promise.reject();}
  function mkShare(){
    if(!kit){$('kShMsg').textContent='Save your kit first.';$('kShMsg').className='apmsg err';return;}
    var dv=$('kExp').value,days=dv?parseInt(dv,10):null,label=$('kLabel').value.trim()||(days?days+'-day link':'Share link');
    $('kMk').disabled=true;
    sb.rpc('kit_share_create',{days:days,label:label}).then(function(r){$('kMk').disabled=false;
      if(r.error||!r.data){$('kShMsg').textContent='Couldn’t make a link: '+(r.error?r.error.message:'try again');$('kShMsg').className='apmsg err';return;}
      shares.unshift(r.data);drawShares();$('kLabel').value='';var u=shareUrl(r.data);
      copy(u).then(function(){$('kShMsg').textContent='New link copied ✓';$('kShMsg').className='apmsg ok';},function(){$('kShMsg').textContent='New link ready below.';$('kShMsg').className='apmsg ok';});});
  }
  function revoke(id){
    if(!confirm('Revoke this link? Anyone who has it won’t be able to open your kit anymore.'))return;
    sb.rpc('kit_share_revoke',{sid:id}).then(function(r){if(r.error||!r.data){toast('Couldn’t revoke. Try again.');return;}
      shares.forEach(function(s){if(s.id===id)s.revoked_at=new Date().toISOString();});drawShares();toast('Link revoked');});
  }

  /* ---------------- boot ---------------- */
  function teaser(){$('apTeaser').hidden=false;$('apPro').hidden=true;}
  function boot(){
    var full=!!(A.user&&(A.access==='full'||A.admin));
    document.documentElement.classList.remove('ap-wait');
    var pn=document.querySelectorAll('[data-nav=pro]');for(var i=0;i<pn.length;i++)pn[i].setAttribute('aria-current','page');
    if(!full){teaser();return;}
    sb=A.sb;uid=A.user.id;$('apPro').hidden=false;
    var d=window.JVE_DATA&&window.JVE_DATA.events;(d||[]).forEach(function(e){evById[e.id]=e;});
    $('tb-track').addEventListener('click',function(){tab('track',true);});$('tb-kit').addEventListener('click',function(){tab('kit',true);});
    document.querySelector('.aptabs').addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='ArrowLeft'){var k=$('tb-kit').getAttribute('aria-selected')==='true';tab(k?'track':'kit',true);(k?$('tb-track'):$('tb-kit')).focus();}});
    tab(/^#kit/.test(location.hash)?'kit':'track',false);
    load();
    $('tkAdd').addEventListener('click',function(){openSheet(null);});
    $('tkIcs').addEventListener('click',function(){ics(rows.filter(function(r){return r.status!=='declined'&&r.status!=='done';}),'my-applications.ics');});
    $('tkList').addEventListener('change',function(e){var s=e.target.closest('.tks');if(!s)return;setStatus(s.closest('.tki').getAttribute('data-id'),s.value);});
    $('tkList').addEventListener('click',function(e){var x=e.target.closest('[data-edit]');if(!x)return;openSheet(byId(x.closest('.tki').getAttribute('data-id')));});
    $('tkList').addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.matches('.tkm')){e.preventDefault();openSheet(byId(e.target.closest('.tki').getAttribute('data-id')));}});
    $('tkForm').addEventListener('submit',saveSheet);$('edCancel').addEventListener('click',closeSheet);$('apScrim').addEventListener('click',closeSheet);
    $('edDel').addEventListener('click',delCur);$('edIcs').addEventListener('click',function(){if(cur)ics([cur],evName(cur).replace(/[^\w]+/g,'-').slice(0,40)+'.ics');});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('apSheet').classList.contains('open'))closeSheet();});
    $('kitForm').addEventListener('submit',saveKit);
    $('k_description').addEventListener('input',function(){$('kDescN').textContent=String(this.value.length);});
    Array.prototype.forEach.call(document.querySelectorAll('input[name=k_booth]'),function(x){x.addEventListener('change',function(){$('k_boothOtherRow').hidden=x.value!=='other'||!x.checked;});});
    $('kPhotos').addEventListener('click',function(e){var a=e.target.closest('#kAddPh');if(a){pickPhoto();return;}var r=e.target.closest('[data-rmph]');if(r)rmPhoto(r.getAttribute('data-rmph'));});
    $('kPhotoIn').addEventListener('change',onPhoto);$('kDocIn').addEventListener('change',onDoc);
    $('kDocs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
      if(b.dataset.updoc)pickDoc(b.dataset.updoc);else if(b.dataset.viewdoc)viewDoc(b.dataset.viewdoc);else if(b.dataset.rmdoc)rmDoc(b.dataset.rmdoc);});
    $('kMk').addEventListener('click',mkShare);
    $('kLinks').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var s=shares.filter(function(x){return x.id===(b.dataset.copylink||b.dataset.openlink||b.dataset.revoke);})[0];if(!s)return;
      if(b.dataset.copylink)copy(shareUrl(s)).then(function(){toast('Link copied');},function(){var i=b.closest('.lnk').querySelector('input');i.select();toast('Press and hold to copy');});
      else if(b.dataset.openlink)window.open(shareUrl(s),'_blank','noopener');
      else if(b.dataset.revoke)revoke(s.id);});
    window.addEventListener('hashchange',function(){if(location.hash==='#kit')tab('kit',false);else if(location.hash==='#tracker')tab('track',false);});
  }
  A.ready.then(function(){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();});
})();
