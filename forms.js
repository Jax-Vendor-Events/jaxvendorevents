(function(){
  'use strict';
  /* Forms on Jax Vendor Events: each form[data-fs] posts its named fields to FormSubmit, which forwards them to the team inbox. Nothing is charged; nothing is published until a person checks it. */
  var AJAX='https://formsubmit.co/ajax/porchlight+jax@mail.tab.bot';
  var RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  Array.prototype.forEach.call(document.querySelectorAll('form[data-fs]'),function(f){
    var m=f.querySelector('.fsmsg');
    function say(t,err){if(!m)return;m.textContent=t;m.classList.add('show');m.classList.toggle('err',!!err);m.scrollIntoView({behavior:'smooth',block:'nearest'});}
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var bad=null;
      Array.prototype.forEach.call(f.querySelectorAll('[required]'),function(el){var ok=String(el.value||'').trim()!=='';if(ok&&el.type==='email')ok=RE.test(el.value.trim());el.toggleAttribute('aria-invalid',!ok);if(!ok&&!bad)bad=el;});
      if(bad){say('Please fill in the highlighted fields.',true);bad.focus();return;}
      var hp=f.querySelector('[name=_honey]');if(hp&&hp.value){say('Thanks! We got it.');f.reset();return;}
      var data={_subject:f.getAttribute('data-fs'),_template:'table',_captcha:'false',page:location.pathname.split('/').pop()||'index.html'};
      var ar=f.querySelector('[name=_autoresponse]');if(ar&&ar.value)data._autoresponse=ar.value; /* FormSubmit emails this confirmation to the address in the field named "email" */
      Array.prototype.forEach.call(f.elements,function(el){if(!el.name||el.name.charAt(0)==='_'||el.type==='submit')return;if(el.type==='checkbox'){data[el.name]=el.checked?'yes':'no';return;}data[el.name]=String(el.value||'').trim().slice(0,2000);});
      var b=f.querySelector('button[type=submit]'),label=b?b.innerHTML:'';if(b){b.disabled=true;b.textContent='Sending\u2026';}
      fetch(AJAX,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)})
        .then(function(r){return r.json().catch(function(){return {};}).then(function(j){return {ok:r.ok,j:j};});})
        .then(function(x){if(x.ok&&String(x.j.success)==='true'){say(f.getAttribute('data-ok')||'Thanks! We got it and will reply by email within 2 days.');f.reset();var nx=f.getAttribute('data-next')&&document.getElementById(f.getAttribute('data-next'));if(nx){nx.hidden=false;setTimeout(function(){nx.scrollIntoView({behavior:'smooth',block:'center'});},600);}try{f.dispatchEvent(new CustomEvent('fs:ok',{bubbles:true}));}catch(_){}}else{say('That didn\u2019t go through just now. Please try again in a minute.',true);}})
        .catch(function(){say(navigator.onLine===false?'You\u2019re offline. Connect and try again.':'That didn\u2019t go through just now. Please try again in a minute.',true);})
        .then(function(){if(b){b.disabled=false;b.innerHTML=label;}});
    });
  });
})();
