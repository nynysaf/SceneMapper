# Connecting a Custom Domain (Cloudflare) to Vercel

Step-by-step guide to connect a domain managed in Cloudflare to your Scene Mapper Vercel deployment.

---

## Prerequisites

- Domain registered and added to Cloudflare (nameservers already pointing to Cloudflare)
- Vercel project deployed (e.g. Scene Mapper)
- Access to both Cloudflare and Vercel dashboards

---

## Important: Cloudflare Proxy vs DNS-Only

**Vercel does not recommend using Cloudflare as a reverse proxy** in front of Vercel. Proxying (orange cloud) can cause:
- Reduced traffic visibility for Vercel's security
- Extra latency
- Caching conflicts
- Bot protection issues

**Use Cloudflare in DNS-only mode (gray cloud)** for records pointing to Vercel. You keep Cloudflare for DNS management and other records (e.g. MX for email), but Vercel gets direct traffic.

---

## Step 1: Add Domain in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **Scene Mapper** project (or your project name)
3. Click **Settings** → **Domains**
4. Click **Add Domain**
5. Enter your domain:
   - **Apex domain:** `yourdomain.com`
   - **Subdomain:** `app.yourdomain.com` or `www.yourdomain.com`
   - You can add both (apex + www) for full coverage
6. Click **Add**
7. Vercel will show the DNS records you need. **Copy or note these values** — you’ll need them for Cloudflare:
   - **Apex (e.g. yourdomain.com):** A record → `76.76.21.21`
   - **Subdomain (e.g. www):** CNAME record → something like `cname.vercel-dns.com` or a project-specific target (e.g. `xxxx.vercel-dns-xxx.com`)

Use the **exact** values Vercel shows for your project.

---

## Step 2: Configure DNS in Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Go to **DNS** → **Records**
4. Add or edit records as follows.

### Option A: Apex domain only (e.g. yourdomain.com)

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| A | `@` | `76.76.21.21` | **DNS only (gray cloud)** |

### Option B: Subdomain only (e.g. app.yourdomain.com or www.yourdomain.com)

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| CNAME | `app` or `www` | `cname.vercel-dns.com` (or the target Vercel gave you) | **DNS only (gray cloud)** |

### Option C: Both apex and www

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| A | `@` | `76.76.21.21` | **DNS only (gray cloud)** |
| CNAME | `www` | `cname.vercel-dns.com` (or Vercel’s target) | **DNS only (gray cloud)** |

### Critical: Set proxy to DNS only

- Click the **orange cloud** so it becomes a **gray cloud** (DNS only) for any record pointing to Vercel.
- Orange = proxied (not recommended with Vercel)
- Gray = DNS only (recommended)

---

## Step 3: Verify in Vercel

1. Back in Vercel → **Settings** → **Domains**
2. Wait a few minutes for DNS propagation (sometimes up to 24–48 hours)
3. When the domain status shows **Valid** and **Ready**, you’re done
4. Optionally use **Refresh** or **Verify** if Vercel supports it

---

## Step 4: Test Your Site

1. Open your custom domain in a browser (e.g. `https://yourdomain.com` or `https://app.yourdomain.com`)
2. Confirm Scene Mapper loads correctly
3. Check that HTTPS works (Vercel provisions SSL automatically)

---

## Troubleshooting

### Domain shows "Invalid Configuration" or similar in Vercel

- Confirm the A record points to `76.76.21.21` for apex
- Confirm the CNAME target matches exactly what Vercel shows
- Ensure Cloudflare proxy is **off** (gray cloud) for Vercel records
- Wait longer; DNS can take up to 48 hours to propagate

### Site loads but SSL shows as invalid or mixed content

- Give Vercel a bit more time to provision the certificate
- Ensure no other SSL/redirect settings in Cloudflare conflict (e.g. "Always Use HTTPS" can stay on if you’re not proxying)

### I want to keep Cloudflare proxy (orange cloud)

Vercel discourages this. If you still use it:

- Enable **"Resolve Over HTTPS"** or equivalent so Cloudflare sends the correct origin
- Consider **Cache Level: Bypass** for your app subdomain to avoid cache conflicts
- Expect possible issues with Vercel’s security and bot protection

---

## Summary Checklist

- [ ] Domain added in Vercel project settings
- [ ] A record for apex (`@` → `76.76.21.21`) or CNAME for subdomain added in Cloudflare
- [ ] Proxy set to **DNS only** (gray cloud) for Vercel records
- [ ] Vercel shows domain as Valid / Ready
- [ ] Site loads over HTTPS on your custom domain
