/* Jax Vendor Events: calm layout (owner, Nov 2 2026 1:53 PM: "still looking the same" after the CSS-only clean-up).
   Layout only: moves existing controls into fewer rows and folds secondary things behind one tap. No feature, route,
   id or paywall rule changes; every original control is still in the page (moved, or reachable through a "More" menu). */
(function(){
  'use strict';
  var d=document,$=function(id){return d.getElementById(id);};
  function el(tag,cls,html){var x=d.createElement(tag);if(cls)x.className=cls;if(html!=null)x.innerHTML=html;return x;}
  var CHEV='<svg class="cm-chev" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var DOTS='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  d.documentElement.classList.add('calm');

  /* ---------- Events / Home (index.html) ---------- */
  function index(){
    var chips=$('chips'),reg=$('cRegion'),tools=d.querySelector('.xh-tools'),seg=d.querySelector('.xseg'),sort=d.querySelector('.xsort'),cnt=d.querySelector('.xbar .count'),head=d.querySelector('.xhead');
    if(!chips||!tools)return;
    /* sort becomes the last chip of the one filter row; the count sits under the page title */
    if(sort){sort.classList.add('xchip','cm-sort');chips.appendChild(sort);}
    if(cnt&&head){cnt.classList.add('cm-count');head.appendChild(cnt);}
    /* region + All/Deadlines live in the filter row on list views, back in the hero on Home */
    var regHome=d.createComment('reg'),segHome=d.createComment('seg');tools.insertBefore(regHome,reg);tools.insertBefore(segHome,seg);
    function place(){var v=d.body.getAttribute('data-view')||'home';
      if(v==='home'){if(reg.parentNode!==tools)tools.insertBefore(reg,regHome.nextSibling);if(seg&&seg.parentNode!==tools)tools.insertBefore(seg,segHome.nextSibling);}
      else{if(reg.parentNode!==chips)chips.insertBefore(reg,chips.firstChild);if(seg&&seg.parentNode!==chips)chips.insertBefore(seg,reg.nextSibling);}
    }
    place();new MutationObserver(place).observe(d.body,{attributes:true,attributeFilter:['data-view']});

    /* My calendar: one line, closed by default */
    var mc=$('mycal');
    if(mc){var tg=el('button','cm-mctog');tg.type='button';tg.setAttribute('aria-expanded','false');tg.setAttribute('aria-controls','mycal');
      var disc=$('disc');if(disc&&disc.parentNode){disc.parentNode.insertBefore(mc,disc.nextSibling);}
      mc.parentNode.insertBefore(tg,mc);var open=false;
      function lbl(){var C=window.JVE_CAL,s=C&&C.state,t='';
        if(s&&s.linked){var td=new Date(),iso=td.getFullYear()+'-'+String(td.getMonth()+1).padStart(2,'0')+'-'+String(td.getDate()).padStart(2,'0');
          var n=(s.busy||[]).filter(function(b){return b.d>=iso;}).length;t=n+' upcoming';}
        else if(s&&s.linked===false)t='link your calendar';
        tg.innerHTML='<svg class="ico" aria-hidden="true"><use href="#i-cal"/></svg><b>My calendar</b>'+(t?'<span> · '+t+'</span>':'')+CHEV;}
      function set(o){open=o;d.body.classList.toggle('cm-mcopen',o);tg.setAttribute('aria-expanded',String(o));}
      tg.addEventListener('click',function(){set(!open);});
      /* a day picked from the strip keeps it open; jve:list fires on every render */
      lbl();var tries=0,iv=setInterval(function(){if(window.JVE_CAL){window.JVE_CAL.on(lbl);lbl();clearInterval(iv);}else if(++tries>40)clearInterval(iv);},250);
    }

    /* signed-in members: the weekly-email box folds into one line too */
    var su=d.querySelector('main > section.xsignup');
    if(su&&d.documentElement.classList.contains('authed')){var sd=el('details','cm-fold cm-su');sd.innerHTML='<summary>Get the weekly email<span class="cm-sub">free · every Monday</span>'+CHEV+'</summary>';su.parentNode.insertBefore(sd,su);sd.appendChild(su);}
    /* the small print at the bottom folds into one line */
    var note=d.querySelector('main > p.note');
    if(note){var dt=el('details','cm-fold cm-note');dt.innerHTML='<summary>About these listings'+CHEV+'</summary>';note.parentNode.insertBefore(dt,note);dt.appendChild(note);}

    /* Home: hero + the 3 most useful sections; everything else under one "More" */
    var home=$('home');
    if(home){var busy=false;
      function isKeep(k){var c=' '+(k.className||'')+' ';
        if(/ dh | dsec | drole | hpro /.test(c))return true;
        if(/ hsec /.test(c)&&(k.querySelector('.hrail')||k.querySelector('.hdl')))return true;
        return false;}
      function tidyHome(){if(busy)return;busy=true;
        try{
          var m=home.querySelector(':scope > .cm-more');
          /* sections copied from a dashboard that has since re-rendered are stale: drop them */
          if(m){[].slice.call(m.querySelectorAll('.cm-morebody > [data-cm-dash]')).forEach(function(x){x.remove();});}
          var rest=[];
          [].slice.call(home.children).forEach(function(k){
            if(k.classList.contains('cm-more'))return;
            if(k.id==='dash'){[].slice.call(k.children).forEach(function(x){if(!isKeep(x)){x.setAttribute('data-cm-dash','');rest.push(x);}});return;}
            if(!isKeep(k))rest.push(k);});
          if(!m&&rest.length){m=el('details','cm-fold cm-more');m.innerHTML='<summary><b>More</b><span></span>'+CHEV+'</summary><div class="cm-morebody"></div>';}
          if(m){var mb=m.querySelector('.cm-morebody');rest.forEach(function(r){mb.appendChild(r);});home.appendChild(m);
            var names=[].slice.call(mb.children).map(function(r){if(r.classList.contains('hstats'))return 'At a glance';if(r.classList.contains('dash-around'))return '';var h=r.querySelector('h2,h3');return h?(h.firstChild&&h.firstChild.textContent||h.textContent).trim():'';}).filter(Boolean);
            m.querySelector('summary span').textContent=names.slice(0,4).join(' · ');
            if(!mb.children.length)m.remove();}
        }catch(e){}
        setTimeout(function(){busy=false;},0);}
      tidyHome();
      new MutationObserver(function(){if(!busy)tidyHome();}).observe(home,{childList:true});
    }
    sheet();
  }

  /* ---------- Event detail sheet: one primary button, the rest under "More" ---------- */
  function sheet(){
    var foot=d.querySelector('#sheet .sh-foot'),body=$('shBody');if(!foot)return;
    var ics=$('shIcs'),sv=$('shSave'),sh=$('shShare');
    var mb=el('button','btn ghost cm-morebtn',DOTS+'<span>More</span>');mb.type='button';mb.setAttribute('aria-haspopup','true');mb.setAttribute('aria-expanded','false');
    var menu=el('div','cm-menu');menu.hidden=true;menu.setAttribute('role','menu');
    function item(label,src){var b=el('button','cm-mi',label);b.type='button';b.setAttribute('role','menuitem');b.addEventListener('click',function(){close();if(src)src.click();});return b;}
    var iSave=item('Save',sv);menu.appendChild(item('Add to calendar (.ics)',ics));menu.appendChild(iSave);menu.appendChild(item('Share',sh));
    [ics,sv,sh].forEach(function(b){if(b)b.classList.add('cm-hid');});
    foot.appendChild(mb);foot.appendChild(menu);
    function close(){menu.hidden=true;mb.setAttribute('aria-expanded','false');}
    mb.addEventListener('click',function(e){e.stopPropagation();var o=menu.hidden;menu.hidden=!o;mb.setAttribute('aria-expanded',String(o));if(o&&sv)iSave.textContent=sv.getAttribute('aria-pressed')==='true'?'Saved ✓ (tap to remove)':'Save';});
    d.addEventListener('click',function(e){if(!menu.hidden&&!menu.contains(e.target)&&e.target!==mb)close();});
    /* "Add to my calendar" (3 buttons) folds into one row, placed after the details */
    if(body){var busy=false;new MutationObserver(function(){if(busy)return;busy=true;
        var a=body.querySelector('.mcadd');
        if(a&&!a.closest('.cm-calfold')&&a.querySelector('.mcaddb')){var f=el('details','cm-fold cm-calfold');f.innerHTML='<summary>Add to my calendar'+CHEV+'</summary>';body.appendChild(f);f.appendChild(a);}
        var olds=body.querySelectorAll('.cm-calfold');for(var i=0;i<olds.length;i++){if(!olds[i].querySelector('.mcadd'))olds[i].remove();}
        busy=false;}).observe(body,{childList:true,subtree:false});}
  }

  /* ---------- Account / Pro: sections are closed cards ---------- */
  function pro(){
    [].slice.call(d.querySelectorAll('[data-calm-fold]')).forEach(function(s){
      var h=s.firstElementChild;if(!h)return;s.classList.add('cm-fs');h.classList.add('cm-fsh');
      var b=el('button','cm-fsb',CHEV);b.type='button';b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Show '+((h.querySelector('h2')||h).textContent||'section').trim());
      h.appendChild(b);
      function t(){var o=!s.classList.contains('cm-open');s.classList.toggle('cm-open',o);b.setAttribute('aria-expanded',String(o));}
      h.addEventListener('click',function(e){if(e.target.closest('a,select,input,[data-show]')&&!e.target.closest('.cm-fsb'))return;t();});
    });
  }

  function boot(){if($('chips'))index();pro();}
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot);else boot();
})();
