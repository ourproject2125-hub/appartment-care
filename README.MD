# Maintaino


 

Mobile-first maintenance app for small apartments (5-20 houses) in India. Works on phones, tablets and laptops (Android, iPhone, Windows, Mac).

React + Tailwind front end, a hosted database with login and file storage (Supabase), hosted on Netlify. Installs on a phone as an app.


 

```

supabase/schema.sql   tables, security rules, functions, private file bucket (run once). Month-end auto-close is at the bottom, commented out

src/lib.js            data layer: server client, helpers, loading, saving, backup, the report

src/App.jsx           every screen, form and the app shell

src/main.jsx          starts the app

src/index.css         Tailwind and print styles

vite.config.js        build, Tailwind and installable-app settings (app name lives here)

netlify.toml          Netlify build and security headers

index.html, package.json, .env.example, .gitignore, README.md

public/               pwa-192.png, pwa-512.png, favicon.svg   <- the app logo

```


 

## 1. Set up the database (about 10 minutes)


 

1. Create a project at supabase.com. Choose the Mumbai (ap-south-1) region.

2. **SQL Editor → New query**: paste all of `supabase/schema.sql` and press Run. It must finish with no errors.

3. **Project Settings → API**: copy the Project URL and the `anon` (or "publishable") key. Never use the `service_role` / secret key in this app.

4. **Authentication → URL Configuration**: set *Site URL* to your Netlify address (add `http://localhost:5173` under Redirect URLs for local testing).

