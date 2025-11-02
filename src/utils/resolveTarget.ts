import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Node as JsonNode } from 'jsonc-parser';
import { Logger } from './logger';
import type { LRUCache } from './cache';

/**
 * Result item returned by resolver
 */
export type ResolvedLocation = {
  uri: vscode.Uri;
  position?: vscode.Position;
  reason?: string;
};

/**
 * Package index shape used by cache
 */
export type PackageIndex = {
  uri: vscode.Uri;
  json: any;
  tree?: JsonNode;
  hash?: string;
  lastAccess?: number;
};

/**
 * Options for resolver behaviour
 */
export type ResolveOptions = {
  extensions?: string[];
  preferNearestNodeModules?: boolean;
};

/**
 * Heuristic helpers
 */
function looksLikePath(token: string) {
  return token.startsWith('./') || token.startsWith('../') || token.startsWith('/') || token.includes('./') || token.includes('../');
}

function tryFileSync(candidate: string) {
  try {
    const stat = fs.statSync(candidate);
    if (stat.isFile()) return candidate;
  } catch {}
  return undefined;
}

function tryIndexVariants(base: string, exts: string[]) {
  const candidates = [base, ...exts.map(e => base + e), ...exts.map(e => path.join(base, 'index' + e))];
  for (const c of candidates) {
    const found = tryFileSync(c);
    if (found) return found;
  }
  return undefined;
}

export async function resolveBinaryName(cmd: string, originDir: string, cache: LRUCache<string, PackageIndex>, exts: string[], preferNearest = true): Promise<ResolvedLocation | undefined> {
  const log = Logger.instance;
  const tried: string[] = [];

  let dir = originDir;
  const root = path.parse(dir).root;

  while (dir && dir !== root) {
    try {
      const pkgPath = path.join(dir, 'package.json');
      const pkg = cache.get(pkgPath);
      if (pkg && pkg.json) {
        const bin = pkg.json.bin;
        if (bin) {
          if (typeof bin === 'string' && path.basename(pkg.uri.fsPath) && path.basename(pkg.uri.fsPath) === cmd) {
          }
          if (typeof bin === 'string' && cmd === path.basename(pkg.json.name || '')) {
          }
          if (typeof bin === 'object' && bin[cmd]) {
            const candidate = path.join(path.dirname(pkg.uri.fsPath), bin[cmd]);
            const resolved = tryIndexVariants(candidate, exts);
            if (resolved) return { uri: vscode.Uri.file(resolved), reason: 'bin field in nearest package' };
          }
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      const nmCandidate = path.join(dir, 'node_modules', cmd);
      const pkgJson = path.join(nmCandidate, 'package.json');
      tried.push(pkgJson);
      if (fs.existsSync(pkgJson)) {
        const raw = fs.readFileSync(pkgJson, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.bin) {
          const binEntry = typeof parsed.bin === 'string' ? parsed.bin : parsed.bin[cmd] || Object.values(parsed.bin)[0];
          if (binEntry) {
            const mainPath = path.join(nmCandidate, binEntry);
            const resolved = tryIndexVariants(mainPath, exts);
            if (resolved) return { uri: vscode.Uri.file(resolved), reason: 'bin field in module package' };
          }
        }
        if (parsed.main || parsed.module) {
          const mainPath = path.join(nmCandidate, parsed.main || parsed.module);
          const resolved = tryIndexVariants(mainPath, exts);
          if (resolved) return { uri: vscode.Uri.file(resolved), reason: 'module main' };
        }
        const idx = tryIndexVariants(path.join(nmCandidate, 'index'), exts);
        if (idx) return { uri: vscode.Uri.file(idx), reason: 'module index fallback' };
      }
    } catch (e) {
      // ignore
    }

    try {
      const shim = path.join(dir, 'node_modules', '.bin', cmd);
      const shimResolved = tryIndexVariants(shim, exts);
      if (shimResolved) return { uri: vscode.Uri.file(shimResolved), reason: '.bin shim' };
      const shimCmd = shim + '.cmd';
      if (fs.existsSync(shimCmd)) return { uri: vscode.Uri.file(shimCmd), reason: '.bin shim .cmd' };
      const shimPs = shim + '.ps1';
      if (fs.existsSync(shimPs)) return { uri: vscode.Uri.file(shimPs), reason: '.bin shim .ps1' };
    } catch (e) {
      // ignore
    }

    dir = path.dirname(dir);
  }

  for (const [, pkg] of cache.entries()) {
    try {
      const name = pkg.json?.name;
      if (name === cmd || name === `@${cmd}` || name?.endsWith('/' + cmd)) {
        if (pkg.json?.bin) {
          const binEntry = typeof pkg.json.bin === 'string' ? pkg.json.bin : pkg.json.bin[cmd] || Object.values(pkg.json.bin)[0];
          if (binEntry) {
            const candidate = path.join(path.dirname(pkg.uri.fsPath), binEntry);
            const resolved = tryIndexVariants(candidate, exts);
            if (resolved) return { uri: vscode.Uri.file(resolved), reason: 'bin in cached package' };
          }
        }
        if (pkg.json?.main) {
          const mainCandidate = path.join(path.dirname(pkg.uri.fsPath), pkg.json.main);
          const resolved = tryIndexVariants(mainCandidate, exts);
          if (resolved) return { uri: vscode.Uri.file(resolved), reason: 'main in cached package' };
        }
      }
    } catch {}
  }

  log.debug(`[resolveBinaryName] Tried candidates: ${JSON.stringify(tried.slice(0,10))}`);
  return undefined;
}

export async function resolveTokenToLocations(
  token: string,
  originUri: vscode.Uri,
  cache: LRUCache<string, PackageIndex>,
  opts: ResolveOptions = {}
): Promise<ResolvedLocation[]> {
  const log = Logger.instance;
  const exts = opts.extensions ?? ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.json'];

  const results: ResolvedLocation[] = [];
  const originDir = path.dirname(originUri.fsPath);

  if (looksLikePath(token)) {
    const t = token.replace(/^["'`]|["'`]$/g, '');
    let candidate = t;
    if (!path.isAbsolute(candidate)) candidate = path.resolve(originDir, candidate);
    const fileResolved = tryIndexVariants(candidate, exts);
    if (fileResolved) {
      results.push({ uri: vscode.Uri.file(fileResolved), reason: 'relative path' });
      return results;
    }
  }

  if (!looksLikePath(token) && token.includes('/')) {
    let dir = originDir, root = path.parse(dir).root;
    while (dir && dir !== root) {
      const nmBase = path.join(dir, 'node_modules');
      const candidate = path.join(nmBase, token);
      const resolved = tryIndexVariants(candidate, exts);
      if (resolved) {
        results.push({ uri: vscode.Uri.file(resolved), reason: 'module subpath' });
        return results;
      }
      dir = path.dirname(dir);
    }
  }

  const binResolved = await resolveBinaryName(token, originDir, cache, exts, opts.preferNearestNodeModules ?? true);
  if (binResolved) {
    results.push(binResolved);
    return results;
  }

  try {
    const glob = `**/${token}*`;
    const found = await vscode.workspace.findFiles(glob, '**/node_modules/**', 10);
    for (const f of found) results.push({ uri: f, reason: 'workspace search' });
    if (results.length) return results;
  } catch (e) {
    log.debug(`[resolveTokenToLocations] workspace search failed: ${String(e)}`);
  }

  return results;
}
