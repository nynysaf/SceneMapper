import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { MapNode, MapConnection, NodeType } from '../types';
import { generateLandmass } from '../lib/landmass-generator';

/** Style for connection lines (from MapTheme.connectionLine). */
export interface ConnectionLineStyle {
  color: string;
  opacity: number;
  thickness: number;
}

interface MapProps {
  nodes: MapNode[];
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeSelect: (node: MapNode, pos: { x: number, y: number }, opts?: { shiftKey?: boolean }) => void;
  onMapClick?: (x: number, y: number, event?: { clientX: number; clientY: number }) => void;
  /** When multiple nodes are selected, dragging any of them moves all. Desktop only. */
  selectedNodeIds?: string[];
  /** Called when multiple selected nodes are moved together. */
  onNodesMove?: (updates: { id: string; x: number; y: number }[]) => void;
  /** Called when user clicks the map background (not on a node). Use to clear multi-selection. */
  onMapBackgroundClick?: () => void;
  isEditable: boolean;
  isPlacing?: boolean;
  /**
   * Optional background image for this map, typically set per SceneMap.
   * When provided, it is rendered underneath all nodes.
   */
  backgroundImageUrl?: string;
  /**
   * Map slug (or any stable id) used to seed the default landmass shape when no background image.
   * Each map gets a different but stable random blob.
   */
  mapSlug?: string;
  /**
   * Per-category colors, usually derived from the active MapTheme.
   * Falls back to a sane default palette when not provided.
   */
  categoryColors: Record<NodeType, string>;
  /**
   * Scale factor for node size (dot and glow). 1 = default; e.g. 0.5 = half, 2 = double.
   * Used by admin to adjust node visibility.
   */
  nodeSizeScale?: number;
  /**
   * Scale factor for node label font size. 1 = default (11px); e.g. 0.75 = smaller, 1.5 = larger.
   * Admin only.
   */
  nodeLabelFontScale?: number;
  /**
   * Scale factor for region label font size (REGION nodes only). 1 = default. Does not affect other node labels.
   */
  regionFontScale?: number;
  /**
   * Font family for REGION node labels. When absent, use Georgia, serif.
   */
  regionFontFamily?: string;
  /**
   * Approved connections to draw as curved lines between nodes.
   */
  connections?: MapConnection[];
  /**
   * Style for connection lines. When absent, use theme primary color, 0.6 opacity, 2px.
   */
  connectionLineStyle?: ConnectionLineStyle;
  /**
   * Current user name; pending connections with this collaboratorId are drawn at 40% opacity.
   */
  currentUserName?: string;
  /**
   * Called when collaborator/admin drags a connection line to adjust its curve.
   * Passes connectionId and new control point in 0–100 space.
   */
  onConnectionCurveChange?: (connectionId: string, curveOffsetX: number, curveOffsetY: number) => void;
  /**
   * Called when user Alt+drags from one node to another to create a connection.
   * REGION nodes are excluded as source and target.
   */
  onConnectionCreate?: (fromNodeId: string, toNodeId: string) => void;
  /**
   * Called when user clicks a connection line. Opens sidebar to show description etc.
   */
  onConnectionSelect?: (connection: MapConnection) => void;
  /**
   * When true, the map is being captured for export: zoom is disabled and transform is identity.
   */
  exportMode?: boolean;
  /**
   * Colour behind the map image (visible when image doesn't fill the viewport).
   * Default #fdfcf0.
   */
  mapBackgroundColor?: string;
}

/**
 * Map Component
 * 
 * Uses D3.js to render a zoomable, draggable SVG canvas.
 * Handles both spatial data visualization and coordinate selection for new entries.
 */
const SCALE = 10; // node x,y are 0–100; SVG coords are x*SCALE, y*SCALE (0–1000)

