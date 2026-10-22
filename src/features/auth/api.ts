import { readActivated, type Session } from './session';

/**
 * Mock of the internet bank auth API. Replace `signIn` and `prepareWorkspace`
 * with the real calls; the login page only depends on their result shapes.
 */

const DAY = 86_400_000;
export const TEMP_CREDENTIAL_DAYS = 30;

interface DemoAccount {
  username: string;
  password: string;
  label: string;
  session: Omit<Session, 'username' | 'tempValidUntil' | 'justActivated'>;
  /** For temporary credentials: how many days ago they were created at onboarding. */
  createdDaysAgo?: number;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    username: 'popy',
    password: 'Popy@2026',
    label: 'Түр эрх · анхны нэвтрэлт',
    createdDaysAgo: 1,
    session: {
      personName: 'Баярхүү Болор',
      org: { name: 'Ашид капитал ББСБ', registerNumber: '1234567', initials: 'АК' },
      credentials: 'temporary',
    },
  },
  {
    username: 'merchant123',
    password: 'Merchant@2026',
    label: 'Байнгын эрх',
    session: {
      personName: 'Ганбат Сарнай',
      org: { name: 'Credit Capital', registerNumber: '7654321', initials: 'CC' },
      credentials: 'permanent',
    },
  },
  {
    username: 'expired',
    password: 'Expired@2026',
    label: 'Хугацаа дууссан түр эрх',
    createdDaysAgo: 31,
    session: {
      personName: 'Дорж Тэмүүлэн',
      org: { name: 'Нүүдэл трейд ХХК', registerNumber: '6000123', initials: 'НТ' },
      credentials: 'temporary',
    },
  },
];

export type AuthErrorCode = 'invalid' | 'expired';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface SignInResult {
  session: Session;
  /** True the first time temporary credentials are used: play the intro. */
  firstLogin: boolean;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function signIn(username: string, password: string): Promise<SignInResult> {
  await wait(900);
  const account = DEMO_ACCOUNTS.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  if (!account || account.password !== password) {
    throw new AuthError('invalid', 'Нэвтрэх нэр эсвэл нууц үг буруу байна.');
  }

  let tempValidUntil: string | undefined;
  if (account.session.credentials === 'temporary') {
    const created = Date.now() - (account.createdDaysAgo ?? 0) * DAY;
    const until = created + TEMP_CREDENTIAL_DAYS * DAY;
    if (until < Date.now()) {
      throw new AuthError(
        'expired',
        'Таны түр нэвтрэх эрхийн 30 хоногийн хугацаа дууссан. Салбарт хандах эсвэл 1800-2929 дугаарт холбогдоно уу.',
      );
    }
    tempValidUntil = new Date(until).toISOString();
  }

  const firstLogin = account.session.credentials === 'temporary' && !readActivated().includes(account.username);
  return {
    session: { ...account.session, username: account.username, tempValidUntil },
    firstLogin,
  };
}

/** Loads what the first screen needs (registration status, menu). Covered by the intro. */
export async function prepareWorkspace(): Promise<void> {
  await wait(2400);
}
