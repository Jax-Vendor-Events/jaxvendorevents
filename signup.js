(function(){
  'use strict';
  /* Weekly email signup. Posts name + email (nothing else) to FormSubmit, which forwards it to the team inbox and sends the subscriber a short confirmation (_autoresponse). */
  var AJAX='https://formsubmit.co/ajax/porchlight+jax@mail.tab.bot';
  var RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function msgFor(f){var n=f.nextElementSibling;return n&&n.classList.contains('msg')?n:null;}
  function say(m,t,err){if(!m)return;m.textContent=t;m.classList.toggle('err',!!err);}
  function val(f,n){var el=f.querySelector('[name="'+n+'"]');return el?String(el.value||'').trim():'';}
  var forms=document.querySelectorAll('form[data-signup]');
  Array.prototype.forEach.call(forms,function(f){
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var m=msgFor(f),b=f.querySelector('button[type=submit]'),em=f.querySelector('input[name=email]');
      var email=val(f,'email');
      if(!RE.test(email)){say(m,'Please enter a valid email address.',true);if(em){em.setAttribute('aria-invalid','true');em.focus();}return;}
      if(em)em.removeAttribute('aria-invalid');
      if(val(f,'_honey')){say(m,'Thanks! You\u2019re on the list.');f.reset();return;}
      var data={email:email,name:val(f,'name').slice(0,80),source:val(f,'source'),_subject:val(f,'_subject'),_template:'table',_captcha:'false',_honey:''};
      if(val(f,'_autoresponse'))data._autoresponse=val(f,'_autoresponse'); /* FormSubmit emails this confirmation to the subscriber */
      var label=b?b.textContent:'';if(b){b.disabled=true;b.textContent='Signing up\u2026';}
      say(m,'');
      fetch(AJAX,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)})
        .then(function(r){return r.json().catch(function(){return {};}).then(function(j){return {ok:r.ok,j:j};});})
        .then(function(x){
          if(x.ok&&String(x.j.success)==='true'){say(m,'Thanks! You\u2019re on the list. The next issue comes to '+email+'.');f.reset();}
          else{say(m,'Signup didn\u2019t go through just now. Please try again in a minute.',true);}
        })
        .catch(function(){say(m,navigator.onLine===false?'You\u2019re offline. Connect and try again.':'Signup didn\u2019t go through just now. Please try again in a minute.',true);})
        .then(function(){if(b){b.disabled=false;b.textContent=label;}});
    });
  });
  if(/[?&]subscribed=1/.test(location.search)){var m=document.getElementById('suMsg');say(m,'Thanks! You\u2019re on the list.');}
})();
