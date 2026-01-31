# D3: Production network and behavior — step-by-step

Do this on your **live production URL** (e.g. `https://your-project.vercel.app`). Use a normal browser (Chrome, Edge, Firefox).

---

## Part A: Dashboard — does the client call the API?

1. **Open production**  
   Go to your Vercel deployment URL (e.g. `https://scene-mapper-xxx.vercel.app`).

2. **Open DevTools**  
   - **Windows:** `F12` or `Ctrl+Shift+I`  
   - **Mac:** `Cmd+Option+I`  
   - Or right-click the page → **Inspect**.

3. **Open the Network tab**  
   - Click **Network** (or **Net**).  
   - Ensure **Preserve log** is checked (so navigation doesn’t clear the list).  
   - In the filter box, type `api` so you only see API requests (or leave empty to see all).

4. **Go to the Dashboard**  
   - Sign in if needed, then open **Dashboard** (e.g. click Dashboard in the nav or go to `/dashboard`).

5. **Check for `/api/maps`**  
   - In the Network list, find a request whose **Request URL** ends with `/api/maps` (method **GET**).  
   - **If you see it:** The production client is using the API (backend is on).  
   - **If you do not see it:** The client is likely using localStorage (backend off or not in build).

6. **Record status and body**  
   - Click the `/api/maps` request.  
   - **Status:** In **Headers** or the request row, note the status code (200, 401, 500, etc.).  
   - **Body:** Open the **Response** (or **Preview**) tab.  
     - **200:** You should see a JSON array (e.g. `[]` or `[{ "id": "...", "title": "...", ... }]`). Note whether it’s an array and whether it has map objects.  
     - **4xx/5xx:** Note the status and any error message in the response body.

**Write in `DIAGNOSTIC_RESULTS.md` (D3):**  
- Dashboard: request to `/api/maps`? **Y** or **N**.  
- Status: **___**.  
- Body: **array of maps** / **empty []** / **error message** / **other (describe)**.

---

## Part B: Map page — does it request map and nodes?

1. **Still in DevTools → Network**  
   Clear the list (trash icon) so the next steps are easy to read.

2. **Open a map**  
   - From the Dashboard, click a map to open it (e.g. `/maps/my-map-slug`),  
   - **or** go directly to a known map URL: `https://your-production-url.vercel.app/maps/<slug>`.

3. **Check for map and nodes requests**  
   Look for these two requests (GET):
   - `/api/maps/<slug>` — fetches the map (title, theme, options).  
   - `/api/maps/<slug>/nodes` — fetches nodes for the map.

4. **Record**  
   For each request you see:
   - **Status:** 200, 404, 500, etc.  
   - **Response:** array/object vs error body.

   If the map doesn’t exist, `/api/maps/<slug>` may correctly return **404**.  
   If you get **500** or no request at all, note that.

**Write in `DIAGNOSTIC_RESULTS.md` (D3):**  
- Map page: request to `/api/maps/[slug]`? **Y** / **N**. Status: **___**.  
- Request to `/api/maps/[slug]/nodes`? **Y** / **N**. Status: **___**.

---

## Part C: Vercel Function Logs (server-side errors)

1. **Open Vercel**  
   Go to [vercel.com](https://vercel.com) → your team → your **Scene Mapper** project.

2. **Open the latest production deployment**  
   - **Deployments** tab → click the latest **Production** deployment (green checkmark).

3. **Open function/runtime logs**  
   - Look for **Functions**, **Logs**, or **Runtime Logs** (wording depends on Vercel UI).  
   - You want logs for serverless function runs (API routes).

4. **Trigger the same traffic again**  
   - In another tab, open production → Dashboard (to trigger GET `/api/maps`).  
   - Then open a map page (to trigger GET `/api/maps/[slug]` and GET `/api/maps/[slug]/nodes`).

5. **Check for errors**  
   - In the logs, look for entries for `/api/maps`, `/api/maps/[slug]`, `/api/maps/[slug]/nodes`.  
   - Note any **500** status or error messages (e.g. Supabase connection, missing env, uncaught exception).

**Write in `DIAGNOSTIC_RESULTS.md` (D3):**  
- Vercel Function Logs: **No errors** / **500 on ___** / **Error: ___**.

---

## Quick summary

| Check | Where | What to record |
|-------|--------|----------------|
| Dashboard | DevTools → Network, then go to Dashboard | Is there GET `/api/maps`? Status? Response (array vs error)? |
| Map page | DevTools → Network, then open a map | GET `/api/maps/[slug]` and `/api/maps/[slug]/nodes`? Status for each? |
| Server | Vercel → Project → Deployments → latest → Logs | Any 500s or errors on those API routes? |

When done, fill in the **D3** section of `docs/DIAGNOSTIC_RESULTS.md` with your notes.
