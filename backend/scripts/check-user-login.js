/**
 * Diagnose Cognito user + test AdminInitiateAuth for an email/password.
 * Usage: node scripts/check-user-login.js <email> <password>
 */
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  ListUsersCommand,
  AdminInitiateAuthCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const { createHmac } = require('crypto');
require('dotenv').config();

const email = process.argv[2];
const password = process.argv[3];
const region = process.env.AWS_REGION || 'us-east-1';
const pool = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;
const clientSecret = process.env.COGNITO_CLIENT_SECRET;

function secretHash(username) {
  return createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

const client = new CognitoIdentityProviderClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

(async () => {
  if (!email) {
    console.error('Usage: node scripts/check-user-login.js <email> [password]');
    process.exit(1);
  }

  console.log('Pool:', pool, 'Client:', clientId);

  try {
    const u = await client.send(
      new AdminGetUserCommand({ UserPoolId: pool, Username: email }),
    );
    console.log('AdminGetUser OK');
    console.log('  Username:', u.Username);
    console.log('  Status:', u.UserStatus);
    console.log('  Enabled:', u.Enabled);
    for (const a of u.UserAttributes || []) {
      if (['email', 'sub', 'name'].includes(a.Name)) console.log('  ', a.Name, '=', a.Value);
    }
  } catch (e) {
    console.log('AdminGetUser failed:', e.name, e.message);
    const list = await client.send(
      new ListUsersCommand({
        UserPoolId: pool,
        Filter: `email = "${email}"`,
      }),
    );
    console.log('ListUsers by email:', list.Users?.length ?? 0);
    for (const u of list.Users || []) {
      console.log('  cognito username:', u.Username, 'status:', u.UserStatus);
    }
  }

  if (!password) return;

  try {
    const resp = await client.send(
      new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        UserPoolId: pool,
        ClientId: clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: secretHash(email),
        },
      }),
    );
    console.log('Login OK, challenge?', resp.ChallengeName || 'none');
    if (resp.AuthenticationResult?.AccessToken) {
      console.log('  Got access token');
    }
  } catch (e) {
    console.log('Login failed:', e.name, e.message);
    if (e.$metadata) console.log('  HTTP', e.$metadata.httpStatusCode);
  }
})();
