import {OIDC_DEFAULT_SCOPES} from '@azure/msal-common';

export const aadScopes = OIDC_DEFAULT_SCOPES.concat(['User.Read', 'Calendars.Read', 'Calendars.ReadWrite']);