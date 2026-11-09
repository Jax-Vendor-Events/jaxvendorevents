#!/usr/bin/env python3
"""Florida county pages for search (Nov 9 2026). No dependencies, Python 3.8+.

  python3 scripts/build_area_pages.py [--out DIR]

Reads api/events.json, the public teaser feed that build_feeds.py makes through the logged-out door, so these pages
can never carry more than the logged-out site shows: teaser title, town, county, dates, fee, deadline, checked badge.
No event name, venue, address, organizer, contact or apply link, ever (the same FORBIDDEN guard as build_feeds.py).

Writes fl/index.html (all counties) and fl/<county>-county.html (one per county with upcoming events), plus
sitemap-areas.xml, and refreshes the numbers between <!--kpis--> and <!--/kpis--> in about.html. A file is rewritten only when its content changed; county pages that no longer have events are
removed. Uses about.html as the page shell (head, header, footer) so the pages look like the rest of the site.
Exit 0 = ok, 1 = failed (nothing written).
Rollback: delete fl/, sitemap-areas.xml, this script, its step in .github/workflows/hourly-refresh.yml and the
Sitemap line for sitemap-areas.xml in robots.txt.
"""
import datetime as dt, html, json, os, re, statistics, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://jaxvendorevents.com/"
FORBIDDEN = ("venue", "address", "organizer", "contact", "email", "phone", "apply", "website", "link", "instagram", "facebook", "notes", "lat", "lng", "lon")
REGION_ORDER = ["Northeast", "Panhandle", "North Central", "Central", "Tampa Bay", "Southwest", "Southeast", "Keys"]
REGION_NAME = {"Northeast": "Northeast FL", "Panhandle": "Panhandle", "North Central": "North Central", "Central": "Central / Orlando",
               "Tampa Bay": "Tampa Bay", "Southwest": "Southwest", "Southeast": "Southeast / Miami", "Keys": "Keys"}  # the map's own region labels
MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
e_ = lambda s: html.escape(str(s or ""), quote=True)


def slug(c):
    return re.sub(r"[^a-z0-9]+", "-", c.lower().replace(".", "")).strip("-") + "-county"


def d(s):
    return dt.date.fromisoformat(s)


def short(s):
    x = d(s); return "%s %d" % (MO[x.month - 1], x.day)


def longd(s):
    x = d(s); return "%s, %s %d" % (DOW[x.weekday()], MO[x.month - 1], x.day)


def fee_num(ev):
    if ev.get("booth_fee_range") == "free":
        return 0.0
    m = re.search(r"\$\s?(\d[\d,]*(?:\.\d+)?)", str(ev.get("booth_fee") or ""))
    return float(m.group(1).replace(",", "")) if m else None


def fee_text(ev):
    if ev.get("booth_fee_range") == "free":
        return "Free to vend"
    f = ev.get("booth_fee")
    if f:
        f = str(f); return f if len(f) <= 30 else f[:28] + "…"
    return "Fee not listed"


def shell():
    t = open(os.path.join(ROOT, "about.html"), encoding="utf-8").read()
    head_end = t.index("</head>")
    main_a, main_b = t.index('<main class="wrap" id="main">'), t.index("</main>") + len("</main>")
    return t[:head_end], t[head_end:main_a], t[main_b:]


def page(shell_parts, path, title, desc, body, ld):
    head, mid, tail = shell_parts
    url = SITE + path
    head = re.sub(r"<title>.*?</title>", "<title>" + e_(title) + "</title>", head, flags=re.S)
    head = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + e_(desc), head)
    head = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m.group(1) + url, head)
    head = re.sub(r'(<meta property="og:url" content=")[^"]*', lambda m: m.group(1) + url, head)
    for k in ("og:title", "twitter:title"):
        head = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % k, lambda m: m.group(1) + e_(title), head)
    for k in ("og:description", "twitter:description"):
        head = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % k, lambda m: m.group(1) + e_(desc), head)
    # pages live one folder down: make the shell's relative links absolute
    fix = lambda s: re.sub(r'(href|src)="(?!https?:|/|#|mailto:|data:)([^"]+)"', r'\1="/\2"', s)
    head, mid, tail = fix(head), fix(mid), fix(tail)
    css = ('<base href="/">'  # the shared scripts (fb.js menu, images) use relative paths
           "<style>.ar-list{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);gap:8px}.ar-row,.ar-row a{min-width:0}"
           ".ar-row a{display:flex;gap:12px;align-items:center;padding:12px;border-radius:14px;background:var(--c-surface);box-shadow:inset 0 0 0 1px var(--c-border);color:var(--c-text);text-decoration:none}"
           ".ar-d{flex:none;width:46px;text-align:center;border-radius:10px;background:var(--c-raised);padding:6px 0;font:700 11px/1.1 var(--f-sans,inherit);color:var(--c-muted);text-transform:uppercase}"
           ".ar-d b{display:block;font-size:19px;color:var(--c-text)}.ar-m{min-width:0;flex:1}.ar-m b{display:block;font-size:15.5px;line-height:1.25}"
           ".ar-m small{display:block;color:var(--c-muted);font-size:13px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
           ".ar-t{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ar-t span{font-size:12px;padding:3px 8px;border-radius:999px;background:var(--c-raised);color:var(--c-text-2,var(--c-muted))}"
           ".ar-t .hot{color:var(--c-accent)}.ar-h{margin:26px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--c-muted)}"
           ".ar-c{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0;padding:0;list-style:none}.ar-c a{display:inline-block;padding:8px 12px;border-radius:999px;background:var(--c-surface);box-shadow:inset 0 0 0 1px var(--c-border);color:var(--c-text);text-decoration:none;font-size:14px}"
           ".ar-c a small{color:var(--c-muted);margin-left:4px}.ar-pro{margin:18px 0;padding:14px;border-radius:14px;background:var(--c-surface);box-shadow:inset 0 0 0 1px var(--c-border)}"
           ".ar-crumb{font-size:13px;color:var(--c-muted);margin:14px 0 0}.ar-crumb a{color:inherit}</style>")
    lds = "".join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False).replace("</", "<\\/") + "</script>" for x in ld)
    return head + css + lds + "\n" + mid + '<main class="wrap" id="main">\n' + body + "\n</main>" + tail


