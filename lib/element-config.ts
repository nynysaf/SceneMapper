/**
 * Element and connection configuration for maps.
 * Map templates provide default labels and icons; themes provide colors.
 */
import { NodeType } from '@/types';

/** Icon: Lucide icon name (e.g. "Calendar") or data URL / URL for custom image */
export type ElementIcon = string;

export interface ElementConfigItem {
  label: string;
  icon: ElementIcon;
  enabled: boolean;
}

export interface ConnectionConfig {
  label: string;
  icon?: ElementIcon;
}

/** Per-node-type display config. Keys are NodeType enum values. */
export type ElementConfig = Partial<Record<NodeType, ElementConfigItem>>;

/** Connection config stored on map. */
export interface MapConnectionConfig extends ConnectionConfig {
  color?: string;
  opacity?: number;
  thickness?: number;
}

export type MapTemplateId = 'scene' | 'ideas' | 'network';

export interface MapTemplate {
  id: MapTemplateId;
  label: string;
  elements: Record<NodeType, { label: string; icon: ElementIcon }>;
  connectionLabel: string;
  connectionIcon?: ElementIcon;
}

/** Default element config for "Scene" template - Events, People, Spaces, Groups, Media, Regions */
export const MAP_TEMPLATE_SCENE: MapTemplate = {
  id: 'scene',
  label: 'Scene',
  elements: {
    EVENT: { label: 'Events', icon: 'Calendar' },
    PERSON: { label: 'People', icon: 'User' },
    SPACE: { label: 'Spaces', icon: 'Building' },
    COMMUNITY: { label: 'Groups', icon: 'Leaf' },
    REGION: { label: 'Regions', icon: 'Globe' },
    MEDIA: { label: 'Media', icon: 'Image' },
  },
  connectionLabel: 'Connections',
  connectionIcon: 'Link2',
};

/** "Ideas" template - for concept maps, ideas, projects */
export const MAP_TEMPLATE_IDEAS: MapTemplate = {
  id: 'ideas',
  label: 'Ideas',
  elements: {
    EVENT: { label: 'Milestones', icon: 'Flag' },
    PERSON: { label: 'People', icon: 'User' },
    SPACE: { label: 'Projects', icon: 'FolderKanban' },
    COMMUNITY: { label: 'Topics', icon: 'Tags' },
    REGION: { label: 'Sections', icon: 'LayoutGrid' },
    MEDIA: { label: 'Resources', icon: 'FileText' },
  },
  connectionLabel: 'Relations',
  connectionIcon: 'GitBranch',
};

/** "Network" template - for org charts, networks */
export const MAP_TEMPLATE_NETWORK: MapTemplate = {
  id: 'network',
  label: 'Network',
  elements: {
    EVENT: { label: 'Events', icon: 'Calendar' },
    PERSON: { label: 'Contacts', icon: 'Users' },
    SPACE: { label: 'Locations', icon: 'MapPin' },
    COMMUNITY: { label: 'Teams', icon: 'UsersRound' },
    REGION: { label: 'Zones', icon: 'Globe' },
    MEDIA: { label: 'Links', icon: 'Link' },
  },
  connectionLabel: 'Connections',
  connectionIcon: 'Link2',
};

export const MAP_TEMPLATES: MapTemplate[] = [
  MAP_TEMPLATE_SCENE,
  MAP_TEMPLATE_IDEAS,
  MAP_TEMPLATE_NETWORK,
];

export const DEFAULT_MAP_TEMPLATE_ID: MapTemplateId = 'scene';

/** Default enabled node types for new maps (excludes Person and Media) */
export const DEFAULT_ENABLED_NODE_TYPES: NodeType[] = [
  NodeType.EVENT,
  NodeType.SPACE,
  NodeType.COMMUNITY,
  NodeType.REGION,
];

/** Node types that can be reordered (excludes REGION which is always last in elements section) */
export const REORDERABLE_NODE_TYPES: NodeType[] = [
  NodeType.EVENT,
  NodeType.PERSON,
  NodeType.SPACE,
  NodeType.COMMUNITY,
  NodeType.MEDIA,
];

/** Build full ElementConfig from template + optional overrides */
export function buildElementConfig(
  templateId: MapTemplateId,
  overrides?: ElementConfig,
  enabledTypes?: NodeType[],
): ElementConfig {
  const template = MAP_TEMPLATES.find((t) => t.id === templateId) ?? MAP_TEMPLATE_SCENE;
  const defaultEnabled = enabledTypes ?? DEFAULT_ENABLED_NODE_TYPES;
  const config: ElementConfig = {};
  for (const type of Object.keys(template.elements) as NodeType[]) {
    const tpl = template.elements[type];
    const ov = overrides?.[type];
    config[type] = {
      label: ov?.label ?? tpl.label,
      icon: ov?.icon ?? tpl.icon,
      enabled: ov?.enabled ?? defaultEnabled.includes(type),
    };
  }
  return config;
}

/** Build connection config from template + overrides */
export function buildConnectionConfig(
  templateId: MapTemplateId,
  overrides?: Partial<MapConnectionConfig>,
): MapConnectionConfig {
  const template = MAP_TEMPLATES.find((t) => t.id === templateId) ?? MAP_TEMPLATE_SCENE;
  return {
    label: overrides?.label ?? template.connectionLabel,
    icon: overrides?.icon ?? template.connectionIcon,
    color: overrides?.color,
    opacity: overrides?.opacity,
    thickness: overrides?.thickness,
  };
}

/** Get enabled node types from config; when absent use template defaults */
export function getEnabledNodeTypes(
  config?: ElementConfig | null,
  templateId?: MapTemplateId,
): NodeType[] {
  const template = MAP_TEMPLATES.find((t) => t.id === (templateId ?? DEFAULT_MAP_TEMPLATE_ID)) ?? MAP_TEMPLATE_SCENE;
  const types: NodeType[] = [];
  for (const type of Object.keys(template.elements) as NodeType[]) {
    const enabled = config?.[type]?.enabled;
    if (enabled !== false) types.push(type);
  }
  return types;
}

/** Get display label for a node type from config, falling back to template defaults */
export function getElementLabel(
  type: NodeType,
  config?: ElementConfig | null,
  templateId?: MapTemplateId,
): string {
  const item = config?.[type];
  if (item?.label) return item.label;
  const template = MAP_TEMPLATES.find((t) => t.id === (templateId ?? DEFAULT_MAP_TEMPLATE_ID)) ?? MAP_TEMPLATE_SCENE;
  return template.elements[type]?.label ?? type;
}

/** Get icon for a node type from config, falling back to template */
export function getElementIcon(
  type: NodeType,
  config?: ElementConfig | null,
  templateId?: MapTemplateId,
): ElementIcon {
  const item = config?.[type];
  if (item?.icon) return item.icon;
  const template = MAP_TEMPLATES.find((t) => t.id === (templateId ?? DEFAULT_MAP_TEMPLATE_ID)) ?? MAP_TEMPLATE_SCENE;
  return template.elements[type]?.icon ?? 'Circle';
}
