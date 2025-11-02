import * as vscode from 'vscode';

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    const uri = vscode.Uri.file(filePath);
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
