# Node popup: click vs drag – root cause and solutions

## Root cause

**D3’s drag behavior on the same element as the click handler prevents the click from firing (or makes it unreliable).**

When both `d3.drag()` and `nodeGroups.on('click', ...)` are attached to the same node groups:

1. A **mousedown** starts the drag (subject is set).
2. A **mouseup** ends the drag (drag `end` runs).
3. The browser would normally fire a **click** after mouseup, but:
   - D3’s drag can consume or mark the source event so the subsequent click is suppressed, or
   - The order/timing of drag end vs click can make our “suppress click after drag” logic wrong (e.g. we set a flag in drag end, but the click either never runs or runs in a different order).

So when the map is **editable** (drag enabled), the **click** event on the node either never fires or is unreliable. Our “only suppress popup when movement > 5px” fix doesn’t help if the click handler never runs.

---

## Solutions (options)

### 1. **Handle “click” inside drag end (recommended)**

- **Idea:** Don’t rely on the `click` event when drag is enabled. In the drag **end** handler, if movement is below a threshold, treat it as a click and call `onNodeSelect` (open popup) from there.
- **Pros:** Single place for both drag and “click”; no dependence on click when drag is on; works the same in all browsers.
- **Cons:** Popup position must be computed in drag end (e.g. from `getBoundingClientRect()` of the node group).

### 2. **Custom pointer handling (no D3 drag for “click vs drag”)**

- **Idea:** Don’t use D3 drag. Use `mousedown` / `mousemove` / `mouseup`: on mousedown record position; on mousemove if moved past threshold set “dragging”; on mouseup if not dragging call `onNodeSelect`, else call `onNodeMove`.
- **Pros:** Full control over when click vs drag happens.
- **Cons:** More code; reimplement what D3 drag does (subject, clamping, etc.).

### 3. **Double-click to open popup**

- **Idea:** Use `dblclick` to open the popup; keep single click + drag for moving. No conflict with D3 drag.
- **Pros:** Simple; no conflict with drag.
- **Cons:** UX change (double-click is less discoverable than single click).

### 4. **Separate “info” control**

- **Idea:** Don’t open popup on node click. Add a small info icon or “Details” in the sidebar that opens the popup for the “selected” node; selection could be by hover or a separate single click that doesn’t use the same element as drag.
- **Pros:** No click/drag conflict.
- **Cons:** Bigger UX change; more UI.

### 5. **Use `event.defaultPrevented` in click (D3 v3 style)**

- **Idea:** In the click handler, if `event.defaultPrevented` (or D3’s equivalent) return early; in drag start/end, call `preventDefault()` so the following click is “suppressed” when we don’t want it. When we do want a click (no movement), don’t prevent default so click fires.
- **Pros:** Uses browser semantics if available.
- **Cons:** D3 v7 doesn’t use global `d3.event`; behavior may differ across browsers; we’d need to ensure drag end doesn’t prevent default when movement was below threshold (may not be possible from inside D3).

---

## Choice: implement solution 1

**Implement solution 1:** In the drag **end** handler, if movement is below the threshold, call `onNodeSelect` (with position from the node’s `getBoundingClientRect()`). Do not rely on the separate `click` handler to open the popup when `isEditable && !isPlacing`. Keep the existing `click` handler for the **non-editable** case (no drag), so view-only users still get popup on click.
