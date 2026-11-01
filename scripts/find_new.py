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
  * keeps only future events in the 7 Northeast Florida counties (by city);
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
MAX_ADD = 25
HORIZON_DAYS = 366
UA = "Mozilla/5.0 (compatible; JaxVendorEventsFinder/1.0; +https://cresl1.github.io/jax-vendor-events/)"
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


SOURCES = [("fairsandfestivals.net", src_fairsandfestivals), ("festivalnet.com", src_festivalnet),
           ("allevents.in", src_allevents)]


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
                         "urls": {norm_url(e.get("source_url")), norm_url(e.get("source")), norm_url(e.get("apply"))} - {""},
                         "active": e.get("verify_status") not in ("past", "cancelled", "removed"),
                         "recurring": bool(e.get("recurring")), "id": e.get("id")})
    ids = {e.get("id") for e in events}

    report = {"run_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
              "today": t_iso, "sources": {}, "added": [], "skipped": {}}

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
        county = county_of(c.get("city"))
        if not county:
            skip("outside the 7 counties"); continue
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
        }
        added.append(e)
        existing.append({"toks": c["toks"], "dates": c["dates"], "county": c["county"], "urls": urls, "active": True, "recurring": False, "id": nid})
        for u in urls:
            seen["items"][u] = {"status": "added", "id": nid, "first_seen": t_iso, "last_date": c["dates"][-1]}
        report["added"].append({"id": nid, "name": c["name"], "dates": c["dates"], "city": c["city"],
                                "via": e["found_via"]})

    # forget seen items whose dates have passed (keeps the file small)
    seen["items"] = {k: v for k, v in seen["items"].items() if (v.get("last_date") or "9999") >= t_iso}
    seen["last_run"] = report

    log(f"added {len(added)} | skipped {json.dumps(report['skipped'])}")
    for a in report["added"]:
        log("  +", ",".join(a["dates"]), a["city"], "|", a["name"], "|", ",".join(a["via"]))
    if dry:
        return 0

    if added:
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
