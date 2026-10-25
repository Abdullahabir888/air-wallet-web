/**
 * Admin data. Everything here is a live Firestore listener, so the admin panel
 * on web, Android and iOS shows the same numbers at the same moment as the users' apps.
 * Firestore rules allow these reads only for accounts with the `admin` claim.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { normalizeBdMobile, type CardDoc, type TransactionDoc, type TxType, type UserDoc, type WalletDoc } from '@air-wallet/core';
import { db } from './firebase';
import { onErr, toDate, useLive, type WithId } from './hooks';
import { useAuth } from '@/providers/AuthProvider';

export interface AuditDoc {
  actorUid: string;
  action: string;
  targetUid: string | null;
  details: Record<string, unknown>;
  createdAt: unknown;
}

const isOn = (admin: boolean, ready = true) => admin && ready;

/** Newest users first. The list is live: new sign-ups and status changes appear instantly. */
export function useAdminUsers(max = 200, status?: UserDoc['status']) {
  const { admin } = useAuth();
  return useLive<WithId<UserDoc>[]>(['admin.users', max, status], isOn(admin) ? (set) => {
    const parts: QueryConstraint[] = [];
    if (status) parts.push(where('status', '==', status));
    parts.push(orderBy('createdAt', 'desc'), qLimit(max));
    return onSnapshot(query(collection(db, 'users'), ...parts),
      (s) => set(s.docs.map((d) => ({ id: d.id, ...(d.data() as UserDoc) }))), onErr('admin.users'));
  } : null);
}

export function useAdminUser(uid: string | undefined) {
  const { admin } = useAuth();
  return useLive<WithId<UserDoc> | null>(['admin.user', uid], isOn(admin, !!uid) ? (set) =>
    onSnapshot(doc(db, 'users', uid!), (s) => set(s.exists() ? { id: s.id, ...(s.data() as UserDoc) } : null), onErr('admin.user')) : null);
}

export function useAdminUserWallets(uid: string | undefined) {
  const { admin } = useAuth();
  return useLive<WithId<WalletDoc>[]>(['admin.wallets', uid], isOn(admin, !!uid) ? (set) =>
    onSnapshot(query(collection(db, 'wallets'), where('ownerUid', '==', uid!)), (s) => {
      const order = ['BDT', 'USD', 'GBP', 'EUR'];
      set(s.docs.map((d) => ({ id: d.id, ...(d.data() as WalletDoc) })).sort((a, b) => order.indexOf(a.currency) - order.indexOf(b.currency)));
    }, onErr('admin.wallets')) : null);
}

export function useAdminUserCard(uid: string | undefined) {
  const { admin } = useAuth();
  return useLive<WithId<CardDoc> | null>(['admin.card', uid], isOn(admin, !!uid) ? (set) =>
    onSnapshot(doc(db, 'cards', uid!), (s) => set(s.exists() ? { id: s.id, ...(s.data() as CardDoc) } : null), onErr('admin.card')) : null);
}

/** All transactions on the platform, or one user's when `uid` is given. */
export function useAdminTransactions(opts: { uid?: string; type?: TxType; max?: number } = {}) {
  const { admin } = useAuth();
  const { uid, type, max = 50 } = opts;
  return useLive<WithId<TransactionDoc>[]>(['admin.tx', uid, type, max], isOn(admin) ? (set) => {
    const parts: QueryConstraint[] = [];
    if (uid) parts.push(where('participants', 'array-contains', uid));
    if (type) parts.push(where('type', '==', type));
    parts.push(orderBy('createdAt', 'desc'), qLimit(max));
    return onSnapshot(query(collection(db, 'transactions'), ...parts),
      (s) => set(s.docs.map((d) => ({ id: d.id, ...(d.data() as TransactionDoc) }))), onErr('admin.tx'));
  } : null);
}

export function useAdminAudit(opts: { targetUid?: string; max?: number } = {}) {
  const { admin } = useAuth();
  const { targetUid, max = 50 } = opts;
  return useLive<WithId<AuditDoc>[]>(['admin.audit', targetUid, max], isOn(admin) ? (set) => {
    const parts: QueryConstraint[] = [];
    if (targetUid) parts.push(where('targetUid', '==', targetUid));
    parts.push(orderBy('createdAt', 'desc'), qLimit(max));
    return onSnapshot(query(collection(db, 'auditLog'), ...parts),
      (s) => set(s.docs.map((d) => ({ id: d.id, ...(d.data() as AuditDoc) }))), onErr('admin.audit'));
  } : null);
}

