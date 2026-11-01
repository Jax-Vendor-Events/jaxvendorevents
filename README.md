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
- Nothing is charged on the site; paid placements are confirmed by email with a payment link.

## Pages added Nov 1, 2026

- `pricing.html` (advertise, draft prices), `sponsor.html` (media kit), `about.html`, `terms.html` (Terms + Privacy), `newsletter-2.html` (Issue #2 draft).
- Internal only (remove before launch): `plan.html` (business plan), `outreach.html` (outreach drafts), `newsletter-2.html` until it is sent.

## Go-public checklist (only after Luis says so)

1. Point the domain at GitHub Pages (CNAME file + DNS), enforce HTTPS.
2. Delete `plan.html` and `outreach.html`; remove the gate script (`gate.js` + `class="locked"` on `<html>`) and every `<meta name="robots" content="noindex…">`.
3. Copy `robots-launch.txt` over `robots.txt`; replace the base URL in `sitemap.xml` with the real domain.
4. Wire the signup forms to the newsletter tool; bump the cache key in `sw.js`.

Note: the password gate is client-side and this repository is public, so page source (including `plan.html`) is readable on GitHub by anyone who looks for it. Make the repo private (needs a paid GitHub plan for Pages) or keep internal pages out of it if that matters.
