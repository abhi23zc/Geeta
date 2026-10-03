import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const uid = process.argv[2];
if (!uid) throw new Error('Usage: npm run bootstrap-admin -- FIREBASE_USER_UID');
initializeApp({ credential: applicationDefault() });
const user = await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid, { ...user.customClaims, admin: true });
console.log(`Admin role assigned to ${uid}. Sign out and in to refresh the token.`);
