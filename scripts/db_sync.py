#!/usr/bin/env python3
"""db_sync.py: move the listings between the member database (Supabase) and this checkout.

The events, finder memory, vendor profiles and paid placements are no longer committed to this
public repo. GitHub Actions pull them into data/ (git-ignored), run the usual scripts, and push the
result back. Needs SUPABASE_URL and SUPABASE_SERVICE_KEY (GitHub Actions secrets; never printed).

  python3 scripts/db_sync.py pull events finder_seen    # -> data/events.json, data/finder_seen.json
  python3 scripts/db_sync.py push events finder_seen    # only what changed; exit 3 = someone else wrote first
Pushes are guarded by the version pulled (optimistic lock), so a run never overwrites an edit made
meanwhile (an admin approval, Tab's daily check): the workflow simply pulls again and redoes its run.
"""
import json, os, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
STATE = os.path.join(DATA, ".db_versions.json")
KEYS = {"events", "finder_seen", "profiles", "paid"}


def _req(method, path, body=None, prefer="return=representation"):
    url, key = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_KEY"]
    req = urllib.request.Request(url + "/rest/v1/" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"apikey": key, "Authorization": "Bearer " + key,
                                          "Content-Type": "application/json", "Prefer": prefer})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, None


def pull(keys):
    vers = {}
    for k in keys:
        st, rows = _req("GET", "site_data?select=doc,version&key=eq." + k)
        if st != 200 or not rows:
            print(f"pull {k}: failed ({st})"); sys.exit(1)
        with open(os.path.join(DATA, k + ".json"), "w", encoding="utf-8") as f:
            json.dump(rows[0]["doc"], f, ensure_ascii=False, indent=1)
        vers[k] = rows[0]["version"]
        print(f"pull {k}: version {rows[0]['version']}")
    with open(STATE, "w") as f:
        json.dump(vers, f)


def push(keys):
    vers = json.load(open(STATE))
    for k in keys:
        with open(os.path.join(DATA, k + ".json"), encoding="utf-8") as f:
            doc = json.load(f)
        st, rows = _req("GET", "site_data?select=doc,version&key=eq." + k)
        if st != 200 or not rows:
            print(f"push {k}: read failed ({st})"); sys.exit(1)
        if rows[0]["version"] != vers[k]:
            print(f"push {k}: changed meanwhile (v{vers[k]} -> v{rows[0]['version']}); redo"); sys.exit(3)
        if rows[0]["doc"] == doc:
            print(f"push {k}: no change"); continue
        st, out = _req("PATCH", f"site_data?key=eq.{k}&version=eq.{vers[k]}",
                       {"doc": doc, "version": vers[k] + 1, "updated_by": "github-actions"})
        if st != 200:
            print(f"push {k}: failed ({st})"); sys.exit(1)
        if not out:
            print(f"push {k}: changed meanwhile; redo"); sys.exit(3)
        print(f"push {k}: version {vers[k] + 1}")


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("pull", "push") or not set(sys.argv[2:]) <= KEYS:
        print(__doc__); sys.exit(2)
    (pull if sys.argv[1] == "pull" else push)(sys.argv[2:])
