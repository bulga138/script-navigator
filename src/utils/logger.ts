import * as vscode from 'vscode';

export class Logger {
  private output: vscode.OutputChannel;
  private static _instance: Logger;

  private constructor() {
    this.output = vscode.window.createOutputChannel('ScriptNavigator');
  }

  static get instance(): Logger {
    if (!this._instance) {
      this._instance = new Logger();
    }
    return this._instance;
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  log(message: string) {
    this.output.appendLine(`[${this.timestamp()}] ${message}`);
  }

  warn(message: string) {
    this.output.appendLine(`[${this.timestamp()}] ⚠️ ${message}`);
  }

  error(message: string, err?: any) {
    this.output.appendLine(`[${this.timestamp()}] ❌ ${message}`);
    if (err) this.output.appendLine(String(err));
  }

  dispose() {
    this.output.dispose();
  }

  debug(message: string) {
    if (vscode.env.isTelemetryEnabled) {
      this.output.appendLine(`[${this.timestamp()}] 🐛 ${message}`);
    }
  }
}
