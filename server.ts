import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig: FirebaseAppletConfig = JSON.parse(
  fs.readFileSync(configPath, 'utf-8')
);

const SERVER_HMAC_SECRET =
  process.env.CHIPS_HMAC_SECRET ||
  `sportup-server-secret-${firebaseConfig.projectId}`;

const FIRESTORE_DOC_PREFIX = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/${FIRESTORE_DOC_PREFIX}`;
const FIRESTORE_COMMIT_URL = `${FIRESTORE_BASE_URL}:commit`;

function getBrazilDateString(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function signChipPayload(payload: Record<string, unknown>): string {
  return crypto
    .createHmac('sha256', SERVER_HMAC_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token Firebase inválido: ${errText}`);
  }

  const data = (await res.json()) as {
    users?: Array<{ localId: string; email?: string }>;
  };
  const user = data.users?.[0];
  if (!user?.localId) {
    throw new Error('Usuário não encontrado no Firebase Auth.');
  }
  return { uid: user.localId, email: user.email };
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string };

function decodeFirestoreFields(
  fields?: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  if (!fields) return {};
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fields)) {
    if ('stringValue' in val) result[key] = val.stringValue;
    else if ('integerValue' in val) result[key] = Number(val.integerValue);
    else if ('doubleValue' in val) result[key] = Number(val.doubleValue);
    else if ('booleanValue' in val) result[key] = Boolean(val.booleanValue);
    else if ('timestampValue' in val) result[key] = val.timestampValue;
  }
  return result;
}

function encodeFirestoreFields(
  obj: object
): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'updatedAt') {
      continue;
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      fields[key] = { integerValue: String(Math.trunc(val)) };
    } else {
      fields[key] = { stringValue: String(val) };
    }
  }
  return fields;
}

async function getFirestoreDoc(
  docPath: string,
  idToken: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${FIRESTORE_BASE_URL}/${docPath}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao ler ${docPath}: ${errText}`);
  }
  const data = (await res.json()) as {
    fields?: Record<string, Record<string, unknown>>;
  };
  return decodeFirestoreFields(data.fields);
}

async function saveFirestoreDoc(
  docPath: string,
  payload: object,
  idToken: string
): Promise<void> {
  const res = await fetch(FIRESTORE_COMMIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: `${FIRESTORE_DOC_PREFIX}/${docPath}`,
            fields: encodeFirestoreFields(payload),
          },
          updateTransforms: [
            {
              fieldPath: 'updatedAt',
              setToServerValue: 'REQUEST_TIME',
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao salvar ${docPath}: ${errText}`);
  }
}

interface ChipWalletState {
  userId: string;
  dailyChips: number;
  purchasedChips: number;
  subscriptionChips: number;
  lastResetDate: string;
  adsWatchedToday: number;
  lastAdDate: string;
  serverSignature: string;
  updatedAt: string;
}

interface SubscriptionState {
  userId: string;
  plan: 'free' | 'monthly_pro';
  status: 'active' | 'unpaid' | 'canceled';
  dailyAllowance: 3 | 5;
  accumulates: boolean;
  currentPeriodEnd: string;
  serverSignature: string;
  updatedAt: string;
}

