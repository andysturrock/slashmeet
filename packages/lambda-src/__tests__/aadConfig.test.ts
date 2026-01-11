import { OIDC_DEFAULT_SCOPES } from '@azure/msal-common';
import { aadScopes } from '../ts-src/aadConfig';

describe('aadConfig', () => {
  test('aadScopes should contain default OIDC scopes and calendar scopes', () => {
    expect(aadScopes).toContain('User.Read');
    expect(aadScopes).toContain('Calendars.Read');
    expect(aadScopes).toContain('Calendars.ReadWrite');
    OIDC_DEFAULT_SCOPES.forEach(scope => {
      expect(aadScopes).toContain(scope);
    });
  });
});
