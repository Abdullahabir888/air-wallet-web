// Grant or remove a role claim. Never exposed to clients.
//   GOOGLE_APPLICATION_CREDENTIALS=sa.json node functions/scripts/set-role.mjs --project <id> <email> admin|atmPartner [--remove]
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const pi = args.indexOf('--project');
const projectId = pi >= 0 ? args.splice(pi, 2)[1] : undefined;
const remove = args.includes('--remove');
const [email, role] = args.filter((a) => !a.startsWith('--'));
if (!email || !['admin', 'atmPartner'].includes(role)) {
  console.error('Usage: set-role.mjs --project <id> <email> admin|atmPartner [--remove]');
  process.exit(1);
}
initializeApp(projectId ? { projectId } : undefined);
const auth = getAuth();
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims ?? {}) };
if (remove) delete claims[role];
else claims[role] = true;
await auth.setCustomUserClaims(user.uid, claims);
await auth.revokeRefreshTokens(user.uid); // forces a fresh token with the new claims
console.log(`${remove ? 'Removed' : 'Granted'} ${role} for ${email}`);