async function loadAndNormalizeWallet(uid: string, idToken: string): Promise<{
  chips: ChipWalletState;
  subscription: SubscriptionState;
  changed: boolean;
}> {
  const today = getBrazilDateString();
  const nowIso = new Date().toISOString();

  const [rawSub, rawChips] = await Promise.all([
    getFirestoreDoc(`subscriptions/${uid}`, idToken),
    getFirestoreDoc(`chips/${uid}`, idToken),
  ]);

  let subChanged = false;
  let chipsChanged = false;

  let subscription: SubscriptionState;
  if (!rawSub) {
    subChanged = true;
    subscription = {
      userId: uid,
      plan: 'free',
      status: 'active',
      dailyAllowance: 3,
      accumulates: false,
      currentPeriodEnd: '',
      serverSignature: '',
      updatedAt: nowIso,
    };
  } else {
    if (rawSub.plan === 'monthly_pro') {
      subChanged = true;
    }
    subscription = {
      userId: uid,
      plan: 'free',
      status: 'active',
      dailyAllowance: 3,
      accumulates: false,
      currentPeriodEnd: '',
      serverSignature: String(rawSub.serverSignature ?? ''),
      updatedAt: String(rawSub.updatedAt ?? nowIso),
    };
  }

  let chips: ChipWalletState;
  if (!rawChips) {
    chipsChanged = true;
    chips = {
      userId: uid,
      dailyChips: 3,
      purchasedChips: 0,
      subscriptionChips: 0,
      lastResetDate: today,
      adsWatchedToday: 0,
      lastAdDate: today,
      serverSignature: '',
      updatedAt: nowIso,
    };
  } else {
    const existingSubChips = Number(rawChips.subscriptionChips ?? 0);
    if (existingSubChips !== 0) {
      chipsChanged = true;
    }
    chips = {
      userId: uid,
      dailyChips: Number(rawChips.dailyChips ?? 0),
      purchasedChips: Number(rawChips.purchasedChips ?? 0),
      subscriptionChips: 0,
      lastResetDate: String(rawChips.lastResetDate ?? today),
      adsWatchedToday: Number(rawChips.adsWatchedToday ?? 0),
      lastAdDate: String(rawChips.lastAdDate ?? today),
      serverSignature: String(rawChips.serverSignature ?? ''),
      updatedAt: String(rawChips.updatedAt ?? nowIso),
    };
  }

  // Daily renewal check (server-side authoritative)
  if (chips.lastResetDate !== today) {
    chipsChanged = true;
    // Free plan: 3 daily chips, do NOT accumulate (unused chips from previous day are replaced)
    chips.dailyChips = 3;
    chips.lastResetDate = today;
  }

  if (chips.lastAdDate !== today) {
    chipsChanged = true;
    chips.adsWatchedToday = 0;
    chips.lastAdDate = today;
  }

  if (subChanged) {
    subscription.updatedAt = nowIso;
    subscription.serverSignature = signChipPayload({
      userId: subscription.userId,
      plan: subscription.plan,
      status: subscription.status,
      dailyAllowance: subscription.dailyAllowance,
    });
    await saveFirestoreDoc(`subscriptions/${uid}`, subscription, idToken);
  }

  if (chipsChanged) {
    chips.updatedAt = nowIso;
    chips.serverSignature = signChipPayload({
      userId: chips.userId,
      dailyChips: chips.dailyChips,
      purchasedChips: chips.purchasedChips,
      subscriptionChips: chips.subscriptionChips,
      lastResetDate: chips.lastResetDate,
    });
    await saveFirestoreDoc(`chips/${uid}`, chips, idToken);
  }

  return { chips, subscription, changed: subChanged || chipsChanged };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth middleware for server-side chip & subscription validation
  async function requireAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de autenticação ausente.' });
      return;
    }
    const idToken = authHeader.slice(7);
    try {
      const user = await verifyFirebaseIdToken(idToken);
      (req as express.Request & { authUser?: { uid: string; idToken: string } }).authUser = {
        uid: user.uid,
        idToken,
      };
      next();
    } catch (err) {
      res.status(401).json({
        error: err instanceof Error ? err.message : 'Falha na autenticação.',
      });
    }
  }

  app.post('/api/chips/sync', requireAuth, async (req, res) => {
    try {
      const { uid, idToken } = (req as express.Request & {
        authUser: { uid: string; idToken: string };
      }).authUser;
      const { chips, subscription } = await loadAndNormalizeWallet(uid, idToken);
      res.json({ chips, subscription, validatedByServer: true });
    } catch (err) {
      console.error('Erro em /api/chips/sync:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erro interno ao sincronizar fichas.',
      });
    }
  });

  app.post('/api/chips/consume', requireAuth, async (req, res) => {
    try {
      const { uid, idToken } = (req as express.Request & {
        authUser: { uid: string; idToken: string };
      }).authUser;
      const { chips, subscription } = await loadAndNormalizeWallet(uid, idToken);

      const total = chips.dailyChips + chips.subscriptionChips + chips.purchasedChips;
      if (total < 1) {
        res.status(402).json({
          error: 'Sem fichas disponíveis. Assista a um vídeo curto ou adquira fichas na loja!',
          chips,
          subscription,
        });
        return;
      }

      // Priority order:
      // 1. Daily non-accumulating chips first
      // 2. Subscription accumulating chips second
      // 3. Purchased permanent chips LAST
      let sourceUsed: 'daily' | 'subscription' | 'purchased' = 'daily';
      if (chips.dailyChips > 0) {
        chips.dailyChips -= 1;
        sourceUsed = 'daily';
      } else if (chips.subscriptionChips > 0) {
        chips.subscriptionChips -= 1;
        sourceUsed = 'subscription';
      } else {
        chips.purchasedChips -= 1;
        sourceUsed = 'purchased';
      }

      const nowIso = new Date().toISOString();
      chips.updatedAt = nowIso;
      chips.serverSignature = signChipPayload({
        userId: chips.userId,
        dailyChips: chips.dailyChips,
        purchasedChips: chips.purchasedChips,
        subscriptionChips: chips.subscriptionChips,
        lastResetDate: chips.lastResetDate,
      });

      await saveFirestoreDoc(`chips/${uid}`, chips, idToken);
      res.json({ chips, subscription, sourceUsed, validatedByServer: true });
    } catch (err) {
      console.error('Erro em /api/chips/consume:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erro ao consumir ficha.',
      });
    }
  });

  app.post('/api/chips/reward-ad', requireAuth, async (req, res) => {
    try {
      const { uid, idToken } = (req as express.Request & {
        authUser: { uid: string; idToken: string };
      }).authUser;
      const { chips, subscription } = await loadAndNormalizeWallet(uid, idToken);

      if (chips.adsWatchedToday >= 10) {
        res.status(429).json({
          error: 'Limite diário de anúncios recompensados atingido (10/dia).',
          chips,
          subscription,
        });
        return;
      }

      chips.dailyChips = Math.min(10, chips.dailyChips + 1);
      chips.adsWatchedToday += 1;
      chips.lastAdDate = getBrazilDateString();
      chips.updatedAt = new Date().toISOString();
      chips.serverSignature = signChipPayload({
        userId: chips.userId,
        dailyChips: chips.dailyChips,
        purchasedChips: chips.purchasedChips,
        subscriptionChips: chips.subscriptionChips,
        lastResetDate: chips.lastResetDate,
      });

      await saveFirestoreDoc(`chips/${uid}`, chips, idToken);
      res.json({ chips, subscription, validatedByServer: true });
    } catch (err) {
      console.error('Erro em /api/chips/reward-ad:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erro ao validar recompensa de vídeo.',
      });
    }
  });

  app.post('/api/chips/purchase', requireAuth, async (req, res) => {
    try {
      const { uid, idToken } = (req as express.Request & {
        authUser: { uid: string; idToken: string };
      }).authUser;
      const packId = String(req.body?.packId ?? '');
      const PACK_AMOUNTS: Record<string, number> = {
        pack_5: 5,
        pack_15: 15,
        pack_40: 40,
      };
      const amount = PACK_AMOUNTS[packId];
      if (!amount) {
        res.status(400).json({ error: 'Pacote de fichas inválido.' });
        return;
      }

      const { chips, subscription } = await loadAndNormalizeWallet(uid, idToken);
      chips.purchasedChips = Math.min(10000, chips.purchasedChips + amount);
      chips.updatedAt = new Date().toISOString();
      chips.serverSignature = signChipPayload({
        userId: chips.userId,
        dailyChips: chips.dailyChips,
        purchasedChips: chips.purchasedChips,
        subscriptionChips: chips.subscriptionChips,
        lastResetDate: chips.lastResetDate,
      });

      await saveFirestoreDoc(`chips/${uid}`, chips, idToken);
      res.json({ chips, subscription, added: amount, validatedByServer: true });
    } catch (err) {
      console.error('Erro em /api/chips/purchase:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erro ao processar compra de fichas.',
      });
    }
  });

  app.post('/api/chips/subscription', requireAuth, async (req, res) => {
    try {
      const { uid, idToken } = (req as express.Request & {
        authUser: { uid: string; idToken: string };
      }).authUser;
      const action = String(req.body?.action ?? '');
      if (!['activate', 'simulate_unpaid', 'cancel'].includes(action)) {
        res.status(400).json({ error: 'Ação de assinatura inválida.' });
        return;
      }

      const { chips, subscription } = await loadAndNormalizeWallet(uid, idToken);
      const now = new Date();
      const nowIso = now.toISOString();

      if (action === 'activate') {
        res.status(410).json({ error: 'A assinatura Premium foi removida do SportUp.' });
        return;
      } else {
        // Monthly unpaid or canceled -> return to free plan (3 daily chips, non-accumulating)
        subscription.plan = 'free';
        subscription.status = action === 'simulate_unpaid' ? 'unpaid' : 'canceled';
        subscription.dailyAllowance = 3;
        subscription.accumulates = false;
        subscription.currentPeriodEnd = '';
        chips.dailyChips = Math.max(chips.dailyChips, 3);
      }

      subscription.updatedAt = nowIso;
      subscription.serverSignature = signChipPayload({
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        dailyAllowance: subscription.dailyAllowance,
      });

      chips.updatedAt = nowIso;
      chips.serverSignature = signChipPayload({
        userId: chips.userId,
        dailyChips: chips.dailyChips,
        purchasedChips: chips.purchasedChips,
        subscriptionChips: chips.subscriptionChips,
        lastResetDate: chips.lastResetDate,
      });

      await Promise.all([
        saveFirestoreDoc(`subscriptions/${uid}`, subscription, idToken),
        saveFirestoreDoc(`chips/${uid}`, chips, idToken),
      ]);

      res.json({ chips, subscription, validatedByServer: true });
    } catch (err) {
      console.error('Erro em /api/chips/subscription:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Erro ao atualizar assinatura.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      plugins: [
        {
          name: 'disable-vite-client-ws',
          enforce: 'post',
          transform(code, id) {
            if (id.includes('vite/dist/client/client.mjs')) {
              return {
                code: code.replace(
                  /const transport = normalizeModuleRunnerTransport\(\(\(\) => \{[\s\S]*?\}\)\(\)\);/,
                  'const transport = normalizeModuleRunnerTransport({ connect() {}, disconnect() {}, send() {} });'
                ),
                map: null,
              };
            }
          },
        },
      ],
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('SportUp server running at http://0.0.0.0:3000');
  });
}

startServer();
