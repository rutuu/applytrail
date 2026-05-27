# ApplyTrail

**Your job search, finally organized.**

ApplyTrail connects to your Gmail and automatically finds every job application,
interview invite, and rejection — so you always know where you stand.

---

## What is this?

If you've been job hunting, you know the problem: your inbox becomes a graveyard of "we received your application" emails, interview invites, and quiet rejections. By the time you've applied to 50+ jobs, keeping track of where things stand is its own part-time job.

**ApplyTrail fixes that.** It reads your Gmail, finds every job-related email, and automatically sorts them into a clean dashboard:

- ✅ **Applied** — applications you've submitted
- 📅 **Interview** — companies that want to talk
- 🎉 **Offer** — the good stuff
- ❌ **Rejected** — so you can move on

No more spreadsheets. No more digging through your inbox. Just a clear picture of your job search at a glance.

---

## Is it safe? Will it read all my emails?

**Short answer: yes, it's safe. No, it doesn't read everything.**

Here's exactly how it works:

1. **You sign in with Google** — the same "Sign in with Google" button you see on thousands of apps. ApplyTrail never sees your Google password.

2. **ApplyTrail asks for read-only access** — it requests permission to read (but never send, delete, or modify) your emails. You'll see exactly what it's asking for on Google's permissions screen before you agree.

3. **It only looks at job-related emails** — ApplyTrail searches for emails from known hiring platforms (like Greenhouse, Lever, Workday) and subjects containing words like "application", "interview", and "offer". It ignores everything else.

4. **Your data stays on your computer** — ApplyTrail stores your job list in a small database file on your own machine, not on any remote server. Nobody else can see it.

5. **You're always in control** — you can delete your data, revoke Gmail access, or uninstall the app at any time. Revoking access takes 10 seconds in your [Google Account settings](https://myaccount.google.com/permissions).

---

## Features

- **Automatic Gmail scanning** — finds the last 6 months of job emails
- **Smart classification** — detects applied / interview / offer / rejected from email content
- **Dashboard with filters** — table and board view, filter by status
- **Manual add** — for applications you applied through a company's own site
- **CSV export** — download your full tracker for Excel or Sheets
- **Edit & notes** — correct any classification and add your own notes
- **No account required** — runs entirely on your own machine

---

## New to this? Start here.

Never used GitHub or the Terminal before? That's okay. This section is for you. The setup takes about 15 minutes and you only have to do it once.

### What you're actually doing

ApplyTrail is an app that runs on your own computer — like opening Spotify or Chrome, except you launch it through a window called Terminal. Once it's running, you use it in your regular web browser at a private address only your computer can see.

You don't need to understand code to use it. You just need to follow these steps once.

---

### Step 1 — Install Node.js

Node.js is the engine that runs ApplyTrail. Think of it like installing a language your computer needs in order to understand the app.