const Map: React.FC<MapProps> = ({
  nodes,
  onNodeMove,
  onNodeSelect,
  onMapClick,
  selectedNodeIds = [],
  onNodesMove,
  onMapBackgroundClick,
  isEditable,
  isPlacing,
  backgroundImageUrl,
  mapSlug,
  categoryColors,
  nodeSizeScale = 1,
  nodeLabelFontScale = 1,
  regionFontScale = 1,
  regionFontFamily,
  connections = [],
  connectionLineStyle,
  currentUserName,
  onConnectionCurveChange,
  onConnectionCreate,
  onConnectionSelect,
  exportMode = false,
  mapBackgroundColor = '#fdfcf0',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const hasFittedInitialRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const bulkDragStartRef = useRef<Record<string, { x: number; y: number }>>({});
  const connectionDragCleanupRef = useRef<(() => void) | null>(null);
  const connectionJustDraggedRef = useRef(false);
  const DRAG_THRESHOLD_SQ = 25; // 5px movement = real drag (below = treat as click)
  const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  const lineStyle = connectionLineStyle ?? {
    color: '#059669',
    opacity: 0.6,
    thickness: 2,
  };

  const defaultLandmass = useMemo(
    () => generateLandmass(mapSlug ?? 'default'),
    [mapSlug],
  );

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svg.select('.map-content');

    // Cleanup previous renders
    container.selectAll('.connection-layer').remove();
    container.selectAll('.node-group').remove();

    // Setup Zoom behavior (disabled in export mode so transform stays identity)
    // translateExtent keeps part of map visible: prevents panning so far that map is lost
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .translateExtent([[-1500, -1500], [2500, 2500]]) // Allow panning well beyond map edges
      .filter(function (event: MouseEvent | TouchEvent | WheelEvent) {
        // D3 default: block right-click; allow ctrl only for wheel (pinch-zoom)
        const e = event as MouseEvent & { type?: string };
        if (!((!e.ctrlKey || e.type === 'wheel') && !e.button)) return false;
        // Allow pan only when clicking background — not on nodes or connections (their drag handlers take priority)
        const target = (event.target as Element);
        if (target?.closest?.('.node-group') || target?.closest?.('.connection-group')) return false;
        return true;
      })
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    if (exportMode) {
      container.attr('transform', 'translate(0,0) scale(1)');
      svg.on('.zoom', null);
    } else if (!isPlacing) {
      svg.call(zoom);
      // Initial load: fit full map (1000×1000) to view, centered with padding
      if (!hasFittedInitialRef.current) {
        hasFittedInitialRef.current = true;
        const padding = 0.05;
        const k = 1 - 2 * padding;
        const cx = 500;
        const ty = cx * (1 - k);
        const initial = d3.zoomIdentity.translate(ty, ty).scale(k);
        requestAnimationFrame(() => {
          if (svgRef.current) {
            d3.select(svgRef.current).call(zoom.transform, initial);
          }
        });
      }
    } else {
      svg.on('.zoom', null); // Disable zoom while placing to allow precise clicks
    }

    // --- Connection lines (above background, under nodes) ---
    // (Use plain object to avoid shadowing built-in Map constructor)
    const nodeById: Record<string, MapNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const connectionsToDraw = connections.filter((c) => {
      if (c.status === 'approved') return true;
      if (c.status === 'pending' && currentUserName && c.collaboratorId === currentUserName) return true;
      return false;
    });
    if (connectionsToDraw.length > 0) {
      const connectionLayer = container.append('g').attr('class', 'connection-layer').style('pointer-events', 'auto');
      const canEditCurve = isEditable && !isPlacing && !!onConnectionCurveChange;
      connectionsToDraw.forEach((conn) => {
        const fromNode = nodeById[conn.fromNodeId];
        const toNode = nodeById[conn.toNodeId];
        if (!fromNode || !toNode) return;
        const x1 = fromNode.x * SCALE;
        const y1 = fromNode.y * SCALE;
        const x2 = toNode.x * SCALE;
        const y2 = toNode.y * SCALE;
        let cpx: number;
        let cpy: number;
        if (conn.curveOffsetX != null && conn.curveOffsetY != null) {
          cpx = conn.curveOffsetX * SCALE;
          cpy = conn.curveOffsetY * SCALE;
        } else {
          const dx = toNode.x - fromNode.x;
          const dy = toNode.y - fromNode.y;
          const len = Math.hypot(dx, dy) || 1;
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          const bulge = 0.15 * len;
          const perpX = (-dy / len) * bulge;
          const perpY = (dx / len) * bulge;
          cpx = (midX + perpX) * SCALE;
          cpy = (midY + perpY) * SCALE;
        }
        let cpxCur = cpx;
        let cpyCur = cpy;
        const pathD = () => `M ${x1} ${y1} Q ${cpxCur} ${cpyCur} ${x2} ${y2}`;
        const isPending = conn.status === 'pending';
        const strokeOpacity = isPending ? 0.4 : lineStyle.opacity;
        const group = connectionLayer
          .append('g')
          .attr('class', 'connection-group')
          .attr('data-from-id', conn.fromNodeId)
          .attr('data-to-id', conn.toNodeId)
          .attr('data-cpx', cpx)
          .attr('data-cpy', cpy);
        group
          .append('path')
          .attr('d', pathD())
          .attr('fill', 'none')
          .attr('stroke', lineStyle.color)
          .attr('stroke-opacity', strokeOpacity)
          .attr('stroke-width', lineStyle.thickness)
          .attr('stroke-linecap', 'round')
          .style('pointer-events', 'none');
        const hitPath = group
          .append('path')
          .attr('d', pathD())
          .attr('fill', 'none')
          .attr('stroke', 'transparent')
          .attr('stroke-width', 20)
          .attr('stroke-linecap', 'round')
          .style('pointer-events', 'stroke')
          .style('cursor', canEditCurve && conn.status === 'approved' ? 'grab' : 'pointer');
        if (onConnectionSelect) {
          hitPath.on('click', function (event: MouseEvent) {
            event.stopPropagation();
            if (connectionJustDraggedRef.current) return;
            onConnectionSelect(conn);
          });
        }
        if (canEditCurve && conn.status === 'approved') {
          const updatePaths = () => {
            const d = pathD();
            group.selectAll('path').attr('d', d);
          };
          // Track drag distance so tiny movements are treated as clicks (to open sidebar)
          let dragStartX = 0;
          let dragStartY = 0;
          const connectionDrag = d3
            .drag<SVGPathElement, unknown>()
            .subject(function () {
              return { x: cpxCur, y: cpyCur };
            })
            .on('start', function (event) {
              event.sourceEvent.stopPropagation();
              dragStartX = event.x;
              dragStartY = event.y;
              connectionJustDraggedRef.current = false;
              d3.select(this).style('cursor', 'grabbing');
            })
            .on('drag', function (event) {
              cpxCur = Math.max(0, Math.min(1000, event.x));
              cpyCur = Math.max(0, Math.min(1000, event.y));
              updatePaths();
            })
            .on('end', function (event) {
              d3.select(this).style('cursor', 'grab');
              const dx = event.x - dragStartX;
              const dy = event.y - dragStartY;
              const movedSq = dx * dx + dy * dy;
              // If the pointer barely moved, treat this as a click:
              // reset curve to original and let the click handler open the sidebar.
              if (movedSq <= DRAG_THRESHOLD_SQ) {
                cpxCur = cpx;
                cpyCur = cpy;
                updatePaths();
                return;
              }
              connectionJustDraggedRef.current = true;
              setTimeout(() => {
                connectionJustDraggedRef.current = false;
              }, 100);
              const curveX = Math.max(0, Math.min(100, cpxCur / SCALE));
              const curveY = Math.max(0, Math.min(100, cpyCur / SCALE));
              onConnectionCurveChange!(conn.id, curveX, curveY);
            });
          hitPath.call(connectionDrag as any);
        }
      });
    }

    // --- Node Rendering ---
    const nodeGroups = container
      .selectAll<SVGGElement, MapNode>('.node-group')
      .data(nodes, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node-group cursor-pointer')
      .attr('transform', (d) => `translate(${d.x * SCALE}, ${d.y * SCALE})`)
      .attr('opacity', (d) => (d.status === 'pending' ? 0.8 : 1));

    const rGlow = 16 * nodeSizeScale;
    const rMain = 10 * nodeSizeScale;
    const labelDy = 25 * nodeSizeScale;
    const labelFontSize = Math.round(11 * nodeLabelFontScale);
    const regionFontSize = Math.round(14 * regionFontScale);

    // Decorative Glow (skip for REGION – no dot)
    nodeGroups.filter((d: MapNode) => d.type !== NodeType.REGION)
      .append('circle')
      .attr('r', rGlow)
      .attr('fill', (d: MapNode) => categoryColors[d.type])
      .attr('opacity', 0.15);

    // Main Dot (skip for REGION)
    nodeGroups.filter((d: MapNode) => d.type !== NodeType.REGION)
      .append('circle')
      .attr('r', rMain)
      .attr('fill', (d: MapNode) => categoryColors[d.type])
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', (d: MapNode) => (d.status === 'pending' ? 0.7 : 1))
      .attr('stroke-dasharray', 'none');

    // Label: for REGION use region font size and center; for others use label font size and offset
    nodeGroups.each(function (d: MapNode) {
      const g = d3.select(this);
      const isRegion = d.type === NodeType.REGION;
      g.append('text')
        .text(d.title)
        .attr('dy', isRegion ? 0 : labelDy)
        .attr('text-anchor', 'middle')
        .attr('class', isRegion ? 'font-semibold' : 'font-bold fill-emerald-950 pointer-events-none uppercase tracking-wider')
        .style('font-size', isRegion ? `${regionFontSize}px` : `${labelFontSize}px`)
        .style('font-family', isRegion && regionFontFamily ? regionFontFamily : undefined)
        .style('fill', isRegion ? (categoryColors[d.type] ?? '#4a5568') : undefined)
        .style('paint-order', isRegion ? undefined : 'stroke')
        .style('stroke', isRegion ? undefined : '#fdfcf0')
        .style('stroke-width', isRegion ? undefined : '4px')
        .style('stroke-linecap', isRegion ? undefined : 'round')
        .style('stroke-linejoin', isRegion ? undefined : 'round');
    });

    // --- Interaction Logic ---

    // Alt+drag from node to node creates a connection (REGION excluded)
    if (isEditable && !isPlacing && onConnectionCreate) {
      nodeGroups.on('pointerdown.alt-connection', function (event: PointerEvent, d: MapNode) {
        if (!event.altKey || d.type === NodeType.REGION) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const sourceNode = d;
        const sourceX = sourceNode.x * SCALE;
        const sourceY = sourceNode.y * SCALE;

        const previewGroup = container.append('g').attr('class', 'connection-preview');
        const previewPath = previewGroup
          .append('path')
          .attr('fill', 'none')
          .attr('stroke', lineStyle.color)
          .attr('stroke-opacity', lineStyle.opacity)
          .attr('stroke-width', lineStyle.thickness)
          .attr('stroke-linecap', 'round')
          .attr('stroke-dasharray', '6,4');

        const updatePreview = (clientX: number, clientY: number) => {
          const pt = svgRef.current!.createSVGPoint();
          pt.x = clientX;
          pt.y = clientY;
          const svgP = pt.matrixTransform(container.node()!.getScreenCTM()!.inverse());
          const cx = (sourceX + svgP.x) / 2;
          const cy = (sourceY + svgP.y) / 2;
          previewPath.attr('d', `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${svgP.x} ${svgP.y}`);
        };

        const cleanup = () => {
          previewGroup.remove();
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('keydown', onEscape);
          document.body.style.cursor = '';
          connectionDragCleanupRef.current = null;
        };
        connectionDragCleanupRef.current = cleanup;
        document.body.style.cursor = 'crosshair';

        const onMove = (e: MouseEvent) => updatePreview(e.clientX, e.clientY);
        const onUp = (e: MouseEvent) => {
          // Coordinate-based hit test (preview path is on top, so elementFromPoint would miss nodes)
          const pt = svgRef.current!.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const svgP = pt.matrixTransform(container.node()!.getScreenCTM()!.inverse());
          const hitRadius = 25 * nodeSizeScale; // generous: covers node glow
          let best: MapNode | null = null;
          let bestDist = hitRadius * hitRadius;
          for (const n of nodes) {
            if (n.type === NodeType.REGION || n.id === sourceNode.id) continue;
            const nx = n.x * SCALE;
            const ny = n.y * SCALE;
            const dx = svgP.x - nx;
            const dy = svgP.y - ny;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist) {
              bestDist = d2;
              best = n;
            }
          }
          if (best) onConnectionCreate(sourceNode.id, best.id);
          cleanup();
        };
        const onEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape') cleanup();
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('keydown', onEscape);
        updatePreview(event.clientX, event.clientY);
      }, { capture: true });
    }

    // Helper to update connection paths when nodes are being dragged (single or bulk)
    const getPos = (id: string, overrides: Record<string, { x: number; y: number }>) => {
      const o = overrides[id];
      if (o) return o;
      const n = nodeById[id];
      return n ? { x: n.x * SCALE, y: n.y * SCALE } : { x: 0, y: 0 };
    };
    const updateConnectionsForPositions = (overrides: Record<string, { x: number; y: number }>) => {
      container.selectAll('.connection-group').each(function (this: SVGGElement) {
        const g = d3.select(this);
        const fromId = g.attr('data-from-id');
        const toId = g.attr('data-to-id');
        const fromNode = nodeById[fromId];
        const toNode = nodeById[toId];
        if (!fromNode || !toNode) return;
        if (!overrides[fromId] && !overrides[toId]) return;
        const cpx = parseFloat(g.attr('data-cpx') || '0');
        const cpy = parseFloat(g.attr('data-cpy') || '0');
        const p1 = getPos(fromId, overrides);
        const p2 = getPos(toId, overrides);
        const d = `M ${p1.x} ${p1.y} Q ${cpx} ${cpy} ${p2.x} ${p2.y}`;
        g.selectAll('path').attr('d', d);
      });
    };

    // Enable Drag and Drop for authorized roles
    if (isEditable && !isPlacing) {
      const drag = d3.drag<SVGGElement, MapNode>()
        .subject((event, d) => {
          const sub = { x: d.x * SCALE, y: d.y * SCALE };
          dragStartRef.current = { x: sub.x, y: sub.y };
          const isBulk = selectedSet.has(d.id) && selectedSet.size > 1;
          if (isBulk && onNodesMove) {
            bulkDragStartRef.current = {};
            selectedSet.forEach((id) => {
              const n = nodeById[id];
              if (n) bulkDragStartRef.current[id] = { x: n.x * SCALE, y: n.y * SCALE };
            });
          } else {
            bulkDragStartRef.current = {};
          }
          return sub;
        })
        .on('start', function() {
          d3.select(this).raise();
          d3.select(this).select('circle:nth-child(2)')
            .attr('stroke', '#FFD700')
            .attr('stroke-width', 4);
        })
        .on('drag', function(event, d) {
          const dx = event.x - dragStartRef.current.x;
          const dy = event.y - dragStartRef.current.y;
          const isBulk = selectedSet.has(d.id) && selectedSet.size > 1 && Object.keys(bulkDragStartRef.current).length > 0;

          if (isBulk) {
            const overrides: Record<string, { x: number; y: number }> = {};
            Object.entries(bulkDragStartRef.current).forEach(([id, start]) => {
              const nx = Math.max(0, Math.min(1000, start.x + dx));
              const ny = Math.max(0, Math.min(1000, start.y + dy));
              overrides[id] = { x: nx, y: ny };
            });
            container.selectAll<SVGGElement, MapNode>('.node-group').each(function (this: SVGGElement, nodeData: MapNode) {
              if (overrides[nodeData.id]) {
                const p = overrides[nodeData.id];
                d3.select(this).attr('transform', `translate(${p.x}, ${p.y})`);
              }
            });
            updateConnectionsForPositions(overrides);
          } else {
            const x = Math.max(0, Math.min(1000, event.x));
            const y = Math.max(0, Math.min(1000, event.y));
            d3.select(this).attr('transform', `translate(${x}, ${y})`);
            updateConnectionsForPositions({ [d.id]: { x, y } });
          }
        })
        .on('end', function (event, d) {
          d3.select(this).select('circle:nth-child(2)')
            .attr('stroke', '#FFFFFF')
            .attr('stroke-width', 2);

          const dx = event.x - dragStartRef.current.x;
          const dy = event.y - dragStartRef.current.y;
          const isBulk = selectedSet.has(d.id) && selectedSet.size > 1 && Object.keys(bulkDragStartRef.current).length > 0;

          if (isBulk && onNodesMove) {
            const updates: { id: string; x: number; y: number }[] = [];
            Object.entries(bulkDragStartRef.current).forEach(([id, start]) => {
              const nx = Math.max(0, Math.min(1000, start.x + dx));
              const ny = Math.max(0, Math.min(1000, start.y + dy));
              updates.push({ id, x: (nx / 1000) * 100, y: (ny / 1000) * 100 });
            });
            onNodesMove(updates);
          } else {
            const xPct = (event.x / 1000) * 100;
            const yPct = (event.y / 1000) * 100;
            onNodeMove(d.id, xPct, yPct);
          }
          bulkDragStartRef.current = {};

          // Treat minimal movement as click (including Shift+Click for multi-select)
          if (dx * dx + dy * dy <= DRAG_THRESHOLD_SQ) {
            const group = this as SVGGElement;
            const circle = group.querySelector('circle:nth-child(2)');
            const rect = circle ? (circle as SVGCircleElement).getBoundingClientRect() : group.getBoundingClientRect();
            const shiftKey = (event.sourceEvent as MouseEvent)?.shiftKey ?? false;
            onNodeSelect(d, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, { shiftKey });
          }
        });

      nodeGroups.call(drag as any);
    } else {
      // When drag is NOT enabled (view-only or placing), use click to open popup
      nodeGroups.on('click', function (event: MouseEvent, d: MapNode) {
        if (isPlacing) return;
        onNodeSelect(d, { x: event.clientX, y: event.clientY }, { shiftKey: event.shiftKey });
      });
    }

    // Handle map click: placement (when placing) or clear multi-selection (when not placing)
    svg.on('click', function(event: MouseEvent) {
      if ((event.target as any).closest?.('.node-group')) return;
      if ((event.target as any).closest?.('.connection-group')) return;

      if (isPlacing && onMapClick) {
        const pt = svgRef.current!.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const svgP = pt.matrixTransform(container.node()!.getScreenCTM()!.inverse());
        const xPct = (svgP.x / 1000) * 100;
        const yPct = (svgP.y / 1000) * 100;
        if (xPct >= 0 && xPct <= 100 && yPct >= 0 && yPct <= 100) {
          onMapClick(xPct, yPct, { clientX: event.clientX, clientY: event.clientY });
        }
      } else if (!isPlacing && onMapBackgroundClick) {
        onMapBackgroundClick();
      }
    });

    // Cleanup Alt+drag listeners if effect re-runs mid-drag
    return () => {
      connectionDragCleanupRef.current?.();
    };
  }, [nodes, connections, currentUserName, lineStyle, onNodeMove, onNodeSelect, onMapClick, isEditable, isPlacing, nodeSizeScale, nodeLabelFontScale, regionFontScale, regionFontFamily, categoryColors, onConnectionCurveChange, onConnectionCreate, onConnectionSelect, exportMode, selectedNodeIds, onNodesMove, onMapBackgroundClick]);

  return (
    <svg 
      ref={svgRef} 
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      className={`w-full h-full selection:bg-none outline-none ${isPlacing ? 'cursor-crosshair' : ''}`}
      style={{ touchAction: 'none', backgroundColor: mapBackgroundColor }}
    >
      <defs>
        {!backgroundImageUrl && (
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#8BA888"
              strokeWidth="0.5"
              opacity="0.1"
            />
          </pattern>
        )}
      </defs>
      <g className="map-content">
        {/* Background – sits inside the zoomable container so it pans/zooms with nodes */}
        {backgroundImageUrl ? (
          <image
            href={backgroundImageUrl}
            x={0}
            y={0}
            width={1000}
            height={1000}
            preserveAspectRatio="xMidYMid meet"
            pointerEvents="all"
          />
        ) : (
          <>
            {/* Default: procedural landmass (bays, inlets, islands, lakes) – shape seeded by map slug */}
            <rect width="1000" height="1000" fill="#c5dce8" pointerEvents="all" />
            <path
              d={defaultLandmass.mainPath}
              fill="#e8e6d9"
              fillRule="evenodd"
              stroke="#d4d2c4"
              strokeWidth="2"
              opacity="0.95"
              pointerEvents="none"
            />
            <path
              d={defaultLandmass.mainPath}
              fill="url(#grid)"
              fillOpacity="0.12"
              fillRule="evenodd"
              pointerEvents="none"
            />
            {defaultLandmass.islandPaths.map((islandPath, i) => (
              <path
                key={i}
                d={islandPath}
                fill="#e8e6d9"
                stroke="#d4d2c4"
                strokeWidth="2"
                opacity="0.95"
                pointerEvents="none"
              />
            ))}
            {defaultLandmass.islandPaths.map((islandPath, i) => (
              <path
                key={`grid-${i}`}
                d={islandPath}
                fill="url(#grid)"
                fillOpacity="0.12"
                pointerEvents="none"
              />
            ))}
          </>
        )}

        {/* D3 injects node elements here */}
      </g>
    </svg>
  );
};

export default Map;
