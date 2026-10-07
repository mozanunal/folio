import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const { version } = JSON.parse(read('package.json'));
assert.match(version, /^\d+\.\d+\.\d+$/);
assert.equal(JSON.parse(read('package-lock.json')).version, version);
assert.equal(JSON.parse(read('package-lock.json')).packages[''].version, version);
assert.equal(JSON.parse(read('src-tauri/tauri.conf.json')).version, version);
const cargoPackage = read('src-tauri/Cargo.toml').split('[package]')[1].split('\n[')[0];
assert.equal(cargoPackage.match(/^version\s*=\s*"([^"]+)"/m)?.[1], version);
const cargoLockPackage = read('src-tauri/Cargo.lock').split('[[package]]').find((entry) => /^name = "folio"$/m.test(entry));
assert.equal(cargoLockPackage?.match(/^version = "([^"]+)"/m)?.[1], version);
if (process.env.GITHUB_REF_TYPE === 'tag') {
  assert.equal(process.env.GITHUB_REF_NAME, `v${version}`, 'Release tag must match the app version');
}
assert.ok(read(`releases/${version}.md`).trim(), 'Release notes are required');
console.log(`version=${version}`);
