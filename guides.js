/* guides.html: county search + filter (no tracking, no network) */
(function(){
  var q=document.getElementById('gq'),grid=document.getElementById('ggrid');if(!q||!grid)return;
  var cards=[].slice.call(grid.querySelectorAll('.gcard')),btns=[].slice.call(document.querySelectorAll('.gfil button')),
      cnt=document.getElementById('gcount'),none=document.getElementById('gnone'),f='all';
  function norm(s){return String(s||'').toLowerCase().replace(/^\s+|\s+$/g,'').replace(/\bcounty\b/g,'').replace(/saint /g,'st. ').replace(/\s+/g,' ').trim();}
  function run(){var t=norm(q.value),n=0;
    cards.forEach(function(c){var ok=(f==='all'||c.getAttribute('data-status')===f)&&(!t||c.getAttribute('data-name').indexOf(t)>-1||c.getAttribute('data-name').replace(/\./g,'').indexOf(t.replace(/\./g,''))>-1);c.hidden=!ok;if(ok)n++;});
    cnt.textContent='Showing '+n+(n===1?' county':' counties');none.hidden=n>0;}
  q.addEventListener('input',run);
  btns.forEach(function(b){b.addEventListener('click',function(){f=b.getAttribute('data-f');btns.forEach(function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false');});run();});});
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('.gaz a');if(!a)return;if(q.value||f!=='all'){q.value='';f='all';btns.forEach(function(x){var on=x.getAttribute('data-f')==='all';x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false');});run();}});
})();
