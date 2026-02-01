import type { MapNode, MapConnection } from '../types';
import { NodeType } from '../types';

export interface ImportResult {
  nodesAdded: MapNode[];
  connectionsAdded: MapConnection[];
  nodesDuplicate: number;
  connectionsDuplicate: number;
  errors: string[];
}

/** Parse a row into a MapNode, validating required fields. */
function parseNodeRow(row: Record<string, unknown>, rowIndex: number): { node?: MapNode; error?: string } {
  const title = String(row.title || '').trim();
  const typeRaw = String(row.type || '').toUpperCase().trim();

  if (!title) {
    return { error: `Row ${rowIndex}: Missing title` };
  }

  const validTypes = Object.values(NodeType) as string[];
  if (!validTypes.includes(typeRaw)) {
    return { error: `Row ${rowIndex}: Invalid type "${row.type}". Must be one of: ${validTypes.join(', ')}` };
  }

  const node: MapNode = {
    id: String(row.id || crypto.randomUUID()),
    type: typeRaw as NodeType,
    title,
    description: String(row.description || ''),
    website: row.website ? String(row.website) : undefined,
    x: Number(row.x) || Math.random() * 80 + 10, // Random position if not specified
    y: Number(row.y) || Math.random() * 80 + 10,
    tags: row.tags ? String(row.tags).split(';').map(t => t.trim()).filter(Boolean) : [],
    primaryTag: String(row.primaryTag || ''),
    collaboratorId: String(row.collaboratorId || ''),
    status: row.status === 'approved' ? 'approved' : 'pending',
  };

  return { node };
}

/** Parse a row into a MapConnection, validating required fields. */
function parseConnectionRow(row: Record<string, unknown>, rowIndex: number): { connection?: MapConnection; error?: string } {
  const fromNodeId = String(row.fromNodeId || '').trim();
  const toNodeId = String(row.toNodeId || '').trim();

  if (!fromNodeId || !toNodeId) {
    return { error: `Row ${rowIndex}: Missing fromNodeId or toNodeId` };
  }

  const connection: MapConnection = {
    id: String(row.id || crypto.randomUUID()),
    fromNodeId,
    toNodeId,
    description: String(row.description || ''),
    collaboratorId: String(row.collaboratorId || ''),
    status: row.status === 'approved' ? 'approved' : 'pending',
  };

  return { connection };
}

/** Check if a node is a duplicate based on title and type (case-insensitive). */
function isNodeDuplicate(node: MapNode, existingNodes: MapNode[]): boolean {
  const titleLower = node.title.toLowerCase();
  return existingNodes.some(
    (existing) =>
      existing.title.toLowerCase() === titleLower &&
      existing.type === node.type
  );
}

/** Check if a connection is a duplicate based on from/to node IDs. */
function isConnectionDuplicate(conn: MapConnection, existingConnections: MapConnection[]): boolean {
  return existingConnections.some(
    (existing) =>
      (existing.fromNodeId === conn.fromNodeId && existing.toNodeId === conn.toNodeId) ||
      (existing.fromNodeId === conn.toNodeId && existing.toNodeId === conn.fromNodeId)
  );
}

