import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const { version } = createRequire(import.meta.url)('../package.json');
const platforms = {
  'macos-arm64': { target: 'aarch64-apple-darwin', host: 'darwin' },
  'windows-x64': { target: 'x86_64-pc-windows-msvc', host: 'win32' },
  'linux-x64': { target: 'x86_64-unknown-linux-gnu', host: 'linux' },
};
const platform = process.argv[2];
const configuration = platforms[platform];
assert.ok(configuration, `Unsupported release platform: ${platform}`);
assert.equal(process.platform, configuration.host);
const bundle = resolve('src-tauri/target', configuration.target, 'release/bundle');
const output = resolve('release-assets');
mkdirSync(output, { recursive: true });
const asset = (suffix) => join(output, `Folio_${version}_${platform}${suffix}`);
const collect = (directory, extension, suffix) => {
  const matches = readdirSync(join(bundle, directory)).filter((name) => name.endsWith(extension));
  assert.equal(matches.length, 1, `Expected one ${extension} installer`);
  copyFileSync(join(bundle, directory, matches[0]), asset(suffix));
};

if (platform === 'macos-arm64') {
  const app = join(bundle, 'macos/Folio.app');
  const architectures = execFileSync('lipo', ['-archs', join(app, 'Contents/MacOS/folio')], { encoding: 'utf8' }).trim();
  assert.equal(architectures, 'arm64');
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, asset('.zip')]);
} else if (platform === 'windows-x64') {
  collect('nsis', '.exe', '-setup.exe');
} else {
  collect('appimage', '.AppImage', '.AppImage');
  collect('deb', '.deb', '.deb');
}
