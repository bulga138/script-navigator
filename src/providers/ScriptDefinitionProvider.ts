import * as vscode from 'vscode';
import * as path from 'path';
import { parseTree, findNodeAtLocation, findNodeAtOffset, Node } from 'jsonc-parser';
import { computeHash } from '../utils/hash.js';
import { safeParseJson } from '../utils/json.js';
import { LRUCache } from '../utils/cache.js';
import { Logger } from '../utils/logger.js';
import { pathExists } from '../utils/fs.js';
import { resolveTokenToLocations } from '../utils/resolveTarget.js';
import type { PackageIndex as ResolveTargetPackageIndex } from '../utils/resolveTarget.js';


interface PackageCacheEntry {
    uri: vscode.Uri;
    json: any;
    tree: Node;
    hash: string;
}


interface KeyValueNode extends Node {
    keyNode: {
        value: string;
    };
    valueNode: {
        type: string;
        value: string;
    };
}

// Type guard function
function isKeyValueNode(node: Node): node is KeyValueNode {
    return (node as KeyValueNode).keyNode !== undefined &&
        (node as KeyValueNode).valueNode !== undefined;
}

export class ScriptDefinitionProvider implements vscode.DefinitionProvider {
    private cache: LRUCache<string, PackageCacheEntry>;
    private log = Logger.instance;

    constructor(context: vscode.ExtensionContext) {
        this.cache = new LRUCache<string, PackageCacheEntry>({
            maxSize: 500,
            persist: true,
            persistDir: context.globalStorageUri.fsPath
        });
        this.indexWorkspace();
        this.watchForChanges();
    }

    /** Workspace indexer for package.json files */
    private async indexWorkspace() {
        const files = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**');
        for (const uri of files) await this.indexFile(uri);
        this.log.log(`[Indexer] Indexed ${this.cache.size} package.json files`);
    }

    private async indexFile(uri: vscode.Uri) {
        try {
            const content = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
            const hash = await computeHash(content);
            const parsed = safeParseJson(content);
if (!parsed || !parsed.tree) return;            this.cache.set(uri.fsPath, { uri, json: parsed.data, tree: parsed.tree, hash });
        } catch (err) {
            this.log.warn(`[Indexer] Failed ${uri.fsPath}: ${err}`);
        }
    }

    private watchForChanges() {
        const watcher = vscode.workspace.createFileSystemWatcher('**/package.json');
        watcher.onDidChange((uri) => this.indexFile(uri));
        watcher.onDidCreate((uri) => this.indexFile(uri));
        watcher.onDidDelete((uri) => this.cache.delete(uri.fsPath));
    }

    /** Return nearest cached package.json */
    private findNearestPackage(uri: vscode.Uri): PackageCacheEntry | undefined {
        let dir = path.dirname(uri.fsPath);
        while (dir && dir !== path.parse(dir).root) {
            const pkgPath = path.join(dir, 'package.json');
            const cached = this.cache.get(pkgPath);
            if (cached) return cached;
            dir = path.dirname(dir);
        }
        return undefined;
    }

    /** Try to find definition of a script/bin/path */
    private async findScriptDefinition(
        scriptName: string,
        fileUri: vscode.Uri
    ): Promise<vscode.Location[]> {
        const results: vscode.Location[] = [];

        // Normalize various CLI invocations
        const normalized = this.normalizeCommand(scriptName);

        // 1️⃣ Try local package
        const localPkg = this.findNearestPackage(fileUri);
        if (localPkg) {
            this.tryAddLocation(localPkg, normalized, results);
            if (results.length) return results;
        }

        // 2️⃣ Fallback to any workspace package
        for (const pkg of this.cache.values()) {
            this.tryAddLocation(pkg, normalized, results);
        }

        // 3️⃣ If it looks like a direct path
        if (results.length === 0 && /[./\\]/.test(normalized)) {
            const abs = path.resolve(path.dirname(fileUri.fsPath), normalized);
            if (await pathExists(abs)) {
                results.push(new vscode.Location(vscode.Uri.file(abs), new vscode.Position(0, 0)));
            }
        }

        return results;
    }

