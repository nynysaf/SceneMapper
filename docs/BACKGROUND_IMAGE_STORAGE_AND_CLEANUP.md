# Background image storage: alternatives and cleanup

**Implemented:** Cloudflare R2 with **Option A (stable path)**. Map backgrounds use path `userId/mapId.ext`; replace overwrites. Delete on map delete in `DELETE /api/maps/[slug]`. See `lib/r2.ts`, `app/api/maps/upload-background/route.ts`, and `.env.example` for R2 config.

---

This doc compares hosting options and how to handle images when maps are deleted or when a user uploads a new image (replace).

---

## 1. Why not keep images in the API body?

Vercel’s serverless request body limit is **4.5 MB** and cannot be increased. A 5 MB image as base64 is ~6.7 MB, so we must store images in external storage and only save a URL in the map. The client uploads the file directly to the chosen provider (or via a presigned URL) so the file never hits our server.

---

## 2. Alternative image hosting (more free space than Supabase)

Supabase gives **500 MB** of storage on the free tier. Below are options with more free space that we can automate (API upload/delete).

| Provider        | Free tier (storage)        | Automation | Notes |
|----------------|----------------------------|------------|--------|
| **Supabase Storage** | 500 MB                    | ✅ Built-in (current design) | Easiest; already in stack. Cleanup keeps usage under 500 MB. |
| **Cloudflare R2**   | **10 GB** (monthly avg)   | ✅ S3-compatible API, presigned URLs | No egress fees. Need R2 bucket + API route to generate presigned upload URL; client uploads to that URL. |
| **Backblaze B2**    | **10 GB**                 | ✅ S3-compatible API          | Similar to R2; presigned upload + client upload. Cheap after free tier. |
| **Vercel Blob**     | **1 GB**                  | ✅ Client upload (no body through server) | Same platform as deploy. 1 GB &gt; 500 MB but less than R2/B2. |
| **Cloudinary**      | Credit-based (25/month)   | ✅ Upload/delete API          | Good for transforms; free tier is credit-based, not raw GB—check if it fits your volume. |

**Recommendation for “more free space without upgrading Supabase”:**

- **Cloudflare R2** or **Backblaze B2** give ~20× more free storage (10 GB vs 500 MB) and are easy to automate with presigned URLs (same flow as now: small API request, then client uploads file to the returned URL). R2 has free egress; B2 has limited free egress.
- **Vercel Blob** is a simple option if you want to stay on Vercel and 1 GB is enough.

---

## 3. Cleanup: when to remove stored images

Two cases matter:

1. **Map deleted** – the map’s background image should be removed from storage so it doesn’t count toward quota.
2. **User replaces the image** (edit map → new background) – the previous image is no longer referenced and can be removed (or overwritten).

### 3.1 Delete when a map is deleted

- **Where:** In `DELETE /api/maps/[slug]`, after auth and loading the map row, **before** deleting the row:
  - Select `background_image_url` (in addition to `id`, `admin_ids`).
  - If `background_image_url` is a URL we own (Supabase Storage, R2, B2, etc.), derive the object key/path and call the provider’s delete API.
  - Then delete the map row (and rely on DB/API for nodes, connections, views as today).
- **Why before row delete:** So we have the URL in hand; after delete we’d have to rely on soft-delete or a trigger.
- **Provider-agnostic:** Use a small helper that detects provider from URL (e.g. Supabase vs R2 public URL) and calls the right delete. If you only support one provider at a time, a single implementation is enough.

### 3.2 Replace: user uploads a new image (same map)

Today we use a **new UUID path every time** (`userId/uuid.ext`), so the old file stays in storage and becomes orphaned.

**Option A – Overwrite by stable path (no orphans on replace)**  
- Use one path per map: e.g. `userId/mapId.ext`.  
- **New map:** Create the map first (with no background or a placeholder), then request upload URL with `mapId` and upload to `userId/mapId.ext`, then PATCH the map with the public URL. So: create map → get id → upload → update map.  
- **Edit map:** Same path `userId/mapId.ext`; upload overwrites the previous file.  
- **On map delete:** Delete object at `userId/mapId` (or by parsing the stored URL).  
- **Pros:** No orphans on replace; simple mental model. **Cons:** New-map flow is two steps (create then upload) or one “create + save” that returns id and then a second “upload background” call.

**Option B – New path each time + delete old on replace**  
- Keep UUID paths. When the user is **editing** a map and uploads a new background:
  - Client (or server) deletes the old object using the current `background_image_url` (if it’s our storage).
  - Then upload new file (new UUID path) and save the new URL.
- **New map:** No old URL; just upload and save.  
- **On map delete:** Same as 3.1—delete object for `background_image_url` if it’s ours.  
- **Pros:** No change to “new map” flow. **Cons:** Need to pass “old URL” (or map id) into upload/delete when replacing; a few more code paths.

**Option C – Orphan cleanup job (optional extra)**  
- Periodic job (e.g. cron): list objects in the bucket, fetch all maps’ `background_image_url`, delete any object not in that set.  
- **Pros:** Catches any missed deletes or legacy data. **Cons:** More moving parts; listing can be costly at scale; only needed if you’re not confident in A or B.

**Recommendation:**  
- Implement **delete on map delete** (3.1) in all cases.  
- For replace, **Option A (stable path)** is cleanest long-term and avoids orphans; **Option B** is a good compromise if you want minimal change to the current “new map” flow and are okay deleting the old URL when the user replaces the image.

---

## 4. What to do before committing

1. **Choose provider**  
   - Stay with **Supabase** and add cleanup (delete on map delete + replace strategy).  
   - Or switch to **R2/B2** (or Vercel Blob) for more free space and implement the same cleanup rules for that provider.

2. **Choose replace strategy**  
   - **Stable path (A):** Upload API accepts `mapId` (optional for new maps); for new map, create map first then upload with that `mapId`.  
   - **Delete old on replace (B):** Upload API or a separate “delete background” endpoint accepts the old URL (or map id) and deletes that object when the user is replacing; client calls it before uploading the new image when editing.

3. **Apply migration only if using Supabase**  
   - If you stay on Supabase Storage, apply `20250208000001_map_backgrounds_storage_rls.sql` so authenticated users can upload and public can read.  
   - If you move to R2/B2/Blob, you can skip that migration (or keep it for a future Supabase fallback).

4. **Implement in code**  
   - **Delete on map delete:** In `DELETE /api/maps/[slug]`, select `background_image_url`, then call provider delete if URL is ours, then delete the row.  
   - **Replace:** Either stable path in upload API + Dashboard flow (create then upload for new map), or “delete old URL when replacing” in edit flow (Dashboard or API).

---

## 5. Summary table

| Decision              | Option 1 (minimal change)     | Option 2 (scale + no orphans)      |
|-----------------------|-------------------------------|------------------------------------|
| **Provider**          | Supabase (500 MB)             | Cloudflare R2 or Backblaze B2 (10 GB) |
| **Map delete**        | Delete object in DELETE route | Same                               |
| **Replace**           | Delete old URL when replacing | Stable path `userId/mapId.ext`; overwrite |
| **New map flow**      | Unchanged                     | Create map → upload with mapId → update map |

Both options automate storage and cleanup; Option 2 gives more free space and Option 2’s stable path keeps storage usage minimal on replace.
