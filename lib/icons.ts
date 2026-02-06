/**
 * Lucide icon picker: map icon names (strings) to React components.
 * Used by IconPicker and for rendering element icons from config.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  User,
  Building,
  Leaf,
  Globe,
  Image,
  Link2,
  Flag,
  FolderKanban,
  Tags,
  LayoutGrid,
  FileText,
  Users,
  MapPin,
  UsersRound,
  Link,
  Circle,
  Heart,
  Star,
  Zap,
  Briefcase,
  Home,
  Store,
  Landmark,
  TreePine,
  Music,
  Film,
  BookOpen,
  Mic,
  MessageCircle,
  Share2,
  GitBranch,
  Workflow,
  Sparkles,
  Lightbulb,
  Target,
  Layers,
  Package,
} from 'lucide-react';

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Calendar,
  User,
  Building,
  Leaf,
  Globe,
  Image,
  Link2,
  Flag,
  FolderKanban,
  Tags,
  LayoutGrid,
  FileText,
  Users,
  MapPin,
  UsersRound,
  Link,
  Circle,
  Heart,
  Star,
  Zap,
  Briefcase,
  Home,
  Store,
  Landmark,
  TreePine,
  Music,
  Film,
  BookOpen,
  Mic,
  MessageCircle,
  Share2,
  GitBranch,
  Workflow,
  Sparkles,
  Lightbulb,
  Target,
  Layers,
  Package,
};

/** Categorized icon names for the picker. Categories match Scene Mapper use cases. */
export const ICON_CATEGORIES: { label: string; icons: string[] }[] = [
  {
    label: 'People & Identity',
    icons: ['User', 'Users', 'UsersRound', 'Heart', 'Star', 'Briefcase'],
  },
  {
    label: 'Places & Spaces',
    icons: ['Building', 'Home', 'Store', 'Landmark', 'MapPin', 'Globe'],
  },
  {
    label: 'Time & Events',
    icons: ['Calendar', 'Flag', 'Zap', 'Target', 'Sparkles'],
  },
  {
    label: 'Groups & Community',
    icons: ['Leaf', 'Tags', 'MessageCircle', 'Share2', 'GitBranch'],
  },
  {
    label: 'Media & Content',
    icons: ['Image', 'FileText', 'BookOpen', 'Music', 'Film', 'Mic'],
  },
  {
    label: 'Organization',
    icons: ['LayoutGrid', 'FolderKanban', 'Workflow', 'Layers', 'Package'],
  },
  {
    label: 'Connections & Links',
    icons: ['Link', 'Link2', 'Lightbulb', 'TreePine', 'Circle'],
  },
];

export function getIconComponent(name: string): LucideIcon | null {
  return LUCIDE_ICON_MAP[name] ?? null;
}