5. **Authentication → Providers → Email**: keep **Confirm email ON** (stops a stranger claiming a neighbour's email).

6. **Authentication → SMTP Settings**: the built-in email sender allows only a few emails per hour. Add a free SMTP service (Brevo, Resend) before real residents join.

7. Optional: enable `pg_cron` (Database → Extensions), then in the last section of `schema.sql` remove the leading `-- ` from each line and run just that block. It closes each month automatically and applies the Admin schedule.


 

**If you ran the OLD schema before** (the one with rotation), easiest is a new empty project. Or, on a test project with nothing you need, run this first and then run the new `schema.sql`:


 

```sql

drop table if exists public.audit_log, public.transfers, public.reviews, public.vendors, public.votes,

  public.work_requests, public.complaints, public.notices, public.expenses, public.payments, public.months,

  public.members, public.admin_terms, public.houses, public.apartments cascade;

drop function if exists public.transfer_admin(uuid, text);

drop function if exists public._do_transfer(uuid, uuid, text);

drop function if exists public.create_apartment(text, text, text, numeric, numeric, jsonb, int, text, text);

drop policy if exists receipts_read on storage.objects;

drop policy if exists receipts_upload on storage.objects;

```


 

## 2. Run on your computer


 

```bash

npm install

cp .env.example .env      # paste your URL and key into .env

npm run dev

```


 

## 3. Host on Netlify (free)


 

1. Put this folder in a GitHub repository (never upload `.env`).

2. Netlify → **Add new site → Import an existing project**. Build settings come from `netlify.toml`.

3. **Site configuration → Environment variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Redeploy (they are read at build time).

4. Put the final Netlify address into Supabase *Site URL*.


 

### The Netlify logo bubble in the bottom-right corner


 

That is Netlify's "Drawer", a feedback and review tool. It is not part of Maintaino and the code cannot remove it. Turn it off in Netlify: **Project configuration → Build & deploy → Continuous deployment → Collaboration tools → Configure → disable Netlify Drawer**, then redeploy. If you ever see it before it is switched off, you can drag or minimise it. Maintaino keeps buttons and forms clear of that corner either way: the main navigation is at the top, messages appear at the top, and pages and forms have extra space at the bottom.


 

## 4. Your logo and app name


 

The name "Maintaino" is set in `vite.config.js` (app name, home-screen name), `index.html` (tab title) and the top bar in `src/App.jsx`.


 

To use your own logo, replace these three files in `public/` and keep the file names exactly:


 

| File | Size | Used for |

| --- | --- | --- |

| `pwa-512.png` | 512 × 512 PNG | Android home screen, install screen, splash |

| `pwa-192.png` | 192 × 192 PNG | Android launcher, iPhone home screen |

| `favicon.svg` | any (SVG, or a PNG renamed in `index.html`) | browser tab |


 

Tips: square image, solid background colour, no transparent or rounded corners (the phone rounds it), and keep the logo inside the middle 80% so round icons do not clip it. After you redeploy, remove the old shortcut from the phone and add it again to see the new icon.


 

## 5. First use


 

1. The first person opens the site, creates an account, confirms the email, signs in, chooses **Set up a new apartment** and says how many months they will be the first Admin.

2. The Admin adds every resident under **More → Houses & members**, with each person's **email**.

3. Each resident opens the site, creates an account with that same email, and lands in their house automatically.

4. **More → Admin schedule**: the Admin plans who is Admin next and for how many months (for example House C for 6 months, then House E for 1 month). There is no fixed order. At the end of a month the Admin closes it with notes; the balance carries forward and the schedule decides who is Admin next. If nobody is planned, the current Admin stays on.


 

Install on a phone: Android Chrome menu → *Install app*. iPhone Safari → Share → *Add to Home Screen*.


 

## Rules (enforced in the database, not just on screen)


 

| Who | Can do |

| --- | --- |

| Any member | Read everything in their apartment, submit payment proof for their house, raise complaints, vote once per house, mark the report reviewed, comment on complaints |

| House that raised a complaint | Close it once it is Resolved |

| Current Admin | Add and edit expenses, notices, work requests, vendors, houses, members. Confirm payments. Update complaint status. Plan the Admin schedule and close the month. Back up and restore |

| Nobody | Delete anything. Rows are only Active, Edited or Archived. The audit log cannot be changed, and the server records who did each action and when |


 

Bills, receipts and photos go to a private bucket. Each apartment can only read its own folder and links expire after 2 minutes. Photos are shrunk on the phone before upload.


 

## Report


 

One report for a **month, quarter or year** (calendar quarters). It shows the money summary, maintenance by house, expenses by category and detail, and complaints. Everyone can view it. The Admin can print or save it as PDF, or download it for Excel.


 

## Free plan notes (recheck current pricing)


 

Supabase free projects pause after about 7 days with no activity. Either upgrade to Pro, or add a keep-alive job. Example `.github/workflows/keepalive.yml`:


 

```yaml

name: keepalive

on: { schedule: [{ cron: "0 6 */3 * *" }], workflow_dispatch: {} }

jobs:

  ping:

    runs-on: ubuntu-latest

    steps:

      - run: curl -s "$URL/rest/v1/" -H "apikey: $KEY" > /dev/null

        env: { URL: "${{ secrets.SUPABASE_URL }}", KEY: "${{ secrets.SUPABASE_ANON_KEY }}" }

```


 

## Known limits and next steps


 

- Audit lines are written by the app after each save. The server stamps the real time and person, but a bug could skip a line. Database triggers would be stronger.

- There is no screen yet to change the monthly maintenance amount. In the SQL Editor: `update months set due = 3000 where ym = '2026-12';` (each new month copies the previous amount).

- Sign-in is email and password. Google sign-in can be added; SMS login needs a paid provider.

- Not built: push notifications, WhatsApp reminders, online payment gateway.

- A Play Store app can be made later by wrapping this same site (Capacitor or Bubblewrap).


 

## What has and has not been tested


 

Tested by script in a real browser engine (Chromium) with the app talking to a stand-in server: sign up, setup, adding expenses with a file, the single report in all three modes and the Excel file, backup and restore, planning and overlapping Admin terms, early handover, role changes, complaints, notices, work votes, payments, double-tap protection, the offline banner, and the "server not connected" screen. The page showed no technical or provider wording.


 

Not tested: the real database (the SQL was never run), the real Tailwind styling and how it looks on actual phones and tablets, installing on a phone, and emails. Test with two accounts (an Admin and a resident) on your own phone before inviting everyone.


 