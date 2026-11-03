/* Jax Vendor Events: Account > App settings > Appearance > Color theme (Nov 3 2026). A row of tappable swatches; the choice applies at once
   on every page (theme.js), is kept on this device and saved on the account (profiles.theme) so it follows the user to other devices. */
(function(){
  'use strict';
  var TH=window.JVE_THEMES,box=document.getElementById('themePick');if(!TH||!TH.setPalette||!box)return;
  /* the swatch art is fixed (it shows each theme whatever theme is on) */
  var ART={current:['#f3f6f5','#ffffff','#075f6b','#0a2a33'],clean:['#ffffff','#f5f5f7','#0066cc','#1d1d1f'],dark:['#0b0f17','#161b26','#22e3c4','#ffffff'],
    warm:['#f5ede0','#fffbf4','#2f5d46','#2b2620'],match:['#ffffff','#f5f5f7','#0066cc','#1d1d1f']};
  var CHECK='<svg class="thp-ck" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><path d="M7 12.4l3.2 3.2L17.2 8.6" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function art(id){var a=ART[id];
    var card='<span class="thp-card" style="background:'+a[1]+';border-color:'+(id==='dark'?'#262d3b':'rgba(0,0,0,.08)')+'"><i style="background:'+a[3]+'"></i><i style="background:'+a[3]+';opacity:.45"></i><b style="background:'+a[2]+'"></b></span>';
    if(id==='match')return '<span class="thp-sw thp-split" style="background:'+a[0]+'">'+card+'<span class="thp-half" style="background:#0b0f17"><span class="thp-card" style="background:#161b26;border-color:#262d3b"><i style="background:#fff"></i><i style="background:#fff;opacity:.45"></i><b style="background:#22e3c4"></b></span></span></span>';
    return '<span class="thp-sw" style="background:'+a[0]+'">'+card+'</span>';}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  box.innerHTML=TH.palettes().map(function(p){return '<button type="button" role="radio" class="thp-opt" data-theme-pick="'+p.id+'" aria-checked="false">'+art(p.id)+CHECK+
    '<span class="thp-name">'+esc(p.name)+(p.id==='current'?'<small>Default</small>':'')+'</span></button>';}).join('');
  var msg=document.getElementById('thMsg');
  function say(t,k){if(!msg)return;msg.textContent=t;msg.className='amsg'+(k?' '+k:'');clearTimeout(say.t);if(t)say.t=setTimeout(function(){msg.textContent='';msg.className='amsg';},4000);}
  function sync(){var cur=TH.palette();Array.prototype.forEach.call(box.querySelectorAll('[data-theme-pick]'),function(b){b.setAttribute('aria-checked',String(b.getAttribute('data-theme-pick')===cur));});}
  box.addEventListener('click',function(e){var b=e.target.closest('[data-theme-pick]');if(!b)return;var id=b.getAttribute('data-theme-pick');if(id===TH.palette())return;
    TH.setPalette(id).then(function(saved){say(saved?'Saved. Your theme follows you on every device.':'Saved on this device.','ok');}).catch(function(){say('Saved on this device. Could not save it to your account, try again later.','err');});
    sync();});
  box.addEventListener('keydown',function(e){if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].indexOf(e.key)<0)return;var bs=[].slice.call(box.querySelectorAll('[data-theme-pick]'));
    var i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();var n=bs[(i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:bs.length-1))%bs.length];n.focus();n.click();});
  document.addEventListener('jve:theme',sync);sync();
})();
