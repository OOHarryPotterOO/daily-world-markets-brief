# Daily World & Markets Brief — autonomous edition

Live URL: https://daily-world-markets-brief.vercel.app/

## Architecture (implemented in code)
- Native **Vercel Cron** calls `GET /api/cron` at 23:00 UTC (= 07:00 Asia/Shanghai) daily, weekends included.
- Server independently retrieves publicly available RSS from BBC, The Guardian, CNBC, SCMP and China Daily. Feed availability can change.
- AI is called server-side for selection, conservative summaries, causal banking/interview implications, and deduplication against the previous two database editions.
- News must have a source feed publication timestamp, genuine publisher URL, and be no more than 72 hours old; prefer 24 hours. No AI images, made-up prices, or URLs.
- A persistence layer is **Upstash Redis REST**, not GitHub. Vercel functions store each edition then update the latest-edition pointer.
- Frontend uses `GET /api/index` and `GET /api/edition?date=YYYY-MM-DD`. It can still display the static October 2 archived report when database is not configured.
- `GET /api/health` returns HTTP 200 only when today's China-date edition exists; otherwise 503.
- Vercel automatically deploys **code** changes from GitHub, not each edition.

## REQUIRED configuration — not yet set

In Vercel → project → Storage, create/connect an Upstash Redis database that provides REST credentials, then ensure these Production environment variables are present:

| Name | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` | database HTTPS REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST auth token |
| `OPENAI_API_KEY` | model inference; separately billed, not included in ChatGPT Plus |
| `OPENAI_MODEL` | chat-completions-compatible model ID from the provider's current catalog |
| `CRON_SECRET` | randomly generated long secret; prevents public cron invocation |

Keep these **only in Vercel environment variables**, never commit secrets to GitHub. Redeploy production after configuring variables.

## Operational status
- ✅ Code and routes checked into GitHub.
- ⚠️ Vercel project's connected tool access still reports unauthorized for direct deployment inspection.
- ⚠️ Environment secrets/storage have not been provisioned.
- ⚠️ Native cron has not been end-to-end tested; publishing is NOT yet confirmed fully autonomous.
- ✅ The old static archive continues to be available when connected and deployed.

## Verification after secrets are configured
1. Production deployment should be Ready; framework **Other**, project root `/`.
2. Call `/api/health` (before first run expect 503).
3. Trigger the cron manually only using `Authorization: Bearer <CRON_SECRET>` from a trusted environment. Never paste secrets into chats or URLs.
4. Inspect logs for `status: published`; verify `/api/index`, `/api/edition?date=...` and homepage.
5. Observe tomorrow's 07:00 Beijing automated run and check real-site publication before turning off the ChatGPT/Gmail fallbacks.

### Limits
RSS descriptions are not licensed full-article text. Automated summaries can only be as substantive as the accessible source text; they cannot ethically infer undisclosed figures or quotations. The system deliberately leaves slots blank when evidence is weak. The Vercel Hobby cron execution may not start exactly at the minute scheduled; it is not a hard real-time delivery guarantee.
