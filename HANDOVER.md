
# SceneMapper – Handover

## Project Overview
SceneMapper is an interactive, crowd-sourced map application for building "scene maps": maps of people, spaces, events, and communities that define a scene. It supports multiple maps per user, role-based access (admin/collaborator/viewer), and a solarpunk-inspired UI. (Torontopia: Solarpunk Commons was an early example map.)

## Current State
- **Core Engine:** Built with React 19 and D3.js for high-performance spatial visualization.
- **Data Model:** Nodes support Titles, Detailed Descriptions, External Websites, and Tags.
- **Role-Based Access Control (RBAC):**
  - `Public`: Can view and submit (pending review).
  - `Collaborator`: Can submit (auto-approved) and move their own nodes.
  - `Admin`: Full moderation capabilities, can move all nodes, and manage the approval queue.
- **Moderation Workflow:** Real-time "Inbox" for admins to approve or deny user-submitted entries.
- **Persistence:** Data goes through **`lib/data.ts`**; when **`NEXT_PUBLIC_USE_BACKEND=true`**, it uses **Supabase** via **`app/api/`** routes (maps, nodes, connections, users, auth). LocalStorage is used when the backend is off (e.g. local dev without env).
- **Dashboard:** Create/edit map, list "YOUR MAPS" (hidden when no maps), copy link, QR code, delete with confirm, sort A–Z / Z–A, role labels (Admin/Collaborator/Viewed).
- **Map view:** Node popup on click only (not on drag), share (copy link, QR), admin-only node size and label font sliders (persisted).
- **Landing:** Featured maps section, logo image + fallback, "Why scene mapping?" link; copy updated (Map your scene your way, etc.).

## Component Architecture
- **Next.js App Router** (`app/`): Landing (`/`), map page (`/maps/[slug]`), dashboard (`/dashboard`). Map page fetches data once and passes to MapExperience. See `docs/DATA_FLOW.md`.
- `Map.tsx`: D3-powered SVG canvas with zoom, drag, and coordinate selection.
- `Sidebar.tsx`: Dual-purpose UI for filtering the manifest and viewing deep-dive details.
- `AdminReviewModal.tsx`: A focused moderation interface for verifying community submissions.
- `SubmissionModal.tsx`: A user-friendly form with a follow-up spatial placement step on the map.

## Recent session progress (to pick up)
- **Dashboard create/edit (Jan 31):** Region font and colour in Themes; layout/spacing fixes (separator, Connection lines, divider); increased font sizes; Create Map button in Your Maps. See `docs/SESSION_SUMMARY.md`.
- **Speed optimizations (done):** Tier 1–4 complete. Map page uses combined API, parallel fetch, single load effect. See `docs/SPEED_AND_EFFICIENCY_PLAN.md` and `docs/DATA_FLOW.md`.
- **Custom domain:** scenemapper.ca live. Session cookie shared across apex/www (12 months). Invitation emails use custom domain links. See `docs/SESSION_SUMMARY.md` for env vars and `docs/CUSTOM_DOMAIN_CLOUDFLARE_VERCEL.md` for setup.

## Version control & deployment
- **Git:** Repo on GitHub; **Vercel** for hosting; **Supabase** for DB. See **`docs/DEPLOYMENT_SEQUENCE.md`** for the full sequence. **Resend** is used for invitation emails when admins/collaborators add emails and save the map.
- **Map download:** Users can download the map as PNG, JPEG, or PDF from the Share section (full map + title/date overlay). **Edit invitation email** in the dashboard lets admins customize subject/body and sender name per map.

## Next Steps / Technical Debt
1. **Authentication:** Implement a real Auth provider (e.g. Supabase Auth or NextAuth) to replace the current role-toggle simulation; tie roles to real users.
2. **Multimedia Support:** Add image upload fields for nodes to create a richer visual experience.
3. **Mobile Polish:** While responsive, the D3 zoom/pan could be further optimized for multi-touch gestures.
4. **Real-time Updates:** Implement WebSockets or similar to allow users to see others adding nodes in real-time.
5. ~~**Custom Domain:**~~ Done. scenemapper.ca connected; Resend uses verified domain for invitations.

## Design Aesthetic
- **Solarpunk Theme:** Uses a palette of emerald greens, amber golds, and sky blues. 
- **Typography:** Uses 'Outfit' for modern readability and 'Playfair Display' for a more organic, historic feel.
- **Visuals:** Employs "Glassmorphism" for UI overlays to maintain the map's immersive feel.
