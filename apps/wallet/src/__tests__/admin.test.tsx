import { render as rtlRender, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const render = (ui: ReactElement) => rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
import type { TransactionDoc, UserDoc } from '@air-wallet/core';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// No network in unit tests: stub Firebase and drive the screens with plain data.
jest.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {}, usingEmulators: false }));
jest.mock('firebase/firestore', () => ({}));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));
jest.mock('@/lib/socialAuth', () => ({ socialSignOut: jest.fn(() => Promise.resolve()) }));

const mockAuth = { user: { uid: 'alice', emailVerified: true }, ready: true, admin: false };
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));

let mockProfile: { data: Partial<UserDoc> | undefined } = { data: undefined };
jest.mock('@/lib/hooks', () => ({
  ...jest.requireActual('@/lib/hooks'),
  useProfile: () => mockProfile,
}));

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  const Stack = () => <Text>app screens</Text>;
  return {
    Stack,
    Redirect: ({ href }: { href: string }) => <Text>{`redirect ${href}`}</Text>,
    router: { push: jest.fn(), replace: jest.fn() },
    usePathname: () => '/admin',
    useSegments: () => ['(app)', '(tabs)', 'home'],
  };
});

import { describeAudit, matchUser } from '@/lib/admin';
import { txParties } from '@/components/admin';
import AppLayout from '../../app/(app)/_layout';
import AdminLayout from '../../app/(app)/admin/_layout';

const user = (over: Partial<UserDoc> & { id: string }) =>
  ({ displayName: 'Rafi Karim', email: 'rafi@demo.airwallet', phone: '+8801712345678', status: 'active', ...over }) as UserDoc & { id: string };

describe('admin user search', () => {
  const rafi = user({ id: 'uid_rafi' });
  test('matches name, email, phone digits and exact uid', () => {
    expect(matchUser(rafi, 'rafi')).toBe(true);
    expect(matchUser(rafi, 'KARIM')).toBe(true);
    expect(matchUser(rafi, 'demo.airwallet')).toBe(true);
    expect(matchUser(rafi, '01712-345678')).toBe(true);
    expect(matchUser(rafi, 'uid_rafi')).toBe(true);
    expect(matchUser(rafi, '')).toBe(true);
  });
  test('does not match unrelated terms or short digit runs', () => {
    expect(matchUser(rafi, 'abir')).toBe(false);
    expect(matchUser(rafi, '17')).toBe(false);
    expect(matchUser(rafi, 'uid_raf')).toBe(false);
  });
});

describe('audit wording', () => {
  test('known actions read as plain sentences', () => {
    expect(describeAudit({ action: 'user.status', details: { status: 'suspended' }, actorUid: 'a', targetUid: 'b', createdAt: null }).title).toBe('Account suspended');
    expect(describeAudit({ action: 'user.status', details: { status: 'active' }, actorUid: 'a', targetUid: 'b', createdAt: null }).title).toBe('Account reactivated');
    expect(describeAudit({ action: 'wallet.credit', details: { reason: 'Refund' }, actorUid: 'a', targetUid: 'b', createdAt: null })).toEqual({ title: 'Wallet credited', detail: 'Refund' });
  });
  test('unknown actions fall back to the raw name', () => {
    expect(describeAudit({ action: 'new.thing', details: {}, actorUid: 'a', targetUid: null, createdAt: null }).title).toBe('new.thing');
  });
});

describe('who sent to whom (admin view)', () => {
  const tx = (over: Partial<TransactionDoc>) =>
    ({ type: 'TRANSFER', participants: ['abir', 'rafi'], createdBy: 'abir', counterparty: { abir: 'Rafi K.', rafi: 'Abir A.' }, ...over }) as TransactionDoc;

  test('transfer shows sender → receiver from loaded names', () => {
    expect(txParties(tx({}), { abir: 'Abir Ahad', rafi: 'Rafi Karim' })).toBe('Abir Ahad → Rafi Karim');
  });
  test('falls back to the counterparty names stored on the transaction', () => {
    expect(txParties(tx({}), {})).toBe('Abir A. → Rafi K.');
  });
  test('admin credit is attributed to the wallet owner, not the admin who made it', () => {
    expect(txParties(tx({ type: 'CREDIT', participants: ['rafi'], createdBy: 'root' }), { rafi: 'Rafi Karim', root: 'Admin' })).toBe('Rafi Karim');
  });
});

describe('live account status', () => {
  beforeEach(() => {
    mockAuth.admin = false;
  });

  test('active user sees the app', async () => {
    mockProfile = { data: { status: 'active', phone: '+8801712345678' } };
    await render(<AppLayout />);
    expect(screen.getByText('app screens')).toBeTruthy();
  });

  test('suspended user is locked out on the spot', async () => {
    mockProfile = { data: { status: 'suspended', phone: '+8801712345678' } };
    await render(<AppLayout />);
    expect(screen.getByText('Your account is suspended')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.queryByText('app screens')).toBeNull();
  });

  test('active user without a mobile number is sent to complete their profile', async () => {
    mockProfile = { data: { status: 'active', phone: null } };
    await render(<AppLayout />);
    expect(screen.getByText('redirect /complete-profile')).toBeTruthy();
  });

  test('suspension wins even before the profile is complete', async () => {
    mockProfile = { data: { status: 'suspended', phone: null } };
    await render(<AppLayout />);
    expect(screen.getByText('Your account is suspended')).toBeTruthy();
  });

  test('admin screens redirect non-admins home', async () => {
    await render(<AdminLayout />);
    expect(screen.getByText('redirect /home')).toBeTruthy();
  });

  test('admins get the admin screens', async () => {
    mockAuth.admin = true;
    await render(<AdminLayout />);
    expect(screen.getByText('app screens')).toBeTruthy();
  });
});
