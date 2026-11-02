/* Jax Vendor Events: "My calendar" (owner request Nov 1 2026: link your own calendar, see it above Events).
   - Events tab: a 2-week strip (tap "Month" for a month grid) of the member's OWN busy days next to how many listed
     markets fall on each day (counts only, from the same listings the visitor's tier already gets: teasers carry no names).
     Tap a day to filter the list to that date. Days with nothing on the member's calendar say "Free".
   - Event sheet: "Add to my calendar" (Google link, .ics for Apple/Outlook, Outlook web link) for events the visitor
     can see in full; locked teasers show "Unlock with Vendor Pro".
   - account.html: the "My calendar" card (#calCard) to paste / refresh / unlink the private iCal link.
   The link itself is fetched and parsed only on the server (my-calendar function); it is stored encrypted and never
   comes back to the browser. Self-contained: needs auth.js (JVE_AUTH) and, on index.html, app.js (window.JVE_APP). */
(function(){
  'use strict';
  var A=window.JVE_AUTH, TZ=(function(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York';}catch(_){return 'America/New_York';}})();
  var WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],W1=['S','M','T','W','T','F','S'],MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      MOL=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function pd(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function add(s,n){var d=pd(s);d.setDate(d.getDate()+n);return iso(d);}
  function today(){return iso(new Date());}
  function nice(s){var d=pd(s);return WD[d.getDay()]+', '+MO[d.getMonth()]+' '+d.getDate();}
  function hm(t){if(!t)return '';var p=t.split(':'),h=+p[0],m=p[1];if(h===24)return '12am';var ap=h<12?'am':'pm';h=h%12||12;return h+(m!=='00'?':'+m:'')+ap;}
  function ago(t){var m=Math.round((Date.now()-Date.parse(t))/6e4);return m<1?'just now':m<60?m+' min ago':Math.round(m/60)+' h ago';}
  var SV={cal:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    ref:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>',
    lock:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
    x:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    tent:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 20l7-14 7 14M12 6v14"/></svg>',
    g:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5L6.4 10C7.2 7.7 9.4 6 12 6z"/></svg>',
    ap:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.3 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.7-1-2.7-4z"/><path d="M14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/></svg>',
    ol:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="12" height="14" rx="2" fill="#0A64D8"/><path fill="#fff" d="M8.5 8.6c-1.9 0-3 1.5-3 3.4s1.1 3.4 3 3.4 3-1.5 3-3.4-1.1-3.4-3-3.4zm0 5.4c-1 0-1.5-.9-1.5-2s.5-2 1.5-2 1.5.9 1.5 2-.5 2-1.5 2z"/><path fill="#28A8EA" d="M14.5 8h7v9.5a1 1 0 0 1-1 1h-6z"/><path fill="#fff" opacity=".85" d="M14.5 8l3.5 3 3.5-3z"/></svg>'};
  function user(){return A&&A.user;}
  function uid(){return user()?A.user.id:'';}

  /* ---------- server calls ---------- */
  var SK='jve_cal_busy';
  function cacheGet(){try{var c=JSON.parse(sessionStorage.getItem(SK)||'null');return c&&c.u===uid()?c:null;}catch(_){return null;}}
  function cacheSet(d){try{sessionStorage.setItem(SK,JSON.stringify({u:uid(),at:Date.now(),d:d}));}catch(_){}}
  function cacheClear(){try{sessionStorage.removeItem(SK);}catch(_){}}
  function api(action,extra){
    var body=Object.assign({action:action,tz:TZ},extra||{});
    return A.sb.functions.invoke('my-calendar',{body:body}).then(function(r){
      if(!r.error)return r.data;
      var res=r.error.context;
      if(res&&res.json)return res.json().then(function(j){throw j;},function(){throw {msg:'Something went wrong. Try again in a minute.'};});
      throw {msg:'Could not reach the calendar service. Check your connection.'};
    });
  }
  var state={busy:null,linked:null,label:null,fetched:null,warn:null,loading:false};
  var subs=[];function emit(){subs.forEach(function(f){try{f();}catch(e){console.error(e);}});}
  function load(refresh){
    if(!user()){state.linked=false;emit();return Promise.resolve();}
    if(!refresh){var c=cacheGet();if(c&&Date.now()-c.at<4*60e3){apply(c.d);return Promise.resolve();}if(c)apply(c.d);}
    state.loading=true;emit();
    return api('busy',refresh?{refresh:true}:null).then(function(d){state.loading=false;apply(d);if(d.linked)cacheSet(d);else cacheClear();},
      function(err){state.loading=false;state.warn=(err&&err.msg)||'Could not load your calendar.';emit();});
  }
  function apply(d){state.linked=!!d.linked;state.busy=d.linked?(d.busy||[]):null;state.label=d.label||null;state.fetched=d.fetched_at||null;state.warn=d.warn||d.msg||null;emit();}
  function busyOn(day){if(!state.busy)return [];return state.busy.filter(function(b){return b.d===day;});}
  function busyLine(b){return (b.a?'All day':hm(b.s)+(b.e&&b.e!==b.s?'–'+hm(b.e):''))+' · '+b.t;}
  window.JVE_CAL={state:state,load:load,on:function(f){subs.push(f);},busyOn:busyOn};

  /* ---------- link card (account.html #calCard, and the Events "Link calendar" sheet) ---------- */
  var HELP='<details class="mchelp"><summary>How do I find this?</summary>'+
    '<div class="mcstep"><b>'+SV.g+' Google Calendar</b><ol><li>On a computer, open <b>calendar.google.com</b> (the phone app doesn’t show this link).</li><li>Click the gear → <b>Settings</b>, then click your calendar under <b>Settings for my calendars</b>.</li><li>Scroll to <b>Integrate calendar</b> and copy <b>Secret address in iCal format</b>.</li><li>Paste it above. (Keep it secret: anyone with it can see that calendar.)</li></ol></div>'+
    '<div class="mcstep"><b>'+SV.ap+' Apple / iCloud</b><ol><li>On iPhone, open <b>Calendar</b> and tap <b>Calendars</b> at the bottom.</li><li>Tap the <b>ⓘ</b> next to the calendar you use.</li><li>Turn on <b>Public Calendar</b>, tap <b>Share Link…</b> → <b>Copy</b>.</li><li>Paste it above (it starts with webcal://). Tip: make a separate “Markets” calendar if you’d rather not publish your main one.</li></ol></div>'+
    '<div class="mcstep"><b>'+SV.ol+' Outlook</b><ol><li>Open <b>Outlook on the web</b> (outlook.com or Microsoft 365).</li><li>Gear → <b>Calendar</b> → <b>Shared calendars</b>.</li><li>Under <b>Publish a calendar</b>, pick your calendar and <b>Can view all details</b> (or “when I’m busy”), then <b>Publish</b>.</li><li>Copy the <b>ICS</b> link and paste it above.</li></ol></div></details>';
  function card(el,opts){
    opts=opts||{};
    function draw(){
      if(!user()){el.innerHTML='<h2>'+SV.cal+' My calendar</h2><p>Log in to link your calendar and see your free days next to every market.</p><a class="btn" href="login.html?next=account.html%23calendar">Log in</a>';return;}
      var head='<h2 class="mch2">'+SV.cal+' My calendar</h2>';
      if(state.linked===null){el.innerHTML=head+'<p class="mcmut">Loading…</p>';return;}
      if(state.linked&&!el._edit){
        var n=(state.busy||[]).length;
        el.innerHTML=head+'<p class="mcok"><span class="mcdot ok"></span><b>Linked:</b> '+esc(state.label||'your calendar')+'</p>'+
          '<p class="mcmut">'+n+' busy item'+(n===1?'':'s')+' in the next 60 days'+(state.fetched?' · updated '+ago(state.fetched):'')+'. It shows above the Events list. Only you can see it.</p>'+
          (state.warn?'<p class="mcwarn">'+esc(state.warn)+'</p>':'')+
          '<div class="mcbtns"><button type="button" class="btn ghost mcb" data-mc="refresh">'+SV.ref+' Refresh</button><button type="button" class="btn ghost mcb" data-mc="change">Change link</button><button type="button" class="btn ghost mcb danger" data-mc="unlink">Unlink</button></div>'+
          (opts.inSheet?'<button type="button" class="btn mcb" data-mc="close">Done</button>':'<a class="mclink" href="index.html#events">See it on the Events tab '+SV.chev+'</a>');
        return;
      }
      el.innerHTML=head+'<p>Paste your calendar’s private iCal link once. Your busy days then show above the Events list, with how many markets fall on each day, so open weekends stand out without switching apps.</p>'+
        '<form class="mcform" novalidate><label class="sr" for="mcUrl'+(opts.inSheet?'S':'')+'">Calendar link</label><input id="mcUrl'+(opts.inSheet?'S':'')+'" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://… or webcal://… (.ics link)" required>'+
        '<button class="btn" type="submit">Link calendar</button>'+(state.linked?'<button type="button" class="btn ghost mcb" data-mc="cancel">Cancel</button>':'')+'</form>'+
        '<p class="mcerr" role="alert" hidden></p>'+HELP+
        '<p class="mcpriv">'+SV.lock+'<span>Works with Google, Apple iCloud and Outlook. We keep the link encrypted, read it only to show <b>you</b> your busy days, and never show it to anyone. Unlink any time.</span></p>';
      var f=el.querySelector('form');f.addEventListener('submit',function(ev){ev.preventDefault();
        var inp=f.querySelector('input'),v=inp.value.trim(),er=el.querySelector('.mcerr'),b=f.querySelector('button[type=submit]');
        if(!/^(https?|webcals?):\/\/\S+$/i.test(v)){er.hidden=false;er.textContent='Paste the full link. It starts with https:// or webcal://';inp.focus();return;}
        er.hidden=true;b.disabled=true;b.textContent='Checking your calendar…';
        api('link',{url:v}).then(function(d){el._edit=false;apply(d);cacheSet({linked:true,label:d.label,busy:d.busy,fetched_at:d.fetched_at});toastMsg('Calendar linked: '+(d.busy||[]).length+' busy items found');},
          function(err){b.disabled=false;b.textContent='Link calendar';er.hidden=false;er.textContent=(err&&err.msg)||'That link did not work. Check it and try again.';});
      });
    }
    el.addEventListener('click',function(ev){var b=ev.target.closest('[data-mc]');if(!b)return;var k=b.getAttribute('data-mc');
      if(k==='refresh'){b.disabled=true;b.lastChild.textContent=' Refreshing…';load(true);}
      else if(k==='change'){el._edit=true;draw();var i=el.querySelector('input');if(i)i.focus();}
      else if(k==='cancel'){el._edit=false;draw();}
      else if(k==='close'){closeSheet();}
      else if(k==='unlink'){if(!confirm('Unlink your calendar? Your busy days will stop showing on Events.'))return;b.disabled=true;
        api('unlink').then(function(){cacheClear();el._edit=false;apply({linked:false});toastMsg('Calendar unlinked');},function(err){b.disabled=false;alert((err&&err.msg)||'Could not unlink. Try again.');});}
    });
    subs.push(draw);draw();
  }
  function toastMsg(m){var t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='mctoast';t.setAttribute('role','status');document.body.appendChild(t);}
    t.textContent=m;t.classList.add('show');clearTimeout(toastMsg.t);toastMsg.t=setTimeout(function(){t.classList.remove('show');},2400);}

  /* ---------- small sheet for linking from the Events tab ---------- */
  var mcs=null;
  function openSheet(){
    if(!mcs){mcs=document.createElement('div');mcs.className='mcsheet';mcs.innerHTML='<div class="mcscrim" data-mcclose></div><div class="mcpanel" role="dialog" aria-modal="true" aria-label="Link your calendar"><button type="button" class="mcx" data-mcclose aria-label="Close">'+SV.x+'</button><div class="mcbody acard"></div></div>';
      document.body.appendChild(mcs);mcs.addEventListener('click',function(e){if(e.target.closest('[data-mcclose]'))closeSheet();});
      document.addEventListener('keydown',function(k){if(k.key==='Escape'&&mcs.classList.contains('open'))closeSheet();});
      card(mcs.querySelector('.mcbody'),{inSheet:true});}
    mcs.classList.add('open');document.body.classList.add('noscroll');setTimeout(function(){var i=mcs.querySelector('input');if(i&&!state.linked)i.focus();},250);
  }
  function closeSheet(){if(mcs){mcs.classList.remove('open');document.body.classList.remove('noscroll');}}

  /* ---------- Events-tab strip ---------- */
  var S={day:null,mode:'2w',month:null,el:null};
  function counts(){
    var APP=window.JVE_APP,m={};if(!APP)return m;var rg=APP.region(),a=today(),z=add(a,62);
    APP.events().forEach(function(e){if(e.rg!==rg)return;var seen={};
      (e.up||[]).forEach(function(x){if(x>=a&&x<=z&&!seen[x]){seen[x]=1;m[x]=(m[x]||0)+1;}});
      if(e.end_date&&e.up&&e.up.length===1&&e.end_date>e.up[0]){for(var d=e.up[0];d<=e.end_date&&d<=z;d=add(d,1)){if(d>=a&&!seen[d]){seen[d]=1;m[d]=(m[d]||0)+1;}}}});
    return m;}
  function cell(day,cnt,mode){
    var d=pd(day),b=busyOn(day),linked=!!state.linked,wk=d.getDay()===0||d.getDay()===6,free=linked&&!b.length,past=day<today();
    var cls='mcday'+(wk?' wk':'')+(free?' free':'')+(b.length?' busy':'')+(S.day===day?' on':'')+(day===today()?' today':'')+(past?' past':'');
    var dots='';for(var i=0;i<Math.min(3,b.length);i++)dots+='<i></i>';
    var lab=WD[d.getDay()]+' '+MO[d.getMonth()]+' '+d.getDate()+': '+(linked?(b.length?b.length+' on your calendar':'free'):'')+(cnt?', '+cnt+' market'+(cnt===1?'':'s'):'');
    if(mode==='m')return '<button type="button" class="'+cls+'" data-day="'+day+'"'+(past?' disabled':'')+' aria-pressed="'+(S.day===day)+'" aria-label="'+esc(lab)+'"><span class="n">'+d.getDate()+'</span>'+(b.length?'<span class="dots">'+dots+'</span>':free?'<span class="fr">free</span>':'<span class="dots"></span>')+(cnt?'<span class="c">'+cnt+'</span>':'')+'</button>';
    return '<button type="button" class="'+cls+'" data-day="'+day+'" aria-pressed="'+(S.day===day)+'" aria-label="'+esc(lab)+'"><span class="w">'+W1[d.getDay()]+'</span><span class="n">'+d.getDate()+'</span>'+
      (b.length?'<span class="t">'+esc(b[0].t)+'</span><span class="dots">'+dots+'</span>':free?'<span class="fr">Free</span>':'<span class="t mute">'+(linked?'':'&nbsp;')+'</span>')+
      '<span class="c'+(cnt?'':' z')+'">'+(cnt?SV.tent+cnt:'–')+'</span></button>';
  }
  function drawStrip(){
    var el=S.el;if(!el)return;var APP=window.JVE_APP;var m=counts(),t0=today(),html='';
    var lin=!!state.linked,acc=document.documentElement.getAttribute('data-access')||'anon';
    var top='<div class="mchd"><h2>'+SV.cal+' My calendar <small>'+(S.mode==='2w'?'next 2 weeks':'')+'</small></h2><div class="mcact">'+
      (lin?'<button type="button" class="mcib" data-act="refresh" aria-label="Refresh my calendar"'+(state.loading?' disabled':'')+'>'+SV.ref+'</button>':'')+
      '<button type="button" class="mctog" data-act="mode" aria-expanded="'+(S.mode==='m')+'">'+(S.mode==='m'?'2 weeks':'Month')+'</button></div></div>';
    if(!user()) top+='<div class="mcprompt"><p><b>Link your calendar to see your free days</b><span>Your own schedule next to every market, without switching apps.</span></p><div><a class="btn" href="login.html?mode=signup&amp;next=account.html%23calendar">Sign up free</a><a class="btn ghost" href="login.html?next=index.html%23events">Log in</a></div></div>';
    else if(state.linked===false) top+='<div class="mcprompt"><p><b>Link your calendar to see your free days</b><span>Google, Apple or Outlook. Only you see it.</span></p><div><button type="button" class="btn" data-act="link">Link calendar</button></div></div>';
    if(S.mode==='2w'){
      var cells='';for(var i=0;i<14;i++)cells+=cell(add(t0,i),m[add(t0,i)]||0,'2w');
      html=top+'<div class="mcrow" role="group" aria-label="Next two weeks">'+cells+'</div>';
    }else{
      var mon=S.month||t0.slice(0,7),first=pd(mon+'-01'),y=first.getFullYear(),mo=first.getMonth(),nd=new Date(y,mo+1,0).getDate();
      var minM=t0.slice(0,7),maxM=add(t0,60).slice(0,7);
      var g='';for(var k=0;k<first.getDay();k++)g+='<span class="mcpad"></span>';
      for(var dd=1;dd<=nd;dd++){var day=mon+'-'+String(dd).padStart(2,'0');g+=day>add(t0,61)?'<span class="mcday out"><span class="n">'+dd+'</span></span>':cell(day,m[day]||0,'m');}
      html=top+'<div class="mcmon"><div class="mcmh"><button type="button" class="mcib" data-act="prev" aria-label="Previous month"'+(mon<=minM?' disabled':'')+'><span style="display:inline-block;transform:scaleX(-1)">'+SV.chev+'</span></button><b>'+MOL[mo]+' '+y+'</b><button type="button" class="mcib" data-act="next" aria-label="Next month"'+(mon>=maxM?' disabled':'')+'>'+SV.chev+'</button></div>'+
        '<div class="mcwk">'+W1.map(function(x){return '<span>'+x+'</span>';}).join('')+'</div><div class="mcgrid">'+g+'</div></div>';
    }
    var key='<div class="mckey">'+(lin?'<span><i class="kb"></i>your plans</span><span><i class="kf"></i>free</span>':'')+'<span>'+SV.tent+' markets'+(acc==='full'?'':' (counts)')+'</span>'+(state.loading?'<span class="mcmut">updating…</span>':state.warn&&lin?'<span class="mcwarn">'+esc(state.warn)+'</span>':'')+'</div>';
    var det='';
    if(S.day){var b=busyOn(S.day),c=m[S.day]||0;
      det='<div class="mcdet"><div><b>'+nice(S.day)+'</b>'+(lin?(b.length?'<ul>'+b.slice(0,4).map(function(x){return '<li>'+esc(busyLine(x))+'</li>';}).join('')+(b.length>4?'<li>+'+(b.length-4)+' more</li>':'')+'</ul>':'<p class="mcfree">Nothing on your calendar. You’re free.</p>'):'')+
        '<p class="mcmut">'+(c?c+' market'+(c===1?'':'s')+' that day, shown below':'No markets listed that day in '+esc(APP?APP.regionLabel():'this region'))+'</p></div><button type="button" class="mcclr" data-act="clear" aria-label="Show all dates">'+SV.x+'</button></div>';}
    el.innerHTML=html+key+det;
    var on=el.querySelector('.mcrow .on');if(on&&on.scrollIntoView&&el._scrollTo){on.scrollIntoView({block:'nearest',inline:'center'});el._scrollTo=false;}
  }
  function pick(day){var APP=window.JVE_APP;S.day=(S.day===day)?null:day;if(APP)APP.setDay(S.day);drawStrip();}
  function strip(el){
    S.el=el;el.hidden=false;
    el.addEventListener('click',function(e){var d=e.target.closest('[data-day]');if(d&&!d.disabled){pick(d.getAttribute('data-day'));return;}
      var a=e.target.closest('[data-act]');if(!a)return;var k=a.getAttribute('data-act');
      if(k==='mode'){S.mode=S.mode==='2w'?'m':'2w';S.month=S.day?S.day.slice(0,7):null;drawStrip();}
      else if(k==='prev'||k==='next'){var mon=S.month||today().slice(0,7),dt=pd(mon+'-01');dt.setMonth(dt.getMonth()+(k==='next'?1:-1));S.month=iso(dt).slice(0,7);drawStrip();}
      else if(k==='refresh'){load(true);}
      else if(k==='link'){openSheet();}
      else if(k==='clear'){pick(S.day);}
    });
    document.addEventListener('jve:list',function(ev){var d=ev.detail||{};if((d.day||null)!==S.day){S.day=d.day||null;}drawStrip();});
    subs.push(drawStrip);drawStrip();
  }

  /* ---------- "Add to my calendar" in the event sheet ---------- */
  function q(o){return Object.keys(o).filter(function(k){return o[k]!=null&&o[k]!=='';}).map(function(k){return k+'='+encodeURIComponent(o[k]);}).join('&');}
  function links(e,d){
    var end=(e.end_date&&e.end_date>d&&e.up&&e.up.length===1)?e.end_date:d,endX=add(end,1);
    var loc=[e.venue,e.city,e.county?e.county+' County, FL':'FL'].filter(Boolean).join(', ');
    var url=(/^https?:\/\//i.test(e.apply||'')?e.apply:/^https?:\/\//i.test(e.source||'')?e.source:'');
    var desc=['Vendor fee: '+(e.fee||'not listed'),e.deadline?'Apply by: '+e.deadline:'',url?'Apply / info: '+url:'',e.time?'Hours: '+e.time:'','From Jax Vendor Events'].filter(Boolean).join('\n');
    return {google:'https://calendar.google.com/calendar/render?action=TEMPLATE&dates='+d.replace(/-/g,'')+'/'+endX.replace(/-/g,'')+'&'+q({text:e.name,details:desc,location:loc}),
      outlook:'https://outlook.live.com/calendar/0/action/compose?'+q({allday:'true',subject:e.name,startdt:d,enddt:endX,body:desc,location:loc,path:'/calendar/action/compose',rru:'addevent'})};
  }
  function sheet(e,d){
    var body=document.getElementById('shBody');if(!body)return;var old=body.querySelector('.mcadd');if(old)old.remove();
    var box=document.createElement('div');box.className='mcadd';
    if(!d){box.innerHTML='<p class="mcmut">'+SV.cal+' Dates aren’t posted yet, so this can’t go on a calendar.</p>';body.insertBefore(box,body.firstChild);return;}
    var b=busyOn(d),fit=state.linked?(b.length?'<p class="mcfit busy">'+SV.cal+' You have '+esc(b[0].t)+(b.length>1?' +'+(b.length-1)+' more':'')+' on '+nice(d)+'</p>':'<p class="mcfit free">'+SV.cal+' You’re free on '+nice(d)+'</p>'):'';
    if(e.locked){
      box.innerHTML=fit+'<button type="button" class="btn ghost mclock" data-unlock="vendor-pro">'+SV.lock+'<span>Add to my calendar</span><small>Unlock with Vendor Pro</small></button>';
    }else{
      var L=links(e,d);
      box.innerHTML=fit+'<p class="mcaddh">Add to my calendar</p><div class="mcaddb"><a class="mcab" href="'+esc(L.google)+'" target="_blank" rel="noopener">'+SV.g+'Google</a><button type="button" class="mcab" data-ics>'+SV.ap+'Apple / .ics</button><a class="mcab" href="'+esc(L.outlook)+'" target="_blank" rel="noopener">'+SV.ol+'Outlook</a></div>';
      box.querySelector('[data-ics]').addEventListener('click',function(){var APP=window.JVE_APP;if(APP&&APP.ics)APP.ics(e,d);});
    }
    body.insertBefore(box,body.firstChild);
  }
  window.JVE_CAL.sheet=sheet;
  window.JVE_CAL.icon=function(e){if(e&&e.locked){if(A&&A.unlock)A.unlock('vendor-pro');return true;}return false;};
  window.JVE_CAL.card=card;

  /* ---------- boot ---------- */
  function boot(){
    var cc=document.getElementById('calCard');if(cc){card(cc);if(location.hash==='#calendar'||location.hash==='#calCard')setTimeout(function(){var sec=cc.closest('.asec');if(sec&&!sec.classList.contains('open')){var bt=sec.querySelector('.ash');if(bt)bt.click();else sec.classList.add('open');}setTimeout(function(){cc.scrollIntoView({behavior:'smooth',block:'start'});},250);},300);}
    var st=document.getElementById('mycal');
    if(st){var go=function(){strip(st);};
      if(window.JVE_APP)go();else document.addEventListener('jve:app',go,{once:true});}
    if(cc||st)load(false);
  }
  if(!A||!A.ready)return;
  A.ready.then(function(){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();});
})();
