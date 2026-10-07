import assert from 'node:assert/strict';

export function configureAppleSigning(environment, platform) {
  const keys = ['APPLE_CERTIFICATE', 'APPLE_CERTIFICATE_PASSWORD', 'APPLE_SIGNING_IDENTITY', 'APPLE_ID', 'APPLE_PASSWORD', 'APPLE_TEAM_ID'];
  const configured = platform === 'darwin' && keys.some((key) => environment[key]);
  if (configured) {
    const missing = keys.filter((key) => !environment[key]);
    assert.equal(missing.length, 0, `Incomplete macOS signing configuration. Missing: ${missing.join(', ')}`);
    assert.ok(environment.APPLE_SIGNING_IDENTITY.startsWith('Developer ID Application:'), 'Distribution requires a Developer ID Application signing identity');
  } else {
    for (const key of keys) delete environment[key];
  }
  return configured;
}
