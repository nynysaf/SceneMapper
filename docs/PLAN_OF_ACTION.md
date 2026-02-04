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

## New Feature Batch — Feb 4, 2026

Prioritized and sequenced. Implement in order where dependencies exist.

### Phase A: Security & Access Control (Critical)

#### A1. Your Maps Filtering & Edit/Delete Restrictions
- [ ] **A1.1** Add `user_map_views` (or equivalent) to track which maps a user has viewed. Migration: `user_id`, `map_id`, `viewed_at`. Record view when user opens a map.
- [ ] **A1.2** Update `GET /api/maps` (and/or client filtering) so "Your Maps" returns only: maps where user is admin, collaborator, or has viewed.
- [ ] **A1.3** In Dashboard, restrict Edit and Delete buttons: show Edit only for maps the user is admin of; show Delete only for maps the user is admin of. Hide or disable for non-admins.

### Phase B: Bug Fixes (High Priority)

#### B1. Node Sidebar Edit/Delete Not Working
- [ ] **B1.1** Fix Edit and Delete buttons in the sidebar when a node is selected. Both currently close the pane instead of triggering the intended action. Trace event handlers and fix propagation/closing logic.

#### B2. Mobile Title Disappearing
- [ ] **B2.1** Fix bug: "Sometimes the title disappears when I leave the map area (and it doesn't come back)." Investigate map title visibility/positioning and restore state when returning.

#### B3. Connection Lines While Dragging
- [ ] **B3.1** Keep connection lines visible while dragging the attached node; they should not disappear during drag.

### Phase C: Layout & UX Polish

#### C1. Permission Mode Button (Desktop)
- [ ] **C1.1** Make the permission mode button floating on desktop so it is not hidden beneath the sidebar when the sidebar is expanded. Adjust z-index and positioning.

#### C2. Permission Mode Button (Mobile)
- [ ] **C2.1** On mobile, keep text with the permission mode control (not just icon). Ensure labels like "Public" / "Collaborator" / "Admin" remain visible.

#### C3. Map Canvas Boundary
- [ ] **C3.1** Add a boundary on the map canvas to prevent users from scrolling too far and losing the map. Ensure part of the map is always visible.

#### C4. Website Button Text Unification
- [ ] **C4.1** Change "Visit Official Site" (NodePopup) and "Visit Digitally" (Sidebar) to both say "Visit link".

#### C5. Sidebar Line Breaks
- [ ] **C5.1** In the sidebar, when a node is selected and its description is shown, render line breaks (e.g. `\n`) as actual line breaks instead of a wall of text.

### Phase D: Admin & Submission Workflow

#### D1. Admin Review Edit Button
- [ ] **D1.1** In admin view, when reviewing submissions, add an "Edit" button so admins can edit, approve, or deny from a single flow.

#### D2. Admin Save Button (Feel-Good UX)
- [ ] **D2.1** In admin view, beside "Edit Map Settings", add a Save button. On click: show pop-up "All changes saved", with confetti exploding from behind the pop-up that fades away within ~2 seconds. Map saves ongoingly; this is purely for user satisfaction.

### Phase E: Confetti & Celebrations

#### E1. Confetti on Node Placement
- [ ] **E1.1** When any user places a new node, trigger a small confetti effect that pops out from the node. Confetti fades away within 2 seconds.

### Phase F: QR Code & Download

#### F1. QR Code Download
- [ ] **F1.1** In the QR code popup, add a Download button. Downloads the QR code and map name as a single `.png` image.

### Phase G: Naming & Categories

#### G1. Communities → Groups
- [ ] **G1.1** Rename "Communities" to "Groups" in the UI.
- [ ] **G1.2** Rename node category "Community" to "Group" (update `NodeType` label/display; consider migration for existing `COMMUNITY` enum value or keep enum, change display label).

#### G2. New Category: Media
- [ ] **G2.1** Add new node type/category: **Media**. Have it deselected by default in map settings and filters.
- [ ] **G2.2** Add Person as deselected by default (alongside Media).

### Phase H: Create/Edit Map Panel Reorganization

#### H1. Expandable Sections
- [ ] **H1.1** First few fields up to "Background map image": expanded by default.
- [ ] **H1.2** Theme: whole expandable section, starts collapsed.
- [ ] **H1.3** "Public map" checkbox onwards: collapsed section titled "Roles & permissions".
- [ ] **H1.4** Upload data: collapsed section titled "Advanced".
- [ ] **H1.5** In Advanced: add checkbox "Submit as a featured map" with subtext: "Proud of your map? Share it to inspire others!"

### Phase I: Multi-Select & Map Canvas

#### I1. Shift+Click+Drag Multi-Select (Desktop)
- [x] **I1.1** Allow Shift+Click+Drag to select multiple nodes for repositioning on desktop.
- [x] **I1.2** When multiple nodes selected, side panel shows "# nodes selected" (e.g. "3 nodes selected").
- [x] **I1.3** Implement bulk repositioning for the selected nodes.

### Phase J: Contact Page & CTA

#### J1. Contact CTA & Page
- [x] **J1.1** Add CTA at bottom of home screen: "Take your scene & network mapping to the next level: [contact our guild] for workshops, consulting, and custom software." Link opens `/contact`.
- [x] **J1.2** Create `/contact` page with form: name, email, subject, body, and Send button.
- [x] **J1.3** Above the form, add brief explanatory text: Scene Mapper is one tool used by a guild of systems mappers and network mappers, part of an even larger network of systems convenors, facilitators, and consultants. Seeing and nurturing systems and scenes is a learnable skill, and we love to support those on their learning journey.

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
- [x] Remove debug logging from `POST /api/maps` — done
- [x] Supabase Auth — done (see `docs/AUTH_AND_PRIVACY_WORK_PLAN.md`)

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
| `components/LandingPage.tsx` | 1.1 (FEATURED_MAP_HREFS), J1.1 |
| `components/Dashboard.tsx` | 2.1, 2.2, 3.1, 4.x, 5.x, 6.1, 7.x, 8.x, A1.2–A1.3, D1.1, D2.1, G1, G2, H1 |
| `components/MapExperience.tsx` | B2.1, B3.1, C1.1, C2.1, C3.1, E1.1, I1.x |
| `components/Sidebar.tsx` | B1.1, C4.1, C5.1, F1.1 |
| `components/NodePopup.tsx` | C4.1 |
| `components/AdminReviewModal.tsx` | D1.1 |
| `types.ts` | 8.4 (add icon fields), G2.1 (Media category) |
| `lib/data.ts` | A1.1 (view tracking) |
| `lib/db-mappers.ts` | 7.x, 8.x (new fields), G2 |
| `app/api/maps/route.ts` | A1.2 |
| `app/contact/page.tsx` | J1.2–J1.3 (new) |
