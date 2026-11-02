/* Jax Vendor Events: log in / create account / forgot password (login.html) and set a new password (reset.html). */
(function(){
  'use strict';
  var SITE='https://jaxvendorevents.com/';
  function $(id){return document.getElementById(id);}
  function q(k){return new URLSearchParams(location.search).get(k)||'';}
  function safeNext(){var n=q('next');return (/^[a-z0-9-]+\.html([?#][^\s]*)?$/i.test(n)&&n.indexOf('login.html')!==0&&n.indexOf('reset.html')!==0)?n:'index.html';}
  function msg(id,text,kind){var m=$(id);if(!m)return;m.className='amsg show '+(kind||'info');m.textContent=text;}
  function busy(btn,on,label){if(!btn)return;if(on){btn.dataset.l=btn.textContent;btn.textContent=label||'One moment…';btn.disabled=true;}else{btn.textContent=btn.dataset.l||btn.textContent;btn.disabled=false;}}
  function nice(err){var m=String((err&&err.message)||err||'');
    if(/invalid login credentials/i.test(m))return 'That email and password don\u2019t match an account. Check both, or reset your password.';
    if(/email not confirmed/i.test(m))return 'Please confirm your email first: open the link we sent you. Need a new one? Tap “Resend confirmation” below.';
    if(/already registered|already been registered|user already exists/i.test(m))return 'There\u2019s already an account with that email. Log in instead, or reset your password.';
    if(/rate limit|too many|security purposes/i.test(m))return 'Too many tries. Please wait a minute and try again.';
    if(/password/i.test(m)&&/(least|short|weak|characters|should contain)/i.test(m))return 'Choose a stronger password: at least 10 characters with letters and numbers.';
    return m||'Something went wrong. Please try again.';}
  function strong(p){return p.length>=10&&/[a-z]/i.test(p)&&/[0-9]/.test(p);}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.peek');if(!b)return;var i=b.parentNode.querySelector('input');i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'Show':'Hide';});
  window.JVE_AUTH.ready.then(function(A){
    var sb=A.sb;
    /* ---------------- reset.html ---------------- */
    if($('resetForm')){
      var ok=false;
      sb.auth.onAuthStateChange(function(ev){if(ev==='PASSWORD_RECOVERY'||ev==='SIGNED_IN'){ok=true;$('resetForm').hidden=false;$('resetWait').hidden=true;}});
      sb.auth.getSession().then(function(r){if(r.data.session){ok=true;$('resetForm').hidden=false;$('resetWait').hidden=true;}
        else setTimeout(function(){if(!ok){$('resetWait').textContent='This reset link is no longer valid (links work once and expire after an hour). Ask for a new one below.';$('resetAgain').hidden=false;}},2500);});
      $('resetForm').addEventListener('submit',function(e){e.preventDefault();var p=$('rPw').value,p2=$('rPw2').value,btn=e.submitter||$('resetForm').querySelector('button[type=submit]');
        if(!strong(p))return msg('resetMsg','Use at least 10 characters with letters and numbers.','err');
        if(p!==p2)return msg('resetMsg','The two passwords don\u2019t match.','err');
        busy(btn,true,'Saving…');
        sb.auth.updateUser({password:p}).then(function(r){if(r.error)throw r.error;return sb.auth.signOut({scope:'others'});})
          .then(function(){msg('resetMsg','New password saved. You\u2019re logged in.','ok');setTimeout(function(){location.replace('account.html');},900);})
          .catch(function(err){busy(btn,false);msg('resetMsg',nice(err),'err');});});
      return;
    }
    /* ---------------- login.html ---------------- */
    var why=q('why'),mode=q('mode');
    var W={expired:'Your login expired. Please log in again.',elsewhere:'You were logged out because your account was signed in on another device. One login per person.',
      out:'You\u2019re logged out.',everywhere:'You\u2019re logged out on every device.',buy:'Create your free account first, so your purchase is attached to it. Takes a minute.',
      verified:'Email confirmed! Log in to continue.'};
    if(q('verified'))why='verified';
    if(W[why])msg('topMsg',W[why],why==='elsewhere'||why==='expired'?'err':'info');
    if(A.user&&why!=='out'&&why!=='everywhere'){location.replace(safeNext());return;}
    var tabs=document.querySelectorAll('.atabs [role=tab]');
    function show(name){Array.prototype.forEach.call(tabs,function(t){var on=t.getAttribute('data-tab')===name;t.setAttribute('aria-selected',on);$(t.getAttribute('aria-controls')).hidden=!on;});
      var h=$('authTitle');if(h)h.textContent=name==='signup'?'Create your free account':name==='forgot'?'Reset your password':'Log in';}
    Array.prototype.forEach.call(tabs,function(t){t.addEventListener('click',function(){show(t.getAttribute('data-tab'));});});
    document.addEventListener('click',function(e){var g=e.target.closest&&e.target.closest('[data-goto]');if(g){e.preventDefault();show(g.getAttribute('data-goto'));}});
    show(mode==='signup'?'signup':mode==='forgot'?'forgot':'login');
    /* log in */
    $('loginForm').addEventListener('submit',function(e){e.preventDefault();var btn=$('loginForm').querySelector('button[type=submit]');
      var em=$('lEmail').value.trim(),pw=$('lPw').value;if(!em||!pw)return msg('loginMsg','Enter your email and password.','err');
      busy(btn,true,'Logging in…');$('resendBox').hidden=true;
      sb.auth.signInWithPassword({email:em,password:pw}).then(function(r){if(r.error)throw r.error;
          return sb.auth.signOut({scope:'others'});})     /* one login per person: this sign-in ends any other device's session */
        .then(function(){location.replace(safeNext());})
        .catch(function(err){busy(btn,false);msg('loginMsg',nice(err),'err');if(/confirm/i.test(String(err&&err.message)))$('resendBox').hidden=false;});});
    $('resendBtn').addEventListener('click',function(){var em=$('lEmail').value.trim();if(!em)return msg('loginMsg','Type your email above first.','err');
      sb.auth.resend({type:'signup',email:em,options:{emailRedirectTo:SITE+'login.html?verified=1'}}).then(function(r){if(r.error)throw r.error;msg('loginMsg','Sent. Check your inbox (and spam) for the confirmation link.','ok');}).catch(function(err){msg('loginMsg',nice(err),'err');});});
    /* create account */
    $('signupForm').addEventListener('submit',function(e){e.preventDefault();var btn=$('signupForm').querySelector('button[type=submit]');
      var d={full_name:$('sName').value.trim(),business_name:$('sBiz').value.trim(),account_type:$('sType').value};
      var em=$('sEmail').value.trim(),pw=$('sPw').value;
      if(!d.full_name||!em)return msg('signupMsg','Please fill in your name and email.','err');
      if(!strong(pw))return msg('signupMsg','Use a password of at least 10 characters with letters and numbers. Don\u2019t reuse one from another site.','err');
      if(!$('sTerms').checked)return msg('signupMsg','Please agree to the Terms & Privacy to continue.','err');
      busy(btn,true,'Creating your account…');
      sb.auth.signUp({email:em,password:pw,options:{data:d,emailRedirectTo:SITE+'login.html?verified=1&next='+encodeURIComponent(safeNext())}})
        .then(function(r){if(r.error)throw r.error;
          if(r.data&&r.data.user&&Array.isArray(r.data.user.identities)&&r.data.user.identities.length===0)throw new Error('already registered');
          $('signupForm').hidden=true;msg('signupMsg','Almost done! We emailed a confirmation link to '+em+'. Open it on this phone to finish creating your account. (Check spam if you don\u2019t see it in a minute.)','ok');})
        .catch(function(err){busy(btn,false);msg('signupMsg',nice(err),'err');});});
    /* forgot password */
    $('forgotForm').addEventListener('submit',function(e){e.preventDefault();var btn=$('forgotForm').querySelector('button[type=submit]');var em=$('fEmail').value.trim();
      if(!em)return msg('forgotMsg','Enter the email you signed up with.','err');busy(btn,true,'Sending…');
      sb.auth.resetPasswordForEmail(em,{redirectTo:SITE+'reset.html'}).then(function(r){if(r.error)throw r.error;busy(btn,false);
        msg('forgotMsg','If there\u2019s an account for '+em+', a reset link is on its way. It works once and expires in an hour.','ok');})
        .catch(function(err){busy(btn,false);msg('forgotMsg',nice(err),'err');});});
  });
})();
