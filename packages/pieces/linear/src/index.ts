import { createPiece, PieceAuth } from '@activepieces/pieces-framework';
import { linearCreateIssue } from './lib/actions/issues/create-issue';
import { linearUpdateIssue } from './lib/actions/issues/update-issue';

const markdown = `
To obtain your API key, follow these steps:

1. Go to settings by clicking your profile-pic (top-left)
2. Go to API section inside My Account.
3. On Personal API keys, give label and press create key.`;

export const linearAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  required: true,
  description: markdown,
  validate: async ({ auth }) => {
    if (auth.startsWith('lin_api_')) {
      return {
        valid: true,
      };
    }
    return {
      valid: false,
      error: 'Invalid API Key',
    };
  },
});
export const linear = createPiece({
  displayName: 'Linear',
  auth: linearAuth,
  minimumSupportedRelease: '0.7.1',
  logoUrl: 'https://cdn.activepieces.com/pieces/linear.png',
  authors: ['kishanprmr'],
  actions: [linearCreateIssue, linearUpdateIssue],
  triggers: [],
});
