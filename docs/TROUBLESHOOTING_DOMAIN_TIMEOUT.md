# Troubleshooting: Connection Timeout / NS_ERROR_NET_TIMEOUT on scenemapper.ca

**Symptoms:** "The connection has timed out", `NS_BINDING_ABORTED`, `NS_ERROR_NET_TIMEOUT` when opening www.scenemapper.ca or scenemapper.ca.

**Root cause (as of check):** Your DNS records are **not** pointing to Vercel. The browser never reaches Vercel’s edge, so the connection times out.

---

## What we found

| Host | Resolved IP | Expected for Vercel |
|------|-------------|---------------------|
| **www.scenemapper.ca** | `94.23.162.163` | Should resolve to Vercel’s edge (e.g. via CNAME → `cname.vercel-dns.com`, which uses IPs like `76.76.21.x` / `66.33.60.x`) |
| **scenemapper.ca** (apex) | `54.38.220.85` | Should be **76.76.21.21** (Vercel’s apex A record) |

- **94.23.162.163** – Not a Vercel IP (often OVH/other hosting).
- **54.38.220.85** – Not Vercel (76.76.21.21 is correct for apex).
- Vercel status page shows all systems operational, so the problem is **DNS/domain configuration**, not Vercel being down.

So: traffic for both **www** and **apex** is going to the wrong servers, which don’t respond (or respond slowly), hence timeouts and `NS_ERROR_NET_TIMEOUT` / `NS_BINDING_ABORTED`.

---

## What to do

### 1. Fix DNS in Cloudflare (recommended)

Your project uses **Cloudflare for DNS** and **Vercel for hosting** (see `docs/CUSTOM_DOMAIN_CLOUDFLARE_VERCEL.md`). You must point the domain to Vercel.

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → select **scenemapper.ca** → **DNS** → **Records**.

2. **Apex domain (scenemapper.ca):**
   - Find the **A** record for `@` (or `scenemapper.ca`).
   - Set **Content** to the value Vercel shows (e.g. **`216.198.79.1`** — Vercel’s current recommended IP; older `76.76.21.21` still works).
   - Set proxy to **DNS only** (gray cloud).

3. **www subdomain (www.scenemapper.ca):**
   - Find the **CNAME** record for `www`.
   - Set **Content** to the **exact** target Vercel shows (e.g. **`bd7927996716fd0c.vercel-dns-017.com`** — project-specific; no trailing space).
   - Set proxy to **DNS only** (gray cloud).

4. Remove or fix any other A/CNAME records that point **www** or apex to old/wrong IPs.

5. Save and wait 5–60 minutes (sometimes up to 24–48 hours) for DNS to propagate.

### 2. Confirm in Vercel

