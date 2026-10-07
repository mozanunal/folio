import { configureAppleSigning } from './release-signing.mjs';

configureAppleSigning(process.env, process.platform);
process.argv.splice(2, 0, 'build');
await import('./tauri.mjs');
