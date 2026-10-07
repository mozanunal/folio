import { spawnSync } from 'node:child_process';
import { dirname, delimiter } from 'node:path';

const environment = process.env;
const cargo = spawnSync('cargo', ['--version'], { env: environment, stdio: 'ignore' });

if (cargo.error?.code === 'ENOENT') {
  const rustup = spawnSync('rustup', ['which', 'cargo'], { encoding: 'utf8' });
  if (rustup.status !== 0 || !rustup.stdout.trim()) {
    console.error('Rust tools are unavailable. Install Rust with rustup and restart your terminal.');
    process.exit(1);
  }
  const pathKey = Object.keys(environment).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  environment[pathKey] = `${dirname(rustup.stdout.trim())}${delimiter}${environment[pathKey] ?? ''}`;
}

const { run } = await import('@tauri-apps/cli');
try {
  await run(process.argv.slice(2), 'npm run tauri');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
