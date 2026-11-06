/* Jax Vendor Events: share buttons (Nov 6, 2026). Plain share URLs only, no trackers or third-party scripts.
   JVEShare.open({url,title,text}) opens a share panel; any element with [data-share-bar] gets an inline row.
   On phones with the Web Share API the first button opens the native share sheet. */
(function(){
  var SITE='https://jaxvendorevents.com/';
  var IMG=SITE+'img/og.jpg';
  var DEF_T='Jax Vendor Events: every vendor market, craft fair and pop-up in Florida';
  function enc(s){return encodeURIComponent(s||'');}
  function links(o){
    var u=enc(o.url),t=enc(o.title),tu=enc((o.title?o.title+' ':'')+o.url);
    return [
      ['fb','Facebook','https://www.facebook.com/sharer/sharer.php?u='+u,'M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3l1-4h-4V9c0-.6.4-1 1-1z'],
      ['x','X','https://twitter.com/intent/tweet?url='+u+'&text='+t,'M4 4l7.2 9.6L4.3 20h2l5.8-5.4L16.5 20H20l-7.5-10L19 4h-2l-5.3 4.9L8 4z'],
      ['wa','WhatsApp','https://wa.me/?text='+tu,'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm4.6 12.6c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1-3-1-4.9-3.9-5.1-4.1-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.3.8-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.3 0 .5l-.4.6-.3.4c.1.2.6 1 1.3 1.7.9.8 1.7 1 1.9 1.1.2.1.4.1.5-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.3.1.1.1.6-.1 1.1z'],
      ['li','LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+u,'M5 3.5A2 2 0 1 1 5 7.5a2 2 0 0 1 0-4zM3.3 9h3.4v11H3.3zM9 9h3.3v1.5c.5-.9 1.7-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.4V20h-3.4v-5.2c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20H9z'],
      ['pin','Pinterest','https://www.pinterest.com/pin/create/button/?url='+u+'&media='+enc(o.image||IMG)+'&description='+t,'M12 2.5a9.5 9.5 0 0 0-3.5 18.3c-.1-.8-.2-2 0-2.8l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.9-4.4-4.5-4.4-3.1 0-4.9 2.3-4.9 4.7 0 .9.4 1.9.8 2.5.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.6-2.2-2.6-2.2-4.3 0-3.5 2.5-6.6 7.3-6.6 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 6.9-5.8 6.9-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.2 1-.9 2.2-1.4 2.9A9.5 9.5 0 1 0 12 2.5z']
    ];
  }
  function svg(d){return '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="currentColor" d="'+d+'"/></svg>';}
  var LINK='M10.6 13.4a1 1 0 0 0 1.4 1.4l4.2-4.2a3 3 0 0 0-4.2-4.2l-1.5 1.5a1 1 0 1 0 1.4 1.4l1.5-1.5a1 1 0 0 1 1.4 1.4zm2.8-2.8a1 1 0 0 0-1.4-1.4l-4.2 4.2a3 3 0 0 0 4.2 4.2l1.5-1.5a1 1 0 1 0-1.4-1.4l-1.5 1.5a1 1 0 0 1-1.4-1.4z';
  var NAT='M12 3l4 4-1.4 1.4L13 6.8V15h-2V6.8L9.4 8.4 8 7zM5 11h2v8h10v-8h2v10H5z';
  function esc(s){return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function css(){
    if(document.getElementById('jshCss'))return;
    var s=document.createElement('style');s.id='jshCss';
    s.textContent='.jsh-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}'+
      '.jsh-b{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;height:44px;padding:0 12px;border-radius:999px;border:1px solid color-mix(in srgb,var(--ink,#0f1e2e) 16%,transparent);background:var(--surf,#fff);color:var(--ink,#0f1e2e);font:inherit;font-size:14px;font-weight:600;text-decoration:none;cursor:pointer}'+
      '.jsh-b:hover,.jsh-b:focus-visible{border-color:var(--sea,#0d6e6e);color:var(--sea,#0d6e6e)}'+
      '.jsh-b.nat{background:var(--sea,#0d6e6e);border-color:var(--sea,#0d6e6e);color:var(--onacc,#fff)}'+
      '.jsh-b .l{display:none}.jsh-row.big .jsh-b .l{display:inline}'+
      '.jsh-wrap{margin:28px auto 8px;padding:20px 16px;border-radius:18px;background:var(--card,#fffdf8);border:1px solid color-mix(in srgb,var(--ink,#0f1e2e) 10%,transparent);text-align:center;max-width:720px}'+
      '.jsh-wrap h2{margin:0 0 4px;font-size:20px}.jsh-wrap p{margin:0 0 14px;color:var(--mut,#5f6b77);font-size:15px}.jsh-wrap .jsh-row{justify-content:center}'+
      '.jsh-pop{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:rgba(10,20,32,.45)}'+
      '.jsh-card{width:100%;max-width:480px;background:var(--surf,#fff);color:var(--ink,#0f1e2e);border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px rgba(0,0,0,.2)}'+
      '@media(min-width:700px){.jsh-pop{align-items:center}.jsh-card{border-radius:20px}}'+
      '.jsh-card h3{margin:0 0 4px;font-size:17px}.jsh-card .jsh-t{margin:0 0 14px;color:var(--mut,#5f6b77);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '.jsh-card .jsh-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.jsh-card .jsh-b{flex-direction:column;height:auto;padding:10px 4px;border-radius:14px;font-size:12px}.jsh-card .jsh-b .l{display:inline}'+
      '.jsh-ev{margin:18px 0 4px;padding-top:14px;border-top:1px solid color-mix(in srgb,var(--ink,#0f1e2e) 10%,transparent)}.jsh-evh{margin:0 0 8px;font-weight:700;font-size:14px}'+
      '.jsh-x{margin-top:12px;width:100%;height:44px;border-radius:12px;border:0;background:var(--bg2,#efe8da);color:var(--ink,#0f1e2e);font:inherit;font-weight:600;cursor:pointer}';
    document.head.appendChild(s);
  }
  function copy(t){
    if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t);
    return new Promise(function(ok,no){var a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy')?ok():no();}catch(e){no(e);}a.remove();});
  }
  function note(btn,msg){var l=btn.querySelector('.l');if(!l)return;var o=l.textContent;l.textContent=msg;setTimeout(function(){l.textContent=o;},1800);}
  function row(o,big){
    css();o=norm(o);
    var d=document.createElement('div');d.className='jsh-row'+(big?' big':'');d.setAttribute('role','group');d.setAttribute('aria-label','Share');
    var h='';
    if(navigator.share)h+='<button type="button" class="jsh-b nat" data-k="nat" aria-label="Share">'+svg(NAT)+'<span class="l">Share</span></button>';
    links(o).forEach(function(x){h+='<a class="jsh-b" data-k="'+x[0]+'" href="'+esc(x[2])+'" target="_blank" rel="noopener noreferrer" aria-label="Share on '+x[1]+'">'+svg(x[3])+'<span class="l">'+x[1]+'</span></a>';});
    h+='<button type="button" class="jsh-b" data-k="copy" aria-label="Copy link">'+svg(LINK)+'<span class="l">Copy link</span></button>';
    d.innerHTML=h;
    d.addEventListener('click',function(ev){
      var b=ev.target.closest('[data-k]');if(!b)return;var k=b.getAttribute('data-k');
      if(k==='nat'){ev.preventDefault();navigator.share({title:o.title,text:o.text||o.title,url:o.url}).catch(function(){});}
      else if(k==='copy'){ev.preventDefault();copy(o.url).then(function(){note(b,'Copied');},function(){window.prompt('Copy this link',o.url);});}
    });
    return d;
  }
  function norm(o){o=o||{};var u=o.url||SITE;try{u=new URL(u,location.href).href;}catch(e){}
    if(/^http:\/\/(localhost|127\.)/.test(u)||location.protocol==='file:')u=u.replace(/^https?:\/\/[^\/]+\//,SITE);
    return {url:u,title:o.title||DEF_T,text:o.text||'',image:o.image};}
  var pop=null,last=null;
  function close(){if(pop){pop.remove();pop=null;document.removeEventListener('keydown',onKey);if(last&&last.focus)last.focus();}}
  function onKey(e){if(e.key==='Escape')close();}
  function open(o){
    close();css();o=norm(o);last=document.activeElement;
    pop=document.createElement('div');pop.className='jsh-pop';pop.setAttribute('role','dialog');pop.setAttribute('aria-modal','true');pop.setAttribute('aria-label','Share');
    var c=document.createElement('div');c.className='jsh-card';
    c.innerHTML='<h3>Share</h3><p class="jsh-t">'+esc(o.title)+'</p>';
    c.appendChild(row(o,true));
    var x=document.createElement('button');x.type='button';x.className='jsh-x';x.textContent='Close';x.addEventListener('click',close);c.appendChild(x);
    pop.appendChild(c);pop.addEventListener('click',function(e){if(e.target===pop)close();});
    document.body.appendChild(pop);document.addEventListener('keydown',onKey);
    var f=c.querySelector('.jsh-b');if(f)f.focus();
  }
  function bars(){
    [].forEach.call(document.querySelectorAll('[data-share-bar]'),function(el){
      if(el.getAttribute('data-done'))return;el.setAttribute('data-done','1');
      el.appendChild(row({url:el.getAttribute('data-url')||SITE,title:el.getAttribute('data-title')||DEF_T},true));
    });
  }

  // Event sheet: an inline "Share this event" row at the end of the details, rebuilt each time a sheet opens.
  function evRow(){
    var sh=document.getElementById('sheet'),body=document.getElementById('shBody');if(!sh||!body)return;
    function sync(){
      if(sh.getAttribute('aria-hidden')!=='false')return;
      var m=/[#&]e=([^&]+)/.exec(location.hash);if(!m)return;
      var url=location.origin+location.pathname+'#e='+m[1];
      var old=body.querySelector('.jsh-ev');if(old&&old.getAttribute('data-u')===url)return;if(old)old.remove();
      var t=(document.getElementById('shTitle')||{}).textContent||'Vendor event';
      var w=document.createElement('div');w.className='jsh-ev';w.setAttribute('data-u',url);
      w.innerHTML='<p class="jsh-evh">Share this event</p>';
      w.appendChild(row({url:url,title:t+' | Jax Vendor Events'},false));
      body.appendChild(w);
    }
    new MutationObserver(function(){setTimeout(sync,60);}).observe(sh,{attributes:true,attributeFilter:['aria-hidden']});
    new MutationObserver(function(){if(!body.querySelector('.jsh-ev'))setTimeout(sync,60);}).observe(body,{childList:true});
    window.addEventListener('hashchange',function(){setTimeout(sync,120);});
    sync();
  }
  window.JVEShare={open:open,row:row,close:close};
  function init(){bars();evRow();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
