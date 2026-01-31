# Env and Migrations Checklist (Zero Discrepancies)

Use this before and after deploy to avoid env/schema mismatches.

---

## Vercel Environment Variables (Production)

Set these in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use it):

| Variable | Required | Value / Notes |
|----------|----------|----------------|
| `NEXT_PUBLIC_USE_BACKEND` | **Yes** | `true` — production must use API, not localStorage |
| `SUPABASE_URL` | **Yes** | Your Supabase project URL (same as in `.env.local` for parity tests) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase service_role key (never expose to client) |
| `RESEND_API_KEY` | No | For invitation emails; omit if not using Resend |
| `RESEND_FROM_EMAIL` | No | From address (e.g. `onboarding@resend.dev` for sandbox) |

**Important:** `NEXT_PUBLIC_*` is inlined at **build time**. Redeploy after changing env. No typo: use `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_KEY`).

---

## Supabase Migrations (Production DB)

The Supabase project that `SUPABASE_URL` points to must have these migrations applied (in order):

| Migration | Contents |
|-----------|----------|
| `20250129000001_initial_schema.sql` | users, maps, nodes tables |
| `20250130000001_connections.sql` | connections table |
| `20250130000002_invitation_emails.sql` | invitation email columns on maps |
| `20250130000003_maps_display_options.sql` | region_font_scale, enabled_node_types, connections_enabled on maps |
| `20250131000001_nodes_allow_region.sql` | allow REGION in nodes.type check |

**How to apply:** Supabase Dashboard → SQL Editor → run each migration file contents, or use `supabase db push` if using Supabase CLI.

---

## Quick verification

- [ ] Vercel Production has all required env vars; redeploy after any change.
- [ ] Production Supabase has all 5 migrations; API returns full map shape (theme, regionFontScale, enabledNodeTypes, connectionsEnabled).
