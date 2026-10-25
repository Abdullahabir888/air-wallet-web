/**
 * Security rules tests. Run with the emulator:  npm run test:rules   (from repo root)
 * Every rule has an allow case and a deny case.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-air-wallet',
    firestore: { rules: readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { displayName: 'Alice', email: 'a@x.com', phone: '01712345678', theme: 'system', defaultCurrency: 'BDT', status: 'active' });
    await setDoc(doc(db, 'users/bob'), { displayName: 'Bob', email: 'b@x.com', phone: null, theme: 'system', defaultCurrency: 'BDT', status: 'active' });
    await setDoc(doc(db, 'wallets/alice_BDT'), { ownerUid: 'alice', currency: 'BDT', balanceMinor: 100000, status: 'active' });
    await setDoc(doc(db, 'transactions/t1'), { participants: ['alice', 'bob'], amountMinor: 500, type: 'TRANSFER' });
    await setDoc(doc(db, 'cardSecrets/alice'), { pan: '9000000000000000', cvv: '123' });
    await setDoc(doc(db, 'cards/alice'), { uid: 'alice', style: 'black' });
    await setDoc(doc(db, 'atmCodes/c1'), { uid: 'alice', code: '123456', status: 'ACTIVE' });
    await setDoc(doc(db, 'fxRates/BDT'), { bdtPer: { USD: '121.80' } });
    await setDoc(doc(db, 'auditLog/a1'), { action: 'x' });
  });
});

const as = (uid: string, claims: Record<string, unknown> = {}) => env.authenticatedContext(uid, claims).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('users', () => {
  test('owner reads own profile, not others', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')));
    await assertFails(getDoc(doc(as('alice'), 'users/bob')));
    await assertFails(getDoc(doc(anon(), 'users/alice')));
  });
  test('owner edits allowed fields only', async () => {
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { displayName: 'Alice A', theme: 'dark' }));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { status: 'active', displayName: 'X1' }));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { phone: '01999999999' }));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { theme: 'neon' }));
    await assertFails(updateDoc(doc(as('bob'), 'users/alice'), { displayName: 'Hacked' }));
  });
});

describe('money is read-only for clients', () => {
  test('owner reads wallet; nobody writes it', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'wallets/alice_BDT')));
    await assertFails(getDoc(doc(as('bob'), 'wallets/alice_BDT')));
    await assertFails(updateDoc(doc(as('alice'), 'wallets/alice_BDT'), { balanceMinor: 999999999 }));
    await assertFails(setDoc(doc(as('alice'), 'wallets/alice_USD'), { ownerUid: 'alice', balanceMinor: 1 }));
  });
  test('participants read transactions; others cannot', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'transactions/t1')));
    await assertFails(getDoc(doc(as('carol'), 'transactions/t1')));
    await assertFails(setDoc(doc(as('alice'), 'transactions/t2'), { participants: ['alice'] }));
  });
  test('list query must be scoped to me', async () => {
    await assertSucceeds(getDocs(query(collection(as('alice'), 'transactions'), where('participants', 'array-contains', 'alice'))));
    await assertFails(getDocs(collection(as('alice'), 'transactions')));
  });
});

describe('cards and ATM', () => {
  test('card secrets are never readable', async () => {
    await assertFails(getDoc(doc(as('alice'), 'cardSecrets/alice')));
    await assertFails(getDoc(doc(as('alice', { admin: true }), 'cardSecrets/alice')));
  });
  test('card visible to owner only, not writable', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'cards/alice')));
    await assertFails(getDoc(doc(as('bob'), 'cards/alice')));
    await assertFails(updateDoc(doc(as('alice'), 'cards/alice'), { style: 'red' }));
  });
  test('ATM code visible to owner only', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'atmCodes/c1')));
    await assertFails(getDoc(doc(as('bob'), 'atmCodes/c1')));
  });
});

describe('shared + admin data', () => {
  test('rates readable when signed in', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'fxRates/BDT')));
    await assertFails(getDoc(doc(anon(), 'fxRates/BDT')));
    await assertFails(setDoc(doc(as('bob'), 'fxRates/BDT'), { bdtPer: { USD: '1' } }));
  });
  test('audit log admin-only', async () => {
    await assertSucceeds(getDoc(doc(as('root', { admin: true }), 'auditLog/a1')));
    await assertFails(getDoc(doc(as('alice'), 'auditLog/a1')));
  });
  test('unknown collections denied', async () => {
    await assertFails(getDoc(doc(as('alice'), 'phoneIndex/01712345678')));
    await assertFails(getDoc(doc(as('alice'), 'idempotency/x')));
  });
});

// The admin panel reads these live on web, Android and iOS. Each query here mirrors one it makes.
describe('admin panel queries', () => {
  const admin = () => as('root', { admin: true });

  test('admin lists all users and filters by status; users cannot', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'users')));
    await assertSucceeds(getDocs(query(collection(admin(), 'users'), where('status', '==', 'suspended'))));
    await assertSucceeds(getDocs(query(collection(admin(), 'users'), where('email', '==', 'a@x.com'))));
    await assertFails(getDocs(collection(as('alice'), 'users')));
  });
  test('admin reads any wallet and any user transactions; users cannot', async () => {
    await assertSucceeds(getDocs(query(collection(admin(), 'wallets'), where('ownerUid', '==', 'alice'))));
    await assertSucceeds(getDocs(collection(admin(), 'transactions')));
    await assertSucceeds(getDocs(query(collection(admin(), 'transactions'), where('type', '==', 'TRANSFER'))));
    await assertFails(getDocs(query(collection(as('bob'), 'wallets'), where('ownerUid', '==', 'alice'))));
    await assertFails(getDocs(query(collection(as('carol'), 'transactions'), where('type', '==', 'TRANSFER'))));
  });
  test('admin reads cards and audit log, but still cannot write anything', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'cards/alice')));
    await assertSucceeds(getDocs(collection(admin(), 'auditLog')));
    await assertFails(updateDoc(doc(admin(), 'users/alice'), { status: 'suspended' }));
    await assertFails(updateDoc(doc(admin(), 'wallets/alice_BDT'), { balanceMinor: 1 }));
    await assertFails(setDoc(doc(admin(), 'auditLog/a2'), { action: 'fake' }));
  });
  test('a suspended user can still read their own profile (so the app can show the lock screen)', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'users/alice'), { status: 'suspended' }));
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')));
  });
});
