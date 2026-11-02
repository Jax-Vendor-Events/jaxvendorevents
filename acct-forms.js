/* Jax Vendor Events: "List your event" goes into the member's own account (reviewed by an admin), not an anonymous email. */
(function(){
  'use strict';
  window.addEventListener('submit',function(e){
    var f=e.target;if(!f||f.id!=='listForm')return;
    e.preventDefault();e.stopImmediatePropagation();
    var A=window.JVE_AUTH;if(!A||!A.user){location.href='login.html?next=list.html';return;}
    function v(id){var el=document.getElementById(id);return el?el.value.trim():'';}
    var m=f.querySelector('.fsmsg');
    function say(t,ok){if(!m){alert(t);return;}m.className='fsmsg amsg show '+(ok?'ok':'err');m.textContent=t;m.scrollIntoView({behavior:'smooth',block:'nearest'});}
    if(!v('lName')||!v('lDate')||!v('lLink'))return say('Please add the event name, date and application link.',false);
    if(!/^https?:\/\/\S+$/i.test(v('lLink')))return say('The application link should start with https://',false);
    var pl={name:v('lName'),dates:[v('lDate')],schedule:v('lRepeat'),time:v('lTime'),city:v('lCity'),county:v('lCounty'),venue:v('lVenue'),fee:v('lFee'),
      deadline:v('lDl')||null,apply:v('lLink'),source:v('lLink'),description:v('lNotes'),organizer:v('lOrg')||(A.profile&&A.profile.business_name)||'',contact:v('lEmail')};
    var btn=f.querySelector('button[type=submit]');if(btn)btn.disabled=true;
    A.sb.from('listing_requests').insert({user_id:A.user.id,kind:'new_event',payload:pl}).then(function(r){if(btn)btn.disabled=false;
      if(r.error)return say(r.error.message,false);f.reset();var nx=document.getElementById('listNext');if(nx)nx.hidden=false;say('Thanks! Your event is in. We check it against your own page and it usually appears within 24 hours. You can follow it under My account.',true);});
  },true);
  document.addEventListener('jve:auth',function(e){var A=e.detail;if(!A||!A.user)return;var o=document.getElementById('lOrg'),em=document.getElementById('lEmail');
    if(o&&!o.value&&A.profile)o.value=A.profile.business_name||'';if(em&&!em.value)em.value=A.user.email||'';});
})();
