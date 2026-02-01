/**
 * Landmass generation config – tune these values to control the procedurally
 * generated default map (bays, inlets, islands, lakes).
 *
 * Each parameter is a { min, max } range. Each map gets a random value within
 * the range (using the map slug as seed), so different maps vary.
 *
 * How to fine-tune:
 * - Edit min/max below and run locally (`npm run dev`) to preview
 * - Same map slug always produces the same shape (deterministic)
 * - Deploy changes to adjust the look across all maps in production
 */
export interface ParamRange {
  min: number;
  max: number;
}

export interface LandmassConfigRanges {
  /** Main coastline: number of initial polygon points before subdivision */
  coastBasePoints: ParamRange;
  /** Main coastline: subdivision depth (1 = 2x points, 2 = 4x, 3 = 8x) */
  coastSubdivisionDepth: ParamRange;
  /** Main coastline: 0–1, how much edges vary when subdivided (higher = more bays/inlets) */
  coastRoughness: ParamRange;
  /** Main coastline: 0–1, scale of the landmass */
  coastScale: ParamRange;

  /** Number of islands */
  islandCount: ParamRange;
  /** Island size multiplier */
  islandScale: ParamRange;
  /** How far from main land islands tend to spawn (0 = edge, 1 = farther out) */
  islandDistance: ParamRange;

  /** Number of inland lakes */
  lakeCount: ParamRange;
  /** Lake size multiplier */
  lakeScale: ParamRange;
}

/** Resolved config with single values (sampled from ranges per map). */
export interface LandmassConfig {
  coastBasePoints: number;
  coastSubdivisionDepth: number;
  coastRoughness: number;
  coastScale: number;
  islandCount: number;
  islandScale: number;
  islandDistance: number;
  lakeCount: number;
  lakeScale: number;
}

export const LANDMASS_CONFIG: LandmassConfigRanges = {
  coastBasePoints: { min: 15, max: 25 },
  coastSubdivisionDepth: { min: 2, max: 4 },
  coastRoughness: { min: 0.3, max: 0.8 },
  coastScale: { min: 0.78, max: 0.92 },

  islandCount: { min: 1, max: 5 },
  islandScale: { min: 0.18, max: 0.75 },
  islandDistance: { min: 0.5, max: 0.75 },

  lakeCount: { min: 1, max: 4 },
  lakeScale: { min: 0.1, max: 1.2 },
};
