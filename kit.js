/* Jax Vendor Events: shared apply kit (kit.html#k=<token>). No account needed.
   The token goes to the kit-share Edge Function, which checks it in the database (active, not revoked, not expired)
   and returns the vendor's kit with short-lived signed URLs for photos and documents. Nothing is cached. */
(function(){
  'use strict';
  var C=window.JVE_SB||{},FN=(C.url||'')+'/functions/v1/kit-share';
  var box=document.getElementById('kitBox');
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function ico(n){return '<svg class="ico" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
  function safe(u){return /^https:\/\/[^\s<>"]+$/i.test(u||'')?u:'';}
  var tok=(location.hash.match(/^#k=([A-Za-z0-9_-]{24})$/)||[])[1],data=null,got=0;
  function err(t,s){box.innerHTML='<div class="kiterr"><b>'+esc(t)+'</b><p>'+esc(s)+'</p></div>';document.title='Vendor kit — Jax Vendor Events';}
  function fetchKit(){
    return fetch(FN,{method:'POST',headers:{'Content-Type':'application/json',apikey:C.key||''},body:JSON.stringify({t:tok}),cache:'no-store',referrerPolicy:'no-referrer'})
      .then(function(r){if(r.status===404)return null;if(!r.ok)throw new Error('http '+r.status);return r.json();});
  }
  function row(k,v){return v?'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>':'';}
  function draw(k){
    data=k;got=Date.now();
    var booth=k.booth_size==='other'?(k.booth_other||'Other'):(k.booth_size||'').replace('x','×');
    var ig=(k.instagram||'').replace(/^@/,'');
    var web=safe(k.website)||(/^http:\/\//i.test(k.website||'')?k.website:'');
    var h='<header class="kith"><h1>'+esc(k.business_name||'Vendor')+'</h1>'+(k.category?'<span class="cat">'+esc(k.category)+'</span>':'')+(k.description?'<p>'+esc(k.description)+'</p>':'')+'</header>';
    if(k.photos&&k.photos.length)h+='<div class="kitph">'+k.photos.map(function(u,i){return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(u)+'" alt="'+esc(k.business_name)+' product photo '+(i+1)+'" loading="'+(i<3?'eager':'lazy')+'"></a>';}).join('')+'</div>';
    h+='<dl class="kitdl">'+row('Booth size',esc(booth))+row('Electricity',k.electricity?'Needs electricity':'No electricity needed')+row('Tent',k.tent?'Brings own tent':'No tent')+
      row('Price range',esc(k.price_range))+row('Website',web?'<a href="'+esc(web)+'" target="_blank" rel="noopener noreferrer">'+esc(web.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))+'</a>':'')+
      row('Instagram',ig?'<a href="https://instagram.com/'+encodeURIComponent(ig)+'" target="_blank" rel="noopener noreferrer">@'+esc(ig)+'</a>':'')+
      row('Email',k.contact_email?'<a href="mailto:'+esc(k.contact_email)+'">'+esc(k.contact_email)+'</a>':'')+row('Phone',k.contact_phone?'<a href="tel:'+esc(k.contact_phone.replace(/[^\d+]/g,''))+'">'+esc(k.contact_phone)+'</a>':'')+'</dl>';
    h+='<h2 class="kitsec">Documents</h2><div class="kitdocs">'+(k.docs&&k.docs.length?k.docs.map(function(d){
      return '<div class="doc has"><span class="di">'+ico('shield')+'</span><span><b>'+esc(d.label)+'</b><small>'+esc(d.name||(d.type==='pdf'?'PDF':'Image'))+'</small></span><span class="dact"><a href="'+esc(d.url)+'" data-doc="'+esc(d.kind)+'" target="_blank" rel="noopener noreferrer">View</a></span></div>';}).join(''):'<p class="apmsg">No documents added yet.</p>')+'</div>';
    box.innerHTML=h;document.title=(k.business_name||'Vendor')+' · vendor kit';
  }
  function load(){
    if(!tok||!C.url){err('This kit link is incomplete','Ask the vendor to send the link again.');return;}
    fetchKit().then(function(k){if(!k){err('This kit link isn’t active','It was turned off or has expired. Ask the vendor for a new link.');return;}draw(k);})
      .catch(function(){err('Couldn’t load this kit','Check your connection and reload the page.');});
  }
  /* document links are signed for 10 minutes: past ~9 minutes, fetch fresh ones before opening */
  box.addEventListener('click',function(e){var a=e.target.closest('a[data-doc]');if(!a||!data)return;
    if(Date.now()-got<9*60e3)return;e.preventDefault();var kind=a.getAttribute('data-doc');var w=window.open('about:blank','_blank');
    fetchKit().then(function(k){if(!k){if(w)w.close();err('This kit link isn’t active','It was turned off or has expired. Ask the vendor for a new link.');return;}draw(k);
      var d=(k.docs||[]).filter(function(x){return x.kind===kind;})[0];if(d){if(w)w.location=d.url;else location.href=d.url;}else if(w)w.close();}).catch(function(){if(w)w.close();});});
  window.addEventListener('hashchange',function(){tok=(location.hash.match(/^#k=([A-Za-z0-9_-]{24})$/)||[])[1];load();});
  load();
})();
