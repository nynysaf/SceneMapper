# Cloudflare R2 setup for map background images

Use this after creating your R2 bucket `map-backgrounds`. Two things are required: **public access** (so the app can show images) and **CORS** (so the browser can upload via presigned URLs).

---

## 1. Public base URL (you must enable this)

By default an R2 bucket is **private**. To get a URL that `<img src="...">` can use, you must turn on public access.

### Option A: r2.dev subdomain (simplest)

1. In the Cloudflare dashboard go to **R2** (object storage).
2. Click your bucket **map-backgrounds**.
3. Open the **Settings** tab.
4. Find the section **Public access** or **Public Development URL**.
5. Click **Enable** (or **Allow public access**).
6. When prompted, type **allow** and confirm.
7. The dashboard will show a **Public bucket URL** or **Public development URL**. It looks like:
   - `https://pub-<long-id>.r2.dev`
   That is your **public base URL**. Copy it (no trailing slash).
8. If you don’t see the URL on the same page, check the bucket **Overview** or **Settings** again after enabling; some accounts show it there. You can also upload a test file and open `https://pub-<id>.r2.dev/your-key` in a browser—the `<id>` is often your **Account ID** (found in the dashboard URL or Account details). Try `https://pub-<YOUR_ACCOUNT_ID>.r2.dev`.

Put this in `.env.local` as **R2_PUBLIC_URL** (no trailing slash), e.g.:

```env
R2_PUBLIC_URL=https://pub-abc123xyz.r2.dev
```

### Option B: Custom domain (for production)

If you use a domain on Cloudflare (e.g. `scenemapper.ca`):

1. R2 → **map-backgrounds** → **Settings**.
2. Under **Custom domains**, click **Add**.
3. Enter a subdomain, e.g. **assets.scenemapper.ca** (or **r2.scenemapper.ca**).
4. Click **Continue** and then **Connect domain**.

The “zone” here is your **domain** (e.g. `scenemapper.ca`) in Cloudflare. You must have that domain added to the same Cloudflare account (Websites → Add site). If you see **“The specified zone id is not valid”**, it usually means:

- The domain isn’t in this account, or
- You’re in the wrong place (e.g. CORS for something else that asks for a zone).

**CORS for R2 does not use a zone id**—you set CORS on the bucket (see below). Zone/domain is only for “Custom domains” on the bucket.

Your public base URL is then your custom domain, e.g.:

```env
R2_PUBLIC_URL=https://assets.scenemapper.ca
```

---

## 2. CORS (so the browser can upload)

CORS is set **on the R2 bucket**, not on a zone. Do **not** use any “zone id” field for this.

1. In the Cloudflare dashboard go to **R2**.
2. Click the bucket **map-backgrounds**.
3. Open the **Settings** tab.
4. Find **CORS Policy** (or **CORS**).
5. Click **Add CORS policy** (or **Edit**).
6. Use the **JSON** tab and paste a policy that allows your app origin and **PUT** (and **Content-Type**).

**Example for local dev and production:**

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `https://yourdomain.com` with your real app origin (e.g. `https://scenemapper.ca`). Use **no trailing slash** in origins. Add both `http://localhost:3000` and your production URL if you use both.

7. Save.

If you only use localhost for now:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

CORS changes can take up to ~30 seconds to apply.

---

## 3. R2 API token and env vars

1. In **R2** click **Manage R2 API Tokens** (or **Overview** → **Manage API Tokens**).
2. **Create API token**.
3. Name it (e.g. “SceneMapper map-backgrounds”).
4. Under **Object Read & Write**, choose **Apply to specific bucket** → **map-backgrounds** (or allow all buckets if you prefer).
5. Create and copy **Access Key ID** and **Secret Access Key** (you won’t see the secret again).

Your **Account ID** is in the dashboard URL when you’re in R2, or under **Account** in the left sidebar.

Add to `.env.local`:

```env
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=map-backgrounds
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

(Use your actual **R2_PUBLIC_URL** from step 1.)

---

## 4. Quick checklist

- [ ] Bucket **map-backgrounds** created
- [ ] **Public access** enabled (r2.dev or custom domain) and **R2_PUBLIC_URL** set
- [ ] **CORS** added on the bucket (no zone id)—origins include your app URL and `PUT` + `Content-Type` allowed
- [ ] **R2 API token** created and **R2_ACCOUNT_ID**, **R2_ACCESS_KEY_ID**, **R2_SECRET_ACCESS_KEY**, **R2_BUCKET_NAME** set in `.env.local`

After that, background image upload in the app should work.

---

## 5. Troubleshooting: "NetworkError when attempting to fetch resource"

This usually means the **browser blocked the upload** to R2 because of **CORS**. The upload is a cross-origin `PUT` from your app to R2; the bucket must allow your app’s origin.

**Do this:**

1. **Confirm which origin you’re using**  
   Open your app in the browser and check the address bar. The origin is exactly that URL with no path and no trailing slash, e.g.:
   - `http://localhost:3000`
   - `https://your-app.vercel.app`
   - `https://scenemapper.ca`

2. **Fix CORS on the R2 bucket**  
   R2 → **map-backgrounds** → **Settings** → **CORS Policy** → **Add CORS policy** (or Edit). In the **JSON** tab use (replace with your real origins):

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://your-app.vercel.app", "https://scenemapper.ca"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   - **AllowedOrigins:** Include **every** URL you use to open the app (localhost, Vercel URL, custom domain). No trailing slash. Exact match only.
   - **AllowedMethods:** Must include **PUT**.
   - **AllowedHeaders:** Must include **Content-Type**.

3. **Save and wait**  
   CORS can take up to ~30 seconds to apply. Try the upload again.

4. **Check the browser Network tab**  
   Open DevTools (F12) → **Network**. Try the upload again. Find the request that failed (it may be to an `r2.cloudflarestorage.com` or `r2.dev` URL). If you see a **CORS error** in the console or the failed request has no response body, CORS is still wrong or not applied yet.
