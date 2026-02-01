/**
 * Procedural landmass generator – complex coastlines, islands, inland lakes.
 * Uses a seeded PRNG so the same seed + config always produces the same shape.
 */
import * as d3 from 'd3';
import type { LandmassConfig, LandmassConfigRanges, ParamRange } from './landmass-config';
import { LANDMASS_CONFIG } from './landmass-config';

/** Sample a value from a range (integer params: use sampleInt). */
function sampleRange(rnd: () => number, range: ParamRange): number {
  return range.min + rnd() * (range.max - range.min);
}

/** Sample an integer from a range (inclusive). */
function sampleInt(rnd: () => number, range: ParamRange): number {
  return Math.floor(range.min + rnd() * (range.max - range.min + 1));
}

/** Resolve config ranges into concrete values for a given RNG state. */
function resolveConfig(rnd: () => number, ranges: LandmassConfigRanges): LandmassConfig {
  return {
    coastBasePoints: sampleInt(rnd, ranges.coastBasePoints),
    coastSubdivisionDepth: sampleInt(rnd, ranges.coastSubdivisionDepth),
    coastRoughness: sampleRange(rnd, ranges.coastRoughness),
    coastScale: sampleRange(rnd, ranges.coastScale),
    islandCount: sampleInt(rnd, ranges.islandCount),
    islandScale: sampleRange(rnd, ranges.islandScale),
    islandDistance: sampleRange(rnd, ranges.islandDistance),
    lakeCount: sampleInt(rnd, ranges.lakeCount),
    lakeScale: sampleRange(rnd, ranges.lakeScale),
  };
}

export interface LandmassPaths {
  /** Main landmass path (includes lake holes when fillRule evenodd). Use fillRule="evenodd". */
  mainPath: string;
  /** Island paths – render as separate filled paths */
  islandPaths: string[];
}

/** Seeded PRNG (mulberry32) – same seed => same sequence. */
function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
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

type Point = [number, number];

/** Midpoint displacement subdivision – creates bays, inlets, irregular coast. */
function subdivideCoast(points: Point[], rnd: () => number, roughness: number): Point[] {
  const result: Point[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const perpX = (-dy / len) * roughness * len * (rnd() - 0.5) * 2;
    const perpY = (dx / len) * roughness * len * (rnd() - 0.5) * 2;
    mid[0] += perpX;
    mid[1] += perpY;
    result.push(a, mid);
  }
  return result;
}

/** Build a closed smooth path from points using Catmull-Rom. */
function pointsToPath(points: Point[]): string {
  if (points.length < 2) return '';
  const line = d3.line<Point>().curve(d3.curveCatmullRomClosed).x((p) => p[0]).y((p) => p[1]);
  return line(points) ?? '';
}

/** Generate main coastline with fractal subdivision. */
function generateMainCoast(rnd: () => number, cfg: LandmassConfig): Point[] {
  const cx = 500;
  const cy = 500;
  const rx = 350 * cfg.coastScale + rnd() * 80;
  const ry = 280 * cfg.coastScale + rnd() * 60;
  const baseN = cfg.coastBasePoints;
  let points: Point[] = [];
  for (let i = 0; i < baseN; i++) {
    const angle = (i / baseN) * 2 * Math.PI + (rnd() - 0.5) * 0.4;
    const r = 0.9 + rnd() * 0.2;
    points.push([
      cx + Math.cos(angle) * rx * r + (rnd() - 0.5) * 30,
      cy + Math.sin(angle) * ry * r + (rnd() - 0.5) * 30,
    ]);
  }
  for (let d = 0; d < cfg.coastSubdivisionDepth; d++) {
    points = subdivideCoast(points, rnd, cfg.coastRoughness * (0.7 + 0.3 * rnd()));
  }
  return points;
}

/** Check if point is roughly inside a polygon (ray casting). */
function isInsidePolygon(pts: Point[], px: number, py: number): boolean {
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Generate a small blob for island or lake. */
function generateBlob(
  centerX: number,
  centerY: number,
  radius: number,
  numPoints: number,
  rnd: () => number
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI + (rnd() - 0.5) * 0.5;
    const r = radius * (0.7 + rnd() * 0.6);
    points.push([centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r]);
  }
  return points;
}

/**
 * Generate landmass paths from a seed string (e.g. map slug).
 * Deterministic: same seed + config => same output.
 */
export function generateLandmass(
  seedString: string,
  configRanges: LandmassConfigRanges = LANDMASS_CONFIG
): LandmassPaths {
  const seed = seedFromString(seedString);
  const rnd = mulberry32(seed);
  const config = resolveConfig(rnd, configRanges);

  const mainPoints = generateMainCoast(rnd, config);
  const mainPath = pointsToPath(mainPoints);

  const islandPaths: string[] = [];
  const maxIslandAttempts = 20;
  for (let i = 0; i < config.islandCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < maxIslandAttempts && !placed; attempt++) {
      const angle = rnd() * 2 * Math.PI;
      const dist = 300 + config.islandDistance * 150 * rnd();
      const ix = 500 + Math.cos(angle) * dist;
      const iy = 500 + Math.sin(angle) * dist;
      if (isInsidePolygon(mainPoints, ix, iy)) continue;
      const radius = 25 * config.islandScale * (0.6 + rnd() * 0.8);
      const islandPts = generateBlob(ix, iy, radius, 8 + Math.floor(rnd() * 4), rnd);
      islandPaths.push(pointsToPath(islandPts));
      placed = true;
    }
  }

  const lakePaths: string[] = [];
  for (let i = 0; i < config.lakeCount; i++) {
    const lx = 400 + rnd() * 200;
    const ly = 400 + rnd() * 200;
    if (!isInsidePolygon(mainPoints, lx, ly)) continue;
    const radius = 35 * config.lakeScale * (0.7 + rnd() * 0.6);
    const lakePts = generateBlob(lx, ly, radius, 10 + Math.floor(rnd() * 4), rnd);
    lakePaths.push(pointsToPath(lakePts));
  }

  const pathWithHoles = mainPath + lakePaths.map((p) => ' ' + p.trim()).join('');
  return {
    mainPath: pathWithHoles,
    islandPaths,
  };
}