def row(ev, today):
    nd = ev["next_date"]; x = d(nd)
    sub = ", ".join(v for v in [ev.get("city"), (ev["county"] + " County") if ev.get("county") else None] if v)
    when = longd(nd)
    if ev.get("end_date") and ev["end_date"] > nd and len(ev.get("dates") or []) <= 1:
        when += " – " + short(ev["end_date"])
    if ev.get("recurring") and ev.get("schedule") and len(ev["schedule"]) < 40:
        when += " · " + ev["schedule"]
    tags = ["<span>" + e_(fee_text(ev)) + "</span>"]
    dl = ev.get("application_deadline")
    if dl and dl >= today:
        n = (d(dl) - d(today)).days
        tags.append('<span%s>Apply by %s</span>' % (' class="hot"' if n <= 7 else "", short(dl)))
    if ev.get("verified"):
        tags.append("<span>Checked</span>")
    return ('<li class="ar-row"><a href="/#e=%s"><span class="ar-d">%s<b>%d</b></span><span class="ar-m"><b>%s</b><small>%s · %s</small>'
            '<span class="ar-t">%s</span></span></a></li>') % (e_(ev["id"]), MO[x.month - 1], x.day, e_(ev["title"]), e_(when), e_(sub), "".join(tags))


def stats(evs, today):
    fees = [f for f in (fee_num(v) for v in evs) if f is not None and f > 0]
    free = sum(1 for v in evs if v.get("booth_fee_range") == "free")
    dls = sorted((v["application_deadline"], v) for v in evs if v.get("application_deadline") and v["application_deadline"] >= today)
    wk_end = (d(today) + dt.timedelta(days=(6 - d(today).weekday()))).isoformat()
    this_week = sum(1 for v in evs if v["next_date"] <= wk_end)
    checked = sum(1 for v in evs if v.get("verified"))
    return {"n": len(evs), "free": free, "median": statistics.median(fees) if len(fees) >= 3 else None, "nfees": len(fees),
            "next_dl": dls[0] if dls else None, "n_dl": len(dls), "week": this_week, "checked": checked}


def money(x):
    return "$%d" % round(x) if abs(x - round(x)) < 0.01 else "$%.2f" % x


def kpis(s):
    k = [(s["n"], "upcoming events"), (s["week"], "this week"), (s["free"], "free to vend"), (s["n_dl"], "open deadlines")]
    return '<div class="kpis">' + "".join('<div class="kpi"><b>%s</b><span>%s</span></div>' % (a, b) for a, b in k) + "</div>"


def summary(s, place, asof):
    p = ["As of %s, Jax Vendor Events lists <b>%d</b> upcoming vendor markets, craft fairs, pop-ups and festivals in %s" % (asof, s["n"], e_(place))]
    p.append(", %d of them checked against the organizer's own page." % s["checked"] if s["checked"] else ".")
    if s["median"] is not None:
        p.append(" Where a booth fee is posted (%d listings), the typical fee is about %s." % (s["nfees"], money(s["median"])))
    if s["free"]:
        p.append(" %d %s free to vend." % (s["free"], "is" if s["free"] == 1 else "are"))
    if s["next_dl"]:
        dl, v = s["next_dl"]
        p.append(" The next application deadline is %s (%s%s)." % (longd(dl), e_(v["title"]), "" if v.get("city") and v["city"] in v["title"] else (" · " + e_(v.get("city"))) if v.get("city") else ""))
    return "<p class=\"lead\">" + "".join(p) + "</p>"


