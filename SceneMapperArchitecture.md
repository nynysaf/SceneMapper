# Scene Mapper



### Description

Scene Mapper is a web/mobile tool that allows a 'scene' (community) to collaboratively create a living visual map of the events, people, spaces and communities that compose the 'scene'. An individual can create a new map, set permissions, add the background image, designate other admins, and adjust the colour themes. Collaborators may add to the map freely (as designated  in the permissions), and the public may view the map and submit new nodes or connections.



### Architecture

##### Scene Mapper Landing Page

* Explains Scene Mapper
* Button to log-in or create an account
* Button to create a map (requires an account)



##### Create a map

* The admin gets a creation form that generates the map
* Includes a title, url slug, map description (up to 300 words), canvas image upload or generation, add other emails to invite other admins or collaborators, map themes: a few font options and some premade colour pallets (or custom). There is a section to set the collaborator password (allows someone to join as a collaborator).
* A button to generate the map



##### Logged in user view

* Once logged in a user can view the maps they are admin for, the maps they have entered collaborator password for, and the maps they have viewed as public.
* They can also change their email address or password
* The 'create map' button also appears here



##### Map view

* This view has already been created
* If a public user wants to join as collaborator they are prompted for the password
* At any point someone can log-in which links the map to their account (with the access level granted)



### Sharing

Maps should be easily shared by url, via social channels, or generate a QR code for folks to view the map in public. 

### Current progress (2026-01-29)- **Next.js App Router**: Landing, dashboard, and `/maps/[slug]` routes are wired up and building cleanly with TypeScript.
- **Multi-map dashboard**: Users can create/edit maps with title, slug, description, background image, collaborator password, theme presets + custom colors, and invite emails. Maps are persisted to `localStorage`.
- **Map view**: Existing Torontopia map experience is wrapped in `MapExperience` and wired to map themes and roles.
- **Moderation & roles**: Public/collaborator/admin visibility rules and review modal are implemented; pending nodes are styled distinctly.
- **Sidebar UX**: Filter panel renamed from “Manifest” to **Filter**; edit-map gear aligned with the Filter heading; expand/collapse handle now moves with the sidebar.
- **Build pipeline**: Next.js production build (`npm run build`) succeeds; legacy `vite.config.ts` is excluded from TS checking.

### Next steps (high level)

0. **Back-end Databases**: Explore the best way to securely store information like user accounts, maps, and map data.
1. **Auth polish**: Replace local-only signup/login with a simple real auth layer (or strengthen the current local model with better validation and password rules).
2. **Per-map access control**: Persist per-map roles (admin/collaborator/public) more explicitly and surface them in the dashboard UI.
3. **Map list UX**: Flesh out dashboard map list (sorting, empty states, delete/archive, clearer role labels).
4. **Public sharing**: Add share affordances (copy link / QR) from both dashboard and map view.
5. **Persistence roadmap**: Sketch migration path from `localStorage` to a real backend (schema for maps, nodes, users, and invitations).
6. **Assorted**: Dragging a node shouldn't open the pop-up, only clicking it. Create a slider under the filters that adjusts node size (admin).