import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.languageCode = 'pt-BR';

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  },
  firebaseConfig.firestoreDatabaseId
);

export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return true;
  }
  try {
    await getDocFromServer(doc(db, 'users', currentUser.uid));
    return true;
  } catch (error) {
    const code = (error as { code?: string })?.code ?? '';
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline')) {
      console.warn('Firestore offline — usando cache local.');
      return false;
    }
    if (
      code === 'permission-denied' ||
      message.includes('Missing or insufficient permissions')
    ) {
      console.warn(
        'Verificação de conexão Firestore retornou permission-denied; aguardando regras/sessão.'
      );
      return false;
    }
    return true;
  }
}

export async function uploadMediaToStorage(
  path: string,
  file: Blob | File
): Promise<string> {
  const storageRef = ref(storage, path);
  const snap = await uploadBytes(storageRef, file);
  return getDownloadURL(snap.ref);
}

const pendingRegistrationProfiles = new Map<
  string,
  { displayName?: string; photoURL?: string }
>();

export function setPendingRegistrationProfile(
  uid: string,
  profile: { displayName?: string; photoURL?: string }
): void {
  const current = pendingRegistrationProfiles.get(uid) ?? {};
  pendingRegistrationProfiles.set(uid, { ...current, ...profile });
}

export function getPendingRegistrationProfile(uid: string): {
  displayName?: string;
  photoURL?: string;
} | null {
  return pendingRegistrationProfiles.get(uid) ?? null;
}

export function clearPendingRegistrationProfile(uid: string): void {
  pendingRegistrationProfiles.delete(uid);
}

