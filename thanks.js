/* thanks.html: tailor "what happens next" to the tier Stripe sends back (?tier=<id>). */
(function(){
  'use strict';
  var m=/[?&]tier=([^&#]*)/.exec(location.search),id=m?decodeURIComponent(m[1]):'';
  var N={'featured-event':['Featured event','Send your event link below if it isn’t listed yet. Want a later week? Say which one.','We match it to your listing and pin it at the top with a Featured badge within 24 hours, for 7 days, with a line in that week’s email.'],
    'deadline-spotlight':['Deadline spotlight','Send your event link and the application deadline.','We add it to “Deadlines coming up” on the site and in the email the week before it closes.'],
    'organizer-plus':['Organizer Plus','Send your market’s page and your upcoming dates.','We list every date, keep them up to date, and line up your 2 featured weeks for this month.'],
    'newsletter-sponsor':['Newsletter sponsor','Send your logo, 2 lines (up to 180 characters) and your link by Thursday.','Your spot runs at the top of the next Monday email, labelled “Sponsor”.'],
    'directory-sponsor':['Directory sponsor','Send your logo or a 1200×300 banner and your link.','Your banner goes up on the events page within 24 hours and runs all month.'],
    'featured-vendor':['Featured vendor','No profile yet? Create one free (More → Create your profile). Want a later week? Say which one below.','We pin your profile at the top of the Vendors page with a Featured badge for 7 days, within 24 hours.'],
    'vendor-pro':['Vendor Pro','No profile yet? Create one free (More → Create your profile) with the same email, so your PRO badge has a home.','Within 24 hours: deadline reminders by email, the weekly email every Sunday (a day early) and a gold PRO badge on your profile.']};
  var t=N[id];var h=document.getElementById('thxTier');if(h)h.value=id||'unknown';
  if(!t)return;
  var L=document.getElementById('thxLead');if(L)L.textContent='Your '+t[0]+' is paid and your receipt is on its way to your email. Here’s what happens next.';
  var a=document.getElementById('thxS1');if(a)a.textContent=t[1];
  var b=document.getElementById('thxS2');if(b)b.textContent=t[2];
  var f=document.getElementById('thxForm');if(f)f.setAttribute('data-fs','Paid placement details: Jax Vendor Events ('+t[0]+')');
})();
