/**
 * Map between Supabase row shapes (snake_case) and app types (camelCase).
 * Used by API routes when reading/writing the database.
 */
import type { SceneMap, MapNode, MapConnection, User, MapTheme } from '@/types';

// --- DB row types (snake_case, matching migration) ---

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbMap {
  id: string;
  slug: string;
  title: string;
  description: string;
  background_image_url: string | null;
  theme: MapTheme;
  collaborator_password_hash: string | null;
  admin_ids: string[];
  collaborator_ids: string[];
  public_view: boolean;
  theme_id: string | null;
  invited_admin_emails: string[] | null;
  invited_collaborator_emails: string[] | null;
  invitation_email_subject_admin: string | null;
  invitation_email_body_admin: string | null;
  invitation_email_subject_collaborator: string | null;
  invitation_email_body_collaborator: string | null;
  invitation_sender_name: string | null;
  node_size_scale: number | null;
  node_label_font_scale: number | null;
  region_font_scale: number | null;
  enabled_node_types: string[] | null;
  connections_enabled: boolean | null;
  icon: string | null;
  icon_background: string | null;
  map_template_id: string | null;
  element_config: Record<string, unknown> | null;
  connection_config: Record<string, unknown> | null;
  feature_requested_at: string | null;
  featured_order: number | null;
  featured_active: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbNode {
  id: string;
  map_id: string;
  type: string;
  title: string;
  description: string;
  website: string | null;
  x: number;
  y: number;
  tags: string[];
  primary_tag: string;
  collaborator_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbConnection {
  id: string;
  map_id: string;
  from_node_id: string;
  to_node_id: string;
  description: string;
  collaborator_id: string;
  status: string;
  curve_offset_x: number | null;
  curve_offset_y: number | null;
  created_at?: string;
  updated_at?: string;
}

// --- Row -> App ---

export function dbUserToUser(row: DbUser): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? '',
    password: '', // never send password to client; API returns user without it
  };
}

const DEFAULT_THEME: MapTheme = {
  primaryColor: '#0d9488',
  secondaryColor: '#f59e0b',
  accentColor: '#0ea5e9',
  backgroundColor: '#f0fdf4',
};

export function dbMapToSceneMap(row: DbMap): SceneMap {
  const theme = row.theme && typeof row.theme === 'object' && 'primaryColor' in row.theme
    ? (row.theme as MapTheme)
    : DEFAULT_THEME;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? '',
    description: row.description ?? '',
    backgroundImageUrl: row.background_image_url ?? undefined,
    theme,
    collaboratorPassword: undefined, // never send password to client
    hasCollaboratorPassword: !!(row.collaborator_password_hash),
    adminIds: row.admin_ids ?? [],
    collaboratorIds: row.collaborator_ids ?? [],
    publicView: row.public_view ?? true,
    themeId: row.theme_id ?? undefined,
    invitedAdminEmails: row.invited_admin_emails ?? undefined,
    invitedCollaboratorEmails: row.invited_collaborator_emails ?? undefined,
    invitationEmailSubjectAdmin: row.invitation_email_subject_admin ?? undefined,
    invitationEmailBodyAdmin: row.invitation_email_body_admin ?? undefined,
    invitationEmailSubjectCollaborator: row.invitation_email_subject_collaborator ?? undefined,
    invitationEmailBodyCollaborator: row.invitation_email_body_collaborator ?? undefined,
    invitationSenderName: row.invitation_sender_name ?? undefined,
    nodeSizeScale: row.node_size_scale ?? undefined,
    nodeLabelFontScale: row.node_label_font_scale ?? undefined,
    regionFontScale: row.region_font_scale != null ? Number(row.region_font_scale) : undefined,
    enabledNodeTypes: (row.enabled_node_types ?? undefined) as SceneMap['enabledNodeTypes'],
    connectionsEnabled: row.connections_enabled ?? undefined,
    icon: row.icon ?? undefined,
    iconBackground: row.icon_background ?? undefined,
    mapTemplateId: (row.map_template_id ?? undefined) as SceneMap['mapTemplateId'],
    featureRequestedAt: row.feature_requested_at ?? undefined,
    featuredOrder: row.featured_order != null ? row.featured_order : undefined,
    featuredActive: row.featured_active ?? undefined,
    ...(() => {
      const raw = row.element_config as Record<string, unknown> | null | undefined;
      if (!raw || typeof raw !== 'object') {
        return { elementConfig: undefined as SceneMap['elementConfig'], elementOrder: undefined as SceneMap['elementOrder'] };
      }
      const { _order, ...rest } = raw;
      const elementOrder = Array.isArray(_order) ? (_order as SceneMap['elementOrder']) : undefined;
      const elementConfig = Object.keys(rest).length ? (rest as SceneMap['elementConfig']) : undefined;
      return { elementConfig, elementOrder };
    })(),
    connectionConfig: (row.connection_config ?? undefined) as SceneMap['connectionConfig'],
  };
}

