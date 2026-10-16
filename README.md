# LeadFlow

A single-screen CRM for sales reps: track leads, log every discussion, and never miss a follow-up. Opening a lead shows its timeline in a dialog, without leaving the dashboard.

![Dashboard](docs/screenshots/01-dashboard.png)

More screenshots: [timeline](docs/screenshots/03-lead-timeline.png) · [status update](docs/screenshots/04-status-update.png) · [add discussion + follow-up](docs/screenshots/06-discussion-with-follow-up.png) · [list updates immediately](docs/screenshots/07-list-updated.png) · [add lead](docs/screenshots/05-add-lead.png) · [search + filter](docs/screenshots/02-search-and-filter.png) · [validation](docs/screenshots/08-validation.png) · [mobile](docs/screenshots/09-mobile.png)

## Features

- **Lead list** showing name, status, last note, and time since the last discussion. **Today's follow-ups are pinned** at the top, and **overdue follow-ups are shown in red**.
- **Search** by name or company, and **filter** by any status.
- **Timeline dialog** with discussion history (newest first), a status dropdown, "Mark done" for the current follow-up, and a form to log a note with an optional follow-up date and time.
- **Add Lead** form: name is required; company and phone are optional; status defaults to New.
- **The list updates immediately** after every change, with toast feedback.
- **Responsive**: a table on desktop and cards on mobile. Includes loading, empty, and error states.

## Tech stack

Next.js 16 (App Router + Route Handlers), React 19, TypeScript · Prisma 7 + PostgreSQL (**Supabase**) · Tailwind CSS v4 + shadcn/ui · Zod · date-fns · Vitest · Docker Compose

## Setup

**Requirements:** Node.js 20.19+, a Supabase project (the free tier is enough), and Docker (for the test database).

1. **Configure** the environment file:
   ```bash
   cp .env.example .env
   ```
   In Supabase, open your project and click **Connect → ORMs → Prisma**. Copy `DATABASE_URL` and `DIRECT_URL` into `.env`, then replace `[YOUR-PASSWORD]` with your database password (**Database → Settings** if you need to reset it).

2. **Install, migrate, seed and run:**
   ```bash
   npm install          # also generates the Prisma client
   npm run db:deploy    # apply migrations
   npm run db:seed      # 9 sample leads (safe to rerun)
   npm run dev          # http://localhost:3000
   ```

**Without Supabase:** run `docker compose up -d db`, then set both URLs to `postgresql://leadflow:<password>@localhost:5432/leadflow?schema=public`.

**Production build:** `npm run build && npm start`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | App connection. On Supabase, the transaction pooler (port 6543, `?pgbouncer=true`). |
| `DIRECT_URL` | Used by Prisma for migrations and seeding. On Supabase, the session pooler (port 5432). |
| `TEST_DATABASE_URL` | Local database used by the tests. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | Settings for the local Docker Postgres (tests and offline use). |
| `APP_PORT` | Host port for the Docker app (default 3000). |

## Tests

```bash
docker compose up -d db   # local Postgres for tests
npm test                  # 44 unit + API tests
npm run lint
npm run typecheck
```

The tests run against a separate local database and refuse to run against Supabase, because they delete data. They cover:

- validation, status codes, and discussion ordering;
- transactional follow-up updates and status persistence;
- today, overdue, and upcoming classification, checked across timezones.

## Docker

```bash
docker compose --profile app up -d --build                        # run migrations, then start the app
docker compose --profile app run --rm migrate npx prisma db seed  # optional sample data
docker compose --profile app down
```

The app connects to the database in `.env`. It starts only after migrations succeed.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/leads?status=&q=` | List leads with their latest discussion. Supports a status filter and name/company search. |
| POST | `/api/leads` | Create a lead → `201` |
| GET | `/api/leads/:id` | Get a lead with its discussions (newest first) |
| PATCH | `/api/leads/:id` | Update `status`, contact details, or `nextFollowUpAt` (`null` clears it) |
| GET | `/api/leads/:id/discussions` | Get a lead's discussion history |
| POST | `/api/leads/:id/discussions` | Add a note, with an optional `followUpAt` → `201` |
| GET | `/api/stats?dayStart=&dayEnd=` | Dashboard counts, using the viewer's local day |

```bash
curl -X POST http://localhost:3000/api/leads -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","company":"Analytical Engines"}'
```

Errors use one JSON shape: `{ "error": { "code", "message", "fieldErrors?" } }`.

| Status | When |
| --- | --- |
| `400` | Invalid input, malformed JSON, or invalid ID |
| `404` | Lead not found |
| `409` | Duplicate phone number |
| `500` | Unexpected error (details are logged, never exposed) |

## Project structure

```
prisma/              schema, migrations, seed
src/app/api/         route handlers (thin: validate input, then call the service)
src/lib/server/      Prisma client, lead service, error handling
src/lib/leads/       shared logic: statuses, Zod schemas, follow-up rules
src/components/      dashboard, lead list, dialogs, shadcn/ui
tests/               unit and API tests
```

## Design decisions

- **Follow-ups:** a lead has one current follow-up. Saving a note with a new follow-up replaces it; saving a note without one leaves it unchanged. Past follow-ups stay visible in the timeline.
- **Atomic saves:** a new discussion and the lead's follow-up update are saved in one database transaction.
- **Timezones:** times are stored in UTC. "Today" and "overdue" are worked out in the viewer's timezone.
- **Pinning with filters:** today's follow-ups are pinned within the current search or filter results.
- **Supabase security:** Row Level Security is enabled, so the tables can't be reached through Supabase's public API. The app connects through Prisma, which RLS doesn't affect.
- **Duplicates:** submit buttons are disabled while a request is in flight. A repeated phone number returns `409`.
- **FastAI** isn't used, because none of the features needed machine learning.

## AI usage

I used an AI coding assistant (Claude Code) throughout, as the brief encourages:

- **Planning:** breaking the brief into phases, planning the data model and API, and prioritizing required features before bonus items.
- **Discussing my approach:** talking through trade-offs before implementing, such as how follow-ups should behave, timezone handling, Supabase connection setup, and security.
- **Implementation:** generating most of the code, tests, and documentation from that plan, which I reviewed.
- **Verification:** running tests, lint, type checks, builds, and scripted browser checks of every flow. Issues found this way were fixed, as the commit history shows.

## Known limitations

- No authentication and no pagination.
- Leads can't be deleted, and contact details can only be edited through the API.
- No real-time sync between browsers.
