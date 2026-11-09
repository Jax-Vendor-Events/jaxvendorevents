#!/usr/bin/env python3
"""New-event finder for Jax Vendor Events (no dependencies, Python 3.8+).

Runs on GitHub Actions every 2 hours (.github/workflows/find-new.yml), then
scripts/refresh.py recomputes the counts.  Can be run by hand:
    python3 scripts/find_new.py [--dry-run] [--today YYYY-MM-DD]

What it does:
  * reads public vendor-event listing pages that allow plain fetching (robots.txt
    is checked every run) - today: FairsAndFestivals.net (Florida list) and
    FestivalNet (Florida list), both vendor-centric show directories, plus
    Allevents Jacksonville (market / craft-fair pages, strict keyword filter);
  * FFEA (Florida Festivals & Events Association, ffea.com/events): its own public
    JSON calendar feed (services/eventsservice.asmx, the same calls its events page
    makes), statewide; vendor-relevant festivals/fairs/markets only;
  * Visit Jacksonville (visitjacksonville.com/events, the city's tourism calendar): the same public search
    index its events page reads; markets, festivals, fairs, art walks and pop-ups only (no concerts, shows,
    exhibits or sports); recurring markets carry their next 12 dates;
  * keeps only future events anywhere in Florida (all sources; statewide since
    Nov 9, 2026 per the owner's all-of-Florida rule); every listing is tagged
    with its county and region (scripts/fl_places.json) and new ones with the
    town-center lat/lng (never the venue's exact point);
  * skips anything already in data/events.json (same source URL, or a similar
    name with a nearby date, or the same active listing) and anything it has
    seen before (data/finder_seen.json);
  * adds at most MAX_ADD new listings per run, marked verify_status "unverified",
    found_by "auto-finder", found_on <date>.  The daily check verifies them
    against the organizer's own page.
  * never edits or deletes an existing listing.
"""
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.request
import urllib.robotparser
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "data", "events.json")
SEEN_PATH = os.path.join(ROOT, "data", "finder_seen.json")
MAX_ADD = 40
HORIZON_DAYS = 366
UA = "Mozilla/5.0 (compatible; JaxVendorEventsFinder/1.0; +https://jaxvendorevents.com/)"
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
DELAY = 1.5

# city / place -> county (Duval, St. Johns, Clay, Nassau, Baker, Flagler, Putnam)
CITY_COUNTY = {}
for county, names in {
    "Duval": "jacksonville|jacksonville beach|jax beach|atlantic beach|neptune beach|baldwin|mayport|mandarin|arlington|"
             "riverside|san marco|springfield|avondale|ortega|southside|westside|northside|oceanway|san jose|"
             "julington creek|jacksonville (duval)|downtown jacksonville|jax",
    "St. Johns": "st. augustine|st augustine|saint augustine|st. augustine beach|st augustine beach|saint augustine beach|"
                 "ponte vedra|ponte vedra beach|nocatee|hastings|elkton|fruit cove|st. johns|st johns|saint johns|"
                 "world golf village|vilano beach|crescent beach|switzerland|palm valley",
    "Clay": "orange park|fleming island|green cove springs|green cove|middleburg|keystone heights|oakleaf|penney farms|"
            "doctors inlet|lakeside",
    "Nassau": "fernandina beach|fernandina|amelia island|yulee|callahan|hilliard|bryceville|nassauville|o'neil",
    "Baker": "macclenny|glen st. mary|glen saint mary|sanderson|olustee",
    "Flagler": "palm coast|bunnell|flagler beach|beverly beach|marineland",
    "Putnam": "palatka|east palatka|crescent city|interlachen|pomona park|welaka|satsuma|san mateo|hollister|"
              "putnam hall|georgetown",
}.items():
    for n in names.split("|"):
        CITY_COUNTY[n] = county

# all of Florida: place -> [county, lat, lng] (town centers), county -> region (scripts/fl_places.json)
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fl_places.json"), encoding="utf-8") as _f:
    FL = json.load(_f)
NE_COUNTIES = ("Duval", "St. Johns", "Clay", "Nassau", "Baker", "Flagler", "Putnam")
REGION_OF = FL["county_region"]
FL_PLACES = FL["places"]

MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september",
          "october", "november", "december"]
MON3 = [m[:3] for m in MONTHS]
STOP = set("the a an and of at in on for by to & annual edition".split()) | set(MONTHS) | set(MON3) | {
    "1st", "2nd", "3rd", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth",
    "tenth", "eleventh", "twelfth", "fl", "florida", "jax", "jacksonville", "st", "saint", "augustine", "beach",
    "park", "county", "nefl", "ne", "north", "east", "south", "west", "event", "events", "show", "shows"}
PLACE = {w for place in CITY_COUNTY for w in re.split(r"[^a-z]+", place) if len(w) > 2} | {"clay", "duval", "nassau",
    "flagler", "putnam", "baker", "amelia", "island", "spring", "first", "coast", "beaches", "cove", "green"}