export function dbNodeToMapNode(row: DbNode): MapNode {
  return {
    id: row.id,
    type: row.type as MapNode['type'],
    title: row.title ?? '',
    description: row.description ?? '',
    website: row.website ?? undefined,
    x: Number(row.x),
    y: Number(row.y),
    tags: row.tags ?? [],
    primaryTag: row.primary_tag ?? '',
    collaboratorId: row.collaborator_id ?? '',
    status: row.status === 'pending' ? 'pending' : 'approved',
  };
}

export function dbConnectionToMapConnection(row: DbConnection): MapConnection {
  return {
    id: row.id,
    fromNodeId: row.from_node_id,
    toNodeId: row.to_node_id,
    description: row.description ?? '',
    collaboratorId: row.collaborator_id ?? '',
    status: row.status === 'pending' ? 'pending' : 'approved',
    curveOffsetX: row.curve_offset_x != null ? Number(row.curve_offset_x) : undefined,
    curveOffsetY: row.curve_offset_y != null ? Number(row.curve_offset_y) : undefined,
  };
}

// --- App -> Row (for insert/update) ---

export function sceneMapToDbMap(m: SceneMap): Omit<DbMap, 'created_at' | 'updated_at'> {
  const theme = m.theme && typeof m.theme === 'object' && 'primaryColor' in m.theme
    ? m.theme
    : DEFAULT_THEME;
  return {
    id: m.id,
    slug: m.slug,
    title: m.title ?? '',
    description: m.description ?? '',
    background_image_url: m.backgroundImageUrl ?? null,
    theme,
    collaborator_password_hash: null, // set separately when storing password hash
    admin_ids: m.adminIds ?? [],
    collaborator_ids: m.collaboratorIds ?? [],
    public_view: m.publicView ?? true,
    theme_id: m.themeId ?? null,
    invited_admin_emails: m.invitedAdminEmails ?? null,
    invited_collaborator_emails: m.invitedCollaboratorEmails ?? null,
    invitation_email_subject_admin: m.invitationEmailSubjectAdmin ?? null,
    invitation_email_body_admin: m.invitationEmailBodyAdmin ?? null,
    invitation_email_subject_collaborator: m.invitationEmailSubjectCollaborator ?? null,
    invitation_email_body_collaborator: m.invitationEmailBodyCollaborator ?? null,
    invitation_sender_name: m.invitationSenderName ?? null,
    node_size_scale: m.nodeSizeScale ?? null,
    node_label_font_scale: m.nodeLabelFontScale ?? null,
    region_font_scale: m.regionFontScale ?? null,
    enabled_node_types: m.enabledNodeTypes?.length ? m.enabledNodeTypes : null,
    connections_enabled: m.connectionsEnabled ?? null,
    icon: m.icon ?? null,
    icon_background: m.iconBackground ?? null,
    map_template_id: m.mapTemplateId ?? null,
    element_config:
      m.elementConfig != null || m.elementOrder != null
        ? { ...(m.elementConfig ?? {}), ...(m.elementOrder?.length ? { _order: m.elementOrder } : {}) }
        : null,
    connection_config: m.connectionConfig ?? null,
    feature_requested_at: m.featureRequestedAt ?? null,
    featured_order: m.featuredOrder ?? null,
    featured_active: m.featuredActive ?? null,
  };
}

export function mapNodeToDbNode(n: MapNode, mapId: string): Omit<DbNode, 'created_at' | 'updated_at'> {
  return {
    id: n.id,
    map_id: mapId,
    type: n.type,
    title: n.title ?? '',
    description: n.description ?? '',
    website: n.website ?? null,
    x: n.x,
    y: n.y,
    tags: n.tags ?? [],
    primary_tag: n.primaryTag ?? '',
    collaborator_id: n.collaboratorId ?? '',
    status: n.status ?? 'approved',
  };
}

export function mapConnectionToDbConnection(c: MapConnection, mapId: string): Omit<DbConnection, 'created_at' | 'updated_at'> {
  return {
    id: c.id,
    map_id: mapId,
    from_node_id: c.fromNodeId,
    to_node_id: c.toNodeId,
    description: c.description ?? '',
    collaborator_id: c.collaboratorId ?? '',
    status: c.status ?? 'approved',
    curve_offset_x: c.curveOffsetX ?? null,
    curve_offset_y: c.curveOffsetY ?? null,
  };
}
