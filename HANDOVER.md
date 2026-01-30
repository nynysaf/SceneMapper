
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
- **Persistence:** Data goes through **`lib/data.ts`** (localStorage-backed); **`app/api/`** routes exist as stubs for a future backend (Supabase).
- **Dashboard:** Create/edit map, list "YOUR MAPS" (hidden when no maps), copy link, QR code, delete with confirm, sort A–Z / Z–A, role labels (Admin/Collaborator/Viewed).
- **Map view:** Node popup on click only (not on drag), share (copy link, QR), admin-only node size and label font sliders (persisted).
- **Landing:** Featured maps section, logo image + fallback, "Why scene mapping?" link; copy updated (Map your scene your way, etc.).

## Component Architecture
- `App.tsx`: Central state hub and orchestration.
- `Map.tsx`: D3-powered SVG canvas with zoom, drag, and coordinate selection.
- `Sidebar.tsx`: Dual-purpose UI for filtering the manifest and viewing deep-dive details.
- `AdminReviewModal.tsx`: A focused moderation interface for verifying community submissions.
- `SubmissionModal.tsx`: A user-friendly form with a follow-up spatial placement step on the map.

## Recent session progress (to pick up)
- **Create/Edit map screens:** Title "Map your scene, your way." (create) / "Edit your map" (edit). Body copy: "Build your map to inspire your scene..." with bold **name**, **Describe**, **background image** bullets. Left column has "YOUR MAPS" section (only when user has maps). Solarpunk Emerald theme description: "Bright greens, warm neutrals – like nature on M" (no Torontopia mention).

## Version control
- No git repository in the project yet. To save progress in future: `git init`, add a `.gitignore` (e.g. `node_modules`, `.next`, `.env*.local`), then commit.

## Next Steps / Technical Debt
1. **Backend Integration:** Replace LocalStorage with a persistent database (e.g., Supabase, Firestore).
2. **Authentication:** Implement a real Auth provider to replace the current role-toggle simulation.
3. **Multimedia Support:** Add image upload fields for nodes to create a richer visual experience.
4. **Mobile Polish:** While responsive, the D3 zoom/pan could be further optimized for multi-touch gestures.
5. **Real-time Updates:** Implement WebSockets or similar to allow users to see others adding nodes in real-time.

## Design Aesthetic
- **Solarpunk Theme:** Uses a palette of emerald greens, amber golds, and sky blues. 
- **Typography:** Uses 'Outfit' for modern readability and 'Playfair Display' for a more organic, historic feel.
- **Visuals:** Employs "Glassmorphism" for UI overlays to maintain the map's immersive feel.
