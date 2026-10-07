import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

if (process.platform !== 'darwin') throw new Error('This launcher installer is for macOS. Use the Folio executable directly on Windows/Linux.');
const directory = join(homedir(), '.local', 'bin');
const destination = join(directory, 'folio');
const launcher = readFileSync(new URL('./folio', import.meta.url));
if (existsSync(destination) && !readFileSync(destination).equals(launcher)) {
  throw new Error(`Another launcher already exists at ${destination}. Move it aside before installing Folio's launcher.`);
}
mkdirSync(directory, { recursive: true });
writeFileSync(destination, launcher);
chmodSync(destination, 0o755);
console.log(`Installed ${destination}`);
console.log('Run: folio ~/notes/');
if (!process.env.PATH?.split(':').includes(directory)) console.log(`Add ${directory} to your shell PATH.`);
