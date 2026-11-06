# Jax Vendor Events for AI agents

Jax Vendor Events (https://jaxvendorevents.com/) lists vendor markets, craft fairs, pop-ups and festival vendor spots across Florida. This file tells assistants, agents and crawlers what they can read, how to link people, and what stays behind the paywall.

## What you can read (public, read-only, no key, CORS-friendly static files)

| Feed | URL | Format |
|---|---|---|
| Events | https://jaxvendorevents.com/api/events.json | JSON, schema at /api/events.schema.json |
| API description | https://jaxvendorevents.com/api/openapi.json | OpenAPI 3.1 |
| Calendar | https://jaxvendorevents.com/feeds/events.ics | iCalendar (all-day events) |
| RSS | https://jaxvendorevents.com/feeds/events.rss | RSS 2.0 |
| Sitemap | https://jaxvendorevents.com/sitemap.xml | XML |

Pages also carry schema.org `Event` JSON-LD built from the same teaser data.

Each event in `events.json` has: `id`, `title` (the public teaser title, e.g. "Craft & art market · St. Augustine"), `next_date`, `dates`, `end_date`, `recurring`, `schedule`, `city`, `county`, `region`, `state`, `category`, `booth_fee`, `booth_fee_range`, `application_deadline`, `verified`, `url`, `details_locked`.

The feeds refresh several times a day. Treat `data_updated` as the listings' last change and `as_of` as the day the feed was built (America/New_York).

## What is NOT public

Venue names, street addresses, organizer names, emails and phone numbers, and apply links are for Vendor Pro members. They are not in any feed and are stripped on the server before a logged-out page sees them. Please don't try to get them by scraping, signing up automatically, or sharing a member's login.

## How to help a person

1. Answer from the feed: what's coming up, where (town/county), when, rough booth fee, deadline.
2. Link the event's `url` so they can see it on the site.
3. If they want the venue, organizer or to apply: send them to https://jaxvendorevents.com/pro.html (Vendor Pro). Don't buy it for them without their go-ahead.
4. Organizers: https://jaxvendorevents.com/list.html to add an event; Account → Payments lets them take booth fees by PayPal, Venmo, Cash App, Zelle or their own Stripe/Square/PayPal link. The money goes straight to the organizer; Jax Vendor Events takes no cut and never holds it.
5. Always say: confirm dates and fees with the organizer before paying or driving out.

## Rules

- Read-only. No automated account creation, applications, payments or form posts.
- Be gentle: the static files are cached; fetching them a few times an hour is plenty.
- Attribute "Jax Vendor Events" and link back.
- Terms: https://jaxvendorevents.com/terms.html · Privacy: https://jaxvendorevents.com/privacy.html · Contact: admin@jaxvendorevents.com
