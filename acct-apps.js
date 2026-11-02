/* Jax Vendor Events: account.html cards for the Pro "Apply kit + My applications" features and the
   "Email me tracker reminders" switch (profiles.prefs.tracker_reminders, default on; pro_reminders.py reads it). */
(function(){
  'use strict';
  var A=window.JVE_AUTH;if(!A||!A.ready)return;
  var $=function(id){return document.getElementById(id);};
  function money(c){var v=c/100;return '$'+(v%1?v.toFixed(2):String(v));}
  function boot(){
    var full=!!(A.user&&(A.access==='full'||A.admin));
    ['akOn','trkOn'].forEach(function(i){var el=$(i);if(el)el.hidden=!full;});
    ['akOff','trkOff'].forEach(function(i){var el=$(i);if(el)el.hidden=full;});
    if(!full)return;
    var sb=A.sb,p=A.profile||{};if(!p.prefs||typeof p.prefs!=='object')p.prefs={};var prefs=p.prefs;
    var cb=$('trkRemind');
    if(cb){cb.checked=prefs.tracker_reminders!==false;cb.addEventListener('change',function(){prefs.tracker_reminders=cb.checked;cb.disabled=true;
      sb.from('profiles').update({prefs:prefs}).eq('id',A.user.id).then(function(r){cb.disabled=false;var m=$('trkMsg');
        if(r.error){cb.checked=!cb.checked;prefs.tracker_reminders=cb.checked;if(m){m.textContent='Could not save. Try again.';m.className='amsg err';}return;}
        if(m){m.textContent=cb.checked?'Tracker reminders on.':'Tracker reminders off.';m.className='amsg ok';}});});}
    var s=$('akSum');
    if(s)sb.from('app_tracker').select('status,paid,fee_cents').then(function(r){var L=r.data||[];if(!L.length){s.textContent='Nothing tracked yet.';return;}
      var ap=L.filter(function(x){return x.status==='approved';}).length,w=L.filter(function(x){return x.status==='applied'||x.status==='waitlist';}).length,
          due=L.reduce(function(a,x){return a+(!x.paid&&x.status==='approved'&&x.fee_cents?x.fee_cents:0);},0);
      s.textContent=ap+' approved · '+w+' waiting · '+money(due)+' due';});
  }
  A.ready.then(function(){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();});
})();