/** Parse an xlsx file and return new nodes/connections, checking for duplicates. */
export async function parseXlsxFile(
  file: File,
  existingNodes: MapNode[],
  existingConnections: MapConnection[]
): Promise<ImportResult> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const result: ImportResult = {
    nodesAdded: [],
    connectionsAdded: [],
    nodesDuplicate: 0,
    connectionsDuplicate: 0,
    errors: [],
  };

  // Process Nodes sheet
  const nodesSheet = workbook.Sheets['Nodes'];
  if (nodesSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(nodesSheet);
    for (let i = 0; i < rows.length; i++) {
      const { node, error } = parseNodeRow(rows[i], i + 2); // +2 for header row and 1-based
      if (error) {
        result.errors.push(`Nodes: ${error}`);
        continue;
      }
      if (node) {
        if (isNodeDuplicate(node, existingNodes) || isNodeDuplicate(node, result.nodesAdded)) {
          result.nodesDuplicate++;
        } else {
          result.nodesAdded.push(node);
        }
      }
    }
  }

  // Process Regions sheet (also nodes with type REGION)
  const regionsSheet = workbook.Sheets['Regions'];
  if (regionsSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(regionsSheet);
    for (let i = 0; i < rows.length; i++) {
      // Force type to REGION for this sheet
      const rowWithType = { ...rows[i], type: 'REGION' };
      const { node, error } = parseNodeRow(rowWithType, i + 2);
      if (error) {
        result.errors.push(`Regions: ${error}`);
        continue;
      }
      if (node) {
        if (isNodeDuplicate(node, existingNodes) || isNodeDuplicate(node, result.nodesAdded)) {
          result.nodesDuplicate++;
        } else {
          result.nodesAdded.push(node);
        }
      }
    }
  }

  // Process Connections sheet
  const connectionsSheet = workbook.Sheets['Connections'];
  if (connectionsSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(connectionsSheet);
    for (let i = 0; i < rows.length; i++) {
      const { connection, error } = parseConnectionRow(rows[i], i + 2);
      if (error) {
        result.errors.push(`Connections: ${error}`);
        continue;
      }
      if (connection) {
        const allConnections = [...existingConnections, ...result.connectionsAdded];
        if (isConnectionDuplicate(connection, allConnections)) {
          result.connectionsDuplicate++;
        } else {
          result.connectionsAdded.push(connection);
        }
      }
    }
  }

  return result;
}

/** Generate a blank template xlsx. Column order and names match export format exactly
 * so exported data from one map can be uploaded to another without modification. */
export async function generateTemplateXlsx(): Promise<Blob> {
  const XLSX = await import('xlsx');

  // Same columns as export-data.ts toXlsx - must stay in sync
  const nodeHeaders = ['id', 'type', 'title', 'description', 'website', 'x', 'y', 'tags', 'primaryTag', 'collaboratorId', 'status'];
  const connectionHeaders = ['id', 'fromNodeId', 'toNodeId', 'description', 'collaboratorId', 'status'];

  const exampleEventId = 'template-example-event-1';
  const exampleRegionId = 'template-example-region-1';

  const nodeExampleRow: Record<string, string | number> = {
    id: exampleEventId,
    type: 'EVENT',
    title: 'Example Event',
    description: 'An example event description',
    website: 'https://example.com',
    x: 50,
    y: 50,
    tags: 'music;community',
    primaryTag: 'music',
    collaboratorId: '',
    status: 'approved',
  };

  const regionExampleRow: Record<string, string | number> = {
    id: exampleRegionId,
    type: 'REGION',
    title: 'Example Region',
    description: 'A neighbourhood or area',
    website: '',
    x: 50,
    y: 50,
    tags: '',
    primaryTag: '',
    collaboratorId: '',
    status: 'approved',
  };

  const connectionExampleRow: Record<string, string> = {
    id: '',
    fromNodeId: exampleEventId,
    toNodeId: exampleRegionId,
    description: 'They collaborate together',
    collaboratorId: '',
    status: 'approved',
  };

  const wb = XLSX.utils.book_new();

  const nodeRows = [nodeExampleRow];
  const wsNodes = XLSX.utils.json_to_sheet(nodeRows);
  XLSX.utils.book_append_sheet(wb, wsNodes, 'Nodes');

  const regionRows = [regionExampleRow];
  const wsRegions = XLSX.utils.json_to_sheet(regionRows);
  XLSX.utils.book_append_sheet(wb, wsRegions, 'Regions');

  const connectionRows = [connectionExampleRow];
  const wsConnections = XLSX.utils.json_to_sheet(connectionRows);
  XLSX.utils.book_append_sheet(wb, wsConnections, 'Connections');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
