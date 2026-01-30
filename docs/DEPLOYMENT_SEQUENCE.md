# Deployment sequence: GitHub → Supabase → Vercel → Domain (optional) → Resend

Use this order so each step has what it needs. **Step 1** is first.

---

## Overview

| Step | What | Why this order |
|------|------|----------------|
| **1** | Push latest code to GitHub | GitHub becomes source of truth; Vercel will pull from it. |
| **2** | Run all Supabase migrations | DB schema must match the code (including connections + invitation emails). |
| **3** | Add project to Vercel, connect GitHub, set env, deploy | App runs on a free `*.vercel.app` URL; no domain required yet. |
| **4** | (Optional) Add a custom domain | Only when you want your own URL; Vercel gives a free subdomain. |
| **5** | Add Resend in Vercel and test invitations | Needs deployed app URL for links in emails. |

---

## Step 1: Get latest code onto GitHub

**Goal:** All your current work (download map, invitation emails, dashboard edits, etc.) is committed and pushed so GitHub has the full project.

1. In the project folder, stage everything and commit:
   ```powershell
   cd "c:\Users\narya\OneDrive\Documents\Games\SceneMapper"
   git add .
   git status
   ```
   Confirm the list includes your changed and new files (no `.env.local`).

2. Commit with a clear message:
   ```powershell
   git commit -m "Map download (PNG/JPEG/PDF), invitation emails (Resend), Edit invitation email modal"
   ```

3. Push to GitHub (use your branch name if different):
   ```powershell
   git push -u origin main
   ```

4. **Verify:** Open your repo on GitHub in the browser. You should see the latest commit and all files (e.g. `lib/invitation-email.ts`, `supabase/migrations/20250130000002_invitation_emails.sql`, updated Dashboard, Sidebar, Map, etc.).

**Done with Step 1 when:** GitHub shows your latest commit and you’re ready to run migrations and connect Vercel.

---

## Step 2: Supabase — run all migrations

**Goal:** Your Supabase database has the same schema as the code: `users`, `maps`, `nodes`, `connections`, and the invitation-email columns on `maps`.

1. Open your Supabase project: [supabase.com/dashboard](https://supabase.com/dashboard) → your project.

2. Go to **SQL Editor** → **New query**.

3. Run migrations in order (only run ones you haven’t run before):
   - **If you’ve never run any:**  
     Paste and run the full contents of `supabase/migrations/20250129000001_initial_schema.sql`.  
     Then run `supabase/migrations/20250130000001_connections.sql`.  
     Then run `supabase/migrations/20250130000002_invitation_emails.sql`.
   - **If you already ran initial_schema and connections:**  
     Run only `supabase/migrations/20250130000002_invitation_emails.sql`.

4. In **Table Editor**, confirm:
   - Tables: `users`, `maps`, `nodes`, `connections`.
   - `maps` has columns: `invitation_email_subject_admin`, `invitation_email_body_admin`, `invitation_email_subject_collaborator`, `invitation_email_body_collaborator`, `invitation_sender_name`.

**Done with Step 2 when:** All three migrations have been run and the table list (and `maps` columns) match above.

---

## Step 3: Vercel — add project and deploy

**Goal:** App is live on a `*.vercel.app` URL, using GitHub and Supabase. No custom domain yet.

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).

2. **Add New Project** → **Import Git Repository** → select your **SceneMapper** repo (from Step 1).  
   - If you don’t see it, connect GitHub to Vercel (Vercel will prompt).

3. **Configure project:**
   - Framework: **Next.js** (auto-detected).
   - Root directory: leave default (project root).
   - Build command / Output: leave defaults unless you’ve changed them.

