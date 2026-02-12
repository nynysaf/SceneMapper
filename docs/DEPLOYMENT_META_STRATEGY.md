# Meta Perspective: Why Deployment Keeps Breaking and How to Fix It

This doc explains **why** we keep seeing deployment errors and discrepancies, and **what meta-strategies** to use so deployment is reliable and consistent.

---

## 1. Why is this hard? (Meta perspective)

| Factor | What happens |
|--------|----------------|
| **Different environments** | Local (Windows, `.env.local`, maybe localStorage) vs Vercel (Linux, build env, production behavior). Same repo, but env, build cache, and runtime differ. We fix things locally without validating in a production-like setup. |
| **Reactive debugging** | We fix what the user reports: build error → fix signature; 404 → add rewrite. We don’t have a gate that catches “did we update all call sites?” or “does the build pass?” before push. |
| **Shared API, many call sites** | Data layer (`lib/data.ts`) is used by Dashboard, MapExperience, map page, import page. Changing a signature (e.g. add optional param) requires every caller to stay in sync. Missing one caller → TypeScript or runtime error in production. |
| **No single “does it work” gate** | “Works on my machine” ≠ “works on Vercel.” We don’t consistently run `npm run build` before push, or run it with production-like env. So broken states get pushed and we find out from Vercel or the user. |
| **State and logic drift** | We add features (e.g. `loaded`, “Map not found”) in one edit but a later edit or merge drops part of it (e.g. `loaded` state removed but `mapNotFound` still uses it). No automated check that “all referenced variables exist.” |
| **Env and build-time behavior** | `NEXT_PUBLIC_*` is inlined at build. If Vercel doesn’t have `NEXT_PUBLIC_USE_BACKEND=true` at build time, the client never uses the API. Env checklist exists but isn’t enforced before every deploy. |

So: **errors and discrepancies come from (1) no mandatory build check before push, (2) shared API changes without verifying all call sites, (3) env/build differences, and (4) partial edits that leave references to missing state.**

---

## 2. Meta-strategies to get deployment right

### A. Always validate the build before “done”

- **Rule:** After any change that touches types, the data layer, or new state (e.g. `loaded`), run `npm run build` locally.
- **If it fails:** Fix before commit. Do not push a failing build.
- **Why:** Vercel runs the same command. Catching TypeScript and build errors locally avoids “push → Vercel build fails → fix → push again.”

### B. Checklist-driven changes for shared APIs

- When changing a **shared API** (e.g. `getNodes(mapSlug, options?)`):
  1. Update the function signature in `lib/data.ts`.
  2. **Grep** for all call sites: `getNodes(`, `getMaps(`, `getMapBySlug(`, `getConnections(`.
  3. Update or verify each call site (add optional arg where needed).
  4. Run `npm run build`.
- Prevents “updated one place, forgot another” (e.g. getNodes signature fixed in lib but one caller still expects one arg in an older branch).

### C. Pre-deploy checklist (run before every push that can affect production)

1. **Build:** `npm run build` — must pass.
2. **Data layer:** If you changed `lib/data.ts` (exports, signatures), grep for call sites and confirm they match.
3. **Env:** If you added or changed env vars, update `.env.example` and the Vercel env checklist (see BUILD_PARITY.md). Ensure Production has `NEXT_PUBLIC_USE_BACKEND=true` and Supabase vars.
4. **Migrations:** If you added a migration, it must be run on the Supabase project used by the deployment (e.g. production).

Optional: run with production-like env locally (`NEXT_PUBLIC_USE_BACKEND=true`, same Supabase as Vercel), then smoke-test dashboard and one map.

### D. One logical change, one verification

- Avoid “fix A, then fix B, then push” without re-running the full build after the full set of edits. It’s easy to leave a reference to `loaded` without declaring it, or to update one caller and miss another. After the full change, run the pre-deploy checklist once.

### E. Document and enforce “no push without green build”

- Make it a habit: **do not push to `main` (or the branch Vercel deploys) unless `npm run build` has passed locally.** Optionally add a CI job (e.g. GitHub Actions) that runs `npm run build` on every push to `main` so broken builds never reach Vercel.

### F. Surface errors instead of failing silently

- Where the app catches API or load errors, show a clear message (“Map not found”, “Could not load maps”) instead of empty state only. That way “no data” is distinguishable from “request failed” and you can fix the right thing.

---

## 3. Pre-deploy checklist (concrete)

Before pushing code that might be deployed:

- [ ] **Build:** Run `npm run build`. It must finish with exit code 0.
- [ ] **Data layer:** If you changed `lib/data.ts` (function signatures or exports), run:
  - `rg "getMaps\(|getMapBySlug\(|getNodes\(|getConnections\(" --type-add 'src:*.{ts,tsx}' -t src` (or grep in your editor) and confirm every call site is correct.
- [ ] **Env (Vercel):** Confirm Production has: `NEXT_PUBLIC_USE_BACKEND=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Add any new vars from `.env.example`.
- [ ] **Migrations:** Any new migration in `supabase/migrations/` must be run on the Supabase project used by the deployment target.

After deploy:

- [ ] Open production URL → sign in → open Dashboard → confirm map list loads.
- [ ] Open a map → confirm nodes/theme load. If you see “Map not found,” the map doesn’t exist in that DB (create it or check env).

---

## 4. What we fixed this round

- **Build error:** `loaded` was used in `app/maps/[slug]/page.tsx` but never declared. The “Map not found” block depended on `loaded`; the effect that was supposed to set `loaded` had been omitted or reverted. Restored `const [loaded, setLoaded] = useState(false)` and set `setLoaded(true)` in the effect when the fetch completes (success or non-abort error).
- **Verification:** Ran `npm run build` locally; it now passes. Going forward, run this before every push to avoid the same class of error.

---

## 5. Summary

- **Root causes of deployment pain:** No mandatory build before push, shared API changes without checking all call sites, env/build differences, and partial edits (missing state).
- **Meta-strategies:** (1) Always run `npm run build` before considering a change done. (2) When changing the data layer, grep call sites and verify. (3) Use the pre-deploy checklist every time. (4) Don’t push to the deploy branch without a green build. (5) Optionally add CI that runs `npm run build` on push.
- **Immediate habit:** Before every push that can affect production, run `npm run build`. If it fails, fix first, then push.
