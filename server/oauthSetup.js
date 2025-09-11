// filepath: /home/skitt/Simon/wgcastingapp/server/oauthSetup.js
/*
Run once to obtain access_token and refresh_token for your personal Google Drive.
Requires env vars:
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  (optional) GOOGLE_REDIRECT_URI  -> defaults to http://localhost
Scope: https://www.googleapis.com/auth/drive.file
*/
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { google } = require('googleapis');
const readline = require('readline');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';

if (!clientId || !clientSecret) {
  console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent'
});

console.log('Authorize this app by visiting this URL:\n');
console.log(authUrl);
console.log('\nAfter approving, paste the authorization code below.');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nEnter the authorization code: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log('\nTokens received (save refresh_token securely, e.g., in server/.env as GOOGLE_REFRESH_TOKEN):');
    console.log(JSON.stringify(tokens, null, 2));
  } catch (err) {
    console.error('Error retrieving tokens:', err.response?.data || err.message);
    process.exit(1);
  }
});

