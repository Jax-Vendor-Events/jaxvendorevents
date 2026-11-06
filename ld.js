/* Jax Vendor Events: schema.org Event JSON-LD for search engines and AI agents (Nov 6 2026).
   Built from the PUBLIC teaser feed /api/events.json (no venue, organizer, contact or apply link: same as the logged-out site). */
(function(){
  'use strict';
  if(window.__jveLd)return;window.__jveLd=1;
  fetch('/api/events.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(j){
    if(!j||!j.events)return;
    var items=j.events.slice(0,60).map(function(e,i){
      return {'@type':'ListItem',position:i+1,item:{'@type':'Event',name:e.title,startDate:e.next_date,endDate:e.end_date||e.next_date,
        eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',eventStatus:'https://schema.org/EventScheduled',
        location:{'@type':'Place',name:(e.city||e.county+' County')+', FL',address:{'@type':'PostalAddress',addressLocality:e.city||undefined,addressRegion:'FL',addressCountry:'US'}},
        url:e.url,description:e.title+' in '+(e.city||e.county+' County')+', Florida. Venue, organizer and how to apply are on Jax Vendor Events (Vendor Pro).'}};});
    var s=document.createElement('script');s.type='application/ld+json';
    s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:'Upcoming vendor events in Florida',url:'https://jaxvendorevents.com/',numberOfItems:j.count,itemListElement:items});
    document.head.appendChild(s);
  }).catch(function(){});
})();