4. **Environment variables** (add before first deploy):
   - `NEXT_PUBLIC_USE_BACKEND` = `true`
   - `SUPABASE_URL` = (from Supabase: Project Settings → API → Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase: Project Settings → API → service_role key)
   - `NEXT_PUBLIC_APP_URL` = leave empty for now (or set to your Vercel URL after first deploy, e.g. `https://your-project.vercel.app`)

   Apply to **Production**, **Preview**, and **Development** if you use them.

5. Click **Deploy**. Wait for the build to finish.

6. Open the generated URL (e.g. `https://scene-mapper-xxx.vercel.app`).  
   Optional: set `NEXT_PUBLIC_APP_URL` to this URL and redeploy so the app knows its own origin.

**Done with Step 3 when:** The app loads on the Vercel URL, you can sign up / log in, create a map, and see data in Supabase.

---

## Step 4: (Optional) Custom domain

**Goal:** Use a URL like `scenemapper.com` instead of `*.vercel.app`. You can do this anytime after Step 3.

1. **Buy a domain** from a registrar, e.g.:
   - [Namecheap](https://www.namecheap.com)
   - [Google Domains](https://domains.google) (now Squarespace)
   - [Cloudflare](https://www.cloudflare.com/products/registrar/)

2. In **Vercel:** Project → **Settings** → **Domains** → **Add** → enter your domain (e.g. `scenemapper.com` or `www.scenemapper.com`).

3. Vercel will show the DNS records you need (e.g. A or CNAME). In your registrar’s DNS settings, add those records. Vercel’s docs are step-by-step for each registrar.

4. After DNS propagates (minutes to hours), Vercel will show the domain as verified. Your app will then be reachable at that domain.

5. Set **`NEXT_PUBLIC_APP_URL`** in Vercel to `https://yourdomain.com` (or your chosen hostname) and redeploy.

**You can skip Step 4** and keep using the free `*.vercel.app` URL; Resend and the app work fine with it.

---

## Step 5: Resend — invitation emails in production

**Goal:** When someone adds an email and saves the map, an invitation email is sent from your deployed app.

1. Get your **Resend API key**: [resend.com](https://resend.com) → **API Keys** → Create → copy the key (starts with `re_`).

2. In **Vercel:** Project → **Settings** → **Environment Variables** → Add:
   - `RESEND_API_KEY` = your Resend API key  
   - `RESEND_FROM_EMAIL` = `onboarding@resend.dev` (Resend sandbox; no domain verification)  
   Apply to Production (and Preview if you want invitations on preview deploys).

3. **Redeploy** the project (e.g. **Deployments** → … on latest → **Redeploy**) so the new env vars are used.

4. **Test:** In the deployed app, open Dashboard → create or edit a map → add your email under “Invite admins by email” or “Invite collaborators by email” → **Save changes**. Check your inbox (and spam) for the invitation.

5. **(Later)** Use your own domain for “From”:
   - In Resend: **Domains** → Add your domain → add the DNS records Resend shows.
   - After verification, set `RESEND_FROM_EMAIL` in Vercel to e.g. `invitations@yourdomain.com` and redeploy.

**Done with Step 5 when:** Invitation emails are sent after saving the map on the live Vercel URL.

---

## Quick reference

| Step | Action |
|------|--------|
| 1 | Commit all changes, push to GitHub |
| 2 | Run Supabase migrations (initial_schema, connections, invitation_emails) |
| 3 | Vercel: Import repo, set Supabase + NEXT_PUBLIC_USE_BACKEND, deploy |
| 4 | (Optional) Buy domain, add in Vercel, set DNS |
| 5 | Add RESEND_API_KEY + RESEND_FROM_EMAIL in Vercel, redeploy, test invitations |

---

## Domain: do you need one?

- **No.** Vercel gives you a free URL like `your-project.vercel.app`. You can use that for the whole app and for links in Resend emails.
- **Yes, when you want:** A custom domain (e.g. `scenemapper.com`) is optional. Buy it from any registrar, then add it in Vercel and point DNS as Vercel instructs. No need to do this before Steps 1–3 or 5.
