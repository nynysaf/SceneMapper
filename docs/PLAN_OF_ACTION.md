# Scene Mapper: Development Plan — Feb 1, 2026 Session

**Goal:** Implement new UI/UX features for the Dashboard create/edit screens before pushing to production.

---

## Current Session Tasks

### 1. Featured Map
- [x] **1.1** Add `emerging-scene-toronto` to `FEATURED_MAP_HREFS` in `LandingPage.tsx`

### 2. UI Spacing & Dividers (Dashboard Create/Edit)
- [x] **2.1** Add a divider line between Background map image and Theme sections
- [x] **2.2** Add body text under "Edit your map" title: "Evolution is sexy. Now is a great time to tweak your description, refresh your colours, and add some new collaborators! 😎"

### 3. Connection Lines Layout
- [x] **3.1** Put Line Colour, Opacity, and Thickness on the same row by shrinking Line Colour column width (use 3-column grid)

### 4. Font Size Consistency
- [x] **4.1** Update "Region font" label to use `text-xs` (matches Event colour)
- [x] **4.2** Update "Community color" label to use `text-xs` (matches Event colour)  
- [x] **4.3** Update "Line colour" label to use `text-xs` (matches Event colour)

### 5. Canadian Spelling (Colour)
- [x] **5.1** Change all "Color" labels to "Colour" in Dashboard.tsx
- [x] **5.2** Audit other components for "Color" references that users see

### 6. Region Font Dropdown Preview
- [x] **6.1** Display each font option in its own font-family in the Region font dropdown

### 7. Upload Data Feature (New)
- [x] **7.1** Add "Upload data (optional)" field below "Edit invitation email" link
- [x] **7.2** Create xlsx file input with drag-and-drop support
- [x] **7.3** Add "Download template" link for blank xlsx with correct headers
- [x] **7.4** Implement duplicate detection logic (check existing database)
- [x] **7.5** Add new unique rows from uploaded file to database
- [x] **7.6** Show upload results (added count, duplicates skipped)

### 8. Map Icon Customization (New)
- [x] **8.1** Add clickable icon beside map name in edit mode
- [x] **8.2** Create emoji picker popup modal
- [x] **8.3** Add background colour picker for icon
- [x] **8.4** Save icon emoji and background colour to map data
- [x] **8.5** Display custom icon in map list and map view

---

## Backlog (Previous Plan - Deferred)

### Diagnostics (Production Parity)
- [ ] D1. Local build: Run `npm run build`
- [ ] D2. Vercel environment audit (manual)
- [ ] D3. Production network and behavior
- [ ] D4. Supabase schema vs migrations
- [ ] D5. Production-like local run

### Fixes (After Diagnostics)
- [ ] F1. Environment (Vercel)
- [ ] F2. Supabase schema
- [ ] F3. API and mappers
- [ ] F4. Error surfacing (no silent failures)
- [ ] F5. Env naming consistency

### Guardrails (Prevent Regressions)
- [ ] G1. Pre-push / pre-deploy checklist
- [ ] G2. CI (already in place)
- [ ] G3. Post-deploy smoke test
- [ ] G4. Single source of truth for "what to check"

### Future Enhancements
- [ ] Tier 3 (remaining): Short TTL cache, prefetch from Dashboard
- [ ] Remove debug logging from `POST /api/maps` once stable
- [ ] Supabase Auth / NextAuth to replace role simulation

---

## Session Progress

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Featured map | ✅ Complete | Added `emerging-scene-toronto` to FEATURED_MAP_HREFS |
| 2.1 Divider line | ✅ Complete | Added `<hr>` between Background image and Theme sections |
| 2.2 Edit body text | ✅ Complete | Added encouraging text with emoji under Edit title |
| 3.1 Connection lines row | ✅ Complete | Changed to 3-column grid, all fields on one row |
| 4.1-4.3 Font sizes | ✅ Complete | All labels now use `text-xs` consistently |
| 5.1-5.2 Canadian spelling | ✅ Complete | Changed all "Color" to "Colour" |
| 6.1 Font preview dropdown | ✅ Complete | Added `style` with font-family to each option |
| 7.1-7.6 Upload data | ✅ Complete | Added xlsx upload with duplicate detection + template download |
| 8.1-8.5 Icon customization | ✅ Complete | Added emoji picker with background colour selection |

---

## Key Files

| File | Relevant Tasks |
|------|----------------|
| `components/LandingPage.tsx` | 1.1 (FEATURED_MAP_HREFS) |
| `components/Dashboard.tsx` | 2.1, 2.2, 3.1, 4.x, 5.x, 6.1, 7.x, 8.x |
| `types.ts` | 8.4 (add icon fields to SceneMap) |
| `lib/data.ts` | 7.x (upload/duplicate logic) |
| `lib/db-mappers.ts` | 7.x, 8.x (new fields) |
