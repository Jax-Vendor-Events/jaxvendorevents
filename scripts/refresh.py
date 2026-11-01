#!/usr/bin/env python3
"""Hourly refresh for Jax Vendor Events (no dependencies, Python 3.8+).

Runs on GitHub Actions every hour (.github/workflows/hourly-refresh.yml) and can be
run by hand:  python3 scripts/refresh.py [--today YYYY-MM-DD] [--dry-run]

What it does, in America/New_York time:
  * drops past dates from listings that still have future dates;
  * marks one-off listings whose last date has passed as verify_status "past"
    (kept in the data, hidden on the site);
  * rolls recurring markets with a stated weekly / "Nth weekday" schedule forward
    so they always show about 10 weeks of upcoming dates (only after the last
    date already listed, so a week removed by a data check is never re-added);
  * dedupes listings by id;
  * recomputes the summary (upcoming, verified, deadlines in 30 days, hidden);
  * stamps checked_at every run, and updated / updated_at only when the listings
    themselves changed;
  * writes data/events.json and its mirror data/events.js, then re-reads both to
    validate them.  Running it twice in a row changes nothing but checked_at.
"""
import datetime as dt
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT, "data", "events.json")
JS_PATH = os.path.join(ROOT, "data", "events.js")
HIDDEN = {"past", "cancelled", "removed"}
HORIZON_DAYS = 70          # keep ~10 weeks of projected dates
WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


# ---------- time in New York (zoneinfo when present, US DST rule otherwise) ----------
def ny_now(utc_now=None):
    utc_now = utc_now or dt.datetime.now(dt.timezone.utc)
    try:
        from zoneinfo import ZoneInfo
        return utc_now.astimezone(ZoneInfo("America/New_York"))
    except Exception:
        y = utc_now.year
        def nth_sunday(month, n):
            d = dt.date(y, month, 1)
            d += dt.timedelta(days=(6 - d.weekday()) % 7)
            return d + dt.timedelta(weeks=n - 1)
        start = dt.datetime.combine(nth_sunday(3, 2), dt.time(7), dt.timezone.utc)   # 2 AM EST
        end = dt.datetime.combine(nth_sunday(11, 1), dt.time(6), dt.timezone.utc)    # 2 AM EDT
        off = -4 if start <= utc_now < end else -5
        return utc_now.astimezone(dt.timezone(dt.timedelta(hours=off)))


def d_(s):
    return dt.date.fromisoformat(s)


# ---------- recurring schedule parsing ----------
def parse_schedule(text):
    """Return (weekday 0-6, nths set or None for weekly, allowed months set) or None."""
    if not text:
        return None
    t = text.lower()
    if re.search(r"season ends|dates on organizer|confirm which|multiple dates|one-off|most ", t):
        return None
    days = {i for i, w in enumerate(WEEKDAYS) if re.search(r"\b" + w + r"s?\b", t)}
    if len(days) != 1:
        return None
    wd = days.pop()
    nths = {int(n) for n in re.findall(r"\b([1-5])(?:st|nd|rd|th)\b", t)}
    if not nths and not re.search(r"weekly|every|" + WEEKDAYS[wd] + "s", t):
        return None
    months = set(range(1, 13))
    m = re.search(r"except ([a-z &,]+)", t)
    if m:
        for i, mo in enumerate(MONTHS):
            if mo in m.group(1):
                months.discard(i + 1)
    m = re.search(r"\(([a-z]{3})[a-z]*\.?\s*[\u2013\-]\s*([a-z]{3})[a-z]*\.?\)", t)
    if m and m.group(1) in MONTHS and m.group(2) in MONTHS:
        a, b = MONTHS.index(m.group(1)) + 1, MONTHS.index(m.group(2)) + 1
        months = {x for x in range(1, 13) if (a <= x <= b if a <= b else (x >= a or x <= b))}
    return wd, (nths or None), months