1. [Vercel Dashboard](https://vercel.com/dashboard) → your **Scene Mapper** project → **Settings** → **Domains**.
2. Ensure **scenemapper.ca** and **www.scenemapper.ca** are added.
3. Use the **exact** A and CNAME values Vercel shows there; they may sometimes differ from the generic `76.76.21.21` / `cname.vercel-dns.com`.
4. After DNS is fixed, both domains should show **Valid** / **Ready**.

### 3. Verify after propagation

- `nslookup scenemapper.ca` → should show **216.198.79.1** (or 76.76.21.21 if using the older record).
- `nslookup www.scenemapper.ca` → should show a CNAME to your Vercel target (e.g. `bd7927996716fd0c.vercel-dns-017.com`) and then a Vercel IP.
- Open https://scenemapper.ca and https://www.scenemapper.ca in a browser; both should load without timeout.

---

## Why you see NS_BINDING_ABORTED / NS_ERROR_NET_TIMEOUT

- **NS_ERROR_NET_TIMEOUT:** The browser tried to connect to the IP that DNS returned; that server didn’t respond in time (wrong host / down / blocking), so the connection timed out.
- **NS_BINDING_ABORTED:** The request was aborted (e.g. due to the timeout or user navigation); often a follow-on effect of the failed connection.

Fixing DNS so both apex and www point to Vercel removes these errors.

---

## Cloudflare matches Vercel but Vercel still shows "Invalid Configuration"

If your Cloudflare records **already match** what Vercel shows (A → `216.198.79.1`, CNAME → `bd7927996716fd0c.vercel-dns-017.com` or your project’s value) but Vercel still says "Invalid Configuration":

1. **Propagation delay** — Vercel checks DNS from its own resolvers. Those can take 15–60+ minutes (sometimes hours) to see your changes. Your browser might already be using the new records.
2. **Click "Refresh"** in Vercel next to each domain to re-run verification.
3. **CNAME target** — In Cloudflare, the CNAME content must be exactly what Vercel shows (e.g. `bd7927996716fd0c.vercel-dns-017.com`). No extra spaces; a trailing dot is optional.
4. **Try the site** — Open https://www.scenemapper.ca and https://scenemapper.ca in a browser (or an incognito window). If your resolver has updated, the site may load even while Vercel’s UI still shows Invalid. If it loads, wait for Vercel to catch up.

---

## If DNS is already correct in Cloudflare

If you’re sure the A and CNAME are set as above but you still see the wrong IPs:

1. **Cache:** Clear DNS cache on your machine (`ipconfig /flushdns` on Windows), try another network or device.
2. **Propagation:** Use [whatsmydns.net](https://www.whatsmydns.net) for scenemapper.ca and www.scenemapper.ca to see what the rest of the world resolves.
3. **Registrar:** Ensure the domain’s nameservers are still set to Cloudflare’s (so Cloudflare’s DNS is actually in use).
4. **Other DNS:** If you use another DNS provider for this domain, apply the same A and CNAME values there.

---

## Quick checklist

- [ ] Cloudflare A record for `@` → **216.198.79.1** (or value from Vercel), proxy **DNS only**
- [ ] Cloudflare CNAME for `www` → **exact value from Vercel** (e.g. `bd7927996716fd0c.vercel-dns-017.com`), proxy **DNS only**
- [ ] No A/CNAME for www or apex pointing to old/wrong IPs
- [ ] Click **Refresh** in Vercel Domains; wait 15–60+ min for "Invalid Configuration" to clear
- [ ] After propagation, https://scenemapper.ca and https://www.scenemapper.ca load without timeout

---

## Still not working after 6+ hours (DNS already matches)

If Cloudflare and Vercel records match but the site still times out or others see “email validation” / “invalid configuration”:

### 1. Email / domain ownership verification (Vercel)

Vercel sometimes requires **verifying you own the domain** before the custom domain goes live:

- **In Vercel:** Project → **Settings** → **Domains**. For each domain, look for a **“Verify”** link, **“Send verification email”**, or a **TXT record** Vercel asks you to add. Complete any pending step.
- **Email:** Check the inbox (and spam) of the **registrant or admin contact** for scenemapper.ca (the address in your domain registrar’s WHOIS / contact info). Vercel may send the verification there.
- **TXT record:** If Vercel shows a TXT record for ownership, add it in Cloudflare (DNS → Records), wait a few minutes, then click **Refresh** or **Verify** in Vercel.

If the domain was ever used by another Vercel team, Vercel will ask for this verification before activating it for your project.

### 2. Remove and re-add the domain in Vercel (clear cached “Invalid”)

Vercel can **cache a failed verification**. Even with correct DNS, the UI can stay “Invalid Configuration” until the domain is re-verified from scratch:

1. In Vercel → **Settings** → **Domains**, **remove** both **scenemapper.ca** and **www.scenemapper.ca** (do not change DNS in Cloudflare).
2. Wait **5–10 minutes**.
3. **Add** **www.scenemapper.ca** first. Use **Add** → enter `www.scenemapper.ca` → Add. Your existing CNAME in Cloudflare should match; Vercel will re-check from scratch.
4. Once www shows Valid/Ready, add **scenemapper.ca** (apex). Your existing A record should match.
5. Check again in 10–15 minutes; the site may start working after this refresh.

### 3. Confirm the app works on the default Vercel URL

- Open your deployment URL (e.g. `https://your-project-name.vercel.app` or the URL in Vercel → Deployments → Production).
- If that URL **loads fine** but the custom domain does not, the issue is only domain/DNS/verification, not the app or build.
- If the **vercel.app** URL also fails, the problem is the deployment or Vercel project (build, runtime, or outage).

### 4. Optional: Use Vercel’s nameservers (if you want Vercel to manage DNS)

If you’re willing to move DNS for scenemapper.ca to Vercel:

- In Vercel → **Domains** (team-level) or project **Settings** → **Domains**, look for **“Use Vercel Nameservers”** or **“Transfer DNS”**.
- Point the domain’s nameservers at the registrar to the values Vercel gives. Then you manage A/CNAME in Vercel instead of Cloudflare for this domain.
- **Caveat:** You currently use Cloudflare for other records (e.g. R2 `assets.scenemapper.ca`, Resend MX/TXT). You’d need to re-create those in Vercel DNS or keep only the apex/www on Vercel and the rest on Cloudflare (split setup is more complex). Only do this if you’re comfortable managing two places or moving all records.

### 5. What “email validation” might mean for visitors

If **other people** see a message about “email validation” or “something needs to be validated”:

- They may be seeing **Vercel’s** or the **host’s** generic “domain not fully set up” / “verification needed” page when the custom domain isn’t yet active.
- Or a **browser/security** message that they’re interpreting as “email.”  
- Easiest fix is still to complete any **domain verification in Vercel** (step 1) and **remove/re-add domains** (step 2) so Vercel marks the domain as valid.

### 6. Contact Vercel support

If DNS is correct, you’ve done steps 1–2, and it’s still broken:

- **Help** in the Vercel dashboard (?) or [vercel.com/help](https://vercel.com/help) → open a ticket.
- Include: **scenemapper.ca** and **www.scenemapper.ca**, that DNS in Cloudflare matches the required A and CNAME, that you’ve removed/re-added the domains, and that others see “email validation” or timeout. They can confirm whether a verification email is pending or there’s an account/domain lock.