    /** Normalize npm/yarn/bun/pnpm/npx/node run syntax */
    // [File: ScriptDefinitionProvider.ts]

    /** Normalize npm/yarn/bun/pnpm/npx/node run syntax */
   // [File: ScriptDefinitionProvider.ts]

    /** Normalize npm/yarn/bun/pnpm/npx/node run syntax */
    private normalizeCommand(cmd: string): string {
        let normalized = cmd.trim();

        // Use if/else to correctly apply only one pattern
        if (/^(npm|pnpm|yarn|bun)\s+run\s+/.test(normalized)) {
            normalized = normalized.replace(/^(npm|pnpm|yarn|bun)\s+run\s+/, '').trim();
        } else if (/^npx\s+/.test(normalized)) {
            normalized = normalized.replace(/^npx\s+/, '').trim();
        } else if (/^(npm|pnpm|yarn|bun)\s+/.test(normalized)) {
            normalized = normalized.replace(/^(npm|pnpm|yarn|bun)\s+/, '').trim();
        } else if (/^node\s+/.test(normalized)) {
            normalized = normalized.replace(/^node\s+/, '').trim();
        }

        // Split by space and take only the first part to remove arguments
        const parts = normalized.split(/\s+/);
        return parts[0];
    }

    /** Try to add matching locations for scripts or bins */
    private tryAddLocation(pkg: PackageCacheEntry, key: string, results: vscode.Location[]) {
        const { tree, json, uri } = pkg;
        const sections: ('scripts' | 'bin')[] = ['scripts', 'bin'];

        for (const section of sections) {
            const node = findNodeAtLocation(tree, [section, key]);
            if (node) {
                const pos = this.offsetToPosition(uri.fsPath, node.offset);
                results.push(new vscode.Location(uri, pos));
            }
        }

        // handle bin path directly if key is missing
        if (json.bin && typeof json.bin === 'string' && path.basename(json.bin) === key) {
            const node = findNodeAtLocation(tree, ['bin']);
            if (node) results.push(new vscode.Location(uri, this.offsetToPosition(uri.fsPath, node.offset)));
        }
    }

    /** Convert offset in file to VS Code position */
    private offsetToPosition(filePath: string, offset: number): vscode.Position {
        try {
            const content = require('fs').readFileSync(filePath, 'utf8');
            const pre = content.slice(0, offset);
            const lines = pre.split(/\r?\n/);
            return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
        } catch {
            return new vscode.Position(0, 0);
        }
    }

    /** Main Definition provider */
    // [File: ScriptDefinitionProvider.ts]