# words that say what kind of event it is, not which one (two names sharing only these are not a match)
GENERIC = set("market marketplace holiday fall autumn winter spring summer christma art craft fest festival farmer "
              "saturday sunday friday vendor fair expo night local shop pop up popup maker artisan community "
              "makers in park fleamarket flea bazaar village".split())

# never a vendor booth event (or off-topic for this directory)
EXCLUDE = re.compile(
    r"\b(job|career|hiring|employment)\s+(fair|expo)|\bgun\b|\bfirearm|\bknife show|\bwebinar|\bonline\b|"
    r"\bvirtual\b|\bclass\b|\bworkshop|\bseminar|\bcourse\b|\bconcert|\btour\b|\bwatch party|\btailgate|"
    r"\bvs\.?\b|\bsymphony|\bcandlelight|\bhalf marathon|\bmarathon|\b5k\b|\b10k\b|\btrivia|\bcomedy|"
    r"\bnetworking|\bmarketing\b|\bwebinar|\bsummit\b|\bconference|\bfundraiser gala|\bgala\b|\bopen house|"
    r"\bcollege fair|\bhealth fair|\bscience fair|\bbook fair|\bcounty fair\b(?!.*vendor)|\bbridal|\bbride\b|"
    r"\bhome show|\bremodel|\bboat show|\breal estate|\bmeeting\b|\bcrawl\b|\bpub crawl", re.I)
# a strong vendor-event word (required for general event sites)
STRONG = re.compile(
    r"\bmarket|\bmarché|\bbazaar|\bcraft|\bartisan|\bmaker|\bvendor|\bpop[\s-]?up|\bflea\b|\bboutique|"
    r"\bswap meet|\bholiday shop|\bshop small|\bshop local|\bart (?:fair|show|festival)|\bart walk", re.I)


def log(*a):
    print(*a, flush=True)


# ---------- fetching (robots.txt respected, small delays, timeouts) ----------
_robots = {}


