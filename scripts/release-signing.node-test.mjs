import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureAppleSigning } from './release-signing.mjs';

const credentials = () => ({
  APPLE_CERTIFICATE: 'example-certificate',
  APPLE_CERTIFICATE_PASSWORD: 'example-password',
  APPLE_SIGNING_IDENTITY: 'Developer ID Application: Example (EXAMPLE)',
  APPLE_ID: 'example@example.invalid',
  APPLE_PASSWORD: 'example-app-specific-password',
  APPLE_TEAM_ID: 'EXAMPLE',
});

test('absent secrets are removed so Tauri does not try to import an empty certificate', () => {
  const environment = Object.fromEntries(Object.keys(credentials()).map((key) => [key, '']));
  environment.PATH = '/example';
  assert.equal(configureAppleSigning(environment, 'darwin'), false);
  assert.deepEqual(environment, { PATH: '/example' });
});

test('incomplete credentials cannot silently produce an unsigned release', () => {
  assert.throws(() => configureAppleSigning({ APPLE_ID: 'example@example.invalid' }, 'darwin'), /Incomplete macOS signing configuration/);
  assert.throws(() => configureAppleSigning({ ...credentials(), APPLE_SIGNING_IDENTITY: '-' }, 'darwin'), /Developer ID Application/);
});

test('complete credentials are preserved for the Tauri signing and notarization process', () => {
  const environment = credentials();
  assert.equal(configureAppleSigning(environment, 'darwin'), true);
  assert.deepEqual(environment, credentials());
});

test('Apple credentials are excluded from other platform builds', () => {
  const environment = credentials();
  assert.equal(configureAppleSigning(environment, 'win32'), false);
  assert.deepEqual(environment, {});
});
