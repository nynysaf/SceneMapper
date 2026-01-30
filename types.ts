
export enum NodeType {
  EVENT = 'EVENT',
  PERSON = 'PERSON',
  SPACE = 'SPACE',
  COMMUNITY = 'COMMUNITY',
}

export interface MapNode {
  id: string;
  type: NodeType;
  title: string;
  description: string;
  website?: string;
  x: number; // Percent based 0-100
  y: number; // Percent based 0-100
  tags: string[];
  primaryTag: string;
  collaboratorId: string;
  status: 'pending' | 'approved';
}

/**
 * Theme configuration for a given Scene Mapper map.
 * 
 * This is intentionally simple for now; we can extend it later
 * when we add richer customization and typography controls.
 */
export interface MapTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  /**
   * Optional font families to allow different atmospheres
   * per map (e.g. display vs body fonts).
   */
  fontBody?: string;
  fontDisplay?: string;
  /**
   * Optional per-node-type colors so each map can
   * customize how Events, People, Spaces, and Communities
   * appear on the canvas.
   */
  categoryColors?: Partial<Record<NodeType, string>>;
}

/**
 * A single map within Scene Mapper.
 * 
 * For now this is only used at the type level so we can evolve
 * the app from a single Torontopia map into a multi-map product
 * without breaking existing behavior.
 */
export interface SceneMap {
  id: string;
  slug: string;
  title: string;
  description: string;
  backgroundImageUrl?: string;
  theme: MapTheme;
  collaboratorPassword?: string;
  adminIds: string[];
  collaboratorIds: string[];
  publicView: boolean;
  /**
   * Optional identifier for a preset theme so we can
   * change the underlying colors without breaking maps.
   */
  themeId?: string;
  /**
   * Emails captured at creation time so a future backend
   * can send real invitations.
   */
  invitedAdminEmails?: string[];
  invitedCollaboratorEmails?: string[];
  /**
   * Admin-set display options; persisted so all viewers see the same.
   * Default 1 when absent.
   */
  nodeSizeScale?: number;
  nodeLabelFontScale?: number;
}

/**
 * Lightweight user session information.
 *
 * The Torontopia prototype only used role + name. We keep those
 * and add optional identifiers so we can later plug in a real
 * auth system and per-map roles without forcing changes everywhere.
 */
export interface UserSession {
  id?: string;
  email?: string;
  role: 'public' | 'collaborator' | 'admin';
  name: string;
  /**
   * Optional per-map role, keyed by SceneMap.id.
   * When absent, the user is treated as a public viewer.
   */
  mapRoles?: Record<string, 'public' | 'collaborator' | 'admin'>;
}

export interface MapConfig {
  zoom: number;
  showLabels: boolean;
  filter: NodeType[];
}

/**
 * Convenience shape for storing nodes keyed by map id
 * in local storage or a future backend.
 */
export type NodesByMapId = Record<string, MapNode[]>;

/**
 * Local-only user model for development.
 * Passwords are stored in plain text for now since this
 * is a prototype; a real backend would handle hashing.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

export interface AuthSession {
  userId: string;
}
