# Auth, Privacy & Account — Testing Checklist

Use this checklist after deployment or when verifying the auth and account flows.

---

## Auth (Supabase)

- [ ] **Signup with password confirmation**
  - Go to Dashboard → Create account
  - Enter name, email, password, confirm password
  - Mismatched passwords → show error, do not submit
  - Matching passwords → account created, redirected to homepage, signed in

- [ ] **Login**
  - Go to Dashboard → Log in
  - Enter valid email and password → signed in, redirected to homepage
  - Invalid credentials → show "Invalid email or password"

- [ ] **Logout**
  - Click "Log out" in Dashboard or Landing page
  - User is signed out; sees guest state

---

## Forgot Password

- [ ] **Request reset link**
  - Dashboard → Log in → "Forgot password?"
  - Enter email → success message: "If an account exists, we've sent a reset link"
  - Check inbox for reset email

- [ ] **Reset password flow**
  - Click link in email → lands on `/reset-password` with “Set new password” form
  - Email shown (read-only), enter new password twice → save → redirected to home
  - Log in with new password → succeeds

---

## Account Screen (`/account`)

- [ ] **Access**
  - Signed in → click email in top right (Dashboard or Home) → navigates to `/account`

- [ ] **Change email**
  - Enter new email + current password → save
  - Email updated; can log in with new email

- [ ] **Change password**
  - Enter current password, new password, confirm → save
  - Can log in with new password

- [ ] **Email notifications**
  - Maps you admin listed with checkboxes
  - Toggle checkbox → preference saved
  - Checked = receive daily digest; unchecked = no digest

- [ ] **Delete account**
  - Sole admin of X maps → confirmation: "X map(s) will be permanently deleted"
  - Not sole admin (or no maps) → confirmation: "Delete your account?"
  - Confirm → account deleted, signed out, redirected to homepage

---

## Map Visibility & Access

- [ ] **Public map**
  - Map with "Public map" checked → anyone with link can view (no login)

- [ ] **Private map** (`public_view = false`)
  - Logged-out user → 404 when opening map URL
  - Admin or collaborator → can view and edit

---

## Collaborator Join

- [ ] **Join with password**
  - Logged in as non-admin, non-collaborator
  - Map has collaborator password set
  - Enter correct password → "Join" → becomes collaborator
  - Wrong password → error

---

## Daily Digest (Optional)

- [ ] **Manual trigger**
  - `GET /api/cron/daily-digest` with `Authorization: Bearer YOUR_CRON_SECRET`
  - Returns JSON; no errors
  - Admins with prefs enabled receive email if there are pending submissions from today

---

## Quick Smoke (Post-Deploy)

1. Create account → create map → add node → log out → log back in → map still there
2. Click email → Account screen loads
3. Open private map URL while logged out → 404
