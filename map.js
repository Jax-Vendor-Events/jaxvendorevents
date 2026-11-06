/* Jax Vendor Events: the events map (Nov 6 2026). A view of the Events page (index.html#map) that uses the same listings,
   region and filters as the list, and the same event sheet (tap a town pin, then an event).
   PRIVACY + PAYWALL: every pin sits at a TOWN or COUNTY center from geo.js (public Census data), never at a venue.
   The listings come from the one paywalled door (get_site in auth.js): free and logged-out visitors get teasers without
   venue, organizer or links, and this file adds nothing to them. Map tiles: OpenStreetMap (standard tiles, toned dark in jve.css). */
(function(){
  'use strict';
  var d=document,G=window.JVE_GEO||{county:{},place:{},alias:{}};
  var map=null,layer=null,loading=null,box=null,panel=null,lastKey=null;
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function nk(s){s=String(s||'').toLowerCase().trim().replace(/\(.*?\)/g,'').replace(/\bsaint\b/g,'st').replace(/\bst\.?\s/g,'st ').replace(/\bcounty\b/g,'').replace(/\bft\.?\s/g,'fort ');
    return s.replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();}
  function cname(c){return String(c||'').replace(/\s*county\s*$/i,'').trim();}
  /* town center for a listing: its city (when that town is in the listing's county), else its county center */
  function spot(e){var co=cname(e.county),k=nk(e.city);k=(G.alias&&G.alias[k])||k;var p=k&&G.place[k];
    if(p&&(!co||nk(p[0])===nk(co)))return {lat:p[1],lng:p[2],label:(e.city||p[0]),county:co||p[0],town:true};
    var c=G.county[co];if(c)return {lat:c[0],lng:c[1],label:co+' County',county:co,town:false};return null;}
  function load(){if(loading)return loading;
    function css(h){var l=d.createElement('link');l.rel='stylesheet';l.href=h;d.head.appendChild(l);}
    function js(s){return new Promise(function(ok,no){var x=d.createElement('script');x.src=s;x.onload=ok;x.onerror=no;d.head.appendChild(x);});}
    css('vendor/leaflet/leaflet-1.9.4.css');css('vendor/leaflet/markercluster-1.5.3.css');
    loading=js('vendor/leaflet/leaflet-1.9.4.js').then(function(){return js('vendor/leaflet/markercluster-1.5.3.js');});return loading;}
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function when(a){if(!a)return 'Ongoing';var p=a.split('-');return MO[+p[1]-1]+' '+(+p[2]);}
  function pro(){var A=window.JVE_AUTH;return !!(A&&(A.admin||(A.has&&(A.has('vendor-pro')||A.has('organizer-plus')||A.has('directory-sponsor')))));}
  function build(){if(box)return;var anchor=d.getElementById('disc')||d.getElementById('list');if(!anchor)return;
    box=d.createElement('section');box.id='mapView';box.className='jv-map';box.setAttribute('aria-label','Events map');
    box.innerHTML='<div class="jv-map-frame"><div id="jmap" class="jv-map-canvas" role="region" aria-label="Map of events by town"></div>'+
      '<div class="jv-map-panel" id="mapPanel" hidden></div></div>'+
      '<p class="jv-map-note" id="mapNote"></p>';
    anchor.parentNode.insertBefore(box,anchor.nextSibling);panel=d.getElementById('mapPanel');
    panel.addEventListener('click',function(e){if(e.target.closest('[data-map-close]')){panel.hidden=true;lastKey=null;}});}
  function groups(){var A=window.JVE_APP,rows=A&&A.rows?A.rows():[],g={},n=0,off=0;
    rows.forEach(function(r){var s=spot(r.e);if(!s){off++;return;}var k=s.label+'|'+s.county;(g[k]=g[k]||{s:s,rows:[]}).rows.push(r);n++;});
    return {g:g,n:n,off:off};}
  function pinIcon(c,cl){var sz=c<10?34:c<50?40:46;return L.divIcon({className:'jv-pin'+(cl?' jv-cl':''),html:'<span>'+c+'</span>',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});}
  function showPanel(k,grp){lastKey=k;var p=pro(),s=grp.s,rows=grp.rows.slice(0,60);
    var h='<div class="jv-mp-head"><div><b>'+esc(s.label)+'</b><small>'+(s.town?esc(s.county)+' County · ':'')+grp.rows.length+' event'+(grp.rows.length===1?'':'s')+'</small></div><button type="button" class="jv-mp-x" data-map-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div><ul class="jv-mp-list">';
    rows.forEach(function(r){var e=r.e,lock=!!e.locked,sub=[when(r.a)];
      if(!lock&&p&&e.venue)sub.push(esc(e.venue));
      h+='<li><button type="button" data-id="'+esc(e.id)+'" data-a="'+esc(r.a||'')+'"><span class="jv-mp-d">'+esc(when(r.a))+'</span><span class="jv-mp-t"><b>'+esc(e.name)+'</b><small>'+(lock?'🔒 Venue + apply link with Pro':sub.slice(1).join(' · ')||esc(e.schedule||e.city||''))+'</small></span></button></li>';});
    if(grp.rows.length>rows.length)h+='<li class="jv-mp-more">+'+(grp.rows.length-rows.length)+' more in the list view</li>';
    panel.innerHTML=h+'</ul>';panel.hidden=false;}
  function draw(){if(!map)return;var r=groups(),pts=[];layer.clearLayers();
    Object.keys(r.g).forEach(function(k){var grp=r.g[k],m=L.marker([grp.s.lat,grp.s.lng],{icon:pinIcon(grp.rows.length),title:grp.s.label+': '+grp.rows.length+' events',keyboard:true});
      m.options.jveCount=grp.rows.length;m.on('click',function(){showPanel(k,grp);});layer.addLayer(m);pts.push([grp.s.lat,grp.s.lng]);});
    if(pts.length)map.fitBounds(pts,{padding:[36,36],maxZoom:10});else map.setView([28.1,-82.4],6);
    if(lastKey&&r.g[lastKey])showPanel(lastKey,r.g[lastKey]);else{panel.hidden=true;lastKey=null;}
    var note=d.getElementById('mapNote');
    note.innerHTML='<b>'+r.n+'</b> event'+(r.n===1?'':'s')+' on the map · pins show the town, not the exact venue'+(pro()?'':'. <a href="pro.html">Vendor Pro</a> unlocks names, venues and apply links.')+(r.off?' '+r.off+' without a town are in the list.':'');}
  function init(){build();if(!box)return;load().then(function(){if(map){map.invalidateSize();draw();return;}
    map=L.map('jmap',{zoomControl:true,scrollWheelZoom:false,tap:true,attributionControl:true}).setView([28.1,-82.4],6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,className:'jv-tiles',
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
    layer=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:46,spiderfyOnMaxZoom:false,zoomToBoundsOnClick:true,
      iconCreateFunction:function(c){var n=0;c.getAllChildMarkers().forEach(function(m){n+=m.options.jveCount||1;});return pinIcon(n,true);}});
    map.addLayer(layer);draw();}).catch(function(){var n=d.getElementById('mapNote');if(n)n.textContent='The map could not load. Check your connection and try again.';});}
  function onView(v){if(v==='map'){init();setTimeout(function(){if(map){map.invalidateSize();}},60);}}
  d.addEventListener('jve:view',function(e){onView(e.detail);});
  d.addEventListener('jve:list',function(e){if(e.detail&&e.detail.view==='map'&&map)draw();});
  d.addEventListener('jve:region',function(){if(map&&window.JVE_APP&&JVE_APP.view()==='map')setTimeout(draw,50);});
  function boot(){if(window.JVE_APP&&JVE_APP.view&&JVE_APP.view()==='map')onView('map');}
  d.addEventListener('jve:app',boot);if(d.readyState!=='loading')boot();else d.addEventListener('DOMContentLoaded',boot);
})();
