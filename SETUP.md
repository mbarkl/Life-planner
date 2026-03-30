# Life Planner - Setup Guide

Follow these steps to get Life Planner running.

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**
3. Choose a name (e.g., "life-planner"), set a database password, pick a region close to you
4. Wait for the project to spin up (~1 minute)

### Get your API keys:
1. Go to **Settings > API** in your Supabase dashboard
2. Copy **Project URL** and **anon/public key**

---

## Step 2: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Paste the entire contents into the SQL editor
5. Click **Run** — this creates all tables, indexes, and security policies

---

## Step 3: Configure Google OAuth in Supabase

1. Go to **Authentication > Providers** in Supabase
2. Find **Google** and enable it
3. You'll need a Google Client ID and Secret:

### Create Google OAuth Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services > OAuth consent screen**
   - Choose "External" user type
   - Fill in app name: "Life Planner"
   - Add your email as a test user
   - Save
4. Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Add authorized redirect URI: `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
5. Back in Supabase, paste the Client ID and Secret into the Google provider settings
6. Save

---

## Step 4: Enable Google Calendar API

1. In the same Google Cloud project, go to **APIs & Services > Library**
2. Search for **Google Calendar API**
3. Click **Enable**

This allows Life Planner to read your calendar events on the dashboard.

---

## Step 5: Get a Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or log in
3. Go to **API Keys** and create a new key
4. Copy the key

---

## Step 6: Configure Environment Variables

1. Copy the example file:
   ```
   cp .env.local.example .env.local
   ```

2. Fill in your values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ANTHROPIC_API_KEY=sk-ant-your-key
   ```

---

## Step 7: Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the login page.

---

## Step 8: Deploy to Vercel (Optional)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add the same environment variables from `.env.local` in Vercel's project settings
4. Deploy

Your app will be available at `https://your-app.vercel.app`.

### Update Google OAuth redirect:
After deploying, add your Vercel URL to:
- Supabase Auth > Google provider > Redirect URL
- Google Cloud Console > OAuth credentials > Authorized redirect URIs

Add: `https://your-app.vercel.app/api/auth/callback`

---

## Using Life Planner

### Brain Dump
Type anything into the brain dump box — rambling thoughts, quick tasks, project ideas. Hit **Process** and AI will:
- Extract tasks, ideas, and notes
- Categorize them into your categories
- Assign them to existing or new projects
- Suggest priority levels and dates

### Dashboard
Your morning command center shows:
- Google Calendar events for today
- AI-prioritized tasks
- Suggestions you can "do today" or dismiss
- Project overview and goals

### Projects
Organize items into Categories > Projects. Add, edit, and remove as needed. Default categories are seeded on first login.
