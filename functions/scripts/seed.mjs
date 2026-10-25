// Seeds reference data. Emulator:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node functions/scripts/seed.mjs
// Real project: GOOGLE_APPLICATION_CREDENTIALS=sa.json node functions/scripts/seed.mjs --project <id> --no-demo-users
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const projectId = args.includes('--project') ? args[args.indexOf('--project') + 1] : 'demo-air-wallet';
const demoUsers = !args.includes('--no-demo-users');
initializeApp({ projectId });
const db = getFirestore();
const auth = getAuth();
const now = FieldValue.serverTimestamp();

// Demo billers (simulated — no real biller integration).
const billers = [
  ['electricity-desco', 'Electricity (DESCO)', 'electricity', 'Meter / account no.'],
  ['electricity-dpdc', 'Electricity (DPDC)', 'electricity', 'Meter / account no.'],
  ['gas-titas', 'Gas (Titas)', 'gas', 'Customer code'],
  ['water-dwasa', 'Water (Dhaka WASA)', 'water', 'Account no.'],
  ['internet', 'Internet / Broadband', 'internet', 'Customer ID'],
  ['tv', 'Cable / Satellite TV', 'tv', 'Subscriber ID'],
  ['education', 'School / University fees', 'education', 'Student ID'],
];
for (const [id, name, category, accountLabel] of billers) {
  await db.doc(`billers/${id}`).set({ name, category, accountLabel, active: true, demo: true });
}

// Demo cash-out agent.
await db.doc('agents/01819000022').set({ name: 'Rahim Store (demo agent)', area: 'Dhanmondi', active: true });

// Demo rates (overwritten by the live provider once EXCHANGE_API_KEY is set).
await db.doc('fxRates/BDT').set({
  base: 'BDT',
  bdtPer: { USD: '121.80', GBP: '158.42', EUR: '131.95' },
  previous: { USD: '121.68', GBP: '158.73', EUR: '131.90' },
  source: 'demo',
  fetchedAt: Timestamp.now(),
});

async function ensureUser(email, password, displayName, phone, balanceMinor, claims) {
  let u;
  try {
    u = await auth.getUserByEmail(email);
  } catch {
    u = await auth.createUser({ email, password, displayName, emailVerified: true });
  }
  if (claims) await auth.setCustomUserClaims(u.uid, claims);
  await db.doc(`users/${u.uid}`).set(
    { displayName, email, phone, photoPath: null, defaultCurrency: 'BDT', theme: 'system', status: 'active', createdAt: now, updatedAt: now },
    { merge: true },
  );
  if (phone) await db.doc(`phoneIndex/${phone}`).set({ uid: u.uid, createdAt: now });
  const w = db.doc(`wallets/${u.uid}_BDT`);
  const mark = db.doc(`seedMarks/${u.uid}`);
  if (balanceMinor > 0 && !(await mark.get()).exists) {
    // Opening balance as a proper double-entry credit (additive, so it is safe whether or not
    // the onUserCreated trigger has already created the wallet).
    const tx = db.collection('transactions').doc();
    const batch = db.batch();
    batch.set(w, { ownerUid: u.uid, currency: 'BDT', balanceMinor: FieldValue.increment(balanceMinor), label: 'Main wallet', status: 'active', version: FieldValue.increment(1), createdAt: now, updatedAt: now }, { merge: true });
    batch.set(db.doc('wallets/system_FUNDING_BDT'), { ownerUid: 'system', currency: 'BDT', balanceMinor: FieldValue.increment(-balanceMinor), label: 'Funding', status: 'active', version: FieldValue.increment(1), updatedAt: now }, { merge: true });
    batch.set(tx, { type: 'CREDIT', status: 'COMPLETED', participants: [u.uid], fromWalletId: 'system_FUNDING_BDT', toWalletId: w.id, amountMinor: balanceMinor, currency: 'BDT', feeMinor: 0, title: 'Wallet credit', subtitle: 'Demo opening balance', createdBy: 'seed', idempotencyKey: `seed_${u.uid}`, createdAt: now });
    batch.set(db.collection('ledgerEntries').doc(), { transactionId: tx.id, walletId: w.id, ownerUid: u.uid, currency: 'BDT', deltaMinor: balanceMinor, balanceAfterMinor: balanceMinor, createdAt: now });
    batch.set(db.collection('ledgerEntries').doc(), { transactionId: tx.id, walletId: 'system_FUNDING_BDT', ownerUid: 'system', currency: 'BDT', deltaMinor: -balanceMinor, balanceAfterMinor: 0, createdAt: now });
    batch.set(mark, { at: now });
    await batch.commit();
  }
  console.log(`✓ ${email} (${u.uid})`);
}

if (demoUsers) {
  await ensureUser('abir@demo.airwallet', 'Demo1234', 'Abdullah Al Ahad', '01712345678', 48_250_00, { admin: true });
  await ensureUser('rafi@demo.airwallet', 'Demo1234', 'Rafi Hasan', '01812345678', 20_000_00);
  await ensureUser('atm@demo.airwallet', 'Demo1234', 'Demo ATM Switch', null, 0, { atmPartner: true });
}
console.log('Seed complete.');
process.exit(0);
