#!/usr/bin/env python3
"""Public teaser feeds for search engines and AI agents (Nov 6 2026). No dependencies, Python 3.8+.

  python3 scripts/build_feeds.py [--out DIR]

Reads the listings through the SAME door a logged-out visitor uses (get_site with the publishable key, no login),
so the feeds can never carry more than the logged-out site shows, then keeps only teaser fields on top of that
(id, teaser title, dates, city, county, region, category, fee range, link). Paid featured listings that are open
on the site are cut back to the teaser here too. No venue, address, organizer, contact or apply link, ever.

Writes api/events.json, feeds/events.ics and feeds/events.rss. A file is rewritten only when its content changed,
so running it twice changes nothing. Exit 0 = ok (prints which files changed), 1 = failed (nothing written).
"""
import datetime as dt, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://jaxvendorevents.com/"
HIDDEN = {"past", "cancelled", "removed"}
CATS = {"campus": "Campus market"}
FORBIDDEN = ("venue", "address", "organizer", "contact", "email", "phone", "apply", "website", "link", "instagram", "facebook", "notes", "lat", "lng", "lon")


def cfg():
    t = open(os.path.join(ROOT, "auth-config.js"), encoding="utf-8").read()
    return re.search(r"url:'([^']+)'", t).group(1), re.search(r"key:'([^']+)'", t).group(1)


def teaser_label(n):
    """Python copy of the database's public.teaser_label() (the logged-out title)."""
    i = re.I
    h = re.search(r"(holiday|christmas|xmas|santa|jingle|winter|noel|tree lighting|mistletoe|luminaria|hanukkah|kwanzaa|new year|valentine|galentine|easter|halloween|thanksgiving|thankful|harvest|spooky|trunk.or.treat|mardi|patrick|veterans|gingerbread|merry|nights of lights|holly)", n, i)
    c = re.search(r"(craft|artisan|maker|art show|art fair|arts? market|arts (and|&)|art ?walk|bazaar|boutique|vintage|flea|antique|art festival)", n, i)
    f = re.search(r"(farmer'?s|farm market|green ?market|growers|produce)", n, i)
    fe = re.search(r"(festival|\bfest\b|\bfair\b|jubilee|celebration|carnival|\bexpo\b|fiesta|parade|palooza|cook-off)", n, i)
    s = ""
    if h: s += "holiday "
    if c: s += "craft & art "
    if f: s += "farmers "
    if fe: s += "festival"
    elif not (h or c or f): s = "pop-up market"
    else: s += "market"
    return s[:1].upper() + s[1:]


def title(e):
    if e.get("locked") and e.get("name"):
        return e["name"]
    base = "Campus market" if e.get("category") == "campus" else teaser_label(e.get("name") or "")
    return base + (" · " + e["city"] if e.get("city") else "")


