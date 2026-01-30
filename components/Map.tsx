
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { MapNode, NodeType } from '../types';

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
}

/**
 * Map Component
 * 
 * Uses D3.js to render a zoomable, draggable SVG canvas.
 * Handles both spatial data visualization and coordinate selection for new entries.
 */
const Map: React.FC<MapProps> = ({
  nodes,
  onNodeMove,
  onNodeSelect,
  onMapClick,
  isEditable,
  isPlacing,
  backgroundImageUrl,
  categoryColors,
  nodeSizeScale = 1,
  nodeLabelFontScale = 1,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragJustEndedRef = useRef(false); // kept for backwards compat with any cached bundles; unused
  const DRAG_THRESHOLD_SQ = 25; // 5px movement = real drag (below = treat as click)

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svg.select('.map-content');
    
    // Cleanup previous renders to ensure fresh D3 binding
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

    // --- Node Rendering ---
    const nodeGroups = container
      .selectAll<SVGGElement, MapNode>('.node-group')
      .data(nodes, (d: any) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node-group cursor-pointer')
      .attr('transform', (d) => `translate(${d.x * 10}, ${d.y * 10})`)
      .attr('opacity', (d) => (d.status === 'pending' ? 0.8 : 1));

    const rGlow = 16 * nodeSizeScale;
    const rMain = 10 * nodeSizeScale;
    const labelDy = 25 * nodeSizeScale;
    const labelFontSize = Math.round(11 * nodeLabelFontScale);

    // Decorative Glow
    nodeGroups
      .append('circle')
      .attr('r', rGlow)
      .attr('fill', (d) => categoryColors[d.type])
      .attr('opacity', 0.15);

    // Main Dot
    nodeGroups
      .append('circle')
      .attr('r', rMain)
      .attr('fill', (d) => categoryColors[d.type])
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', (d) => (d.status === 'pending' ? 0.7 : 1))
      .attr('stroke-dasharray', 'none');

    // Label Rendering (With white stroke for legibility)
    nodeGroups
      .append('text')
      .text((d) => d.title)
      .attr('dy', labelDy)
      .attr('text-anchor', 'middle')
      .attr('class', 'font-bold fill-emerald-950 pointer-events-none uppercase tracking-wider')
      .style('font-size', `${labelFontSize}px`)
      .style('paint-order', 'stroke')
      .style('stroke', '#fdfcf0')
      .style('stroke-width', '4px')
      .style('stroke-linecap', 'round');

    // --- Interaction Logic ---

    // Enable Drag and Drop for authorized roles
    if (isEditable && !isPlacing) {
      const drag = d3.drag<SVGGElement, MapNode>()
        .subject((event, d) => {
          const sub = { x: d.x * 10, y: d.y * 10 };
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
            // Use the main circle's center (not the whole group) so the popup anchors to the dot, not below it (group includes label)
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

  }, [nodes, onNodeMove, onNodeSelect, onMapClick, isEditable, isPlacing, nodeSizeScale, nodeLabelFontScale]);

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
            <rect width="1000" height="1000" fill="url(#grid)" pointerEvents="all" />
            {/* Visual Background Elements (only when no custom image is set) */}
            <path
              d="M 0 850 Q 300 750, 600 900 T 1000 800 V 1000 H 0 Z"
              fill="#AED6F1"
              opacity="0.4"
              pointerEvents="none"
            />
            <ellipse
              cx="450"
              cy="900"
              rx="80"
              ry="40"
              fill="#8BA888"
              opacity="0.2"
              pointerEvents="none"
            />
            <ellipse
              cx="580"
              cy="870"
              rx="50"
              ry="25"
              fill="#8BA888"
              opacity="0.2"
              pointerEvents="none"
            />
            <path
              d="M 700 0 Q 650 400, 750 750"
              stroke="#8BA888"
              strokeWidth="60"
              strokeLinecap="round"
              fill="none"
              opacity="0.08"
              pointerEvents="none"
            />
            <text
              x="500"
              y="950"
              className="text-3xl font-bold fill-blue-700 opacity-20 italic pointer-events-none"
              textAnchor="middle"
              style={{ fontFamily: 'Playfair Display' }}
            >
              Lake Ontario
            </text>
          </>
        )}

        {/* D3 injects node elements here */}
      </g>
    </svg>
  );
};

export default Map;
