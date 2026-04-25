import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceDir = path.join(projectRoot, 'node_modules', 'monaco-editor', 'min', 'vs');
const targetDir = path.join(projectRoot, 'public', 'monaco', 'vs');

if (!existsSync(sourceDir)) {
  console.error(`[monaco-assets] Monaco source assets were not found at ${sourceDir}`);
  process.exit(1);
}

mkdirSync(path.dirname(targetDir), { recursive: true });
rmSync(targetDir, { recursive: true, force: true });
cpSync(sourceDir, targetDir, { recursive: true });

console.log(`[monaco-assets] Synced Monaco assets to ${targetDir}`);