def allowed(url):
    m = re.match(r"(https?://[^/]+)", url)
    base = m.group(1)
    if base not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            req = urllib.request.Request(base + "/robots.txt", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                rp.parse(r.read().decode("utf-8", "replace").splitlines())
        except urllib.error.HTTPError as e:
            rp.parse([] if e.code in (404, 410) else ["User-agent: *", "Disallow: /"])
        except Exception:
            rp.parse(["User-agent: *", "Disallow: /"])
        _robots[base] = rp
    return _robots[base].can_fetch(UA, url) and _robots[base].can_fetch("*", url)


def fetch(url):
    if not allowed(url):
        raise RuntimeError("robots.txt disallows " + url)
    time.sleep(DELAY)
    # a few listing sites answer only to a browser-like agent; we still identify honestly first
    last = None
    for ua in (UA, BROWSER_UA):
        req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept": "text/html,*/*;q=0.8",
                                                   "Accept-Language": "en-US,en;q=0.9"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last = e
            if e.code not in (403, 405, 406, 429):
                break
            time.sleep(DELAY)
    raise last


def clean(s):
    if s is None:
        return None
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    s = re.sub(r"\s+", " ", s).strip()
    return s or None


def county_of(city):
    c = (city or "").strip().lower()
    c = re.sub(r",?\s*(fl|florida)\.?$", "", c).strip()
    return CITY_COUNTY.get(c)


def _miles(a, b):
    import math
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(h))


def place_of(city, lat=None, lng=None):
    """-> (county, town-center lat, lng) anywhere in Florida, or (None, None, None).
    The Northeast Florida table above wins (it knows neighborhoods); then Census places;
    then, when the source gives coordinates, the nearest Census place within 15 miles."""
    c = (city or "").strip().lower()
    c = re.sub(r",?\s*(fl|florida)\.?$", "", c).strip()
    c = re.sub(r"\s+", " ", c)
    variants = [c, c.replace("saint ", "st. "), re.sub(r"^st ", "st. ", c), c.replace("st. ", "saint "),
                re.sub(r"^ft\.? ", "fort ", c), re.sub(r"\s+(beach|springs)$", "", c)]
    hit = next((FL_PLACES[v] for v in variants if v in FL_PLACES), None)
    ne = CITY_COUNTY.get(c)
    if ne:
        if hit and hit[0] == ne:
            return ne, hit[1], hit[2]
        k = FL["county_center"].get(ne)
        return ne, k[0], k[1]
    if hit:
        return hit[0], hit[1], hit[2]
    if lat is not None and lng is not None and 24.3 <= lat <= 31.1 and -87.7 <= lng <= -79.8:
        best = min(FL_PLACES.values(), key=lambda p: _miles((lat, lng), (p[1], p[2])))
        if _miles((lat, lng), (best[1], best[2])) <= 15:
            return best[0], best[1], best[2]
    return None, None, None

def nice_city(city):
    c = clean(city) or ""
    c = re.sub(r"^Saint Augustine", "St. Augustine", c)
    c = re.sub(r"^St Augustine", "St. Augustine", c)
    return c


def daterange(a, b):
    a, b = dt.date.fromisoformat(a), dt.date.fromisoformat(b or a)
    if b < a or (b - a).days > 20:
        b = a
    out = []
    while a <= b:
        out.append(a.isoformat())
        a += dt.timedelta(days=1)
    return out


# ---------- sources ----------
def src_fairsandfestivals():
    url = "https://www.fairsandfestivals.net/states/FL/"
    t = fetch(url)
    out = []
    for b in t.split('<div class="event">')[1:]:
        def g(p):
            m = re.search(p, b, re.S)
            return m.group(1).strip() if m else None
        name = clean(g(r"<h4>(.*?)</h4>"))
        ts = g(r'class="timestamp"[^>]*>(\d+)<')
        if not name or not ts:
            continue
        # timestamps are local midnight (Eastern); read the date in New York time
        d = (dt.datetime.fromtimestamp(int(ts), dt.timezone.utc) - dt.timedelta(hours=4)).date()
        if (g(r'class="state">([^<]+)<') or "FL").strip().upper() != "FL":
            continue
        loc = clean(g(r'class="location">(.*?)</td>')) or ""
        city = clean(g(r'class="city">([^<]+)<'))
        addr = re.sub(r"^.*?,\s*FL\s*", "", loc).strip() or None
        desc = clean(g(r'Description:</td>\s*<td>(.*?)</td>')) or ""
        hours = re.search(r"Hours:\s*([0-9][^.|]{2,40}?(?:am|pm|AM|PM))", desc)
        link = g(r'href="(/events/details/[^"]+)"')
        vend = re.findall(r'<li class="allowed ([a-z]+)"', b)
        name = re.sub(r"^(19|20)\d\d\s+", "", name)
        out.append({
            "name": name, "dates": [d.isoformat()], "city": nice_city(city), "venue": None, "address": addr,
            "time": hours.group(1).strip() if hours else None,
            "url": "https://www.fairsandfestivals.net" + link if link else url,
            "source": "fairsandfestivals.net", "vendor_types": vend, "desc": desc[:300],
            "vendor_site": True,
        })
    return out


def src_festivalnet():
    url = "https://festivalnet.com/fairs-festivals/Florida/Jacksonville-FL"
    t = fetch(url)
    out = []
    for b in t.split('class="event-block"')[1:]:
        def g(p):
            m = re.search(p, b, re.S)
            return m.group(1).strip() if m else None
        name = clean(g(r'itemprop="name">([^<]+)</span></a>'))
        start = g(r'itemprop="startDate" content="([0-9-]{10})')
        if not name or not start:
            continue
        end = g(r'itemprop="endDate" content="([0-9-]{10})')
        if (clean(g(r'itemprop="addressRegion">([^<]+)<')) or "FL").upper() not in ("FL", "FLORIDA"):
            continue
        out.append({
            "name": name, "dates": daterange(start, end), "city": nice_city(g(r'itemprop="addressLocality">([^<]+)<')),
            "venue": clean(g(r'event-location"[^>]*>\s*<span itemprop="name">([^<]+)<')), "address": None,
            "time": None, "url": g(r'itemprop="url"[^>]*href="([^"]+)"') or url, "source": "festivalnet.com",
            "organizer_site": clean(g(r'class="event-URL[^"]*">\s*<a[^>]*title="([^"]+)"')),
            "desc": (clean(g(r'itemprop="description">(.*?)</p>')) or "")[:300], "vendor_site": True,
        })
    return out


def src_allevents():
    pages = ["https://allevents.in/jacksonville/markets", "https://allevents.in/jacksonville/craft-fair",
             "https://allevents.in/jacksonville/holiday-markets", "https://allevents.in/jacksonville/all?q=vendor",
             "https://allevents.in/jacksonville/all?q=craft%20fair", "https://allevents.in/jacksonville/all?q=pop%20up%20market"]
    out = []
    for p in pages:
        try:
            t = fetch(p)
        except Exception as e:
            log("  allevents page failed:", p, str(e)[:120])
            continue
        for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', t, re.S):
            try:
                j = json.loads(m.group(1).strip())
            except Exception:
                continue
            for e in (j if isinstance(j, list) else [j]):
                if not isinstance(e, dict) or e.get("@type") not in ("Event", "Festival", "SaleEvent"):
                    continue
                loc = e.get("location") or {}
                if isinstance(loc, list):
                    loc = loc[0] if loc else {}
                ad = loc.get("address") or {}
                city = ad.get("addressLocality") if isinstance(ad, dict) else None
                street = ad.get("streetAddress") if isinstance(ad, dict) else (ad if isinstance(ad, str) else None)
                sd, ed = str(e.get("startDate") or "")[:10], str(e.get("endDate") or "")[:10]
                if not re.match(r"\d{4}-\d{2}-\d{2}$", sd):
                    continue
                if "Cancelled" in str(e.get("eventStatus")) or "Postponed" in str(e.get("eventStatus")):
                    continue
                if "Online" in str(e.get("eventAttendanceMode")):
                    continue
                out.append({
                    "name": clean(e.get("name")), "dates": daterange(sd, ed if re.match(r"\d{4}-\d{2}-\d{2}$", ed) else sd),
                    "city": nice_city(city or ""), "venue": clean(loc.get("name")), "address": clean(street),
                    "time": None, "url": e.get("url") or p, "source": "allevents.in",
                    "desc": (clean(e.get("description")) or "")[:300], "vendor_site": False,
                })
    return out


# FFEA: the calendar's own JSON service (the calls ffea.com/events makes in the browser). Statewide.
FFEA_SVC = "https://www.ffea.com/services/eventsservice.asmx/"
FFEA_PAGE = "https://www.ffea.com/events"
# FFEA lists every kind of member event; keep festivals, fairs, markets and other events that take vendors
FFEA_KEEP = re.compile(
    r"fest\b|festival|\bfair\b|bazaar|market|art show|art in the park|arts? (?:walk|night)|car.{0,30}show|"
    r"craft|food truck|\bbbq\b|barbecue|pig jam|seafood|oyster|fun day|first friday|river nights|noche buena|"
    r"christmas in|holiday nights|winter ?wonderland|light up|ranchapalooza|expo\b", re.I)
FFEA_DROP = re.compile(
    r"opera|theater|theatre|dinner|dining|giveaway|\bball\b|\btours?\b|parade|tree lighting|golf|basketball|"
    r"disco|ceremony|salute|orientation|concert|band\b|open house|anniversary|reenactment|exhibit|showcase|"
    r"networking|mixer|cocktail|webinar|meetup|seminar|committee|sponsorships? (?:now )?available|air show|"
    r"film festival|fringe|winter ?wonderland|holiday nights|polar express|grinch|snoopy|scrooge", re.I)
FFEA_DROP_CATS = {14, 45, 47}     # FFEA's own member events, sports, networking


def _ffea_post(method, body):
    url = FFEA_SVC + method
    if not allowed(url):
        raise RuntimeError("robots.txt disallows " + url)
    time.sleep(DELAY)
    req = urllib.request.Request(url, data=body.encode("utf-8"), method="POST", headers={
        "User-Agent": UA, "Content-Type": "application/json; charset=utf-8", "Accept": "application/json",
        "Referer": FFEA_PAGE})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8", "replace"))["d"]


def src_ffea():
    flags = ("'keywords':'%25%25','isFeatured':'false','fanPicks':'false','pastEvents':'false','allEvents':'false',"
             "'memberEvents':'false','memberOnly':'false','showCategoryExceptionID':0,'isolatedSchedule':0,"
             "'customFieldFilters':[], 'searchInDescription':true")
    days = _ffea_post("GetEventDays", "{'day':'','startDate':'','endDate':'','categoryID':0,'currentUserItems':'false',"
                                      "'tagID':0,'myPicks':'false'," + flags + "}")
    if not days:
        return []
    d = _ffea_post("GetEventDaysByList", "{'dates':'" + ",".join(days) + "','day':'','categoryID':0,'tagID':0," + flags + "}")
    by_id = {}
    for day in d.get("Days") or []:
        m = re.match(r"(\d\d)/(\d\d)/(\d{4})$", day.get("DateString") or "")
        if not m:
            continue
        iso = f"{m.group(3)}-{m.group(1)}-{m.group(2)}"
        for t in day.get("Times") or []:
            for it in t.get("Items") or []:
                if it.get("EventID") is None:
                    continue
                e = by_id.setdefault(it["EventID"], {"it": it, "dates": set()})
                e["dates"].add(iso)
    out = []
    for e in by_id.values():
        it = e["it"]
        if it.get("IsPrivate") or it.get("IsMemberOnly"):
            continue
        name = clean(it.get("Name"))
        if not name:
            continue
        name = re.sub(r"\?(?=\w)", " ", name).strip()          # their feed turns some spaces into "?"
        cats = {c.get("CategoryID") for c in it.get("CategoryMaps") or []}
        if cats & FFEA_DROP_CATS or FFEA_DROP.search(name) or not FFEA_KEEP.search(name):
            out.append({"name": name, "dates": [], "skip": "not a vendor event"})
            continue
        loc = next((L for L in it.get("Locations") or [] if L.get("City") or L.get("Latitude")), {}) or {}
        if (loc.get("State") or "FL").strip().upper() not in ("FL", "FLORIDA"):
            continue
        city = clean(loc.get("City")) or ""
        if city.isupper():
            city = city.title()
        tags = [t.get("Tag") for t in it.get("Tags") or [] if t.get("Tag")]
        url = it.get("DetailURL") or FFEA_PAGE
        out.append({
            "name": name, "dates": sorted(e["dates"]), "city": nice_city(city),
            "venue": clean(loc.get("Name")), "address": clean((loc.get("AddressLine1") or "").replace("?", " ")),
            "time": clean(it.get("EventTimeRangeString")), "url": url, "source": "ffea",
            "organizer_site": clean(it.get("ExternalLink")),
            "desc": (clean(it.get("ShortDescription")) or "")[:300], "vendor_site": True,
            "scope": "florida", "lat": loc.get("Latitude"), "lng": loc.get("Longitude"), "ffea_tags": tags,
        })
    return out


# Visit Jacksonville (visitjacksonville.com/events, the city's official tourism calendar; added Nov 9, 2026 at the
# owner's request). Its events page searches a public, search-only index (the app id + key are printed in the
# page's own HTML, data-info on the events list); we read that same index, as the page does, instead of the HTML.
# robots.txt allows /events/. One page read + ~13 small queries per run.
VJ_PAGE = "https://www.visitjacksonville.com/events/"
VJ_APP, VJ_KEY, VJ_INDEX = "EYQHJ2IY2M", "c6d5977cb5cd80c09abfd2a7e5d9e88b", "prod-visit-jacksonville-listings"
VJ_HORIZON_DAYS = 200
VJ_MAX_DATES = 12        # a weekly market lists its next 12 dates, not 30
VJ_KEEP = re.compile(
    r"(?<!super)\bmarkets?\b|\bmarketplace|\bmercado|\bfarmers?'?\b|\bflea\b|\bbazaar|\bcrafts?\b|\bfairs?\b|\bfaire\b|"
    r"\bfestival|\bfest\b|\w{3,}fest\b|\bpop[\s-]?ups?\b|\bmakers?'?s?\b|\bartisans?\b|\bexpo\b|\bart ?walk|"
    r"\bblock party|\bsmall business saturday|\bshop (?:small|local)|\bswap meet|\btrunk show|\bvendors?\b", re.I)
VJ_VENDOR_WORDS = re.compile(r"\bvendors?\b|\bartisans?\b|\bcrafters?\b|\bmakers\b|\bbooths?\b|\blocal (?:artists|businesses|shops)\b", re.I)
VJ_DROP = re.compile(
    r"\btour\b|\btribute\b|\bconcert|\bsymphony|\borchestra|\bcomedy|\bcomedian|\bmusical\b|\bin concert|\bopera\b|"
    r"\bballet|\bnutcracker|\bexhibit|\bexhibition|\byoga\b|\btrivia|\bwine dinner|\bbeer dinner|\bcompetition\b|"
    r"\bgrom\b|\bsurf\b|\bfit ?fest", re.I)


def _vj_keys():
    """App id / key / index as the events page prints them today (falls back to the ones read on Nov 9, 2026)."""
    try:
        t = html.unescape(fetch(VJ_PAGE))
        m = re.search(r'"appId":"(\w+)","apiKey":"(\w+)","index":"([\w-]+)"', t)
        if m:
            return m.group(1), m.group(2), m.group(3)
    except Exception as e:
        log("visitjacksonville: events page read failed, using the stored key:", str(e)[:120])
    return VJ_APP, VJ_KEY, VJ_INDEX


def _vj_query(app, key, index, body):
    time.sleep(0.5)
    req = urllib.request.Request(
        f"https://{app}-dsn.algolia.net/1/indexes/{index}/query", data=json.dumps(body).encode("utf-8"),
        method="POST", headers={"X-Algolia-Application-Id": app, "X-Algolia-API-Key": key, "User-Agent": BROWSER_UA,
                                "Content-Type": "application/json", "Referer": VJ_PAGE,
                                "Origin": "https://www.visitjacksonville.com"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def _vj_hm(ts):
    t = dt.datetime.fromtimestamp(int(ts), dt.timezone.utc)      # the index stores local wall time as UTC
    return t.strftime("%I:%M %p").lstrip("0").replace(":00 ", " ")


def src_visitjax():
    if not allowed(VJ_PAGE):
        raise RuntimeError("robots.txt disallows " + VJ_PAGE)
    app, key, index = _vj_keys()
    t0 = int(time.time()) // 86400 * 86400
    hits, step = {}, 15 * 86400
    for s in range(t0, t0 + VJ_HORIZON_DAYS * 86400, step):
        page = 0
        while True:
            j = _vj_query(app, key, index, {
                "query": "", "hitsPerPage": 1000, "page": page, "facetFilters": [["sectionName:Events"]],
                "numericFilters": [f"startDate>={s}", f"startDate<{s + step}"],
                "attributesToRetrieve": ["title", "uri", "content", "eventCategories", "address", "website",
                                         "startDate", "endDate", "isAllDay", "readableRepeatRule", "_geoloc"],
                "attributesToHighlight": [], "attributesToSnippet": []})
            for h in j.get("hits") or []:
                hits[h["objectID"]] = h
            page += 1
            if page >= (j.get("nbPages") or 0):
                break
    by_base = {}
    for oid, h in hits.items():                      # "8401970-1799424000" = an occurrence of listing 8401970
        by_base.setdefault(oid.split("-")[0], []).append(h)
    out = []
    for occ in by_base.values():
        occ.sort(key=lambda h: h.get("startDate") or 0)
        h = occ[0]
        name = clean(h.get("title"))
        if not name:
            continue
        desc = clean(h.get("content")) or ""
        cats = set(h.get("eventCategories") or [])
        keep = bool(VJ_KEEP.search(name)) or (bool(VJ_VENDOR_WORDS.search(desc)) and bool(
            cats & {"Fairs & Festivals", "Holiday Events", "Foodie", "Cultural", "Classes & Community Events"}))
        if VJ_DROP.search(name) or not keep:
            out.append({"name": name, "dates": [], "skip": "not a vendor event"})
            continue
        dates = []
        for o in occ:
            if o.get("startDate"):
                d = dt.datetime.fromtimestamp(int(o["startDate"]), dt.timezone.utc).date().isoformat()
                e = dt.datetime.fromtimestamp(int(o.get("endDate") or o["startDate"]), dt.timezone.utc).date().isoformat()
                dates += daterange(d, e)
        dates = sorted(set(dates))[:VJ_MAX_DATES]
        addr = [clean(a) for a in (h.get("address") or []) if clean(a)]
        city = ""
        if addr:
            m = re.match(r"\s*([A-Za-z .'-]+?)\s*,\s*(FL|Florida)\b", addr[-1], re.I)
            if m:
                city = m.group(1).strip().title()
                addr = addr[:-1]
        venue = addr[0] if len(addr) > 1 else None
        street = addr[-1] if addr else None
        tm = None
        if not h.get("isAllDay") and h.get("startDate"):
            tm = _vj_hm(h["startDate"]) + (" - " + _vj_hm(h["endDate"]) if h.get("endDate") and h["endDate"] != h["startDate"] else "")
        geo = h.get("_geoloc") or {}
        rule = clean(h.get("readableRepeatRule"))
        out.append({
            "name": name, "dates": dates, "city": nice_city(city) or "Jacksonville", "venue": venue,
            "address": street, "time": tm, "url": "https://www.visitjacksonville.com/events" + (h.get("uri") or "/"),
            "source": "visitjacksonville.com", "organizer_site": clean(h.get("website")),
            "desc": ((rule + ". ") if rule else "") + desc[:300],
            "vendor_site": True,     # already filtered to markets / fairs / festivals / pop-ups above
            "scope": "florida", "lat": geo.get("lat"), "lng": geo.get("lng"),
        })
    return out


SOURCES = [("fairsandfestivals.net", src_fairsandfestivals), ("festivalnet.com", src_festivalnet),
           ("allevents.in", src_allevents), ("ffea", src_ffea),
           ("visitjacksonville.com", src_visitjax)]
# Note (Nov 1, 2026): FestivalNet, AllEvents and FairsAndFestivals.net all forbid scraping in their terms of
# use. No new pages are read from them for the statewide change (Nov 9, 2026): FairsAndFestivals.net was
# already reading its Florida-wide list; FestivalNet and AllEvents stay on the Jacksonville pages. Set JVE_FINDER_SKIP="festivalnet.com,allevents.in,fairsandfestivals.net" to turn
# any of them off without a code change.
_SKIP = {x.strip() for x in os.environ.get("JVE_FINDER_SKIP", "").split(",") if x.strip()}
SOURCES = [(n, f) for n, f in SOURCES if n not in _SKIP]


# ---------- matching ----------
def tokens(name):
    n = html.unescape(name or "").lower()
    n = re.sub(r"\b(19|20)\d\d\b", " ", n)
    n = re.sub(r"\b\d+(st|nd|rd|th)\b", " ", n)
    n = re.sub(r"[^a-z0-9 ]+", " ", n)
    toks = [t for t in n.split() if t not in STOP and not t.isdigit()]
    toks = [t[:-1] if len(t) > 3 and t.endswith("s") else t for t in toks]
    return set(toks)


def similar(a, b):
    """a, b: (full tokens, core tokens without place words)."""
    (fa, ca), (fb, cb) = a, b
    if not fa or not fb:
        return False
    if fa == fb:
        return True
    def jac(x, y):
        return len(x & y) / len(x | y) if (x | y) else 0
    if jac(fa, fb) >= 0.6 and (fa & fb) - GENERIC:
        return True
    small, big = (fa, fb) if len(fa) <= len(fb) else (fb, fa)
    if small <= big and len(small - GENERIC) >= 2 and len(small) / len(big) >= 0.5:
        return True
    if ca and cb and jac(ca, cb) >= 0.6 and (ca & cb) - GENERIC:
        return True
    return False


def name_key(name):
    full = tokens(name)
    return (full, full - PLACE)


def near(dates_a, dates_b, days):
    for x in dates_a:
        for y in dates_b:
            if abs((dt.date.fromisoformat(x) - dt.date.fromisoformat(y)).days) <= days:
                return True
    return False


def norm_url(u):
    return re.sub(r"[?#].*$", "", (u or "").strip().lower()).rstrip("/").replace("://www.", "://")


def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (s or "").lower())).strip("-")[:50]


# ---------- main ----------
def main(argv):
    dry = "--dry-run" in argv
    try:
        from zoneinfo import ZoneInfo
        today = dt.datetime.now(ZoneInfo("America/New_York")).date()
    except Exception:
        today = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=5)).date()
    if "--today" in argv:
        today = dt.date.fromisoformat(argv[argv.index("--today") + 1])
    t_iso, horizon = today.isoformat(), (today + dt.timedelta(days=HORIZON_DAYS)).isoformat()

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    events = data.get("events")
    if not isinstance(events, list) or not events:
        sys.exit("events.json has no events list; refusing to run")
    try:
        with open(SEEN_PATH, encoding="utf-8") as f:
            seen = json.load(f)
    except (FileNotFoundError, ValueError):
        seen = {}
    seen.setdefault("items", {})

    existing = []
    for e in events:
        ds = [x for x in (e.get("dates") or []) if isinstance(x, str) and re.match(r"\d{4}-\d{2}-\d{2}$", x)]
        existing.append({"toks": name_key(e.get("name")), "dates": ds, "county": e.get("county"),
                         "city": re.sub(r"\s*\(.*\)$", "", (e.get("city") or "").lower()).strip(),
                         "urls": {norm_url(e.get("source_url")), norm_url(e.get("source")), norm_url(e.get("apply"))} - {""},
                         "active": e.get("verify_status") not in ("past", "cancelled", "removed"),
                         "recurring": bool(e.get("recurring")), "id": e.get("id")})
    ids = {e.get("id") for e in events}

    report = {"run_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
              "today": t_iso, "sources": {}, "added": [], "added_by_region": {}, "skipped": {}}

    # 1) gather
    cands = []
    for name, fn in SOURCES:
        try:
            got = fn()
            report["sources"][name] = {"ok": True, "fetched": len(got)}
            log(f"{name}: {len(got)} raw items")
            cands += got
        except Exception as e:
            report["sources"][name] = {"ok": False, "error": str(e)[:200]}
            log(f"{name}: FAILED {str(e)[:200]}")

    def skip(reason):
        report["skipped"][reason] = report["skipped"].get(reason, 0) + 1

    # 2) filter + merge (same event on two sites, or monthly instances of one market)
    groups = []
    for c in cands:
        if not c.get("name"):
            continue
        if c.get("skip"):
            skip(c["skip"]); continue
        county, plat, plng = place_of(c.get("city"), c.get("lat"), c.get("lng"))
        if not county:
            skip("place not found in Florida"); continue
        c["plat"], c["plng"] = plat, plng
        ds = sorted(x for x in c["dates"] if t_iso <= x <= horizon)
        if not ds:
            skip("past or too far out"); continue
        text = c["name"] + " " + (c.get("desc") or "")
        if EXCLUDE.search(c["name"]) or (not c.get("vendor_site") and EXCLUDE.search(text)):
            skip("not a vendor event"); continue
        if not c.get("vendor_site") and not STRONG.search(c["name"]):
            skip("not a vendor event"); continue
        if c.get("vendor_site") and c.get("vendor_types") == ["commercial"] and not STRONG.search(c["name"]):
            skip("not a vendor event"); continue
        c["name"] = re.sub(r"\s*[-\u2013~]\s*(" + "|".join(MONTHS) + r")\s*$", "", c["name"], flags=re.I).strip()
        c["county"], c["dates"], c["toks"] = county, ds, name_key(c["name"])
        for g in groups:
            if g["county"] == county and similar(g["toks"], c["toks"]) and (
                    g["toks"][0] == c["toks"][0] or near(g["dates"], ds, 3)):
                g["dates"] = sorted(set(g["dates"]) | set(ds))
                g["also"].append(c)
                break
        else:
            c["also"] = []
            groups.append(c)

    # 3) dedupe against the directory and the seen-list
    added = []
    for c in sorted(groups, key=lambda g: g["dates"][0]):
        key = norm_url(c["url"])
        urls = {key} | {norm_url(a["url"]) for a in c["also"]}
        if any(u in seen["items"] for u in urls):
            skip("seen before"); continue
        dup = None
        for x in existing:
            if urls & x["urls"]:
                dup = x; break
            if x["county"] == c["county"] and similar(x["toks"], c["toks"]) and (
                    near(c["dates"], x["dates"], 3) or (x["active"] and x["recurring"])
                    or (x["toks"][0] == c["toks"][0] and near(c["dates"], x["dates"], 30))
                    or (not x["active"] and near(c["dates"], x["dates"], 120))):
                dup = x; break
        if not dup and (c["city"] or "").lower() not in ("jacksonville", ""):
            # small towns: same town, same day, same kind of event (e.g. "holiday market") = same event
            for x in existing:
                if x.get("city") == (c["city"] or "").lower() and set(c["dates"]) & set(x["dates"]) and \
                        len(c["toks"][0] & x["toks"][0]) >= 2:
                    dup = x; break
        if dup:
            for u in urls:
                seen["items"][u] = {"status": "duplicate", "of": dup["id"], "first_seen": t_iso, "last_date": c["dates"][-1]}
            log("  = already listed:", c["dates"][0], c["name"], "->", dup["id"])
            skip("already listed"); continue
        if len(added) >= MAX_ADD:
            skip("over the per-run cap (next run)"); continue
        base = "af-" + slug(c["name"]) + "-" + c["dates"][0]
        nid, k = base, 2
        while nid in ids:
            nid, k = f"{base}-{k}", k + 1
        ids.add(nid)
        srcs = [c] + c["also"]
        note = "Found automatically on " + ", ".join(sorted({s["source"] for s in srcs})) + " on " + t_iso + \
               "; not yet checked against the organizer's own page."
        if c.get("organizer_site"):
            note += " Organizer site named there: " + c["organizer_site"] + "."
        multi = len(c["dates"]) > 1 and (dt.date.fromisoformat(c["dates"][-1]) - dt.date.fromisoformat(c["dates"][0])).days == len(c["dates"]) - 1
        e = {
            "id": nid, "name": c["name"], "organizer": None, "dates": c["dates"],
            "end_date": c["dates"][-1] if multi else None, "schedule": None, "recurring": False,
            "county": c["county"], "city": c["city"], "venue": c.get("venue") or next((s.get("venue") for s in srcs if s.get("venue")), None),
            "fee": None, "fee_bucket": "unknown", "deadline": None, "deadline_note": None, "apply": None,
            "contact": None, "source": c["url"], "source_kind": "scan", "verified": False, "last_checked": t_iso,
            "handmade": False, "projected": False,
            "address": c.get("address") or next((s.get("address") for s in srcs if s.get("address")), None),
            "verify_status": "unverified", "verified_on": None, "source_url": c["url"], "verify_note": note,
            "time": c.get("time") or next((s.get("time") for s in srcs if s.get("time")), None),
            "found_by": "auto-finder", "found_on": t_iso, "found_via": sorted({s["source"] for s in srcs}),
            "region": REGION_OF.get(c["county"]),
            "lat": round(c["plat"], 3) if c.get("plat") is not None else None,
            "lng": round(c["plng"], 3) if c.get("plng") is not None else None,
        }
        added.append(e)
        existing.append({"toks": c["toks"], "dates": c["dates"], "county": c["county"], "city": (c["city"] or "").lower(), "urls": urls, "active": True, "recurring": False, "id": nid})
        for u in urls:
            seen["items"][u] = {"status": "added", "id": nid, "first_seen": t_iso, "last_date": c["dates"][-1]}
        report["added"].append({"id": nid, "name": c["name"], "dates": c["dates"], "city": c["city"],
                                "county": c["county"], "region": e["region"], "via": e["found_via"]})
        rg = e["region"] or "?"
        report["added_by_region"][rg] = report["added_by_region"].get(rg, 0) + 1

    # forget seen items whose dates have passed (keeps the file small)
    seen["items"] = {k: v for k, v in seen["items"].items() if (v.get("last_date") or "9999") >= t_iso}
    seen["last_run"] = report

    log(f"added {len(added)} | by region {json.dumps(report['added_by_region'])} | skipped {json.dumps(report['skipped'])}")
    for a in report["added"]:
        log("  +", ",".join(a["dates"]), a["city"], "|", a["name"], "|", ",".join(a["via"]))
    if dry:
        return 0

    # every listing carries its region (backward-compatible extra field; counties map to regions in fl_places.json)
    tagged = 0
    for ev in events:
        if not ev.get("region") and REGION_OF.get(ev.get("county")):
            ev["region"] = REGION_OF[ev["county"]]
            tagged += 1
    if data.get("regions") != FL["regions"]:
        data["regions"] = FL["regions"]
        tagged += 1
    if tagged:
        log(f"region tagged on {tagged} existing listing(s)")
    if added or tagged:
        data["events"] = events + added
        out = json.dumps(data, indent=1, ensure_ascii=False)
        assert len(json.loads(out)["events"]) == len(events) + len(added)
        tmp = JSON_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(out)
        os.replace(tmp, JSON_PATH)
    tmp = SEEN_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(json.dumps(seen, indent=1, ensure_ascii=False, sort_keys=True))
    os.replace(tmp, SEEN_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
