/**
 * Firebase Cloud Functions (2nd Gen) para validação de fichas e assinaturas do SportUp.
 * Para implantar no seu projeto Firebase:
 *   cd functions && npm install firebase-functions firebase-admin && firebase deploy --only functions
 */

/*
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore('ai-studio-d5823c6e-cc25-4f58-8c50-f47a4eb02d5b');

export const consumeLessonChip = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Faça login para consumir fichas.');
  }
  const uid = request.auth.uid;
  const chipRef = db.doc(`chips/${uid}`);
  const subRef = db.doc(`subscriptions/${uid}`);

  return db.runTransaction(async (tx) => {
    const [chipSnap, subSnap] = await Promise.all([tx.get(chipRef), tx.get(subRef)]);
    const chips = chipSnap.data() ?? { dailyChips: 3, subscriptionChips: 0, purchasedChips: 0 };

    if (chips.dailyChips > 0) {
      tx.update(chipRef, { dailyChips: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
      return { source: 'daily' };
    }
    if (chips.subscriptionChips > 0) {
      tx.update(chipRef, { subscriptionChips: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
      return { source: 'subscription' };
    }
    if (chips.purchasedChips > 0) {
      tx.update(chipRef, { purchasedChips: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
      return { source: 'purchased' };
    }
    throw new HttpsError('resource-exhausted', 'Você não possui fichas suficientes.');
  });
});

export const dailyChipsRenewal = onSchedule('every day 00:00', async () => {
  const subs = await db.collection('subscriptions').get();
  for (const docSnap of subs.docs) {
    const sub = docSnap.data();
    const chipRef = db.doc(`chips/${docSnap.id}`);
    if (sub.plan === 'monthly_pro' && sub.status === 'active') {
      await chipRef.set(
        { dailyChips: 0, subscriptionChips: FieldValue.increment(5), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    } else {
      await chipRef.set(
        { dailyChips: 3, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  }
});
*/
export {};
