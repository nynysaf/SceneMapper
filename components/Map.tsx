import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { MapNode, MapConnection, NodeType } from '../types';

/** Seeded PRNG (mulberry32) so the same map slug always produces the same landmass. */
function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a random blob path (pale landmass) for the default map. Same seed => same shape. */
function generateLandmassPath(seedString: string): string {
  const seed = seedFromString(seedString);
  const rnd = mulberry32(seed);
  const cx = 500;
  const cy = 500;
  const rx = 320 + rnd() * 80;
  const ry = 260 + rnd() * 60;
  const n = 14 + Math.floor(rnd() * 6);
  const points: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI + (rnd() - 0.5) * 0.5;
    const r = 0.85 + rnd() * 0.3;
    points.push([
      cx + Math.cos(angle) * rx * r + (rnd() - 0.5) * 40,
      cy + Math.sin(angle) * ry * r + (rnd() - 0.5) * 40,
    ]);
  }
  const line = d3.line().curve(d3.curveCatmullRomClosed).x((d) => d[0]).y((d) => d[1]);
  return line(points) ?? '';
}

/** Style for connection lines (from MapTheme.connectionLine). */
export interface ConnectionLineStyle {
  color: string;
  opacity: number;
  thickness: number;
}

interface MapProps {
  nodes: MapNode[];
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeSelect: (node: MapNode, pos: { x: number, y: number }) => void;
  onMapClick?: (x: number, y: number) => void;
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
  isEditable,
  isPlacing,
  backgroundImageUrl,
  mapSlug,
  categoryColors,
  nodeSizeScale = 1,
  nodeLabelFontScale = 1,
  regionFontScale = 1,
  connections = [],
  connectionLineStyle,
  currentUserName,
  onConnectionCurveChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragJustEndedRef = useRef(false); // kept for backwards compat with any cached bundles; unused
  const DRAG_THRESHOLD_SQ = 25; // 5px movement = real drag (below = treat as click)

  const lineStyle = connectionLineStyle ?? {
    color: '#059669',
    opacity: 0.6,
    thickness: 2,
  };

  const defaultLandmassPath = useMemo(
    () => generateLandmassPath(mapSlug ?? 'default'),
    [mapSlug],
  );

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svg.select('.map-content');

    // Cleanup previous renders
    container.selectAll('.connection-layer').remove();
    container.selectAll('.node-group').remove();

