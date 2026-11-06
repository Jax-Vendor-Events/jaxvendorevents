/* Jax Vendor Events: Brand profile editor (account.html, #brandBox). The member's own row in brand_profiles
   (Row Level Security: only their own) and their own folder in the 'brand' storage bucket (policy: <user id>/...).
   Images are checked (PNG/JPG/WebP only, never SVG), re-encoded here to a small WebP/JPEG/PNG under 2 MB, and the
   bucket refuses anything else or anything bigger. All text is saved as plain text and drawn with textContent. */
(function(){
  'use strict';
  var BR=window.JVE_BRAND,box=document.getElementById('brandBox');if(!box||!BR)return;
  function $(id){return document.getElementById(id);}
  function msg(t,k){var m=$('brMsg');m.className='amsg show '+(k||'info');m.textContent=t;}
  var MAX_IN=15*1024*1024,MAX_OUT=2*1024*1024;
  var SW=['#0d6e6e','#c4461a','#c98a1b','#1f4e79','#7a2e8e','#b3264a','#2f7d32','#111418'];
  var VCATS=['Jewelry & accessories','Art & prints','Clothing & apparel','Candles & home','Bath & body','Crafts & gifts','Food & baked goods','Food truck / prepared food','Produce & farm','Plants & flowers','Kids & toys','Pets','Vintage & thrift','Health & wellness','Services','Other'];
  var OCATS=['Farmers market','Craft fair','Holiday market','Night market','Festival','Pop-up market','Flea market','Campus market','Art walk','Food truck rally'];
  var REG=['Northeast','Panhandle','North Central','Central','Tampa Bay','Southwest','Southeast','Keys'];
  function rnd(){var a=new Uint8Array(9);crypto.getRandomValues(a);return Array.prototype.map.call(a,function(x){return (x%36).toString(36);}).join('');}
  function slugify(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,34).replace(/-+$/,'');}
  function clean(s,max){return String(s||'').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);}
  function cleanBio(s){return String(s||'').replace(/[\u0000-\u0009\u000b-\u001f\u007f<>]/g,'').replace(/\n{3,}/g,'\n\n').trim().slice(0,600);}
  function social(kind,v){v=String(v||'').trim();if(!v)return null;
    if(/^https?:\/\//i.test(v)){if(!/^https?:\/\/[^\s"'<>]+$/i.test(v))return false;if(kind==='website')return v;v=v.replace(/^http:/i,'https:');
      var ok={instagram:/^https:\/\/(www\.)?instagram\.com\//i,facebook:/^https:\/\/(www\.|m\.)?(facebook|fb)\.com\//i,tiktok:/^https:\/\/(www\.)?tiktok\.com\//i}[kind];return ok.test(v)?v:false;}
    if(kind==='website'){return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s"'<>]*)?$/i.test(v)?'https://'+v:false;}
    var h=v.replace(/^@/,'').replace(/^(www\.)?(instagram|facebook|fb|tiktok)\.com\//i,'').replace(/\/+$/,'');
    if(!/^[A-Za-z0-9._-]{1,60}$/.test(h))return false;
    return kind==='instagram'?'https://instagram.com/'+h:kind==='facebook'?'https://facebook.com/'+h:'https://www.tiktok.com/@'+h.replace(/^@/,'');}
  function handle(u){if(!u)return '';var m=String(u).match(/(?:instagram\.com|facebook\.com|fb\.com|tiktok\.com)\/@?([^/?#]+)/i);return m?'@'+m[1]:u;}

  /* ---------- image: check, crop, re-encode ---------- */
  async function sniff(file){var b=new Uint8Array(await file.slice(0,16).arrayBuffer());
    if(b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47)return 'png';
    if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'jpg';
    if(b[0]===0x52&&b[1]===0x49&&b[2]===0x46&&b[3]===0x46&&b[8]===0x57&&b[9]===0x45&&b[10]===0x42&&b[11]===0x50)return 'webp';
    return null;}
  function decode(file){
    if(window.createImageBitmap)return createImageBitmap(file,{imageOrientation:'from-image'}).catch(function(){return viaImg(file);});
    return viaImg(file);}
  function viaImg(file){return new Promise(function(res,rej){var u=URL.createObjectURL(file),im=new Image();im.onload=function(){res(im);};im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('That image could not be opened.'));};im.src=u;});}
  function toBlob(cv,type,q){return new Promise(function(res){cv.toBlob(function(b){res(b);},type,q);});}
  async function prepare(file,kind){
    if(!file)throw new Error('No file picked.');
    if(/svg/i.test(file.type)||/\.svgz?$/i.test(file.name||''))throw new Error('SVG files aren\u2019t allowed. Please use a PNG, JPG or WebP image.');
    if(!/^image\/(png|jpeg|webp)$/i.test(file.type||''))throw new Error('Please use a PNG, JPG or WebP image.');
    if(file.size>MAX_IN)throw new Error('That file is over 15 MB. Please pick a smaller image.');
    var real=await sniff(file);if(!real)throw new Error('That file isn\u2019t a real PNG, JPG or WebP image.');
    var src=await decode(file),w=src.width||src.naturalWidth,h=src.height||src.naturalHeight;if(!w||!h)throw new Error('That image could not be opened.');
    var sx=0,sy=0,sw=w,sh=h,ow,oh;
    if(kind==='logo'){var s=Math.min(w,h);sx=(w-s)/2;sy=(h-s)/2;sw=sh=s;ow=oh=Math.min(512,s);}
    else if(kind==='cover'){var r=3;if(w/h>r){sw=h*r;sx=(w-sw)/2;}else{sh=w/r;sy=(h-sh)/2;}ow=Math.min(1500,Math.round(sw));oh=Math.round(ow/r);}
    else{var k=Math.min(1,1280/Math.max(w,h));ow=Math.round(w*k);oh=Math.round(h*k);}
    var cv=document.createElement('canvas');cv.width=ow;cv.height=oh;var cx=cv.getContext('2d');cx.imageSmoothingQuality='high';cx.drawImage(src,sx,sy,sw,sh,0,0,ow,oh);
    if(src.close)try{src.close();}catch(_){}
    var qs=[0.86,0.76,0.62],b=null,ext='webp';
    for(var i=0;i<qs.length;i++){b=await toBlob(cv,'image/webp',qs[i]);
      if(!b||b.type!=='image/webp'){ /* this browser can't write WebP */
        if(kind==='logo'){b=await toBlob(cv,'image/png');ext='png';if(b&&b.size>MAX_OUT){b=await toBlob(cv,'image/jpeg',qs[i]);ext='jpg';}}
        else{b=await toBlob(cv,'image/jpeg',qs[i]);ext='jpg';}}
      else ext='webp';
      if(b&&b.size<=MAX_OUT)break;}
    if(!b||b.size>MAX_OUT)throw new Error('That image is still over 2 MB after shrinking. Please pick a smaller one.');
    return {blob:b,ext:ext,type:ext==='webp'?'image/webp':ext==='png'?'image/png':'image/jpeg'};}

  window.JVE_AUTH.ready.then(async function(A){
    if(!A.user)return;
    var sb=A.sb,uid=A.user.id,prof=A.profile||{};
    var st={row:null,logo:null,cover:null,photos:[],cats:[],color:SW[0],listed:true,kind:prof.account_type==='organizer'?'organizer':'vendor'};
    var r=await sb.from('brand_profiles').select('*').eq('user_id',uid).maybeSingle();
    var mod=await sb.from('brand_moderation').select('hidden,hidden_paths').eq('user_id',uid).maybeSingle();
    if(r.data){var d=r.data;st.row=d;st.logo=d.logo_path;st.cover=d.cover_path;st.photos=(d.photos||[]).slice();st.cats=(d.categories||[]).slice();st.color=d.color||SW[0];st.listed=d.listed!==false;st.kind=d.kind;}
    var hiddenAll=!!(mod.data&&mod.data.hidden),hp=(mod.data&&mod.data.hidden_paths)||[];
    /* ---------- form ---------- */
    box.innerHTML=''+
'<div class="br-top"><p class="hint" style="margin:0">Your public page in the directory. Free for every account.</p><a class="br-view" id="brView" hidden target="_blank" rel="noopener">View public profile \u2192</a></div>'+
'<div class="amsg" id="brMod"></div>'+
'<form class="form" id="brForm" novalidate>'+
' <div class="br-media"><div><div class="br-logo" id="brLogoPrev">Logo</div><div class="br-acts"><button type="button" class="btn sm" data-pick="logo">Upload</button><button type="button" class="btn sm ghost" data-clear="logo" hidden>Remove</button></div></div>'+
'  <div><div class="br-cover" id="brCoverPrev">Cover image (optional)</div><div class="br-acts"><button type="button" class="btn sm ghost" data-pick="cover">Upload cover</button><button type="button" class="btn sm ghost" data-clear="cover" hidden>Remove</button></div></div></div>'+
' <p class="hint">PNG, JPG or WebP. Logos are cropped square and resized to 512px; covers to a wide 3:1 banner. No SVG.</p>'+
' <input type="file" class="br-file" id="brFile" accept="image/png,image/jpeg,image/webp">'+
' <input type="file" class="br-file" id="brFiles" accept="image/png,image/jpeg,image/webp" multiple>'+
' <div class="row"><label for="brName">Business name <span class="br-count" id="cName"></span></label><input id="brName" maxlength="60" required autocomplete="organization"></div>'+
' <div class="row"><label for="brTag">Tagline <span class="br-count" id="cTag"></span></label><input id="brTag" maxlength="80" placeholder="One short line about you"></div>'+
' <div class="row"><label>Brand color</label><div class="br-colors" id="brSw"></div><p class="hint">Used as the accent on your public profile.</p></div>'+
' <div class="row"><label for="brKind">Show me as</label><select id="brKind"><option value="vendor">Vendor</option><option value="organizer">Organizer (I run events)</option></select></div>'+
' <div class="row"><label for="brBio">Short bio <span class="br-count" id="cBio"></span></label><textarea id="brBio" rows="4" maxlength="600" placeholder="Who you are and what makes your booth worth a stop"></textarea></div>'+
' <div class="row"><label id="brCatL">What you sell (pick all that apply)</label><div class="br-chips" id="brCats" role="group" aria-labelledby="brCatL"></div></div>'+
' <div class="row"><label for="brWhat" id="brWhatL">Products, in your words</label><input id="brWhat" maxlength="200"></div>'+
' <div class="two row"><div><label for="brCity">City</label><input id="brCity" maxlength="60" autocomplete="address-level2"></div><div><label for="brRegion">Region</label><select id="brRegion"><option value="">Pick one</option></select></div></div>'+
' <p class="br-sub">Links</p>'+
' <div class="row"><label for="brWeb">Website</label><input id="brWeb" maxlength="300" inputmode="url" placeholder="https://yourshop.com"></div>'+
' <div class="two row"><div><label for="brIg">Instagram</label><input id="brIg" maxlength="200" placeholder="@yourhandle"></div><div><label for="brFb">Facebook</label><input id="brFb" maxlength="200" placeholder="page name or link"></div></div>'+
' <div class="row"><label for="brTt">TikTok</label><input id="brTt" maxlength="200" placeholder="@yourhandle"></div>'+
' <p class="br-sub">Photos <span class="br-count" id="cPh"></span></p><p class="hint" style="margin-top:0">Up to 6 product or booth photos.</p><div class="br-photos" id="brPhotos"></div>'+
' <p class="br-sub">Public contact (optional)</p>'+
' <label class="check"><input type="checkbox" id="brShowC"> <span>Show a contact on my public profile. Your login email and phone are never shown unless you add them here.</span></label>'+
' <div class="two row" id="brCRow" hidden><div><label for="brPEm">Public email</label><input id="brPEm" type="email" maxlength="120" inputmode="email"></div><div><label for="brPPh">Public phone</label><input id="brPPh" type="tel" maxlength="20" inputmode="tel"></div></div>'+
' <label class="check"><input type="checkbox" id="brListed"> <span>List my profile in the Vendor &amp; organizer directory</span></label>'+
' <div class="br-perk" id="brPerk"></div>'+
' <div class="btnrow" style="margin-top:16px"><button class="btn" type="submit" id="brSave">Save brand profile</button></div><div class="amsg" id="brMsg" role="status" aria-live="polite"></div>'+
'</form>';
    var f=$('brForm');
    if(hiddenAll){var mm=$('brMod');mm.className='amsg show err';mm.textContent='Your profile is hidden by the site admin right now, so only you can see it. Reply to any of our emails if you think that\u2019s a mistake.';}
    function fill(){var d=st.row||{};
      $('brName').value=d.business_name||prof.business_name||'';$('brTag').value=d.tagline||'';$('brBio').value=d.bio||'';$('brWhat').value=d.what||'';$('brCity').value=d.city||'';
      $('brKind').value=st.kind;$('brWeb').value=d.website||prof.website||'';$('brIg').value=handle(d.instagram);$('brFb').value=handle(d.facebook);$('brTt').value=handle(d.tiktok);
      $('brPEm').value=d.public_email||'';$('brPPh').value=d.public_phone||'';$('brShowC').checked=!!(d.public_email||d.public_phone);$('brCRow').hidden=!$('brShowC').checked;$('brListed').checked=st.listed;
      var rs=$('brRegion');REG.forEach(function(x){var o=document.createElement('option');o.value=x;o.textContent=x+' Florida';rs.appendChild(o);});
      var RM={ne:'Northeast',panhandle:'Panhandle',nc:'North Central',central:'Central',tampa:'Tampa Bay',sw:'Southwest',se:'Southeast',keys:'Keys'};
      rs.value=d.region||RM[(window.JVE_REGIONS&&window.JVE_REGIONS.get&&window.JVE_REGIONS.get())||'']||'';}
    fill();
    function counts(){[['brName','cName',60],['brTag','cTag',80],['brBio','cBio',600]].forEach(function(x){$(x[1]).textContent=$(x[0]).value.length+'/'+x[2];});$('cPh').textContent=st.photos.length+'/6';}
    ['brName','brTag','brBio'].forEach(function(id){$(id).addEventListener('input',counts);});
    $('brShowC').addEventListener('change',function(){$('brCRow').hidden=!this.checked;});
    /* color */
    function paintColor(){box.style.setProperty('--bc',st.color);var hx=$('brHex');if(hx&&document.activeElement!==hx)hx.value=st.color;var pk=$('brPick');if(pk)pk.value=st.color;
      Array.prototype.forEach.call($('brSw').querySelectorAll('.br-sw'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-c')===st.color));});}
    SW.forEach(function(c){var b=document.createElement('button');b.type='button';b.className='br-sw';b.style.background=c;b.setAttribute('data-c',c);b.setAttribute('aria-label','Color '+c);b.addEventListener('click',function(){st.color=c;paintColor();});$('brSw').appendChild(b);});
    var pk=document.createElement('input');pk.type='color';pk.id='brPick';pk.setAttribute('aria-label','Pick any color');pk.addEventListener('input',function(){st.color=pk.value.toLowerCase();paintColor();});$('brSw').appendChild(pk);
    var hx=document.createElement('input');hx.className='hex';hx.id='brHex';hx.maxLength=7;hx.setAttribute('aria-label','Hex color');hx.addEventListener('input',function(){var v=hx.value.trim().toLowerCase();if(/^#[0-9a-f]{6}$/.test(v)){st.color=v;paintColor();}});$('brSw').appendChild(hx);
    paintColor();
    /* categories */
    function drawCats(){var org=$('brKind').value==='organizer',list=org?OCATS:VCATS,c=$('brCats');c.textContent='';
      $('brCatL').textContent=org?'Events you run (pick all that apply)':'What you sell (pick all that apply)';$('brWhatL').textContent=org?'Your events, in your words':'Products, in your words';
      $('brWhat').placeholder=org?'e.g. Riverside Saturday market, monthly night market':'e.g. Sterling silver rings, layered necklaces';
      list.concat(st.cats.filter(function(x){return list.indexOf(x)<0;})).forEach(function(x){var l=document.createElement('label'),i=document.createElement('input');i.type='checkbox';i.value=x;i.checked=st.cats.indexOf(x)>=0;
        i.addEventListener('change',function(){if(i.checked){st.cats.push(x);}else st.cats=st.cats.filter(function(y){return y!==x;});});
        l.appendChild(i);l.appendChild(document.createTextNode(x));c.appendChild(l);});}
    $('brKind').addEventListener('change',function(){st.cats=[];drawCats();});drawCats();
    /* media previews */
    function imgNode(p){var u=BR.img(p);if(!u)return null;var i=document.createElement('img');i.src=u;i.alt='';return i;}
    function drawMedia(){var L=$('brLogoPrev'),C=$('brCoverPrev');L.textContent='';C.textContent='';
      var li=imgNode(st.logo);if(li)L.appendChild(li);else L.textContent='Logo';
      var ci=imgNode(st.cover);if(ci)C.appendChild(ci);else C.textContent='Cover image (optional)';
      f.querySelector('[data-clear="logo"]').hidden=!st.logo;f.querySelector('[data-clear="cover"]').hidden=!st.cover;
      var P=$('brPhotos');P.textContent='';
      st.photos.forEach(function(p,i){var d=document.createElement('div');d.className='br-photo';var im=imgNode(p);if(im){im.alt='Photo '+(i+1);d.appendChild(im);}
        if(hp.indexOf(p)>=0){var s=document.createElement('small');s.textContent='hidden by admin';s.style.cssText='position:absolute;left:5px;bottom:5px;background:rgba(0,0,0,.65);color:#fff;font-size:10px;padding:2px 5px;border-radius:5px';d.appendChild(s);}
        var x=document.createElement('button');x.type='button';x.setAttribute('aria-label','Remove photo '+(i+1));x.textContent='\u00d7';x.addEventListener('click',function(){st.photos.splice(i,1);drawMedia();});d.appendChild(x);P.appendChild(d);});
      if(st.photos.length<6){var a=document.createElement('button');a.type='button';a.className='br-add';a.textContent='+ Add photos';a.addEventListener('click',function(){$('brFiles').click();});P.appendChild(a);}
      counts();}
    drawMedia();
    var picking=null;
    f.addEventListener('click',function(e){var b=e.target.closest('[data-pick]');if(b){picking=b.getAttribute('data-pick');$('brFile').value='';$('brFile').click();return;}
      var c=e.target.closest('[data-clear]');if(c){st[c.getAttribute('data-clear')]=null;drawMedia();}});
    async function upload(file,kind){var p=await prepare(file,kind);var path=uid+'/'+kind+'-'+rnd()+'.'+p.ext;
      var up=await sb.storage.from('brand').upload(path,p.blob,{contentType:p.type,upsert:false,cacheControl:'31536000'});
      if(up.error)throw new Error(/row-level|policy|security/i.test(up.error.message)?'Upload refused. Remove a few old photos and try again.':/size|large/i.test(up.error.message)?'That image is over 2 MB.':up.error.message);
      return path;}
    $('brFile').addEventListener('change',async function(){var file=this.files&&this.files[0];if(!file||!picking)return;var kind=picking;box.classList.add('br-busy');msg('Uploading\u2026','info');
      try{st[kind]=await upload(file,kind);drawMedia();msg((kind==='logo'?'Logo':'Cover')+' uploaded. Tap Save to publish it.','ok');}catch(err){msg(err.message,'err');}finally{box.classList.remove('br-busy');}});
    $('brFiles').addEventListener('change',async function(){var fl=Array.prototype.slice.call(this.files||[]);this.value='';if(!fl.length)return;
      var room=6-st.photos.length;if(fl.length>room){msg('You can add '+room+' more photo'+(room===1?'':'s')+'. Extra files were skipped.','info');fl=fl.slice(0,room);}
      box.classList.add('br-busy');var bad=[];
      for(var i=0;i<fl.length;i++){try{st.photos.push(await upload(fl[i],'photo'));drawMedia();}catch(err){bad.push((fl[i].name||'file')+': '+err.message);}}
      box.classList.remove('br-busy');msg(bad.length?bad.join(' '):'Photos uploaded. Tap Save to publish them.',bad.length?'err':'ok');});
    function perk(){var b=[];if(A.has('featured-vendor'))b.push('Featured badge + top of the directory');if(A.has('directory-sponsor'))b.push('Sponsor badge + top of the directory');
      if(A.has('vendor-pro'))b.push('gold PRO badge + higher placement');if(A.has('organizer-plus'))b.push('Verified organizer badge + higher placement');
      var e=$('brPerk');e.textContent='';
      if(b.length){e.textContent='Your plan adds: '+b.join(', ')+'.';return;}
      e.appendChild(document.createTextNode(st.kind==='organizer'||$('brKind').value==='organizer'?'Organizer Plus adds a Verified organizer badge and higher placement. ':'Vendor Pro adds a gold PRO badge and higher placement; Featured vendor puts you at the very top for a week. '));
      var a=document.createElement('a');a.href='pricing.html#vendors';a.textContent='See options';e.appendChild(a);}
    perk();$('brKind').addEventListener('change',perk);
    function showView(){var v=$('brView');if(st.row&&st.row.slug){v.hidden=false;v.href='profile.html?u='+encodeURIComponent(st.row.slug);}}
    showView();
    async function cleanup(keep){ /* remove files in my folder that the saved profile no longer uses */
      var ls=await sb.storage.from('brand').list(uid,{limit:100});if(ls.error||!ls.data)return;
      var gone=ls.data.map(function(o){return uid+'/'+o.name;}).filter(function(p){return keep.indexOf(p)<0;});
      if(gone.length)await sb.storage.from('brand').remove(gone);}
    f.addEventListener('submit',async function(e){e.preventDefault();
      var name=clean($('brName').value,60);if(name.length<2)return msg('Add your business name.','err');
      var links={};var bad=null;[['website','brWeb'],['instagram','brIg'],['facebook','brFb'],['tiktok','brTt']].forEach(function(k){var v=social(k[0],$(k[1]).value);if(v===false)bad=bad||k[0];links[k[0]]=v||null;});
      if(bad)return msg('That '+(bad==='website'?'website':bad.charAt(0).toUpperCase()+bad.slice(1))+' link doesn\u2019t look right. Use an http(s) link'+(bad==='website'?'':' or @handle')+'.','err');
      var showC=$('brShowC').checked,pem=showC?clean($('brPEm').value,120):'',pph=showC?clean($('brPPh').value,20):'';
      if(pem&&!/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(pem))return msg('That public email doesn\u2019t look right.','err');
      if(pph&&!/^[0-9 +().-]{7,20}$/.test(pph))return msg('That public phone doesn\u2019t look right.','err');
      var row={user_id:uid,business_name:name,tagline:clean($('brTag').value,80)||null,bio:cleanBio($('brBio').value)||null,color:st.color,kind:$('brKind').value,
        categories:st.cats.slice(0,60),what:clean($('brWhat').value,200)||null,city:clean($('brCity').value,60)||null,region:$('brRegion').value||null,
        website:links.website,instagram:links.instagram,facebook:links.facebook,tiktok:links.tiktok,public_email:pem||null,public_phone:pph||null,
        logo_path:st.logo,cover_path:st.cover,photos:st.photos.slice(0,6),listed:$('brListed').checked};
      var btn=$('brSave');btn.disabled=true;msg('Saving\u2026','info');
      try{var res;
        if(st.row){res=await sb.from('brand_profiles').update(row).eq('user_id',uid).select().single();}
        else{var base=slugify(name);if(base.length<3)base=(base+'-shop').replace(/^-/,'');
          for(var i=0;i<6;i++){row.slug=i?base+'-'+(i<3?i+1:rnd().slice(0,4)):base;res=await sb.from('brand_profiles').insert(row).select().single();
            if(!res.error||!/slug|duplicate|unique/i.test(res.error.message))break;}}
        if(res.error)throw res.error;
        st.row=res.data;st.kind=res.data.kind;showView();
        cleanup([st.logo,st.cover].concat(st.photos).filter(Boolean)).catch(function(){});
        msg(row.listed?'Saved. Your profile is live in the directory.':'Saved. Your profile is private (not listed).','ok');
        document.dispatchEvent(new CustomEvent('jve:brand',{detail:res.data}));
      }catch(err){msg(/check constraint|violates/i.test(err.message||'')?'Something in the form isn\u2019t allowed. Check the links and lengths.':(err.message||'Could not save.'),'err');}
      finally{btn.disabled=false;}});
  });
})();
