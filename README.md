# 🧭 Script Navigator

Jump directly to your `package.json` scripts and their implementations. **Ctrl+click** (or `Cmd+click`) on `npm run lint` in your `Jenkinsfile` to go to its definition, then **Ctrl+click** `eslint .` to jump to the `eslint` binary\!

This extension supercharges your "Go to Definition" capabilities for Node.js projects, understanding your npm scripts, binaries, and local files. It creates a "two-way" navigation link:

1.  **From Code → `package.json`:** Jump from any file (`.js`, `.ts`, `Jenkinsfile`, `.md`, etc.) *to* your script definition.
2.  **From `package.json` → Implementation:** Jump from your script definition *to* the actual file or binary that runs.

## ✅ Features

  - ⚡ **Go to Script Definition**: **Ctrl+click** a script command (like `npm run lint` [cite: 2] [cite\_start]or `npx merge-reports` [cite: 7]) in *any* file to jump to its definition in the nearest `package.json` (`scripts` or `bin` section).
  - 🚀 **Go to Script Implementation**: From *inside* `package.json`, **Ctrl+click** on a script's value (e.g., `"eslint ."` or `"./lib/merge-reports.js"`) to jump to the actual executable file.
  - 🧠 **Smart Command Parsing**: Understands `npm`, `npx`, `yarn`, `pnpm`, `bun`, and `node` commands. [cite\_start]It automatically strips arguments (like `--hub ${HUB_IP}` [cite: 5]) to find the base command.
  - 🔍 **Advanced Binary Resolution**: Finds script implementations in `node_modules/.bin`, workspace-wide `package.json` `bin` entries, and relative file paths.
  - 📂 **Workspace-wide Index**: Scans and caches all `package.json` files in your workspace for fast, monorepo-friendly navigation.
  - 📜 **`Jenkinsfile` Support**: Natively understands commands inside `sh '''...'''` blocks in `Jenkinsfile` and `.groovy` files.

## 🛠️ Installation

1.  Press `Ctrl+Shift+X` (or `Cmd+Shift+X`) to open the Extensions view.
2.  Search for **"Script Navigator"**.
3.  Click **Install**.

Alternatively, via CLI (once published):

```bash
code --install-extension bulga.script-navigator
```

## 🖱️ Usage

This extension activates automatically. There are two primary ways to use it:

### 1\. From Code to `package.json`

In any file (like your `Jenkinsfile` or `index.js`), find a line that calls a script.

```groovy
// In your Jenkinsfile
sh '''
    [cite_start]npx merge-reports [cite: 7]
    [cite_start]npm run lint [cite: 2]
'''
```

  - **Ctrl+click** (or `Cmd+click`) on `merge-reports`.
  - You will jump directly to the `"merge-reports": "lib/merge-reports.js"` line in your `package.json`.

### 2\. From `package.json` to File

In your `package.json`, find a script or binary definition.

```json
// In your package.json
"scripts": {
    "lint": "eslint ."
},
"bin": {
    "merge-reports": "lib/merge-reports.js"
}
```

  - **Ctrl+click** (or `Cmd+click`) on `eslint`.
      - You will jump to the actual `eslint` executable in `node_modules/.bin/eslint`.
  - **Ctrl+click** (or `Cmd+click`) on `lib/merge-reports.js`.
      - You will jump to and open the `lib/merge-reports.js` file.

## ⚙️ Commands

This extension contributes the following command to the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

  - `Script Navigator: Re-index Workspace`: Manually rescans the entire workspace for all `package.json` files.

## 📦 Requirements

  - VS Code v1.74+
  - A Node.js project containing one or more `package.json` files.

## 🐞 Known Issues & Troubleshooting

### Nothing happens when I click

  - Try running the `Script Navigator: Re-index Workspace` command from the Command Palette.
  - Ensure the `package.json` containing the script is not inside a `node_modules` folder (which are ignored by the indexer).
  - Check the `Script Navigator` output channel for any errors.

## 🏷️ Release Notes

**0.1.0**

  - Initial release of Script Navigator.
  - Support for `package.json` `scripts` and `bin` navigation.
  - Support for jumping from `Jenkinsfile`, `.js`, `.ts`, and other files.
  - Advanced binary and path resolution.