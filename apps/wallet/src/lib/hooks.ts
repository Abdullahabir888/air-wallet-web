import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore';
import type {
  AtmCodeDoc,
  BillerDoc,
  CardDoc,
  FxRatesDoc,
  MoneyRequestDoc,
  TransactionDoc,
  UserDoc,
  WalletDoc,
} from '@air-wallet/core';
import { db } from './firebase';
import { api } from './api';
import { useAuth } from '@/providers/AuthProvider';

export type WithId<T> = T & { id: string };

/**
 * Firestore realtime listener → TanStack Query cache.
 * Screens get instant cached data on revisit and live updates while mounted.
 */
export function useLive<T>(key: readonly unknown[], subscribe: ((set: (v: T) => void) => Unsubscribe) | null) {
  const qc = useQueryClient();
  const k = JSON.stringify(key);
  const q = useQuery<T>({ queryKey: key, queryFn: () => new Promise<T>(() => {}), enabled: false, staleTime: Infinity });
  useEffect(() => {
    if (!subscribe) return;
    return subscribe((v) => qc.setQueryData(key, v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, !!subscribe]);
  return { data: q.data, loading: !!subscribe && q.data === undefined };
}

export const onErr = (where: string) => (e: Error) => console.warn(`[firestore] ${where}:`, e.message);

export function useProfile() {
  const { user } = useAuth();
  return useLive<WithId<UserDoc> | null>(['profile', user?.uid], user ? (set) =>
    onSnapshot(doc(db, 'users', user.uid), (s) => set(s.exists() ? ({ id: s.id, ...(s.data() as UserDoc) }) : null), onErr('profile')) : null);
}

export function useWallets() {
  const { user } = useAuth();
  return useLive<WithId<WalletDoc>[]>(['wallets', user?.uid], user ? (set) =>
    onSnapshot(query(collection(db, 'wallets'), where('ownerUid', '==', user.uid)), (s) => {
      const order = ['BDT', 'USD', 'GBP', 'EUR'];
      set(s.docs.map((d) => ({ id: d.id, ...(d.data() as WalletDoc) })).sort((a, b) => order.indexOf(a.currency) - order.indexOf(b.currency)));
    }, onErr('wallets')) : null);
}

export function useTransactions(max = 30, type?: TransactionDoc['type'][]) {
  const { user } = useAuth();
  return useLive<WithId<TransactionDoc>[]>(['tx', user?.uid, max, type?.join(',')], user ? (set) => {
    const parts = [where('participants', 'array-contains', user.uid)];
    if (type?.length) parts.push(where('type', 'in', type));
    return onSnapshot(query(collection(db, 'transactions'), ...parts, orderBy('createdAt', 'desc'), qLimit(max)),
      (s) => set(s.docs.map((d) => ({ id: d.id, ...(d.data() as TransactionDoc) }))), onErr('transactions'));
  } : null);
}

export function useTransaction(id: string | undefined) {
  return useLive<WithId<TransactionDoc> | null>(['txOne', id], id ? (set) =>
    onSnapshot(doc(db, 'transactions', id), (s) => set(s.exists() ? { id: s.id, ...(s.data() as TransactionDoc) } : null), onErr('transaction')) : null);
}

export function useRequests() {
  const { user } = useAuth();
  return useLive<WithId<MoneyRequestDoc>[]>(['requests', user?.uid], user ? (set) =>
    onSnapshot(query(collection(db, 'moneyRequests'), where('participants', 'array-contains', user.uid), orderBy('createdAt', 'desc'), qLimit(30)),
      (s) => set(s.docs.map((d) => ({ id: d.id, ...(d.data() as MoneyRequestDoc) }))), onErr('requests')) : null);
}

export function useCard() {
  const { user } = useAuth();
  return useLive<WithId<CardDoc> | null>(['card', user?.uid], user ? (set) =>
    onSnapshot(doc(db, 'cards', user.uid), (s) => set(s.exists() ? { id: s.id, ...(s.data() as CardDoc) } : null), onErr('card')) : null);
}

export function useActiveAtmCode() {
  const { user } = useAuth();
  return useLive<WithId<AtmCodeDoc> | null>(['atm', user?.uid], user ? (set) =>
    onSnapshot(query(collection(db, 'atmCodes'), where('uid', '==', user.uid), where('status', '==', 'ACTIVE'), qLimit(1)),
      (s) => set(s.docs[0] ? { id: s.docs[0].id, ...(s.docs[0].data() as AtmCodeDoc) } : null), onErr('atm')) : null);
}

export function useBillers() {
  const { user } = useAuth();
  return useLive<WithId<BillerDoc>[]>(['billers'], user ? (set) =>
    onSnapshot(query(collection(db, 'billers'), where('active', '==', true)), (s) => set(s.docs.map((d) => ({ id: d.id, ...(d.data() as BillerDoc) }))), onErr('billers')) : null);
}

/** Live BDT rates: listens to the shared cache and nudges the server to refresh every 60 s while visible. */
export function useRates() {
  const { user } = useAuth();
  const live = useLive<WithId<FxRatesDoc> | null>(['rates'], user ? (set) =>
    onSnapshot(doc(db, 'fxRates', 'BDT'), (s) => set(s.exists() ? { id: s.id, ...(s.data() as FxRatesDoc) } : null), onErr('rates')) : null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!user) return;
    const tick = () => api.refreshRates().catch(() => {});
    tick();
    timer.current = setInterval(tick, 60_000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [user]);
  return live;
}

export function toDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof (ts as Timestamp).toDate === 'function') return (ts as Timestamp).toDate();
  return null;
}
