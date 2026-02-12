# Work Plan Overview

| Phase | Contents | Status |
|-------|----------|--------|
| **1** | Supabase Auth migration — Use Supabase Auth, new signup/login routes, password confirmation on signup, retire custom users/session | ✅ Done |
| **2** | Forgot password — "Forgot password?" link, reset email via Supabase, land on `/reset-password` to set new password (with confirmation) | ✅ Done |
| **3** | Privacy gaps — Use `publicView` for map visibility, expose toggle in Dashboard, add `POST /api/maps/[slug]/join` for collaborator password | ✅ Done |
| **4** | Account screen — `/account` with change email, change password, delete account (with sole-admin map warning), notification prefs per map | ✅ Done |
| **5** | Daily digest — `user_map_notification_prefs` table, Resend digest email, Vercel Cron at 11:59 PM ET | ✅ Done |
| **6** | Cleanup — Remove legacy auth, update session consumers, testing | ✅ Done |
| **7** | New Feature Batch (Feb 4) — Your Maps filtering, edit/delete restrictions, permission mode UI, map boundary, admin review edit, confetti, QR download, Communities→Groups, Media category, expandable Create/Edit sections, multi-select nodes, contact CTA & page | 🔲 Planned |

---

## Next Actions

- **Run testing checklist** — `docs/TESTING_CHECKLIST.md` after each deploy
- **Optional:** Supabase Custom SMTP (Resend) — send auth emails from your domain (see `docs/BEFORE_FIRST_RUN.md` § 3.4)

---

## Reference

- Full details: `docs/AUTH_AND_PRIVACY_WORK_PLAN.md`
- New Feature Batch (Phase 7): `docs/PLAN_OF_ACTION.md` § New Feature Batch
- Testing: `docs/TESTING_CHECKLIST.md`
