/* thanks.html: tailor "what happens next" to the tier Stripe sends back (?tier=<id>). */
(function(){
  'use strict';
  var m=/[?&]tier=([^&#]*)/.exec(location.search),id=m?decodeURIComponent(m[1]):'';
  var N={'featured-event':['Featured event','Send your event link and the week you want featured.','We check it against your own page and pin it at the top within 24 hours, with a line in that week’s email.'],
    'deadline-spotlight':['Deadline spotlight','Send your event link and the application deadline.','We add it to “Deadlines coming up” on the site and in the email the week before it closes.'],
    'organizer-plus':['Organizer Plus','Send your market’s page and your upcoming dates.','We list every date, keep them up to date, and line up your 2 featured weeks for this month.'],
    'newsletter-sponsor':['Newsletter sponsor','Send your logo, 2 lines (up to 180 characters) and your link by Thursday.','Your spot runs at the top of the next Monday email, labelled “Sponsor”.'],
    'directory-sponsor':['Directory sponsor','Send your logo or a 1200×300 banner and your link.','Your banner goes up on the events page within 24 hours and runs all month.'],
    'featured-vendor':['Featured vendor','Send your profile link or business name and the week you want.','We pin your profile at the top of the Vendors page for that week.'],
    'vendor-pro':['Vendor Pro','Nothing else needed. Just reply to your receipt if you have questions.','We switch on Pro for your email within 24 hours and send the weekly email to you a day early.']};
  var t=N[id];var h=document.getElementById('thxTier');if(h)h.value=id||'unknown';
  if(!t)return;
  var L=document.getElementById('thxLead');if(L)L.textContent='Your '+t[0]+' is paid and your receipt is on its way to your email. Here’s what happens next.';
  var a=document.getElementById('thxS1');if(a)a.textContent=t[1];
  var b=document.getElementById('thxS2');if(b)b.textContent=t[2];
  var f=document.getElementById('thxForm');if(f)f.setAttribute('data-fs','Paid placement details: Jax Vendor Events ('+t[0]+')');
})();