def event_ld(ev):
    x = {"@type": "Event", "name": ev["title"], "startDate": ev["next_date"], "url": ev["url"],
         "eventStatus": "https://schema.org/EventScheduled", "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
         "location": {"@type": "Place", "name": ", ".join(v for v in [ev.get("city"), "FL"] if v),
                      "address": {"@type": "PostalAddress", "addressLocality": ev.get("city") or "", "addressRegion": "FL", "addressCountry": "US"}}}
    if ev.get("end_date"):
        x["endDate"] = ev["end_date"]
    return x


def build(feed, today):
    evs = [v for v in feed.get("events") or [] if v.get("next_date") and v["next_date"] >= today]
    for v in evs:
        assert not any(k for k in v if any(b in k.lower() for b in FORBIDDEN) and k != "url"), v["id"]
    by_c = {}
    for v in evs:
        if v.get("county"):
            by_c.setdefault(v["county"].replace(" County", "").strip(), []).append(v)
    asof = "%s %d, %d" % (MONTH[d(today).month - 1], d(today).day, d(today).year)
    S = shell(); out = {}
    reg_of = {}
    for c, L in by_c.items():
        rs = [v.get("region") for v in L if v.get("region")]
        reg_of[c] = max(set(rs), key=rs.count) if rs else None
    # county pages
    for c, L in sorted(by_c.items()):
        L.sort(key=lambda v: (v["next_date"], v["id"]))
        s = stats(L, today); place = c + " County, FL"
        towns = {}
        for v in L:
            if v.get("city"): towns[v["city"]] = towns.get(v["city"], 0) + 1
        body = ['<p class="ar-crumb"><a href="/fl/">Florida</a> › %s County</p>' % e_(c),
                '<section class="ph"><h1>Vendor events in %s County, Florida</h1>%s</section>' % (e_(c), summary(s, c + " County", asof)), kpis(s)]
        if len(towns) > 1:
            body.append('<p class="ar-h">Towns</p><ul class="ar-c">' + "".join('<li><a href="/fl/%s.html#t-%s">%s<small>%d</small></a></li>' % (slug(c), re.sub(r"[^a-z0-9]+", "-", t.lower()), e_(t), n) for t, n in sorted(towns.items(), key=lambda x: -x[1])) + "</ul>")
        cur = None; seen_t = set()
        for v in L:
            m = d(v["next_date"]).strftime("%Y-%m")
            if m != cur:
                if cur: body.append("</ul>")
                cur = m; body.append('<h2 class="ar-h">%s %d</h2><ul class="ar-list">' % (MONTH[d(v["next_date"]).month - 1], d(v["next_date"]).year))
            r = row(v, today)
            t = v.get("city")
            if t and t not in seen_t and len(towns) > 1:
                seen_t.add(t); r = r.replace('<li class="ar-row">', '<li class="ar-row" id="t-%s">' % re.sub(r"[^a-z0-9]+", "-", t.lower()), 1)
            body.append(r)
        body.append("</ul>")
        body.append('<div class="ar-pro"><b>Event names, venues, organizers and apply links</b> are in <a href="/pro.html">Vendor Pro</a>. '
                    'Free accounts can save events and get the weekly email. Always confirm dates and fees with the organizer before you pay.</div>')
        near = sorted((x for x in by_c if x != c and reg_of.get(x) and reg_of.get(x) == reg_of.get(c)), key=lambda x: -len(by_c[x]))
        if near:
            body.append('<p class="ar-h">More in %s</p><ul class="ar-c">' % e_(REGION_NAME.get(reg_of[c], reg_of[c])) +
                        "".join('<li><a href="/fl/%s.html">%s County<small>%d</small></a></li>' % (slug(x), e_(x), len(by_c[x])) for x in near) + "</ul>")
        body.append('<p class="ar-crumb"><a href="/#map">See them on the map</a> · <a href="/guides.html">%s County vendor registration guide</a> · <a href="/fl/">All Florida counties</a></p>' % e_(c))
        faq = [("How do I find vendor events in %s County?" % c, "Jax Vendor Events lists %d upcoming vendor markets, craft fairs, pop-ups and festivals in %s County, soonest first, with the booth fee and application deadline where the organizer posted them." % (s["n"], c)),
               ("What does a booth cost in %s County?" % c, ("Where a fee is posted, the typical booth fee is about %s; %d listings are free to vend." % (money(s["median"]), s["free"])) if s["median"] is not None else "Fees vary by event; each listing shows the fee when the organizer posts one.")]
        ld = [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
                  {"@type": "ListItem", "position": 1, "name": "Florida", "item": SITE + "fl/"},
                  {"@type": "ListItem", "position": 2, "name": c + " County", "item": SITE + "fl/" + slug(c) + ".html"}]},
              {"@context": "https://schema.org", "@type": "ItemList", "name": "Vendor events in %s County, FL" % c, "numberOfItems": len(L),
               "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": event_ld(v)} for i, v in enumerate(L[:50])]},
              {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}]
        title = "Vendor events in %s County, FL (%d upcoming) | Jax Vendor Events" % (c, s["n"])
        desc = "%d upcoming vendor markets, craft fairs, pop-ups and festivals in %s County, Florida, with booth fees and application deadlines." % (s["n"], c)
        out["fl/%s.html" % slug(c)] = page(S, "fl/%s.html" % slug(c), title, desc, "\n".join(body), ld)
    # index
    s = stats(evs, today)
    body = ['<section class="ph"><h1>Vendor events by Florida county</h1>%s</section>' % summary(s, "Florida", asof), kpis(s)]
    regs = {}
    for c in by_c:
        regs.setdefault(reg_of.get(c) or "Other", []).append(c)
    for r in REGION_ORDER + sorted(k for k in regs if k not in REGION_ORDER):
        if r not in regs: continue
        cs = sorted(regs[r])
        body.append('<h2 class="ar-h">%s</h2><ul class="ar-c">' % e_(REGION_NAME.get(r, r)) +
                    "".join('<li><a href="/fl/%s.html">%s County<small>%d</small></a></li>' % (slug(c), e_(c), len(by_c[c])) for c in cs) + "</ul>")
    body.append('<p class="ar-crumb"><a href="/#events">All events</a> · <a href="/#map">Event map</a> · <a href="/guides.html">Vendor registration guide, all 67 counties</a></p>')
    ld = [{"@context": "https://schema.org", "@type": "ItemList", "name": "Vendor events by Florida county",
           "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": SITE + "fl/" + slug(c) + ".html", "name": c + " County"} for i, c in enumerate(sorted(by_c))]}]
    out["fl/index.html"] = page(S, "fl/", "Vendor events by Florida county (%d upcoming) | Jax Vendor Events" % s["n"],
                                "Upcoming vendor markets, craft fairs, pop-ups and festivals in %d Florida counties, with booth fees and deadlines." % len(by_c), "\n".join(body), ld)
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          "  <url><loc>%sfl/</loc><lastmod>%s</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>" % (SITE, today)]
    for c in sorted(by_c):
        sm.append("  <url><loc>%sfl/%s.html</loc><lastmod>%s</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>" % (SITE, slug(c), today))
    sm.append("</urlset>")
    out["sitemap-areas.xml"] = "\n".join(sm) + "\n"
    # about.html: keep its numbers true (they said 192 listings / 7 counties until Nov 9 2026). Only the marked block changes.
    ab = open(os.path.join(ROOT, "about.html"), encoding="utf-8").read()
    if "<!--kpis-->" in ab and "<!--/kpis-->" in ab:
        k = ('<!--kpis--><div class="kpis"><div class="kpi"><b>%d</b><span>upcoming markets listed</span></div>'
             '<div class="kpi"><b>%d</b><span>checked on the organizer\'s page</span></div><div class="kpi"><b>67</b><span>Florida counties covered</span></div>'
             '<div class="kpi"><b>Weekly</b><span>checked and updated</span></div></div><!--/kpis-->') % (len(evs), sum(1 for v in evs if v.get("verified")))
        out["about.html"] = ab[:ab.index("<!--kpis-->")] + k + ab[ab.index("<!--/kpis-->") + len("<!--/kpis-->"):]
    return out


def main(argv):
    out_dir = argv[argv.index("--out") + 1] if "--out" in argv else ROOT
    try:
        from zoneinfo import ZoneInfo
        today = dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()
    except Exception:
        today = (dt.datetime.utcnow() - dt.timedelta(hours=5)).date().isoformat()
    try:
        feed = json.load(open(os.path.join(ROOT, "api", "events.json"), encoding="utf-8"))
        files = build(feed, today)
    except Exception as ex:
        print("area pages FAILED:", ex); return 1
    changed = []
    for p, t in files.items():
        fp = os.path.join(out_dir, p); os.makedirs(os.path.dirname(fp), exist_ok=True)
        old = open(fp, encoding="utf-8").read() if os.path.exists(fp) else None
        if old != t:
            open(fp, "w", encoding="utf-8").write(t); changed.append(p)
    fl = os.path.join(out_dir, "fl")
    for f in os.listdir(fl):
        if f.endswith(".html") and "fl/" + f not in files:
            os.remove(os.path.join(fl, f)); changed.append("-fl/" + f)
    print("area pages:", sum(1 for p in files if p.startswith("fl/")), "pages;", "changed:", ", ".join(changed) if changed else "none")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
