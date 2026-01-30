# Invitation Emails: Design & Implementation

When a map creator/editor adds new emails in "Invite admins by email" or "Invite collaborators by email" and clicks **Save changes** (or **Create map**), we send an invitation email to each **newly added** address.

---

## 1. Email mock-up

### Admin invitation

**Subject:** You're invited as an admin of **{Map title}**

**From:** `Scene Mapper <invitations@yourdomain.com>` (or Resend sandbox: `onboarding@resend.dev` for testing)

**Body (plain text):**

```
Hi,

You've been invited to help manage the map "{Map title}" on Scene Mapper.

As an admin you can:
• Add new people, spaces, events, and communities
• Approve or deny submissions
• Move, edit and delete elements
• Change map settings

Open the map: {origin}/maps/{slug}

If you don't have an account yet, sign up at {origin}/dashboard — then use the link above to open the map.

— Scene Mapper
```

**Body (HTML, same content):**

Simple single-column layout, same copy, with the "Open the map" as a clear button/link. Map title and link are variables.

---

### Collaborator invitation

**Subject:** You're invited to collaborate on **{Map title}**

**From:** (same as above)

**Body (plain text):**

```
Hi,

You've been invited to add and edit entries on the map "{Map title}" on Scene Mapper.

As a collaborator you can:
• Add new people, spaces, events, and communities
• Move your nodes on the map
• Edit your own entries

Open the map: {origin}/maps/{slug}

If you don't have an account yet, sign up at {origin}/dashboard — then open the map and, if needed, use "Join as collaborator" with the password shared by the map owner.

— Scene Mapper
```

---

## 2. Who sends the email?

The email is sent by your **backend**, not the browser. The "From" address is determined by the email provider you use (see below). Typical options:

| Sender identity | Meaning |
|-----------------|--------|
| **Resend** (recommended) | You use Resend’s API. "From" can be their sandbox `onboarding@resend.dev` (testing) or your domain (e.g. `invitations@yourdomain.com`) after adding the domain in Resend. |
| **SendGrid / Mailgun / etc.** | Same idea: your server calls their API; "From" is whatever you configure in that provider (often a verified domain). |
| **Supabase (Auth)** | Supabase can send auth-related emails (magic link, etc.). It is **not** meant for custom transactional emails like map invitations; use a dedicated email API instead. |

So: **your app (Vercel API route) calls an email provider’s API; the provider actually sends the email and shows as "From" the address you configured there.**

---

## 3. Implementation options (Vercel + Supabase)

| Option | Where it runs | How email is sent | Pros | Cons |
|--------|----------------|-------------------|------|------|
| **A. Next.js API route + Resend** | Vercel (serverless) | Resend API from the route | Simple, one codebase; Resend free tier (3k/mo); good deliverability | Need Resend API key (free signup) |
| **B. Next.js API route + SendGrid** | Vercel | SendGrid API | Free tier (100/day), widely used | Slightly more setup than Resend |
| **C. Supabase Edge Function + Resend** | Supabase | Resend API from Edge Function | Keeps email logic in Supabase layer | Extra moving part; cold starts; still need Resend |
| **D. Supabase DB trigger + external service** | Supabase | Trigger calls a webhook/API | Decoupled from app code | Complex; need to diff “new” emails in trigger or another service |

**Recommendation: Option A — Next.js API route + Resend**

- **Simple:** One place (your API) after saving maps: diff new emails, then call Resend.
- **Free:** Resend free tier is enough for invitation volume (3,000 emails/month).
- **Fits your stack:** You already have Vercel (Next.js) and Supabase; no need to add Supabase Edge Functions just for this.
- **From address:** Use Resend’s sandbox for development (`onboarding@resend.dev`); for production, add your domain in Resend and use e.g. `invitations@yourdomain.com`.

---

## 4. Recommended flow

1. **User adds/edits emails** in the create/edit map form and clicks **Save changes** (or **Create map**).
2. **Client** calls existing `POST /api/maps` with the full maps array (no change to client contract).
3. **Server** (`app/api/maps/route.ts`):
   - For each map in the request that has `invitedAdminEmails` or `invitedCollaboratorEmails`:
     - Fetch the **existing** map from Supabase (by id) to get previous `invited_admin_emails` and `invited_collaborator_emails`.
     - **Upsert** the map as you do now.
     - **Diff:** `newAdminEmails = current admins list − previous admins list`; same for collaborators.
   - Call a small **send-invitations** helper (or inline) that, for each new admin email, sends the admin invitation email via Resend; for each new collaborator email, sends the collaborator invitation email.
4. **Resend** sends the emails; "From" is the address you configured in Resend (sandbox or your domain).

So: **the email is sent by Resend on behalf of your app; the “sender” is the From address you set in Resend (e.g. `invitations@yourdomain.com` or `onboarding@resend.dev`).**

---

## 5. Minimal implementation checklist

- [ ] Sign up at [resend.com](https://resend.com) and get an API key.
- [ ] Add `RESEND_API_KEY` to Vercel env (and optionally `.env.local`).
- [ ] In `POST /api/maps`: before or after upsert, for each map, fetch existing map, diff admin/collaborator email lists, then for each new email call Resend (admin vs collaborator template).
- [ ] Use Resend’s Node SDK or `fetch` to their API; keep templates for subject/body (plain text or HTML) in code or a small shared file.
- [ ] (Optional) For production, add and verify your domain in Resend and set From to e.g. `invitations@yourdomain.com`.

If you want, the next step is to add the actual Resend integration and the diff/send logic in `app/api/maps/route.ts` (and a tiny template for the two email types) following this design.
