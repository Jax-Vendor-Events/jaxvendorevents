/* Jax Vendor Events: pure helpers (saved list, deadline countdowns, distance, My matches, profiles). No network, device-only. */
(function(g){
  'use strict';
  function pd(s){var p=String(s).split('-');return Date.UTC(+p[0],+p[1]-1,+p[2]);}
  function daysBetween(a,b){return Math.round((pd(b)-pd(a))/864e5);}
  // countdown chip for an application deadline (dates as YYYY-MM-DD, deadline = last day to apply)
  function countdown(today,deadline){
    if(!deadline||deadline<today)return null;
    var n=daysBetween(today,deadline);
    var text=n===0?'Apply today':n===1?'Apply by tomorrow':'Apply in '+n+' days';
    return {days:n,text:text,urgent:n<=3};   // urgent = closing within ~72 h
  }
  function parseSaved(raw){try{var a=JSON.parse(raw||'[]');return Array.isArray(a)?a.filter(function(x){return typeof x==='string';}):[];}catch(e){return [];}}
  function toggleSaved(list,id){var a=list.slice(),i=a.indexOf(id);if(i>-1)a.splice(i,1);else a.push(id);return a;}
  var CITY=[["world golf",29.97,-81.47],["st. augustine beach",29.85,-81.27],["st. augustine",29.894,-81.314],["east palatka",29.65,-81.60],["palatka",29.648,-81.637],["neptune beach",30.312,-81.396],["atlantic beach",30.334,-81.399],["jacksonville beach",30.294,-81.393],["jax beach",30.294,-81.393],["mayport",30.385,-81.43],["keystone heights",29.786,-82.031],["palm coast",29.585,-81.208],["nocatee",30.10,-81.42],["yulee",30.632,-81.606],["flagler beach",29.475,-81.127],["ortega",30.27,-81.705],["oakleaf",30.17,-81.83],["orange park",30.166,-81.706],["hastings",29.718,-81.508],["westside",30.30,-81.78],["southside",30.25,-81.58],["fernandina",30.669,-81.462],["amelia",30.62,-81.45],["hilliard",30.691,-81.917],["green cove",29.992,-81.678],["ponte vedra",30.24,-81.385],["mandarin",30.16,-81.65],["northside",30.42,-81.65],["fleming island",30.093,-81.72],["bunnell",29.466,-81.258],["middleburg",30.069,-81.86],["riverside",30.31,-81.685],["san marco",30.305,-81.655],["callahan",30.562,-81.83],["jacksonville",30.332,-81.656]];
  var COUNTY={"Duval":[30.33,-81.66],"St. Johns":[29.95,-81.42],"Clay":[29.98,-81.86],"Nassau":[30.60,-81.77],"Baker":[30.33,-82.28],"Flagler":[29.47,-81.28],"Putnam":[29.61,-81.74]};
  // approximate town/county center for a listing (never a street address)
  function place(e){var c=String((e&&e.city)||'').toLowerCase();for(var i=0;i<CITY.length;i++){if(c.indexOf(CITY[i][0])>-1)return [CITY[i][1],CITY[i][2]];}if(e&&typeof e.lat==='number'&&typeof e.lng==='number')return [e.lat,e.lng];var k=COUNTY[e&&e.county]||(window.JVE_GEO&&window.JVE_GEO.county&&window.JVE_GEO.county[e&&e.county]);return k?k.slice():null;}
  function miles(a,b){if(!a||!b)return null;var R=3958.8,r=Math.PI/180,dl=(b[0]-a[0])*r,dg=(b[1]-a[1])*r;var h=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dg/2)*Math.sin(dg/2);return 2*R*Math.asin(Math.sqrt(h));}
  /* ---- My matches: a visitor's saved preferences (device only) filter the event list ---- */
  var COUNTIES=['Duval','St. Johns','Clay','Nassau','Baker','Flagler','Putnam'].concat(["Alachua", "Bay", "Bradford", "Brevard", "Broward", "Calhoun", "Charlotte", "Citrus", "Collier", "Columbia", "DeSoto", "Dixie", "Escambia", "Franklin", "Gadsden", "Gilchrist", "Glades", "Gulf", "Hamilton", "Hardee", "Hendry", "Hernando", "Highlands", "Hillsborough", "Holmes", "Indian River", "Jackson", "Jefferson", "Lafayette", "Lake", "Lee", "Leon", "Levy", "Liberty", "Madison", "Manatee", "Marion", "Martin", "Miami-Dade", "Monroe", "Okaloosa", "Okeechobee", "Orange", "Osceola", "Palm Beach", "Pasco", "Pinellas", "Polk", "Santa Rosa", "Sarasota", "Seminole", "St. Lucie", "Sumter", "Suwannee", "Taylor", "Union", "Volusia", "Wakulla", "Walton", "Washington"]);  // all 67 (statewide since Nov 9, 2026)
  var TYPES=[['farmers','Farmers markets'],['craft','Craft & art fairs'],['festival','Festivals & fairs'],['holiday','Holiday markets'],['city','City & county events'],['popup','Pop-ups & other markets']];
  var TYPE_RE={farmers:/farmer'?s|farm market|green ?market|growers|produce/i,
    craft:/craft|artisan|maker|art show|art fair|arts? market|arts (and|&)|art ?walk|bazaar|boutique|vintage|flea|antique|art festival/i,
    festival:/festival|\bfest\b|\bfair\b|jubilee|celebration|carnival|\bexpo\b|fiesta|parade|palooza|cook-off|\bcon \d{4}/i,
    holiday:/holiday|christmas|xmas|santa|jingle|winter|noel|tree lighting|mistletoe|luminaria|hanukkah|kwanzaa|new year|valentine|galentine|easter|halloween|thanksgiving|thankful|harvest|spooky|trunk.or.treat|mardi|patrick|veterans|\bmlk\b|gingerbread|merry|nights of lights|holly/i};
  // event types from the listing's own name (+ the city/county tag); "popup" when nothing else fits
  function eventTypes(e){var n=String((e&&e.name)||''),t=[];['farmers','craft','festival','holiday'].forEach(function(k){if(TYPE_RE[k].test(n))t.push(k);});
    if(e&&e.host_type)t.push('city');if(!t.some(function(x){return x!=='city';}))t.push('popup');return t;}
  // vendor fee in dollars when the listing states one ($ amount or free); null = not listed
  function feeAmount(e){if(!e)return null;if(e.fee_bucket==='free')return 0;var m=String(e.fee||'').match(/\$\s?(\d[\d,]*(?:\.\d+)?)/);if(m)return parseFloat(m[1].replace(/,/g,''));if(/^\s*free\b/i.test(e.fee||''))return 0;return null;}
  function uniq(a){return a.filter(function(x,i){return a.indexOf(x)===i;});}
  function parsePrefs(raw){var p;try{p=typeof raw==='string'?JSON.parse(raw||'null'):raw;}catch(e){p=null;}
    if(!p||typeof p!=='object'||Array.isArray(p))return null;
    var keys=TYPES.map(function(t){return t[0];});
    var out={counties:uniq((Array.isArray(p.counties)?p.counties:[]).filter(function(c){return COUNTIES.indexOf(c)>-1;})),
      types:uniq((Array.isArray(p.types)?p.types:[]).filter(function(t){return keys.indexOf(t)>-1;})),
      days:uniq((Array.isArray(p.days)?p.days:[]).map(Number).filter(function(d){return d>=0&&d<=6&&Math.floor(d)===d;})),
      max_fee:(p.max_fee===null||p.max_fee===''||p.max_fee===undefined||isNaN(+p.max_fee))?null:Math.max(0,+p.max_fee),
      unknown_fee:p.unknown_fee!==false,
      setting:['indoor','outdoor'].indexOf(p.setting)>-1?p.setting:'any',
      alerts:p.alerts===true};
    return out;}
  function hasPrefs(p){return !!(p&&(p.counties.length||p.types.length||p.days.length||p.max_fee!==null||p.setting!=='any'));}
  function wday(s){var q=String(s).split('-');return new Date(Date.UTC(+q[0],+q[1]-1,+q[2])).getUTCDay();}
  function addDays(s,n){var q=String(s).split('-');var d=new Date(Date.UTC(+q[0],+q[1]-1,+q[2]+n));return d.toISOString().slice(0,10);}
  // upcoming dates of e that fit the preferences; null = the event does not match; [] = matches but has no dated day (ongoing)
  function matchDates(e,p,up){if(!e)return null;up=up||e.dates||[];if(!hasPrefs(p))return up.slice();
    if(p.counties.length&&p.counties.indexOf(e.county)<0)return null;
    if(p.types.length&&!eventTypes(e).some(function(t){return p.types.indexOf(t)>-1;}))return null;
    if(p.max_fee!==null){var a=feeAmount(e);if(a===null?!p.unknown_fee:a>p.max_fee)return null;}
    if(p.setting!=='any'&&e.setting&&e.setting!=='both'&&e.setting!==p.setting)return null; // only listings that state indoor/outdoor are filtered
    if(!p.days.length)return up.slice();
    if(!up.length){var sch=String(e.schedule||'').toLowerCase();var DN=['sun','mon','tue','wed','thu','fri','sat'];if(!sch)return [];return p.days.some(function(d){return sch.indexOf(DN[d])>-1;})||!/(sun|mon|tue|wed|thu|fri|sat)/.test(sch)?[]:null;}
    var hit=up.filter(function(x){if(p.days.indexOf(wday(x))>-1)return true;
      if(e.end_date&&x===up[0]&&e.end_date>x){for(var i=1;i<7;i++){var y=addDays(x,i);if(y>e.end_date)break;if(p.days.indexOf(wday(y))>-1)return true;}}return false;});
    return hit.length?hit:null;}
  var DAYN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function prefsSummary(p){if(!hasPrefs(p))return '';var L={};TYPES.forEach(function(t){L[t[0]]=t[1];});var s=[];
    if(p.counties.length)s.push(p.counties.join(', '));if(p.types.length)s.push(p.types.map(function(t){return L[t];}).join(', '));
    if(p.max_fee!==null)s.push(p.max_fee===0?'free to vend':'fee up to $'+p.max_fee);
    if(p.days.length)s.push([1,2,3,4,5,6,0].filter(function(d){return p.days.indexOf(d)>-1;}).map(function(d){return DAYN[d];}).join(', '));
    if(p.setting!=='any')s.push(p.setting);return s.join(' · ');}
  /* ---- profiles ---- */
  var CATEGORIES=['Jewelry & accessories','Art & prints','Clothing & apparel','Candles & home','Bath & body','Crafts & gifts','Food & baked goods','Food truck / prepared food','Produce & farm','Plants & flowers','Kids & toys','Pets','Vintage & thrift','Health & wellness','Services','Other'];
  var APPLY=[['link','Through my application link'],['email','By email'],['facebook','Message us on Facebook'],['instagram','DM us on Instagram'],['other','Other (see note)']];
  function slug(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'profile';}
  function initials(s){var w=String(s||'').replace(/[^A-Za-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase();}
  // a social handle or URL -> a safe https link (null if it can't be one)
  var SOC={instagram:'https://www.instagram.com/',tiktok:'https://www.tiktok.com/@',facebook:'https://www.facebook.com/',x:'https://x.com/'};
  function socialUrl(kind,v){v=String(v||'').trim();if(!v)return null;if(/^https?:\/\//i.test(v))return /^https:\/\//i.test(v)?v:v.replace(/^http:/i,'https:');
    if(/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)&&!(kind in SOC&&!/\//.test(v)&&!/\.(com|net|org|co|us|shop|store|art|io)$/i.test(v)))return 'https://'+v.replace(/^\/+/,'');
    var h=v.replace(/^@/,'').replace(/[^A-Za-z0-9._-]/g,'');if(!h||!(kind in SOC))return null;return SOC[kind]+h;}
  function safeLogo(u){u=String(u||'');return /^profiles\/logos\/[a-z0-9-]+\.(png|jpe?g|webp|svg)$/i.test(u)||/^https:\/\/[^\s"'<>]+$/i.test(u)?u:null;}
  function featuredNow(p,today){return !!(p&&p.featured_until&&p.featured_until>=today);}
  function publicProfiles(list){return (Array.isArray(list)?list:[]).filter(function(p){return p&&p.status==='approved'&&(p.type==='vendor'||p.type==='organizer')&&p.name&&p.id;});}
  var api={countdown:countdown,daysBetween:daysBetween,parseSaved:parseSaved,toggleSaved:toggleSaved,place:place,miles:miles,COUNTY:COUNTY,
    COUNTIES:COUNTIES,TYPES:TYPES,eventTypes:eventTypes,feeAmount:feeAmount,parsePrefs:parsePrefs,hasPrefs:hasPrefs,matchDates:matchDates,prefsSummary:prefsSummary,
    CATEGORIES:CATEGORIES,APPLY:APPLY,slug:slug,initials:initials,socialUrl:socialUrl,safeLogo:safeLogo,featuredNow:featuredNow,publicProfiles:publicProfiles};
  g.JVE_LOGIC=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
