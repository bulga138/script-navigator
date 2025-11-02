import { parseTree, findNodeAtLocation, Node as JsonNode } from 'jsonc-parser';

export interface ParsedJsonFile {
  data: any;
  tree: JsonNode | undefined;
  error?: string;
}

/** Safely parse JSON or JSONC text */
export function safeParseJson(content: string): ParsedJsonFile {
  try {
    const data = JSON.parse(content);
    const tree = parseTree(content)!;
    return { data, tree };
  } catch (err: any) {
    return { data: undefined, tree: undefined, error: err?.message ?? 'Invalid JSON' };
  }
}

/** Find node at a specific property path (with null safety) */
export function findNode(tree: JsonNode | undefined, path: (string | number)[]): JsonNode | undefined {
  if (!tree) return undefined;
  try {
    return findNodeAtLocation(tree, path);
  } catch {
    return undefined;
  }
}