    // Setup Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    // Toggle zoom interaction based on placement state
    if (!isPlacing) {
      svg.call(zoom);
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
      const connectionLayer = container.append('g').attr('class', 'connection-layer');
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
          // Default: offset control point perpendicular to the segment so the line curves
          const dx = toNode.x - fromNode.x;
          const dy = toNode.y - fromNode.y;
          const len = Math.hypot(dx, dy) || 1;
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2;
          const bulge = 0.15 * len; // curve strength (15% of segment length)
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
        const group = connectionLayer.append('g').attr('class', 'connection-group');
        group
          .append('path')
          .attr('d', pathD())
          .attr('fill', 'none')
          .attr('stroke', lineStyle.color)
          .attr('stroke-opacity', strokeOpacity)
          .attr('stroke-width', lineStyle.thickness)
          .attr('stroke-linecap', 'round');
        if (canEditCurve && conn.status === 'approved') {
          const hitPath = group
            .append('path')
            .attr('d', pathD())
            .attr('fill', 'none')
            .attr('stroke', 'transparent')
            .attr('stroke-width', 20)
            .attr('stroke-linecap', 'round')
            .style('cursor', 'grab')
            .style('pointer-events', 'stroke');
          const updatePaths = () => {
            const d = pathD();
            group.selectAll('path').attr('d', d);
          };
          const connectionDrag = d3
            .drag<SVGPathElement, unknown>()
            .subject(function () {
              return { x: cpxCur, y: cpyCur };
            })
            .on('start', function (event) {
              event.sourceEvent.stopPropagation();
              d3.select(this).style('cursor', 'grabbing');
            })
            .on('drag', function (event) {
              cpxCur = Math.max(0, Math.min(1000, event.x));
              cpyCur = Math.max(0, Math.min(1000, event.y));
              updatePaths();
            })
            .on('end', function () {
              d3.select(this).style('cursor', 'grab');
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
        .style('fill', isRegion ? (categoryColors[d.type] ?? '#4a5568') : undefined)
        .style('paint-order', isRegion ? undefined : 'stroke')
        .style('stroke', isRegion ? undefined : '#fdfcf0')
        .style('stroke-width', isRegion ? undefined : '4px')
        .style('stroke-linecap', isRegion ? undefined : 'round');
    });

    // --- Interaction Logic ---

    // Enable Drag and Drop for authorized roles
    if (isEditable && !isPlacing) {
      const drag = d3.drag<SVGGElement, MapNode>()
        .subject((event, d) => {
          const sub = { x: d.x * SCALE, y: d.y * SCALE };
          dragStartRef.current = { x: sub.x, y: sub.y };
          return sub;
        })
        .on('start', function() {
          d3.select(this).raise(); // Bring to front
          d3.select(this).select('circle:nth-child(2)')
            .attr('stroke', '#FFD700')
            .attr('stroke-width', 4);
        })
        .on('drag', function(event) {
          const x = Math.max(0, Math.min(1000, event.x));
          const y = Math.max(0, Math.min(1000, event.y));
          d3.select(this).attr('transform', `translate(${x}, ${y})`);
        })
        .on('end', function (event, d) {
          d3.select(this).select('circle:nth-child(2)')
            .attr('stroke', '#FFFFFF')
            .attr('stroke-width', 2);

          const xPct = (event.x / 1000) * 100;
          const yPct = (event.y / 1000) * 100;
          onNodeMove(d.id, xPct, yPct);

          // When drag is on the same element, click often never fires. Treat "no movement" as click and open popup here.
          const dx = event.x - dragStartRef.current.x;
          const dy = event.y - dragStartRef.current.y;
          if (dx * dx + dy * dy <= DRAG_THRESHOLD_SQ) {
            const group = this as SVGGElement;
            const circle = group.querySelector('circle:nth-child(2)');
            const rect = circle ? (circle as SVGCircleElement).getBoundingClientRect() : group.getBoundingClientRect();
            onNodeSelect(d, {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          }
        });

      nodeGroups.call(drag as any);
    } else {
      // When drag is NOT enabled (view-only or placing), use click to open popup
      nodeGroups.on('click', function (event: MouseEvent, d: MapNode) {
        if (isPlacing) return;
        onNodeSelect(d, { x: event.clientX, y: event.clientY });
      });
    }

    // Handle Coordinate Capture for new nodes
    svg.on('click', function(event) {
      if (!isPlacing || !onMapClick) return;
      
      // Ignore clicks on existing nodes
      if ((event.target as any).closest('.node-group')) return;

      const pt = svgRef.current!.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(container.node()!.getScreenCTM()!.inverse());
      
      const xPct = (svgP.x / 1000) * 100;
      const yPct = (svgP.y / 1000) * 100;
      
      if (xPct >= 0 && xPct <= 100 && yPct >= 0 && yPct <= 100) {
        onMapClick(xPct, yPct);
      }
    });

  }, [nodes, connections, currentUserName, lineStyle, onNodeMove, onNodeSelect, onMapClick, isEditable, isPlacing, nodeSizeScale, nodeLabelFontScale, regionFontScale, categoryColors, onConnectionCurveChange]);

  return (
    <svg 
      ref={svgRef} 
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full bg-[#fdfcf0] selection:bg-none outline-none ${isPlacing ? 'cursor-crosshair' : ''}`}
      style={{ touchAction: 'none' }}
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
            {/* Default: pale landmass surrounded by water (shape seeded by map slug) */}
            <rect width="1000" height="1000" fill="#c5dce8" pointerEvents="all" />
            <path
              d={defaultLandmassPath}
              fill="#e8e6d9"
              stroke="#d4d2c4"
              strokeWidth="2"
              opacity="0.95"
              pointerEvents="none"
            />
            <path
              d={defaultLandmassPath}
              fill="url(#grid)"
              fillOpacity="0.12"
              pointerEvents="none"
            />
          </>
        )}

        {/* D3 injects node elements here */}
      </g>
    </svg>
  );
};

export default Map;