    /** Main Definition provider */
    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Location[] | undefined> {
       const line = document.lineAt(position.line);
        // Regex to find command-like tokens, including hyphens, paths, and @scopes
        const commandRegex = /[-\w@/.]+/g;
        let match;
        let word: string | undefined;

        while ((match = commandRegex.exec(line.text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;

            // Check if our cursor position is inside this match
            if (position.character >= start && position.character <= end) {
                word = match[0];
                break;
            }
        }
        if (!word) return;

        // Handle Jenkinsfile/Groovy files specifically
        const fileName = path.basename(document.uri.fsPath);
        if (fileName === 'Jenkinsfile' || fileName === 'jenkinsfile' || fileName.endsWith('.groovy')) {
            return await this.handleJenkinsfile(document, position, word);
        }

        // --- REFACTORED BLOCK START ---

        // If inside package.json
        if (path.basename(document.uri.fsPath) === 'package.json') {
            const content = document.getText();
            const root = parseTree(content);
            const offset = document.offsetAt(position);
            if (!root) return;
            
            const node = findNodeAtOffset(root, offset);
            if (!node) return;

            let token: string | undefined = undefined;

            // Case 1: Clicked on a string value (e.g., "lib/merge-reports.js" or "eslint .")
            if (node.type === 'string' && node.parent?.type === 'property') {
                token = node.value;
            }
            // Case 2: Clicked on a property key (e.g., "merge-reports")
            else if (node.type === 'string' && node.parent?.type === 'property' && node.parent.children?.[0] === node) {
                const valueNode = node.parent.children[1];
                if (valueNode && valueNode.type === 'string') {
                    token = valueNode.value;
                }
            }
            // Case 3: A more general check if inside a property
            else if (node.parent?.type === 'property') {
                const valueNode = node.parent.children?.[1];
                if (valueNode && valueNode.type === 'string') {
                    token = valueNode.value;
                }
            }

            if (token) {
                // We have a token (like "eslint ." or "lib/merge-reports.js")
                // Resolve the first part of the command.
                const command = token.split(/\s+/)[0];

                // Use the powerful resolver
                // We must cast the cache type as the definitions are in different files
                const resolverCache = this.cache as unknown as LRUCache<string, ResolveTargetPackageIndex>;
                
                const locations = await resolveTokenToLocations(
                    command,
                    document.uri,
                    resolverCache,
                    {} // Use default options from resolveTarget
                );

                if (locations.length > 0) {
                    return locations.map(loc => new vscode.Location(
                        loc.uri,
                        loc.position ?? new vscode.Position(0, 0)
                    ));
                }
            }
        }

        // --- REFACTORED BLOCK END ---

        // If clicked in code (like "npm run lint" or "merge-reports")
        // This part finds the definition *in* the package.json file
        return await this.findScriptDefinition(word, document.uri);
    }


    /** Handle Jenkinsfile specific parsing */
    // [File: ScriptDefinitionProvider.ts]

    /** Handle Jenkinsfile specific parsing */
    private async handleJenkinsfile(
        document: vscode.TextDocument,
        position: vscode.Position,
        word: string // This 'word' now comes from our new regex, e.g., "merge-reports"
    ): Promise<vscode.Location[] | undefined> {
        
        const line = document.lineAt(position.line).text.trim();

        // Check if the line looks like a full command
        if (line.startsWith('npm') || line.startsWith('npx') || line.startsWith('yarn') || line.startsWith('bun') || line.startsWith('node')) {
            
            // We have a full command line, e.g., "npx fr-short-uri --hub ..." 
            // Normalize the *entire line* to get the base command
            const normalized = this.normalizeCommand(line);
            
            // 'normalized' will be "fr-short-uri" (from the line) or "lint" (from "npm run lint" [cite: 2])
            
            // Check if the word we clicked on is part of this command
            // (e.g., clicking 'fr-short-uri' is part of the normalized 'fr-short-uri')
            if (normalized.includes(word)) {
                return await this.findScriptDefinition(normalized, document.uri);
            }
        }

        // Fallback for simple commands or if the line check fails
        return await this.findScriptDefinition(word, document.uri);
    }

    /** Extract commands from sh blocks in Jenkinsfiles */
    private extractShBlocks(text: string): string[] {
        const blocks: string[] = [];
        const shBlockRegex = /sh\s*'''([\s\S]*?)'''/g;
        let match;

        while ((match = shBlockRegex.exec(text)) !== null) {
            const blockContent = match[1];
            // Split by newlines and clean up
            const commands = blockContent.split('\n')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0 && !cmd.startsWith('#'));
            blocks.push(...commands);
        }

        return blocks;
    }
}

/** Registration helper */
export function registerScriptDefinitionProvider(context: vscode.ExtensionContext) {
    const provider = new ScriptDefinitionProvider(
        context
    );
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider({ pattern: '**' }, provider)
    );
    Logger.instance.log('[ScriptDefinitionProvider] Registered.');
}
