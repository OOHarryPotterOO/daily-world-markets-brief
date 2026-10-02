# Daily World & Markets Brief

A mobile-friendly, static dashboard for dated, source-linked world and finance news.

## Current status

The website shell is published to GitHub. **No news edition is live yet.** The index is intentionally empty to avoid presenting fabricated or stale news. Daily automated publication is **not yet configured**.

## Data model

`data/index.json`: `{ "latest": "2026-10-02", "dates": ["2026-10-02"] }`

`data/YYYY-MM-DD.json`: `{ "date":"2 October 2026", "cutoff":"07:00, 2 October 2026", "note":"...", "sections":{"world":[],"global":[],"mainland":[],"hongkong":[]}, "takeaways":{"Global Macro":"...","Mainland China":"...","Hong Kong":"..."}}`

Every story has `headline`, `source`, `published`, `summary`, `implication`, `url` and optionally `label`, `images` (`url`, `alt`, `credit`, `verified`). Do not label unverified images verified; do not reuse old news as fresh. Check the previous two briefs and article dates before publishing.

## Deployment

Import this GitHub repository to Vercel as an **Other** static site, no build command. Each commit to `main` redeploys the site. Automating content publication requires a separately authorized scheduled process with GitHub write access and source verification; a GitHub/Vercel connection by itself does not supply that process.
