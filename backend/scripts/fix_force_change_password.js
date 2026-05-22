/**
 * fix_force_change_password.js
 *
 * Lists all users in the Cognito User Pool, finds any stuck in
 * FORCE_CHANGE_PASSWORD status, and calls AdminSetUserPassword
 * with --permanent to move them to CONFIRMED.
 *
 * Usage:
 *   node fix_force_change_password.js <NEW_PASSWORD>
 *
 * Example:
 *   node fix_force_change_password.js "MyNewPass123!"
 *
 * The password must satisfy Cognito's password policy
 * (uppercase, lowercase, digit, special char, min 8 chars).
 */

const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminSetUserPasswordCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

require('dotenv').config();

// ── Config ──────────────────────────────────────────────
const REGION = process.env.AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

if (!USER_POOL_ID) {
  console.error('❌  COGNITO_USER_POOL_ID not found in .env');
  process.exit(1);
}

const NEW_PASSWORD = process.argv[2];
if (!NEW_PASSWORD) {
  console.error('❌  Usage: node fix_force_change_password.js <NEW_PASSWORD>');
  console.error('   Example: node fix_force_change_password.js "MyNewPass123!"');
  process.exit(1);
}

const client = new CognitoIdentityProviderClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── Helpers ─────────────────────────────────────────────

async function listAllUsers() {
  const users = [];
  let paginationToken;

  do {
    const cmd = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60,
      ...(paginationToken && { PaginationToken: paginationToken }),
    });

    const resp = await client.send(cmd);
    if (resp.Users) users.push(...resp.Users);
    paginationToken = resp.PaginationToken;
  } while (paginationToken);

  return users;
}

async function forceConfirmUser(username) {
  const cmd = new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: username,
    Password: NEW_PASSWORD,
    Permanent: true, // moves status → CONFIRMED
  });
  return client.send(cmd);
}

// ── Main ────────────────────────────────────────────────

(async () => {
  try {
    console.log(`\n🔍  Listing users in pool: ${USER_POOL_ID} ...\n`);
    const allUsers = await listAllUsers();
    console.log(`   Total users found: ${allUsers.length}\n`);

    // Show a table of all users and their status
    console.log('┌──────────────────────────────────┬────────────────────────────┬──────────────────────────┐');
    console.log('│ Username                         │ Email                      │ Status                   │');
    console.log('├──────────────────────────────────┼────────────────────────────┼──────────────────────────┤');
    for (const u of allUsers) {
      const email = (u.Attributes || []).find(a => a.Name === 'email')?.Value || '—';
      const status = u.UserStatus || '—';
      console.log(
        `│ ${u.Username.padEnd(32)} │ ${email.padEnd(26)} │ ${status.padEnd(24)} │`
      );
    }
    console.log('└──────────────────────────────────┴────────────────────────────┴──────────────────────────┘\n');

    // Filter for FORCE_CHANGE_PASSWORD
    const stuck = allUsers.filter(u => u.UserStatus === 'FORCE_CHANGE_PASSWORD');

    if (stuck.length === 0) {
      console.log('✅  No users stuck in FORCE_CHANGE_PASSWORD. Nothing to do!\n');
      return;
    }

    console.log(`⚠️   Found ${stuck.length} user(s) in FORCE_CHANGE_PASSWORD status:\n`);
    for (const u of stuck) {
      const email = (u.Attributes || []).find(a => a.Name === 'email')?.Value || '—';
      console.log(`   • ${u.Username}  (${email})`);
    }

    console.log(`\n🔑  Setting permanent password for each user...\n`);

    let success = 0;
    let failed = 0;

    for (const u of stuck) {
      const email = (u.Attributes || []).find(a => a.Name === 'email')?.Value || u.Username;
      try {
        await forceConfirmUser(u.Username);
        console.log(`   ✅  ${email} → CONFIRMED`);
        success++;
      } catch (err) {
        console.error(`   ❌  ${email} → FAILED: ${err.message}`);
        failed++;
      }
    }

    console.log(`\n────────────────────────────────────────────`);
    console.log(`   Done!  ✅ ${success} confirmed  |  ❌ ${failed} failed`);
    console.log(`────────────────────────────────────────────\n`);
  } catch (err) {
    console.error('❌  Fatal error:', err.message);
    process.exit(1);
  }
})();
