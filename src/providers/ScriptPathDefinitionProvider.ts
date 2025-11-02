import * as vscode from 'vscode';
import { ScriptDefinitionProvider } from './ScriptDefinitionProvider.js';
import { Logger } from '../utils/logger.js';

/**
 * ScriptPathDefinitionProvider
 * Lightweight delegator to ScriptDefinitionProvider that handles package.json
 * paths, script names, and bin entries. Shares the same caching/indexing core.
 */
export class ScriptPathDefinitionProvider implements vscode.DefinitionProvider {
  private log = Logger.instance;
  private core: ScriptDefinitionProvider;

  constructor(core: ScriptDefinitionProvider) {
    this.core = core;
  }

  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Location[] | undefined> {
    try {
      const locs = await this.core.provideDefinition(document, position);
      return locs;
    } catch (err) {
      this.log.error('[ScriptPathDefinitionProvider] provideDefinition failed', err);
      return [];
    }
  }
}

/** Registration helper */
export function registerScriptPathDefinitionProvider(context: vscode.ExtensionContext, core: ScriptDefinitionProvider) {
  const provider = new ScriptPathDefinitionProvider(core);
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider({ pattern: '**' }, provider)
  );
  Logger.instance.log('[ScriptPathDefinitionProvider] Registered.');
}