1. Go to [nodejs.org](https://nodejs.org)
2. Click the big **"LTS"** download button (LTS = stable version)
3. Open the downloaded file and follow the installer — it's like installing any other app
4. When it's done, you can verify it worked: open Terminal (see Step 2) and type `node -v` — it should print a version number like `v20.0.0`

---

### Step 2 — Open Terminal

Terminal is a text-based window that lets you run commands on your computer. It sounds scarier than it is.

**On Mac:** Press **Cmd + Space**, type `Terminal`, press Enter.

You'll see a window with a blinking cursor. This is where you'll paste the commands in the steps below. Each command does one specific thing — you don't need to understand them, just paste and press Enter.

---

### Step 3 — Download ApplyTrail

In Terminal, paste this and press Enter:

```bash
git clone https://github.com/rutuu/applytrail.git
cd applytrail
npm install
```

This downloads the app to your computer and installs everything it needs. The `npm install` step might take a minute — that's normal.

---

### Step 4 — Set up Google access

ApplyTrail needs permission to read your Gmail. This requires creating a free "app" in Google Cloud — it sounds technical but it's mostly clicking through forms.

Follow the step-by-step instructions in the **Quick Start → Set up Google OAuth** section below. Come back here when you have your **Client ID** and **Client Secret**.

---

### Step 5 — Create your settings file

In your `applytrail` folder, find the file called `.env.example`. 

> **Can't see it?** On Mac, press **Cmd + Shift + .** in Finder to show hidden files.

Make a copy of it and rename the copy to `.env.local`. Open it with any text editor (TextEdit works) and fill in the values:

- `NEXTAUTH_SECRET` — open Terminal and run `openssl rand -base64 32`, then paste the result here
- `NEXTAUTH_URL` — type `http://localhost:3000` exactly as shown
- `GOOGLE_CLIENT_ID` — paste from Google Cloud
- `GOOGLE_CLIENT_SECRET` — paste from Google Cloud
- `DATABASE_URL` — type `file:./prisma/applytrail.db` exactly as shown

Save the file. Make sure it's named `.env.local` (with the dot at the start).

---

### Step 6 — Start the app

In Terminal, paste these two commands one at a time:

```bash
npm run db:push
npm run dev
```

Then open your browser and go to **http://localhost:3000**

You'll see the ApplyTrail landing page. Sign in with Google, click **Sync Gmail**, and your dashboard will populate.

---

### Stopping and starting the app

- **To stop:** go to Terminal and press **Ctrl + C**
- **To start again later:** open Terminal, navigate to the folder with `cd path/to/applytrail`, then run `npm run dev`

The app only runs when you have it open in Terminal. Your data is saved locally so nothing is lost when you stop it.

---

## Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- A Google account
- A free [Google Cloud](https://console.cloud.google.com) project (for the Gmail connection — instructions below)

### 1. Clone the repo

```bash
git clone https://github.com/rutuu/applytrail.git
cd applytrail
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Google OAuth

ApplyTrail needs a Google "OAuth app" to connect to Gmail. This is free and takes about 5 minutes.

<details>
<summary><strong>Click to expand: Step-by-step Google Cloud setup</strong></summary>

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in
2. Click **"Select a project"** → **"New Project"** → name it `ApplyTrail` → **Create**
3. In the left menu, go to **APIs & Services → Library**
4. Search for **"Gmail API"** and click **Enable**
5. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** → **Create**
   - App name: `ApplyTrail`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through the rest (defaults are fine)
   - On the last screen, click **Back to Dashboard**
6. Go to **APIs & Services → Credentials**
   - Click **+ Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `ApplyTrail Local`
   - Authorized redirect URIs: add `http://localhost:3000/api/auth/callback/google`
   - Click **Create**
7. Copy the **Client ID** and **Client Secret** — you'll need them in the next step

</details>

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<paste from Google Cloud>
GOOGLE_CLIENT_SECRET=<paste from Google Cloud>
DATABASE_URL="file:./prisma/applytrail.db"
```

### 5. Set up the database

```bash
npm run db:push
```

This creates a local SQLite database file at `prisma/applytrail.db`. No external database needed.

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser, sign in with Google, and click **Sync Gmail**.

---

## Deploying to Vercel (optional)

If you want to access ApplyTrail from anywhere (not just your laptop), you can deploy it to Vercel for free.

1. Push your fork to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Add the same environment variables from `.env.local` in the Vercel dashboard
4. Change `NEXTAUTH_URL` to your Vercel URL (e.g. `https://applytrail.vercel.app`)
5. Update the Google Cloud OAuth redirect URI to `https://YOUR_APP.vercel.app/api/auth/callback/google`
6. **Important:** switch `DATABASE_URL` to a hosted database like [Turso](https://turso.tech) (free tier) or [PlanetScale](https://planetscale.com) — SQLite doesn't persist on Vercel

---

## How the classifier works

ApplyTrail uses keyword pattern matching to classify emails, with no AI required by default.

| Category | Signals it looks for |
|---|---|
| **Applied** | "application received", "thank you for applying", "we got your application" |
| **Interview** | "interview", "schedule a call", "next steps", "phone screen", "we'd like to meet" |
| **Offer** | "offer of employment", "pleased to offer", "offer letter", "compensation" |
| **Rejected** | "unfortunately", "not moving forward", "decided to pursue other candidates" |

If a match is ambiguous, it's marked as "unknown" so you can classify it yourself.

**Optional Claude AI fallback:** Add `ANTHROPIC_API_KEY=your-key-here` to your `.env.local` to enable smarter classification for ambiguous emails. ApplyTrail will only call Claude when the rule-based classifier isn't confident — so it's efficient and low-cost. Get a free API key at [console.anthropic.com](https://console.anthropic.com).

> Your API key lives only in your `.env.local` file on your own machine. It's never sent to or stored by ApplyTrail — it goes directly from your machine to Anthropic's API.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Auth | [NextAuth.js](https://next-auth.js.org) with Google OAuth |
| Database | [SQLite](https://sqlite.org) via [Prisma](https://prisma.io) |
| Gmail | [Google APIs Node.js client](https://github.com/googleapis/google-api-nodejs-client) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Language | [TypeScript](https://typescriptlang.org) |

---

## Project structure

```
applytrail/
├── prisma/
│   └── schema.prisma         # Database schema
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/page.tsx # Main dashboard
│   │   └── api/
│   │       ├── auth/          # Google OAuth (NextAuth)
│   │       ├── sync/          # Gmail scan endpoint
│   │       ├── jobs/          # CRUD for job entries
│   │       └── export/        # CSV download
│   ├── components/
│   │   ├── JobBoard.tsx       # Table + board view
│   │   ├── StatsBar.tsx       # Summary numbers
│   │   └── AddJobModal.tsx    # Manual entry form
│   ├── lib/
│   │   ├── gmail.ts           # Gmail API client
│   │   ├── classifier.ts      # Email classification logic
│   │   ├── auth.ts            # NextAuth config
│   │   └── prisma.ts          # Database client
│   └── types/
│       └── index.ts           # Shared TypeScript types
└── .env.example               # Environment variable template
```

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

Ideas for what's next:

- [ ] Email body parsing for richer data extraction
- [ ] Bulk status editing
- [ ] Dark mode
- [ ] Outlook / other email provider support
- [ ] Mobile-friendly layout

Open an issue or submit a PR — all skill levels welcome.

---

## License

MIT — free to use, modify, and distribute.

---

*Built by someone who got tired of losing track of their own job search.*
