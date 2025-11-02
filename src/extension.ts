import * as vscode from 'vscode';
import { ScriptDefinitionProvider } from './providers/ScriptDefinitionProvider.js';
import { registerScriptPathDefinitionProvider } from './providers/ScriptPathDefinitionProvider.js';
import { Logger } from './utils/logger.js';

export async function activate(context: vscode.ExtensionContext) {
  const log = Logger.instance;
  log.log('[Extension] Activating Script Navigator...');
  const coreProvider = new ScriptDefinitionProvider(context);
  registerScriptPathDefinitionProvider(context, coreProvider);
  const reindexCommand = vscode.commands.registerCommand('scriptNavigator.reindex', async () => {
    log.log('[Command] Reindexing workspace...');
    await coreProvider['indexWorkspace']?.();
    vscode.window.showInformationMessage('Script Navigator reindexed successfully.');
  });
  context.subscriptions.push(reindexCommand);
  log.log('[Extension] Script Navigator activated successfully.');
}

export function deactivate() {
  Logger.instance.log('[Extension] Deactivated.');
}
