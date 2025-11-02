import * as crypto from 'crypto';
import * as vscode from 'vscode';

/** Compute SHA-1 hash of text or file buffer */
export async function computeHash(input: string | Uint8Array): Promise<string> {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

/** Compute file hash via VSCode FS API */
export async function hashFile(uri: vscode.Uri): Promise<string> {
  try {
    const fileBuffer = await vscode.workspace.fs.readFile(uri);
    return await computeHash(fileBuffer);
  } catch {
    return '';
  }
}
