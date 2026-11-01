# Jax Vendor Events (private draft)

Static directory of vendor markets in Northeast Florida. Data in `data/events.json` (mirrored to `data/events.js` for the page). Draft only: noindex, robots Disallow, password gate. Not public yet.


Fonts: Fraunces and Inter (SIL Open Font License), self-hosted in fonts/.

## Vendor + organizer profiles (moderated)

- `join.html` is the "Create your profile" form (vendor or organizer). It posts a normal multipart form to FormSubmit, which emails it to `porchlight+jax@mail.tab.bot` with the subject **JVE profile: vendor** or **JVE profile: organizer**. The logo file arrives as an email attachment (FormSubmit only carries files on the normal POST, not its AJAX endpoint). Preferences are also saved on the visitor's device (`jve_prefs`) and drive **My matches** on the events page.
- Nothing is public until it is added to `data/profiles.json`. To approve a submission, copy the email's `profile_json` value into a file and run:

  ```
  python3 tools/add_profile.py --json-file submission.json --logo path/to/attached-logo.png
  # optional: --featured-until 2026-11-08   ($10/week featured vendor spotlight)
  # take one down: python3 tools/add_profile.py --remove <id>
  ```

  It validates the entry (links, no phone numbers or street addresses in public text, private email stays private unless they ticked "show"), copies the logo to `profiles/logos/`, rewrites `data/profiles.json` + `data/profiles.js`, and removes the two sample profiles the first time. Then commit those files and push.
- `profiles.html` is the directory (vendors / organizers, search, category, featured slot) and `profile.html?id=…` a single profile.

## Forms (FormSubmit, all to porchlight+jax@mail.tab.bot)

- `list.html` "List your event" → subject **New event listing: Jax Vendor Events** (AJAX via `forms.js`).
- `pricing.html#get-featured` "Get featured" → subject **Get featured request: Jax Vendor Events**.
- Newsletter signup (newsletter page + every footer) → **New signup: Jax Vendor Events weekly email** (`signup.js`). At launch these move to the newsletter tool.
- Paid placements: buy buttons open the Stripe Payment Link in `data/checkout.json` when one is set, otherwise the "Book your spot" request form (see "Checkout and buy buttons").

## Pages added Nov 1, 2026

