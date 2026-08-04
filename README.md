# Editorial Board Hub

A single system for running a school Editorial Board: a public website, a
members' portal, a permanent document archive, an events calendar, and the admin
tools to drive all of it.

This is **Phase 1 of the roadmap** — the MVP scope, built end to end.

---

## Contents

- [What's built](#whats-built)
- [Getting it running](#getting-it-running)
- [Signing in](#signing-in)
- [Changing the Board's name and branding](#changing-the-boards-name-and-branding)
- [How permissions work](#how-permissions-work)
- [Sending an urgent SMS](#sending-an-urgent-sms)
- [Deploying to Vercel + Neon](#deploying-to-vercel--neon)
- [Backups and data export](#backups-and-data-export)
- [Project layout](#project-layout)
- [Scheduled reminders](#scheduled-reminders)
- [What's deliberately not built yet](#whats-deliberately-not-built-yet)

---

## What's built

### 1. Public website
Homepage, About (mission, structure, live executive list), Publications archive
with search/filter and an in-browser PDF reader, news feed, events calendar,
photo gallery with lightbox, achievements timeline, and a combined
Contact / Join-the-Board form. Mobile-responsive, SEO metadata on every page,
plus `sitemap.xml` and `robots.txt`.

### 2. Members' portal
Email + password sign-in, four ranked roles, and a dashboard showing upcoming
meetings, deadlines, assigned tasks, and unread announcements. Includes the
document library (search, folders, tags, role-gated), the internal calendar with
RSVPs, the announcements board with read receipts, a privacy-controlled member
directory, and a personal profile with contribution history.

### 3. Communication
In-app announcements targeted at specific roles, with optional email blasts.
Email notifications for new announcements, task assignments, new events, account
creation, and password resets.

**Urgent SMS** (Admin → Urgent SMS) texts every member directly, for the things
that can't wait until someone next opens the portal. It shows the exact message
that will land on the phone, counts segments as the carrier will bill them,
estimates the cost before you commit, and requires an explicit confirmation.
Afterwards it keeps a per-recipient delivery log — who received it, who failed
and why, and who was skipped for having no number.

Members control both channels in their own profile.

### 4. Records & institutional memory
Structured document storage with folders, tags, a *record date* separate from
the upload date, search by title/description/filename, and per-role visibility.
Every upload, deletion, role change, and password reset is written to an
append-only activity log that survives the departure of the person who acted.

### 5. Events
Month-grouped calendar, event detail pages with agenda and required materials,
Attending / Maybe / Can't-make-it RSVPs, and an attendance register that turns
RSVPs into an actual record of who showed up. Automatic email reminders go out
the day before — see [Scheduled reminders](#scheduled-reminders).

### 6. Media archive
Albums (public or private), batch photo upload, a public gallery with a
keyboard-navigable lightbox, and a private members-only archive.

### 7. Admin dashboard
Member management with role changes and password resets, announcements, events,
documents, publications, news posts, media, achievements, a contact inbox, task
assignment, the activity log, live stats, and a full JSON data export.

---

## Getting it running

**You need:** Node 18.18+ and a PostgreSQL database.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#    Then edit .env — at minimum set DATABASE_URL and AUTH_SECRET.
#    Generate a secret with:  openssl rand -base64 32

# 3. Create the schema
npx prisma migrate dev

# 4. Load demo data (optional, but it makes everything clickable)
npm run db:seed

# 5. Run
npm run dev          # http://localhost:3000
```

### If you don't have Postgres locally

Easiest route is a free hosted database — create one at
[neon.tech](https://neon.tech) and paste the connection string into
`DATABASE_URL`. It works exactly the same as a local one.

Alternatively, with Docker:

```bash
docker run --name eic-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
```

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:deploy` | Apply existing migrations (use in production) |
| `npm run db:seed` | Load demo data |
| `npm run db:studio` | Browse the database in a GUI |
| `npm run db:reset` | Drop everything and re-migrate ⚠️ |
| `npm run export:backup` | Write a full JSON backup to `./backups` |

---

## Signing in

`npm run db:seed` creates eight accounts covering all four roles. They all share
the password in `SEED_PASSWORD` (default `ChangeMe!2024`).

| Email | Role | Position |
| --- | --- | --- |
| `admin@oseitutushs.edu.gh` | Administrator | Editor-in-Chief |
| `exec@oseitutushs.edu.gh` | Executive | Deputy Editor |
| `secretary@oseitutushs.edu.gh` | Executive | Secretary |
| `editor@oseitutushs.edu.gh` | Editor | Features Editor |
| `design@oseitutushs.edu.gh` | Editor | Layout & Design Editor |
| `member@oseitutushs.edu.gh` | Member | Staff Writer |
| `photo@oseitutushs.edu.gh` | Member | Photographer |
| `reporter@oseitutushs.edu.gh` | Member | Reporter |

Sign in as each to see how much the interface changes between roles.

> **Before going live:** delete these accounts, or at minimum change every
> password. Admin → Members.

There is no public sign-up — accounts are created by an administrator in
Admin → Members, and the new member gets a one-time temporary password by email
which they must change on first sign-in.

---

## Changing the Board's name and branding

Everything identifying the Board lives in **one file**:

```
src/lib/config.ts
```

It holds the Board name, school name, tagline, contact details, social handles,
founding year, mission statement, the description of how the Board is organised,
the list of interest areas on the Join form, and the SMS country code and
pricing.

The Board name (**EIC**) and school (**Osei Tutu Senior High School**) are set.
Everything still marked `TODO` is a placeholder — notably the contact email,
what EIC stands for, and the founding year. Those are deliberately left empty
rather than guessed: anything empty is simply not rendered, so the site stays
honest until you fill them in.

**Colours and typography** are in `src/app/globals.css`, at the top, as CSS
variables. Change `--brand` and `--accent` and the whole interface follows.
Light and dark themes are both defined; the site follows the reader's system
setting.

The people shown on the public About page are **not** in the config file — they
come from the database. Mark someone as an executive in Admin → Members and they
appear, ordered by the "Exec order" field.

---

## How permissions work

Four roles, ranked. Each one can do everything the one below it can.

| Role | Can |
| --- | --- |
| **Member** | Read announcements, browse the library, RSVP, view the directory |
| **Editor** | …plus publish news, upload documents, media, and publications |
| **Executive** | …plus create events and announcements, assign tasks, view attendance and the inbox |
| **Administrator** | …plus manage members and roles, view the activity log, export data |

Documents and events each carry a **minimum role**. A document set to
"Executive and above" is invisible to Members in the library *and* its file
returns 404 if they request the URL directly — the check is enforced when the
file is served, not just when the list is rendered.

Who can do what is defined in one place, `src/lib/rbac.ts`, as named
capabilities (`can.manageEvents`, `can.viewAuditLog`, …). To change who can do
something, edit that file rather than hunting through pages.

The last remaining administrator cannot demote or archive themselves — that
would lock everyone out of member management permanently.

---

## Sending an urgent SMS

**Admin → Urgent SMS.** Executives and administrators only.

Type the message, choose who gets it (leave everything unticked for the whole
Board), check the count and the cost, tick the confirmation, send. The delivery
log appears immediately afterwards.

### Before it will actually send

Two things, in this order:

**1. Members need phone numbers.** A broadcast silently skips anyone without
one, so the compose screen lists exactly who can't be reached and why. Numbers
can be added two ways:

- members add their own in Portal → My profile
- an administrator adds them in Admin → Members

Local format is fine — `024 412 3456`, `+233 24 412 3456`, and `0244123456` are
all understood. Set your country's dialling code in `src/lib/config.ts`
(`sms.defaultCountryCode`) or every number will be malformed.

**2. Connect Twilio.** Until you do, messages are written to the server log
rather than sent, which means you can rehearse the whole flow safely.

From the [Twilio console](https://console.twilio.com):

1. Copy the **Account SID** and **Auth Token** from the dashboard home page.
2. Buy an SMS-capable phone number, or create a Messaging Service.
3. Put these in your environment (Vercel → Settings → Environment Variables):

   | Name | Value |
   | --- | --- |
   | `SMS_PROVIDER` | `twilio` |
   | `TWILIO_ACCOUNT_SID` | starts `AC…` |
   | `TWILIO_AUTH_TOKEN` | from the dashboard — *not* an API key secret |
   | `TWILIO_FROM` | your number in `+233…` form, or a Messaging Service SID starting `MG` |
   | `NEXT_PUBLIC_SITE_URL` | your public HTTPS address, for delivery receipts |

4. Redeploy, then open **Admin → Urgent SMS** and use the two checks in the
   sidebar: **Test the Twilio connection** (proves the credentials, sends
   nothing) and **Text myself a test** (proves end-to-end delivery, costs one
   message).

### Two Twilio gotchas worth knowing

**Trial accounts can only text verified numbers.** This is the one that bites
hardest: a trial account accepts your broadcast, reports it as sent, and
delivers to nobody except the handful of numbers you verified in the console.
The connection check detects a trial account and says so in red. Upgrade before
you rely on this.

**Some countries require a local or registered sender.** If messages to your
country fail with a routing error, you likely need a local number or a
registered alphanumeric sender ID. Twilio's country guide covers what each one
needs.

### Delivery receipts

With `NEXT_PUBLIC_SITE_URL` set to a public HTTPS address, Twilio posts status
updates to `/api/sms/status` and the delivery log upgrades from *accepted by
Twilio* to *confirmed on the handset* — plus **Undelivered** with a plain-English
reason when a carrier rejects one.

Every callback is signature-verified with your auth token, so nobody can forge
delivery statuses into your records. Nothing to configure beyond the URL; the
callback is registered per-message automatically, and skipped entirely on
localhost where Twilio couldn't reach it.

Failures are translated out of Twilio's numeric codes into something actionable
— "This person replied STOP…", "This is a Twilio trial account…", "That's a
landline…" — rather than leaving an executive to look up error 21610.

### What it costs

SMS is billed per *segment*, not per message. A plain-text message gets 160
characters per segment; one emoji or unusual character switches the whole thing
to a 70-character encoding and can triple the bill. The compose screen shows the
segment count live and warns you when that happens, so there are no surprises.

The `[Editorial Board]` prefix counts towards the limit. Shorten or remove it in
`src/lib/config.ts` (`sms.prefix`) if your provider already sends under a named
sender ID.

### Rules of thumb

- Use an **announcement** for anything that can wait — it's free and it keeps a
  proper record.
- Use **SMS** for a meeting moved to today, a deadline brought forward, or
  something cancelled at short notice.
- A text cannot be recalled. Read it back before ticking the confirmation.
- Anyone who was skipped did *not* get the message. If it was genuinely urgent,
  reach them another way, then add their number.

## Deploying to Vercel + Neon

Total cost to start: **£0**. Both have free tiers that comfortably fit a school
Editorial Board.

### 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy the **pooled** connection string (it has `-pooler` in the host).
3. Keep `?sslmode=require` on the end.

### 2. Put the code on GitHub

```bash
git init
git add .
git commit -m "Editorial Board Hub"
git remote add origin git@github.com:YOUR-ORG/editorial-board.git
git push -u origin main
```

### 3. Deploy — Vercel

1. [vercel.com/new](https://vercel.com/new) → import the repository.
2. Add these environment variables:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon pooled connection string |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `NEXT_PUBLIC_SITE_URL` | your final URL, e.g. `https://board.school.edu` |
   | `CRON_SECRET` | `openssl rand -hex 32` — authorises the daily reminder job |

3. Deploy. The build runs `prisma generate` automatically, and `vercel.json`
   registers the daily reminder cron.

### 4. Create the schema in production

```bash
DATABASE_URL="your-neon-url" npx prisma migrate deploy
```

Then create your first administrator. The simplest way is to seed with a
password you choose and immediately delete the accounts you don't want:

```bash
DATABASE_URL="your-neon-url" SEED_PASSWORD="a-strong-password" npm run db:seed
```

### 5. File uploads — required before real use

Vercel's filesystem is **read-only at runtime**, so uploads will fail until you
set this up.

1. Vercel dashboard → Storage → Create a **Blob** store.
2. It adds `BLOB_READ_WRITE_TOKEN` to your project automatically.
3. Redeploy.

Until that token is set, uploads are written to a local `.uploads/` directory —
fine for development, useless on Vercel. The admin dashboard shows a warning
while it's unset.

### 6. Email — optional but recommended

1. Sign up at [resend.com](https://resend.com) (free: 3,000 emails/month).
2. Verify your sending domain.
3. Add `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Editorial Board <noreply@school.edu>`).

Without a key, emails are printed to the server log instead of being sent —
nothing silently pretends to have delivered. The admin dashboard warns you.

### 7. Custom domain

Vercel dashboard → Settings → Domains. HTTPS is automatic. Update
`NEXT_PUBLIC_SITE_URL` to match, so SEO canonicals and email links are right.

---

## Backups and data export

**Database.** Neon takes automatic point-in-time backups on the free tier. For
your own copy:

```bash
pg_dump "your-neon-url" > backup-$(date +%F).sql
```

**Everything, as JSON.** Two ways to the same file:

```bash
npm run export:backup                       # -> ./backups/eic-backup-<timestamp>.json
npm run export:backup -- --out mine.json    # a path you choose
npm run export:backup -- --stdout | gzip > backup.json.gz
```

…or, from the app, any administrator can download it from
Admin → Activity log → *Export data* (`/api/export`).

To back up production from your own machine, put the connection string in
front:

```bash
DATABASE_URL="your-neon-url" npm run export:backup
```

Both routes build the payload from the same code (`src/lib/export.ts`), so they
always contain the same thing. The table list isn't written down anywhere —
it's taken from Prisma's model metadata, so a model added next term is in the
backup the day it exists. Password hashes are stripped wherever they appear.

**Uploaded files are not in that JSON** — documents, publication PDFs, and
photos are referenced by URL. Copy your Vercel Blob store (or `./.uploads` when
running locally) separately. The script reminds you which applies when it
finishes.

Doing this once a term is a reasonable habit, and it means the Board is never
locked into this system.

---

## Project layout

```
prisma/
  schema.prisma          the data model, commented
  seed.ts                demo data
scripts/
  export-backup.ts       `npm run export:backup`
src/
  app/
    (public)/            the public website
    portal/              members' area
    admin/               admin area
    api/                 auth, sign-out, data export
    uploads/[...path]/   serves local uploads, permission-checked
  components/
    ui.tsx               the whole design system
    public-nav / footer / cards, portal-shell, admin-shell, lightbox
  lib/
    config.ts            >>> branding lives here <<<
    rbac.ts              roles and capabilities
    auth.ts              sign-in
    auth.config.ts       edge-safe half, used by middleware
    portal.ts            session loading and role guards
    storage.ts           file uploads (Vercel Blob or local disk)
    email.ts             email (Resend or console)
    sms.ts               urgent SMS (Twilio, custom gateway, or console)
    sms-format.ts        phone normalisation + segment/cost maths
    twilio.ts            credentials, webhook signing, error translation
    audit.ts             activity log
    export.ts            the backup payload, shared by the route and the script
    reminders.ts         day-before event reminders
    db.ts, utils.ts, labels.ts
```

A few decisions worth knowing about:

- **No webfonts.** The site uses system font stacks, so it renders immediately
  on a slow connection. That was judged to matter more than a bespoke typeface.
- **Public pages are statically rendered** and revalidate every 5 minutes. They
  don't read the session, which is what keeps them cacheable.
- **Post and announcement bodies are stored as plain text** and rendered as
  text, not HTML. A compromised editor account can't inject scripts into a
  public page.
- **Storage, email, and SMS are adapters.** Swapping Vercel Blob for S3, Resend
  for SMTP, or Twilio for a local SMS aggregator means editing one file each.
- **Segment counting is shared** between the browser and the server (
  `sms-format.ts`), so the cost you approve is the cost that gets charged.

---

## Scheduled reminders

Members get an email the day before anything on the calendar.

There is no long-running timer in a serverless deployment, so the schedule lives
in `vercel.json` and Vercel calls `/api/cron/reminders` once a day. The logic
itself is in `src/lib/reminders.ts`.

**To switch it on in production**, set `CRON_SECRET` to a long random string
(`openssl rand -hex 32`) in your Vercel project. Vercel Cron sends it as a
bearer token; without it, the endpoint is reachable only by a signed-in
administrator, and never by an anonymous caller.

**To test it by hand**, sign in as an administrator and visit:

```
/api/cron/reminders?dryRun=1     # who would be emailed, sends nothing
/api/cron/reminders              # actually send
```

Behaviour worth knowing:

- **Nobody gets reminded twice.** The job claims each event with a conditional
  write before sending, so two overlapping runs can't both send. If the email
  provider then fails, the claim is released and the next run retries rather
  than losing the reminder.
- **People who declined are skipped.** Anyone who has already RSVP'd "can't
  make it" isn't chased.
- **Role limits are respected.** An executives-only event only emails
  executives and administrators.
- **It never emails about the past.** A cron run that fires late won't tell
  everyone about yesterday's meeting.
- **The window is 36 hours, not 24.** With a single daily run, 24 would miss an
  evening event tomorrow — it wouldn't be caught until the morning it happened.
  If you move to an hourly schedule (Vercel Pro), set `REMINDER_WINDOW_HOURS=24`
  and reminders land almost exactly a day ahead.

Events that have been reminded show a **Reminded** badge in Admin → Events, and
each run writes a line to the activity log.

Reminders are email-only on purpose. SMS costs real money per message, so it
stays a deliberate, human decision via Admin → Broadcast.

---

## What's deliberately not built yet

These are Phase 2 and 3 on the roadmap, and are **not** in this build:

- WhatsApp Business API (needs a Meta Business account and template approval;
  the broadcast model already has a `channel` field ready for it — SMS, which
  was originally Phase 3, is built and working)
- Full-text search across document *contents*
- Document version history and per-document comment threads
- Recurring events, room/equipment booking, and school-calendar sync
- Video in the media archive, watermarking, AI-assisted tagging
- Engagement analytics and generated PDF/Excel reports
- Offline access / PWA
- Multilingual support

The database schema already accommodates most of these, so they are additions
rather than rewrites.