def fits(day, rule):
    wd, nths, months = rule
    if day.weekday() != wd or day.month not in months:
        return False
    return nths is None or ((day.day - 1) // 7 + 1) in nths


def roll_forward(dates, rule, today, horizon):
    start = max([today] + [d_(x) + dt.timedelta(days=1) for x in dates])
    out, day = [], start
    while day <= horizon:
        if fits(day, rule):
            out.append(day.isoformat())
        day += dt.timedelta(days=1)
    if not out and not [x for x in dates if x >= today.isoformat()]:
        # off-season (e.g. "Sept-June"): list the first date of the next season
        while day <= today + dt.timedelta(days=400):
            if fits(day, rule):
                return [day.isoformat()]
            day += dt.timedelta(days=1)
    return out


# ---------- the refresh ----------
def refresh(data, today, now_iso):
    log = []
    events = data.get("events") or []
    seen, deduped = {}, []
    for e in events:                       # dedupe by id: first wins, later fills gaps
        i = e.get("id")
        if i in seen:
            first = seen[i]
            for k, v in e.items():
                if first.get(k) in (None, "", []) and v not in (None, "", []):
                    first[k] = v
            log.append("dedupe " + str(i))
            continue
        seen[i] = e
        deduped.append(e)
    events = deduped
    t_iso, horizon = today.isoformat(), today + dt.timedelta(days=HORIZON_DAYS)

    for e in events:
        if e.get("verify_status") in HIDDEN:
            continue
        dates = sorted(set(x for x in (e.get("dates") or []) if isinstance(x, str) and re.match(r"^\d{4}-\d{2}-\d{2}$", x)))
        end = e.get("end_date")
        if end and end >= t_iso:            # multi-day event still running
            if dates != (e.get("dates") or []):
                e["dates"] = dates
            continue
        fut = [x for x in dates if x >= t_iso]
        rule = parse_schedule(e.get("schedule")) if e.get("recurring") and e.get("projected") else None
        if rule:
            ok = [x for x in fut if fits(d_(x), rule)]
            if fut and len(ok) < 0.8 * len(fut):
                rule = None                 # listed dates don't follow the text; leave them alone
        if rule:
            add = roll_forward(fut, rule, today, horizon)
            if add:
                log.append("roll %s +%d" % (e.get("id"), len(add)))
            fut = sorted(set(fut + add))
        if fut:
            if fut != (e.get("dates") or []):
                if len(dates) > len([x for x in dates if x >= t_iso]):
                    log.append("drop past dates " + str(e.get("id")))
                e["dates"] = fut
        elif dates:                          # every listed date has passed
            e["verify_status"] = "past"
            e["past_on"] = t_iso
            log.append("past " + str(e.get("id")))

    data["events"] = events
    return log


def summary(data, today):
    t_iso = today.isoformat()
    up = []
    for e in data["events"]:
        if e.get("verify_status") in HIDDEN:
            continue
        ds = [x for x in (e.get("dates") or []) if x >= t_iso or (e.get("end_date") and e["end_date"] >= t_iso)]
        if ds or (not e.get("dates") and e.get("schedule")):
            up.append(e)
    dl = [e for e in up if e.get("deadline") and t_iso <= e["deadline"] and (d_(e["deadline"]) - today).days <= 30]
    return {
        "upcoming": len(up),
        "verified": sum(1 for e in up if e.get("verified")),
        "deadlines_30d": len(dl),
        "hidden": len(data["events"]) - len(up),
        "total_listings": len(data["events"]),
    }


def dump_json(data):
    return json.dumps(data, indent=1, ensure_ascii=False)


def dump_js(data):
    return "window.JVE_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"


def main(argv):
    dry = "--dry-run" in argv
    now = ny_now()
    today = now.date()
    if "--today" in argv:
        today = d_(argv[argv.index("--today") + 1])
    now_iso = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict) or not isinstance(data.get("events"), list) or not data["events"]:
        sys.exit("events.json has no events list; refusing to write")
    before = json.loads(json.dumps(data))

    log = refresh(data, today, now_iso)
    data["stats"] = summary(data, today)

    def core(x):
        return {k: v for k, v in x.items() if k not in ("checked_at", "updated_at", "updated", "window", "stats")}

    changed = core(before) != core(data) or before.get("stats") != data["stats"]
    if changed or not data.get("updated_at"):
        data["updated_at"] = now_iso
        if (data.get("updated") or "") < today.isoformat():
            data["updated"] = today.isoformat()
    data["window"] = "Upcoming from " + today.strftime("%b ") + str(today.day) + today.strftime(", %Y")
    data["checked_at"] = now_iso
    data["auto_refresh"] = "Hourly on GitHub Actions (scripts/refresh.py)"

    out_json, out_js = dump_json(data), dump_js(data)
    # validate before writing
    assert json.loads(out_json)["events"], "empty after refresh"
    ids = [e.get("id") for e in data["events"]]
    assert len(ids) == len(set(ids)), "duplicate ids"
    assert json.loads(out_js[len("window.JVE_DATA="):-2]) == json.loads(out_json)

    print("today (New York):", today.isoformat(), "| changed:", changed, "| stats:", json.dumps(data["stats"]))
    for line in log:
        print(" -", line)
    if dry:
        return 0
    for path, text in ((JSON_PATH, out_json), (JS_PATH, out_js)):
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp, path)
    with open(JSON_PATH, encoding="utf-8") as f:
        json.load(f)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