- `pricing.html` (advertise, draft prices), `sponsor.html` (media kit), `about.html`, `terms.html` (Terms + Privacy), `newsletter-2.html` (Issue #2 draft).
- Internal only (remove before launch): `plan.html` (business plan), `outreach.html` (outreach drafts), `newsletter-2.html` until it is sent.

## Checkout and buy buttons (added Nov 1, 2026)

- Every paid tier has one big button (`data-buy="<tier id>"`) on `pricing.html`, `sponsor.html`, `list.html` (upgrade card + after-submit upsell), the event sheet ("Run this market? Get it featured") and the vendor directory. `checkout.js` wires them all.
- **Prices/links live in `data/checkout.json`**, one line per tier:

  | tier id | what | price |
  |---|---|---|
  | `featured-event` | Featured event | $20/week |
  | `deadline-spotlight` | Deadline spotlight | $10 |
  | `organizer-plus` | Organizer Plus | $29/month |
  | `newsletter-sponsor` | Newsletter sponsor | $35/issue |
  | `directory-sponsor` | Directory sponsor | $75/month |
  | `featured-vendor` | Featured vendor | $10/week |
  | `vendor-pro` | Vendor Pro | $5/month |

- **To switch on card checkout for a tier:** paste its Stripe Payment Link (must start with `https://`) as the value, e.g. `"featured-event": "https://buy.stripe.com/..."`, and commit. Nothing else changes; the file is read fresh on every page load (the service worker never caches it). In Stripe, set each Payment Link's *After payment → Redirect* to `https://cresl1.github.io/jax-vendor-events/thanks.html?tier=<tier id>` (the real domain after launch).
- **Live since Nov 1, 2026 (commit 874189b):** all 7 tiers carry real Stripe Payment Links. The launch offer (pricing) and founding-sponsor offer (media kit) always open the request form, because they need a reply before anyone pays; so does “Ask us” (tier `not-sure`).
- **Empty value = request form.** The button opens "Book your spot" on `pricing.html#get-featured` with that tier picked (hidden field `tier`, subject `Get featured request: Jax Vendor Events (<tier>)`, same auto-reply). So no button is ever dead, with or without Stripe.
- `thanks.html?tier=<id>` confirms payment, says what happens next for that tier (live within 24 h, we email when it is up) and has a short details form (subject `Paid placement details: Jax Vendor Events (<tier>)`, auto-reply on). Like every page it is behind the gate until launch, so a real customer can only reach it after go-public.
- `pricing.html` shows one audience at a time (Organizer / Business / Vendor switch; `#organizers`, `#businesses`, `#vendors` open each one; `?tier=<id>` opens the form).
- Service worker cache key `jve-rv1`.

## Go-public checklist (only after Luis says so)

1. Point the domain at GitHub Pages (CNAME file + DNS), enforce HTTPS.
2. Delete `plan.html` and `outreach.html`; remove the gate script (`gate.js` + `class="locked"` on `<html>`) and every `<meta name="robots" content="noindex…">`.
3. Copy `robots-launch.txt` over `robots.txt`; replace the base URL in `sitemap.xml` with the real domain.
4. Wire the signup forms to the newsletter tool; bump the cache key in `sw.js`.

Note: the password gate is client-side and this repository is public, so page source (including `plan.html`) is readable on GitHub by anyone who looks for it. Make the repo private (needs a paid GitHub plan for Pages) or keep internal pages out of it if that matters.

## Hourly auto-refresh (added Nov 1, 2026)

- `.github/workflows/hourly-refresh.yml` runs `scripts/refresh.py` at 7 minutes past every hour (and on demand from the Actions tab → "Hourly refresh" → Run workflow). It costs nothing: public repos get free Actions minutes.
- The script (Python stdlib only, New York time) drops past dates, hides one-off listings whose last date has passed (`verify_status: "past"`, kept in the data), rolls weekly / "Nth weekday" markets forward ~10 weeks, dedupes by id, recomputes `stats`, stamps `checked_at` every run and `updated_at` when listings change, rewrites `data/events.json` + `data/events.js` and validates both. It commits only when the files changed; a push that races another commit is rebuilt on the latest copy.
- The home page badge reads "Updated X min ago" from `checked_at`.
- It does not discover new events or re-check organizer pages; that stays with the weekly data check.
- GitHub pauses scheduled workflows in a repo with no activity for 60 days; the hourly commits count as activity.

## Navigation redesign (Nov 1, 2026)

- Five destinations on every page: **Events · Deadlines · Saved · Newsletter · More** (bottom bar on phones, top bar on desktop). Events, Deadlines and Saved are views of `index.html` (`#deadlines`, `#saved`) that switch without a reload; the back button closes the event sheet and steps back through views (`#e=<id>` opens an event).
- Events home: sticky search + one row of chips (This weekend / Next weekend on Sundays, Next 2 weeks, Free, County, Category, Deadlines soon; "My matches" appears only when profile preferences exist) and a Sort menu (Soonest, Deadline, Free first, Near me by device location).
- No settings page: the old Settings sheet (5 color themes, dark-mode switch, home county) is gone. Appearance is the sun/moon button in the header (dark by default, remembered as `jve_look`). Everything for organizers/advertisers/about lives in the **More** sheet built by `theme.js`.
- Styles for this layer are in `ui.css` (loaded after `styles.css`; charcoal dark palette `#12141a` / cards `#1e222a`, teal accent).
- The newsletter "Send test to me" panel is internal: it only shows after opening any page once with `?admin=1`.
- Data files, `scripts/refresh.py`, `scripts/find_new.py` and the workflows are unchanged. Service worker cache key `jve-nx1`.