export interface AdminStats {
  users: number | null;
  suspended: number | null;
  tx24h: number;
  /** BDT moved in the last 24 h (minor units). Counts each transaction once. */
  bdtVolume24h: number;
  /** True when the 24 h window hit the listener cap, so the numbers are a floor. */
  capped: boolean;
}

const WINDOW_CAP = 500;

/**
 * Overview figures. User counts come from server-side count queries (cheap at any size)
 * and refresh every 30 s; the 24 h activity numbers are a live listener.
 */
export function useAdminStats(): { data: AdminStats | undefined; refresh: () => void } {
  const { admin } = useAuth();
  const [counts, setCounts] = useState<{ users: number | null; suspended: number | null }>({ users: null, suspended: null });
  const [tick, setTick] = useState(0);
  // Window start is fixed per minute so the listener isn't torn down on every render.
  const since = useMemo(() => Timestamp.fromMillis(Math.floor(Date.now() / 60_000) * 60_000 - 86_400_000), [tick]);

  useEffect(() => {
    if (!admin) return;
    let live = true;
    const load = async () => {
      try {
        const [all, sus] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'users'), where('status', '==', 'suspended'))),
        ]);
        if (live) setCounts({ users: all.data().count, suspended: sus.data().count });
      } catch (e) {
        onErr('admin.counts')(e as Error);
      }
    };
    load();
    const id = setInterval(() => {
      load();
      setTick((t) => t + 1);
    }, 30_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [admin]);

  const recent = useLive<WithId<TransactionDoc>[]>(['admin.tx24', since.toMillis()], admin ? (set) =>
    onSnapshot(query(collection(db, 'transactions'), where('createdAt', '>=', since), orderBy('createdAt', 'desc'), qLimit(WINDOW_CAP)),
      (s) => set(s.docs.map((d) => ({ id: d.id, ...(d.data() as TransactionDoc) }))), onErr('admin.tx24')) : null);

  const data = useMemo<AdminStats | undefined>(() => {
    if (!recent.data) return undefined;
    const bdtVolume24h = recent.data
      .filter((t) => t.currency === 'BDT' && t.status !== 'FAILED' && t.type !== 'ATM_RELEASE' && t.type !== 'REVERSAL')
      .reduce((s, t) => s + t.amountMinor, 0);
    return { ...counts, tx24h: recent.data.length, bdtVolume24h, capped: recent.data.length >= WINDOW_CAP };
  }, [recent.data, counts]);

  return { data, refresh: () => setTick((t) => t + 1) };
}

/** Exact lookup by email or BD mobile, for accounts older than the loaded list. */
export async function findUser(term: string): Promise<WithId<UserDoc> | null> {
  const t = term.trim();
  if (!t) return null;
  const field = t.includes('@') ? 'email' : 'phone';
  // Phones are stored in the shared normalized form, so normalize the same way.
  const value = field === 'email' ? t.toLowerCase() : normalizeBdMobile(t);
  if (!value) return null;
  const s = await getDocs(query(collection(db, 'users'), where(field, '==', value), qLimit(1)));
  const d = s.docs[0];
  return d ? { id: d.id, ...(d.data() as UserDoc) } : null;
}

/** Client-side filter over a loaded list: name, email, phone or uid. */
export function matchUser(u: WithId<UserDoc>, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  return (
    u.displayName?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q) ||
    u.id.toLowerCase() === q ||
    (digits.length >= 4 && (u.phone ?? '').replace(/\D/g, '').includes(digits))
  );
}

/** "user.status" → "Account suspended", with details made readable. */
export function describeAudit(a: AuditDoc): { title: string; detail?: string } {
  const d = a.details ?? {};
  switch (a.action) {
    case 'wallet.credit':
      return { title: 'Wallet credited', detail: typeof d.reason === 'string' ? d.reason : undefined };
    case 'user.status':
      return { title: d.status === 'suspended' ? 'Account suspended' : 'Account reactivated' };
    case 'ledger.mismatch':
      return { title: 'Ledger mismatch found', detail: `Wallet ${String(d.walletId)}` };
    case 'card.freeze':
      return { title: 'Card frozen by owner' };
    case 'card.unfreeze':
      return { title: 'Card unfrozen by owner' };
    case 'card.reveal':
      return { title: 'Card details viewed' };
    case 'atm.redeem':
      return { title: 'ATM code redeemed', detail: typeof d.atmId === 'string' ? `ATM ${d.atmId}` : undefined };
    default:
      return { title: a.action };
  }
}

export const auditDate = (a: AuditDoc) => toDate(a.createdAt);
