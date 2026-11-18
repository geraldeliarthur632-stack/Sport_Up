import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { ChipWallet, UserSubscription } from '../types/sportup';

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface ChipsApiResponse {
  chips: ChipWallet;
  subscription: UserSubscription;
  sourceUsed?: 'daily' | 'subscription' | 'purchased';
  added?: number;
  validatedByServer: boolean;
}

function getBrazilDateString(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

class StaticHostFallbackError extends Error {}

async function callServerOrFallback<T>(
  endpoint: string,
  body: Record<string, unknown> | undefined,
  firestoreFallback: (uid: string) => Promise<T>
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: await authHeaders(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const contentType = res.headers.get('content-type') || '';
    if (
      res.status === 404 ||
      res.status === 405 ||
      !contentType.includes('application/json')
    ) {
      throw new StaticHostFallbackError('Static hosting mode');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao processar fichas.');
    }
    return data as T;
  } catch (err) {
    if (
      err instanceof StaticHostFallbackError ||
      err instanceof TypeError
    ) {
      return firestoreFallback(user.uid);
    }
    throw err;
  }
}

function defaultSubscription(uid: string): UserSubscription {
  return {
    userId: uid,
    plan: 'free',
    status: 'active',
    dailyAllowance: 3,
    accumulates: false,
    currentPeriodEnd: '',
    serverSignature: '',
  };
}

function normalizeChips(uid: string, raw: Partial<ChipWallet> | null): {
  chips: ChipWallet;
  changed: boolean;
} {
  const today = getBrazilDateString();
  if (!raw) {
    return {
      changed: true,
      chips: {
        userId: uid,
        dailyChips: 3,
        purchasedChips: 0,
        subscriptionChips: 0,
        lastResetDate: today,
        adsWatchedToday: 0,
        lastAdDate: today,
        serverSignature: '',
      },
    };
  }

  let changed = false;
  let dailyChips = Number(raw.dailyChips ?? 0);
  const purchasedChips = Number(raw.purchasedChips ?? 0);
  let lastResetDate = String(raw.lastResetDate ?? today);
  let adsWatchedToday = Number(raw.adsWatchedToday ?? 0);
  let lastAdDate = String(raw.lastAdDate ?? today);

  if (lastResetDate !== today) {
    dailyChips = 3;
    lastResetDate = today;
    changed = true;
  }
  if (lastAdDate !== today) {
    adsWatchedToday = 0;
    lastAdDate = today;
    changed = true;
  }

  return {
    changed,
    chips: {
      userId: uid,
      dailyChips,
      purchasedChips,
      subscriptionChips: 0,
      lastResetDate,
      adsWatchedToday,
      lastAdDate,
      serverSignature: String(raw.serverSignature ?? ''),
    },
  };
}

async function syncViaFirestore(uid: string): Promise<ChipsApiResponse> {
  const subRef = doc(db, 'subscriptions', uid);
  const chipsRef = doc(db, 'chips', uid);
  const [subSnap, chipsSnap] = await Promise.all([
    getDoc(subRef),
    getDoc(chipsRef),
  ]);

  let subscription = defaultSubscription(uid);
  if (!subSnap.exists()) {
    await setDoc(subRef, {
      ...subscription,
      updatedAt: serverTimestamp(),
    });
  } else {
    subscription = {
      ...subscription,
      ...(subSnap.data() as Partial<UserSubscription>),
      plan: 'free',
      dailyAllowance: 3,
      accumulates: false,
    };
  }

  const { chips, changed } = normalizeChips(
    uid,
    chipsSnap.exists() ? (chipsSnap.data() as Partial<ChipWallet>) : null
  );

  if (changed) {
    await setDoc(chipsRef, {
      userId: chips.userId,
      dailyChips: chips.dailyChips,
      purchasedChips: chips.purchasedChips,
      subscriptionChips: 0,
      lastResetDate: chips.lastResetDate,
      adsWatchedToday: chips.adsWatchedToday ?? 0,
      lastAdDate: chips.lastAdDate ?? getBrazilDateString(),
      serverSignature: chips.serverSignature ?? '',
      updatedAt: serverTimestamp(),
    });
  }

  return { chips, subscription, validatedByServer: false };
}

export async function syncChipsWithServer(): Promise<ChipsApiResponse> {
  return callServerOrFallback('/api/chips/sync', undefined, syncViaFirestore);
}

export async function consumeChipOnServer(): Promise<ChipsApiResponse> {
  return callServerOrFallback('/api/chips/consume', undefined, async (uid) => {
    const chipsRef = doc(db, 'chips', uid);
    const subRef = doc(db, 'subscriptions', uid);
    const subSnap = await getDoc(subRef);
    const subscription = subSnap.exists()
      ? ({
          ...defaultSubscription(uid),
          ...(subSnap.data() as Partial<UserSubscription>),
        } as UserSubscription)
      : defaultSubscription(uid);

    return runTransaction(db, async (tx) => {
      const snap = await tx.get(chipsRef);
      const { chips } = normalizeChips(
        uid,
        snap.exists() ? (snap.data() as Partial<ChipWallet>) : null
      );

      if (chips.dailyChips + chips.purchasedChips < 1) {
        throw new Error(
          'Sem fichas disponíveis. Assista a um vídeo curto ou adquira fichas na loja!'
        );
      }

      let sourceUsed: 'daily' | 'purchased' = 'daily';
      if (chips.dailyChips > 0) {
        chips.dailyChips -= 1;
        sourceUsed = 'daily';
      } else {
        chips.purchasedChips -= 1;
        sourceUsed = 'purchased';
      }

      tx.set(chipsRef, {
        userId: chips.userId,
        dailyChips: chips.dailyChips,
        purchasedChips: chips.purchasedChips,
        subscriptionChips: 0,
        lastResetDate: chips.lastResetDate,
        adsWatchedToday: chips.adsWatchedToday ?? 0,
        lastAdDate: chips.lastAdDate ?? getBrazilDateString(),
        serverSignature: chips.serverSignature ?? '',
        updatedAt: serverTimestamp(),
      });

      return {
        chips,
        subscription,
        sourceUsed,
        validatedByServer: false,
      };
    });
  });
}

export async function claimAdRewardOnServer(): Promise<ChipsApiResponse> {
  return callServerOrFallback(
    '/api/chips/reward-ad',
    undefined,
    async (uid) => {
      const chipsRef = doc(db, 'chips', uid);
      const subRef = doc(db, 'subscriptions', uid);
      const subSnap = await getDoc(subRef);
      const subscription = subSnap.exists()
        ? ({
            ...defaultSubscription(uid),
            ...(subSnap.data() as Partial<UserSubscription>),
          } as UserSubscription)
        : defaultSubscription(uid);

      return runTransaction(db, async (tx) => {
        const snap = await tx.get(chipsRef);
        const { chips } = normalizeChips(
          uid,
          snap.exists() ? (snap.data() as Partial<ChipWallet>) : null
        );
        const today = getBrazilDateString();
        const watched = chips.adsWatchedToday ?? 0;
        if (watched >= 10) {
          throw new Error(
            'Limite diário de anúncios recompensados atingido (10/dia).'
          );
        }

        chips.dailyChips = Math.min(10, chips.dailyChips + 1);
        chips.adsWatchedToday = watched + 1;
        chips.lastAdDate = today;

        tx.set(chipsRef, {
          userId: chips.userId,
          dailyChips: chips.dailyChips,
          purchasedChips: chips.purchasedChips,
          subscriptionChips: 0,
          lastResetDate: chips.lastResetDate,
          adsWatchedToday: chips.adsWatchedToday,
          lastAdDate: chips.lastAdDate,
          serverSignature: chips.serverSignature ?? '',
          updatedAt: serverTimestamp(),
        });

        return {
          chips,
          subscription,
          validatedByServer: false,
        };
      });
    }
  );
}

export async function purchaseChipsOnServer(
  packId: 'pack_5' | 'pack_15' | 'pack_40'
): Promise<ChipsApiResponse> {
  const PACK_AMOUNTS: Record<string, number> = {
    pack_5: 5,
    pack_15: 15,
    pack_40: 40,
  };
  const amount = PACK_AMOUNTS[packId];
  if (!amount) throw new Error('Pacote de fichas inválido.');

  return callServerOrFallback(
    '/api/chips/purchase',
    { packId },
    async (uid) => {
      const chipsRef = doc(db, 'chips', uid);
      const subRef = doc(db, 'subscriptions', uid);
      const subSnap = await getDoc(subRef);
      const subscription = subSnap.exists()
        ? ({
            ...defaultSubscription(uid),
            ...(subSnap.data() as Partial<UserSubscription>),
          } as UserSubscription)
        : defaultSubscription(uid);

      return runTransaction(db, async (tx) => {
        const snap = await tx.get(chipsRef);
        const { chips } = normalizeChips(
          uid,
          snap.exists() ? (snap.data() as Partial<ChipWallet>) : null
        );

        chips.purchasedChips = Math.min(10000, chips.purchasedChips + amount);

        tx.set(chipsRef, {
          userId: chips.userId,
          dailyChips: chips.dailyChips,
          purchasedChips: chips.purchasedChips,
          subscriptionChips: 0,
          lastResetDate: chips.lastResetDate,
          adsWatchedToday: chips.adsWatchedToday ?? 0,
          lastAdDate: chips.lastAdDate ?? getBrazilDateString(),
          serverSignature: chips.serverSignature ?? '',
          updatedAt: serverTimestamp(),
        });

        return {
          chips,
          subscription,
          added: amount,
          validatedByServer: false,
        };
      });
    }
  );
}

export async function updateSubscriptionOnServer(
  action: 'activate' | 'simulate_unpaid' | 'cancel'
): Promise<ChipsApiResponse> {
  return callServerOrFallback(
    '/api/chips/subscription',
    { action },
    async (uid) => syncViaFirestore(uid)
  );
}
