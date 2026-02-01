import type { MapNode, MapConnection } from '../types';
import { NodeType } from '../types';

/** Escape a CSV cell (quotes, newlines). */
function csvEscape(val: string): string {
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/** Convert nodes/connections to CSV string with multiple sections. */
export function toCsv(nodes: MapNode[], connections: MapConnection[]): string {
  const nodeHeaders = ['id', 'type', 'title', 'description', 'website', 'x', 'y', 'tags', 'primaryTag', 'collaboratorId', 'status'];
  const connectionHeaders = ['id', 'fromNodeId', 'toNodeId', 'description', 'collaboratorId', 'status'];

  const nodeRows = nodes.map((n) =>
    [
      n.id,
      n.type,
      n.title,
      n.description,
      n.website ?? '',
      n.x,
      n.y,
      (n.tags ?? []).join(';'),
      n.primaryTag ?? '',
      n.collaboratorId,
      n.status,
    ].map(String).map(csvEscape).join(',')
  );

  const regions = nodes.filter((n) => n.type === NodeType.REGION);
  const regionRows = regions.map((n) =>
    [
      n.id,
      n.type,
      n.title,
      n.description,
      n.website ?? '',
      n.x,
      n.y,
      (n.tags ?? []).join(';'),
      n.primaryTag ?? '',
      n.collaboratorId,
      n.status,
    ].map(String).map(csvEscape).join(',')
  );

  const connectionRows = connections.map((c) =>
    [
      c.id,
      c.fromNodeId,
      c.toNodeId,
      c.description,
      c.collaboratorId,
      c.status,
    ].map(String).map(csvEscape).join(',')
  );

  const sections: string[] = [
    'Nodes',
    nodeHeaders.map(csvEscape).join(','),
    ...nodeRows,
    '',
    'Regions',
    nodeHeaders.map(csvEscape).join(','),
    ...regionRows,
    '',
    'Connections',
    connectionHeaders.map(csvEscape).join(','),
    ...connectionRows,
  ];

  return '\uFEFF' + sections.join('\n'); // BOM for Excel UTF-8
}

/** Convert nodes/connections to XLSX blob (multiple sheets). */
export async function toXlsx(nodes: MapNode[], connections: MapConnection[]): Promise<Blob> {
  const XLSX = await import('xlsx');

  const nodeHeaders = ['id', 'type', 'title', 'description', 'website', 'x', 'y', 'tags', 'primaryTag', 'collaboratorId', 'status'];
  const connectionHeaders = ['id', 'fromNodeId', 'toNodeId', 'description', 'collaboratorId', 'status'];

  const nodeRows = nodes.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    description: n.description,
    website: n.website ?? '',
    x: n.x,
    y: n.y,
    tags: (n.tags ?? []).join(';'),
    primaryTag: n.primaryTag ?? '',
    collaboratorId: n.collaboratorId,
    status: n.status,
  }));

  const regions = nodes.filter((n) => n.type === NodeType.REGION);
  const regionRows = regions.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    description: n.description,
    website: n.website ?? '',
    x: n.x,
    y: n.y,
    tags: (n.tags ?? []).join(';'),
    primaryTag: n.primaryTag ?? '',
    collaboratorId: n.collaboratorId,
    status: n.status,
  }));

  const connectionRows = connections.map((c) => ({
    id: c.id,
    fromNodeId: c.fromNodeId,
    toNodeId: c.toNodeId,
    description: c.description,
    collaboratorId: c.collaboratorId,
    status: c.status,
  }));

  const wb = XLSX.utils.book_new();
  const wsNodes = XLSX.utils.json_to_sheet(nodeRows);
  const wsRegions = XLSX.utils.json_to_sheet(regionRows);
  const wsConnections = XLSX.utils.json_to_sheet(connectionRows);

  XLSX.utils.book_append_sheet(wb, wsNodes, 'Nodes');
  XLSX.utils.book_append_sheet(wb, wsRegions, 'Regions');
  XLSX.utils.book_append_sheet(wb, wsConnections, 'Connections');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Generate filename: map name + date (YYYY-MM-DD). Same pattern as image download. */
export function exportFilename(mapTitle: string, ext: string): string {
  const dateForFilename = new Date().toISOString().slice(0, 10);
  const safeTitle = (mapTitle || 'Map')
    .replace(/[\s\\/:*?"<>|]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'map';
  return `${safeTitle}_${dateForFilename}.${ext}`;
}