def fetch():
    url, key = cfg()
    req = urllib.request.Request(url + "/rest/v1/rpc/get_site", data=json.dumps({"keys": ["events"]}).encode(),
                                 headers={"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read())
    if d.get("access") != "anon":
        raise SystemExit("expected the logged-out view")
    return d["events"]


def build(data, today):
    out = []
    for e in data.get("events") or []:
        if e.get("verify_status") in HIDDEN:
            continue
        dates = sorted(x for x in (e.get("dates") or []) if isinstance(x, str) and x >= today)
        if not dates:
            continue
        fee = e.get("fee")
        out.append({
            "id": e["id"],
            "title": title(e),
            "next_date": dates[0],
            "dates": dates[:12],
            "end_date": e.get("end_date") if (e.get("end_date") or "") >= dates[0] else None,
            "recurring": bool(e.get("recurring")),
            "schedule": e.get("schedule") or None,
            "city": e.get("city") or None,
            "county": e.get("county") or None,
            "region": e.get("region") or None,
            "state": "FL",
            "category": e.get("category") or ("campus" if e.get("campus") else None),
            "booth_fee": fee if isinstance(fee, (int, float)) or (isinstance(fee, str) and len(fee) <= 40) else None,
            "booth_fee_range": e.get("fee_bucket") or None,
            "application_deadline": e.get("deadline") or None,
            "verified": bool(e.get("verified")),
            "url": SITE + "#e=" + e["id"],
            "details_locked": True,
        })
    out.sort(key=lambda x: (x["next_date"], x["id"]))
    for x in out:  # belt and braces: nothing that could name a place or a person
        assert not any(k for k in x if any(b in k.lower() for b in FORBIDDEN) and k != "url"), x
    return out


def esc_ics(s):
    return str(s).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    b = line.encode("utf-8")
    if len(b) <= 74:
        return line
    parts, cur = [], b""
    for ch in line:
        c = ch.encode("utf-8")
        if len(cur) + len(c) > 73:
            parts.append(cur.decode("utf-8")); cur = b""
        cur += c
    parts.append(cur.decode("utf-8"))
    return "\r\n ".join(parts)


def ics(events, stamp):
    L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jax Vendor Events//Public teaser feed//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
         "X-WR-CALNAME:Jax Vendor Events (Florida vendor markets)", "X-WR-TIMEZONE:America/New_York",
         "X-WR-CALDESC:Upcoming vendor markets\\, craft fairs and festivals in Florida. Venue\\, organizer and how to apply: jaxvendorevents.com (Vendor Pro)."]
    ds = stamp.replace("-", "").replace(":", "")[:15] + "Z" if stamp else "20260101T000000Z"
    for e in events:
        for d in e["dates"][:6]:
            day = dt.date.fromisoformat(d)
            end = dt.date.fromisoformat(e["end_date"]) + dt.timedelta(days=1) if (e["end_date"] and d == e["next_date"] and len(e["dates"]) == 1) else day + dt.timedelta(days=1)
            where = ", ".join(x for x in [e["city"], (e["county"] + " County") if e["county"] else None, "FL"] if x)
            L += ["BEGIN:VEVENT", "UID:%s-%s@jaxvendorevents.com" % (e["id"], d), "DTSTAMP:" + ds,
                  "DTSTART;VALUE=DATE:" + day.strftime("%Y%m%d"), "DTEND;VALUE=DATE:" + end.strftime("%Y%m%d"),
                  fold("SUMMARY:" + esc_ics(e["title"])), fold("LOCATION:" + esc_ics(where)), "URL:" + e["url"],
                  fold("DESCRIPTION:" + esc_ics("Vendor event in " + where + ". Venue, organizer and how to apply: " + e["url"])),
                  "TRANSP:TRANSPARENT", "END:VEVENT"]
    L.append("END:VCALENDAR")
    return "\r\n".join(L) + "\r\n"


def rss(events, stamp):
    from email.utils import format_datetime
    from xml.sax.saxutils import escape as x
    try:
        pub = format_datetime(dt.datetime.fromisoformat(stamp.replace("Z", "+00:00")))
    except Exception:
        pub = "Thu, 01 Jan 2026 00:00:00 +0000"
    items = []
    for e in events[:100]:
        day = dt.date.fromisoformat(e["next_date"])
        where = ", ".join(v for v in [e["city"], (e["county"] + " County") if e["county"] else None, "FL"] if v)
        t = "%s · %s" % (e["title"], day.strftime("%a %b ") + str(day.day))
        desc = "%s in %s on %s. Booth fee: %s. Venue, organizer and how to apply are on Jax Vendor Events (Vendor Pro)." % (
            e["title"], where, day.strftime("%A, %B ") + str(day.day), e["booth_fee"] or e["booth_fee_range"] or "not listed")
        items.append("<item><title>%s</title><link>%s</link><guid isPermaLink=\"false\">jve-%s-%s</guid><category>%s</category><description>%s</description></item>" % (
            x(t), x(e["url"]), x(e["id"]), e["next_date"], x(e["category"] or "market"), x(desc)))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>'
            "<title>Jax Vendor Events: upcoming Florida vendor events</title><link>%s</link>"
            '<atom:link href="%sfeeds/events.rss" rel="self" type="application/rss+xml"/>'
            "<description>Vendor markets, craft fairs, pop-ups and festivals across Florida, soonest first. Teaser details only; full details with Vendor Pro.</description>"
            "<language>en-us</language><lastBuildDate>%s</lastBuildDate>%s</channel></rss>\n") % (SITE, SITE, pub, "".join(items))


def write(path, text):
    p = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    old = open(p, encoding="utf-8", newline="").read() if os.path.exists(p) else None
    if old == text:
        return False
    with open(p, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    return True


def main(argv):
    global OUT
    OUT = argv[argv.index("--out") + 1] if "--out" in argv else ROOT
    try:
        from zoneinfo import ZoneInfo
        today = dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()
    except Exception:
        today = (dt.datetime.utcnow() - dt.timedelta(hours=5)).date().isoformat()
    data = fetch()
    events = build(data, today)
    if len(events) < 10:
        print("FAILED: only %d events; refusing to write" % len(events)); return 1
    stamp = data.get("updated_at") or data.get("updated") or ""
    doc = {"$schema": SITE + "api/events.schema.json", "name": "Jax Vendor Events public event feed",
           "description": "Upcoming vendor markets, craft fairs, pop-ups and festivals in Florida. Teaser fields only: venue, address, organizer, contacts and apply links are for Vendor Pro members on the site.",
           "license": SITE + "terms.html", "terms": "Link people to each event's url (or " + SITE + "pro.html to unlock details). Don't scrape the site or resell this data.",
           "home": SITE, "upgrade_url": SITE + "pro.html", "data_updated": stamp, "as_of": today, "count": len(events), "events": events}
    js = json.dumps(doc, ensure_ascii=False, indent=1) + "\n"
    json.loads(js)
    changed = [p for p, t in (("api/events.json", js), ("feeds/events.ics", ics(events, stamp)), ("feeds/events.rss", rss(events, stamp))) if write(p, t)]
    print("feeds: %d events; changed: %s" % (len(events), ", ".join(changed) or "nothing"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
