import React, { Component, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { BookOpen, Coins, Shield, User as UserIcon } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { ChipsStoreTab } from './components/ChipsStoreTab';
import { LearnTab } from './components/LearnTab';
import { LessonPlayerModal } from './components/LessonPlayerModal';
import {
  OfflineIndicator,
  PWAInstallFloatingAd,
} from './components/PWAInstallBanner';
import { ProfileTab } from './components/ProfileTab';
import { SportOnboardingScreen } from './components/SportOnboardingScreen';
import { SportUpLogo } from './components/SportUpLogo';
import { TeamTab } from './components/TeamTab';
import { TopBar } from './components/TopBar';
import { VideoRewardModal } from './components/VideoRewardModal';
import {
  claimAdRewardOnServer,
  purchaseChipsOnServer,
  syncChipsWithServer,
} from './lib/chipsApi';
import {
  auth,
  clearPendingRegistrationProfile,
  db,
  getPendingRegistrationProfile,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from './lib/firebase';
import { getOfflineLesson } from './lib/offlineCache';
import { SPORTS_BY_ID } from './data/sportsMeta';
import type {
  ChipWallet,
  Lesson,
  LessonProgress,
  SportId,
  UserProfile,
  UserSubscription,
} from './types/sportup';

type AppTab = 'aprender' | 'time' | 'perfil' | 'loja';

const POSITIONS_STORAGE_KEY = 'sportup_positions_by_sport_v1';

function readStoredPositionsBySport(): Partial<Record<SportId, string[]>> {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<SportId, string[]>>) : {};
  } catch {
    return {};
  }
}

function saveStoredPositionsForSport(sportId: SportId, positions: string[]): void {
  try {
    const current = readStoredPositionsBySport();
    current[sportId] = positions;
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}

function sanitizePositionsForSport(
  sportId: SportId,
  positions?: string[]
): string[] {
  const meta = SPORTS_BY_ID[sportId];
  const validIds = new Set(meta.positions.map((p) => p.id));
  const clean = (positions ?? []).filter((id) => validIds.has(id)).slice(0, 3);
  return clean.length > 0 ? clean : [meta.positions[0].id];
}

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-center space-y-4">
            <h1 className="text-xl font-extrabold text-slate-900">
              Ops! Algo deu errado
            </h1>
            <p className="text-xs text-slate-600 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[46px] rounded-2xl bg-emerald-500 text-white font-extrabold text-sm border-b-4 border-emerald-700"
            >
              Recarregar SportUp
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function getBrazilDateString(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000);
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function SportUpApp() {
  const [authReady, setAuthReady] = useState(false);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chips, setChips] = useState<ChipWallet | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [progressMap, setProgressMap] = useState<
    Record<string, LessonProgress>
  >({});

  const [onboardingStatus, setOnboardingStatus] = useState<
    'idle' | 'checking' | 'needed' | 'done'
  >('idle');
  const [activeTab, setActiveTab] = useState<AppTab>('aprender');
  const [selectedSport, setSelectedSport] = useState<SportId>('futsal');
  const [positionsBySport, setPositionsBySport] = useState<
    Partial<Record<SportId, string[]>>
  >(() => readStoredPositionsBySport());
  const [selectedPositions, setSelectedPositions] = useState<string[]>(() => {
    const stored = readStoredPositionsBySport();
    return sanitizePositionsForSport('futsal', stored.futsal);
  });
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('sportup_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('sportup_theme', theme);
    } catch {
      // Ignore storage error
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const syncChipsAndWallet = async (uid: string, isMounted: () => boolean) => {
    try {
      const synced = await syncChipsWithServer();
      if (isMounted()) {
        setChips(synced.chips);
        setSubscription(synced.subscription);
      }
    } catch (err) {
      console.warn('Sync de fichas com servidor, usando fallback:', err);
      try {
        const today = getBrazilDateString(0);
        const subRef = doc(db, 'subscriptions', uid);
        const chipsRef = doc(db, 'chips', uid);
        const [subSnap, chipsSnap] = await Promise.all([
          getDoc(subRef),
          getDoc(chipsRef),
        ]);

        if (!subSnap.exists()) {
          await setDoc(subRef, {
            userId: uid,
            plan: 'free',
            status: 'active',
            dailyAllowance: 3,
            accumulates: false,
            currentPeriodEnd: '',
            serverSignature: '',
            updatedAt: serverTimestamp(),
          });
        }

        if (!chipsSnap.exists()) {
          await setDoc(chipsRef, {
            userId: uid,
            dailyChips: 3,
            purchasedChips: 0,
            subscriptionChips: 0,
            lastResetDate: today,
            adsWatchedToday: 0,
            lastAdDate: today,
            serverSignature: '',
            updatedAt: serverTimestamp(),
          });
        } else {
          const existingChips = chipsSnap.data() as ChipWallet;
          if (existingChips.lastResetDate !== today) {
            await updateDoc(chipsRef, {
              dailyChips: 3,
              lastResetDate: today,
              adsWatchedToday: 0,
              lastAdDate: today,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (fallbackErr) {
        console.warn('Fallback de fichas falhou:', fallbackErr);
      }
    }
  };

  // Check whether user already has a saved profile/sport or needs first-time onboarding
  useEffect(() => {
    if (!fbUser) {
      setUserProfile(null);
      setChips(null);
      setSubscription(null);
      setProgressMap({});
      setOnboardingStatus('idle');
      return;
    }

    const uid = fbUser.uid;
    let active = true;
    setOnboardingStatus('checking');

    async function checkProfileAndBootstrap() {
      void testFirestoreConnection();
      const userRef = doc(db, 'users', uid);
      try {
        let snap;
        try {
          snap = await getDocFromServer(userRef);
        } catch {
          snap = await getDoc(userRef);
        }

        if (!active) return;

        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
          if (data.selectedSportId) {
            setSelectedSport(data.selectedSportId);
            const stored = readStoredPositionsBySport();
            const rawPos =
              data.selectedPositions && data.selectedPositions.length > 0
                ? data.selectedPositions
                : stored[data.selectedSportId];
            const cleanPos = sanitizePositionsForSport(
              data.selectedSportId,
              rawPos
            );
            setSelectedPositions(cleanPos);
            saveStoredPositionsForSport(data.selectedSportId, cleanPos);
            setPositionsBySport((prev) => ({
              ...prev,
              [data.selectedSportId!]: cleanPos,
            }));
            setOnboardingStatus('done');
          } else {
            setOnboardingStatus('needed');
          }

          if (fbUser?.email) {
            setDoc(
              doc(db, 'users', uid, 'private', 'account'),
              {
                uid,
                email: fbUser.email.slice(0, 200),
                provider: (fbUser.providerData[0]?.providerId || 'password').slice(0, 40),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).catch(() => {});
          }
        } else {
          // First login (Google or Email): wait for initial sport selection before creating profile
          setOnboardingStatus('needed');
        }
      } catch (err) {
        console.warn('Erro ao verificar perfil inicial:', err);
        if (active) {
          setOnboardingStatus('needed');
        }
      }
    }

    checkProfileAndBootstrap();

    return () => {
      active = false;
    };
  }, [fbUser]);

  // Attach real-time listeners and sync chips only after authentication and onboarding completion
  useEffect(() => {
    if (!fbUser || onboardingStatus !== 'done') {
      return;
    }

    const uid = fbUser.uid;
    let active = true;

    void syncChipsAndWallet(uid, () => active);

    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
          if (data.selectedSportId) {
            setSelectedSport(data.selectedSportId);
            if (data.selectedPositions && data.selectedPositions.length > 0) {
              const cleanPos = sanitizePositionsForSport(
                data.selectedSportId,
                data.selectedPositions
              );
              setSelectedPositions(cleanPos);
            }
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubChips = onSnapshot(
      doc(db, 'chips', uid),
      (snap) => {
        if (snap.exists()) setChips(snap.data() as ChipWallet);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `chips/${uid}`)
    );

    const unsubSub = onSnapshot(
      doc(db, 'subscriptions', uid),
      (snap) => {
        if (snap.exists()) setSubscription(snap.data() as UserSubscription);
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, `subscriptions/${uid}`)
    );

    const qProgress = query(
      collection(db, 'progress'),
      where('userId', '==', uid)
    );
    const unsubProgress = onSnapshot(
      qProgress,
      (snap) => {
        const map: Record<string, LessonProgress> = {};
        snap.docs.forEach((d) => {
          const p = d.data() as LessonProgress;
          map[p.lessonId] = p;
        });
        setProgressMap(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'progress')
    );

    return () => {
      active = false;
      unsubUser();
      unsubChips();
      unsubSub();
      unsubProgress();
    };
  }, [fbUser, onboardingStatus]);

  const handleSelectSport = async (sportId: SportId, positions?: string[]) => {
    const cleanPos = sanitizePositionsForSport(
      sportId,
      positions ?? positionsBySport[sportId]
    );
    setSelectedSport(sportId);
    setSelectedPositions(cleanPos);
    saveStoredPositionsForSport(sportId, cleanPos);
    setPositionsBySport((prev) => ({ ...prev, [sportId]: cleanPos }));

    if (fbUser && userProfile) {
      updateDoc(doc(db, 'users', fbUser.uid), {
        selectedSportId: sportId,
        selectedPositions: cleanPos,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  };

  const handleUpdatePositions = async (positions: string[]) => {
    const cleanPos = sanitizePositionsForSport(selectedSport, positions);
    setSelectedPositions(cleanPos);
    saveStoredPositionsForSport(selectedSport, cleanPos);
    setPositionsBySport((prev) => ({ ...prev, [selectedSport]: cleanPos }));

    if (fbUser && userProfile) {
      updateDoc(doc(db, 'users', fbUser.uid), {
        selectedPositions: cleanPos,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  };

  const handleStartLesson = async (lesson: Lesson) => {
    // Unlimited lesson watching & replaying for all users
    const cached = getOfflineLesson(lesson.id);
    setActiveLesson(cached ?? lesson);
  };

  const handleCompleteLesson = async ({
    lesson,
    scorePercent,
    xpEarned,
  }: {
    lesson: Lesson;
    scorePercent: number;
    xpEarned: number;
  }) => {
    if (!fbUser || !userProfile) return;

    const progressId = `${fbUser.uid}_${lesson.id}`;
    const progressPath = `progress/${progressId}`;
    const prevProgress = progressMap[lesson.id];

    try {
      await setDoc(doc(db, 'progress', progressId), {
        userId: fbUser.uid,
        lessonId: lesson.id,
        sportId: lesson.sportId,
        completed: true,
        score: Math.max(prevProgress?.score ?? 0, scorePercent),
        xpEarned: Math.max(prevProgress?.xpEarned ?? 0, xpEarned),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, progressPath);
    }

    const today = getBrazilDateString(0);
    const yesterday = getBrazilDateString(-1);
    const lastDate = userProfile.lastActivityDate;
    let nextStreak = userProfile.streak || 0;
    if (lastDate === yesterday) {
      nextStreak += 1;
    } else if (lastDate !== today) {
      nextStreak = 1;
    }

    const nextXp = (userProfile.xp || 0) + xpEarned;
    const nextAch = new Set(userProfile.achievements ?? []);
    nextAch.add('primeiro_passo');
    if (scorePercent === 100) nextAch.add('nota_maxima');
    if (nextStreak >= 2) nextAch.add('sequencia_3');
    if (nextXp >= 100) nextAch.add('mestre_100xp');

    const completedSports = new Set(
      Object.values(progressMap)
        .filter((p) => p.completed)
        .map((p) => p.sportId)
    );
    completedSports.add(lesson.sportId);
    if (completedSports.size >= 2) nextAch.add('multi_esporte');

    try {
      await updateDoc(doc(db, 'users', fbUser.uid), {
        xp: nextXp,
        streak: nextStreak,
        lastActivityDate: today,
        achievements: Array.from(nextAch),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${fbUser.uid}`
      );
    }
  };

  const handleUnlockTeamAchievement = async () => {
    if (!fbUser || !userProfile) return;
    const nextAch = new Set(userProfile.achievements ?? []);
    if (nextAch.has('capitao_time')) return;
    nextAch.add('capitao_time');
    await updateDoc(doc(db, 'users', fbUser.uid), {
      achievements: Array.from(nextAch),
      xp: (userProfile.xp || 0) + 50,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  };

  const handleCompleteOnboarding = async (
    chosenSport: SportId,
    chosenPositions: string[]
  ) => {
    if (!fbUser) return;
    const uid = fbUser.uid;
    const cleanPositions = sanitizePositionsForSport(
      chosenSport,
      chosenPositions
    );
    await fbUser.reload().catch(() => {});
    const pending = getPendingRegistrationProfile(uid);

    const rawName = (
      pending?.displayName ||
      fbUser.displayName ||
      fbUser.email?.split('@')[0] ||
      'Atleta SportUp'
    ).trim();
    const displayName = rawName.slice(0, 80) || 'Atleta SportUp';
    const rawPhotoURL = (pending?.photoURL || fbUser.photoURL || '').trim();
    const photoURL = rawPhotoURL.length <= 1024 ? rawPhotoURL : '';

    const userRef = doc(db, 'users', uid);
    let existingSnap;
    try {
      existingSnap = await getDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }

    if (!existingSnap.exists()) {
      const initialProfile: Record<string, unknown> = {
        uid,
        displayName,
        xp: 0,
        streak: 0,
        selectedSportId: chosenSport,
        selectedPositions: cleanPositions,
        achievements: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) {
        initialProfile.photoURL = photoURL;
      }
      try {
        await setDoc(userRef, initialProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
      }
      setUserProfile({
        uid,
        displayName,
        ...(photoURL ? { photoURL } : {}),
        xp: 0,
        streak: 0,
        selectedSportId: chosenSport,
        selectedPositions: cleanPositions,
        achievements: [],
      });
    } else {
      try {
        await updateDoc(userRef, {
          selectedSportId: chosenSport,
          selectedPositions: cleanPositions,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    }

    if (fbUser.email) {
      await setDoc(
        doc(db, 'users', uid, 'private', 'account'),
        {
          uid,
          email: fbUser.email.slice(0, 200),
          provider: (fbUser.providerData[0]?.providerId || 'password').slice(0, 40),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    }

    clearPendingRegistrationProfile(uid);
    saveStoredPositionsForSport(chosenSport, cleanPositions);
    setPositionsBySport((prev) => ({ ...prev, [chosenSport]: cleanPositions }));
    setSelectedPositions(cleanPositions);
    setSelectedSport(chosenSport);
    setOnboardingStatus('done');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <SportUpLogo size="xl" showWordmark={false} className="justify-center animate-bounce" />
          <div className="flex justify-center">
            <SportUpLogo size="md" />
          </div>
          <p className="text-sm font-bold text-slate-600">
            Carregando SportUp...
          </p>
        </div>
      </div>
    );
  }

  if (!fbUser) {
    return <AuthScreen />;
  }

  if (onboardingStatus === 'idle' || onboardingStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <SportUpLogo size="xl" showWordmark={false} className="justify-center animate-bounce" />
          <p className="text-sm font-bold text-slate-600">
            Verificando seu perfil...
          </p>
        </div>
      </div>
    );
  }

  if (onboardingStatus === 'needed') {
    const pending = getPendingRegistrationProfile(fbUser.uid);
    const onboardingName =
      pending?.displayName ||
      fbUser.displayName ||
      fbUser.email?.split('@')[0] ||
      'Atleta';
    return (
      <SportOnboardingScreen
        displayName={onboardingName}
        onConfirmSport={handleCompleteOnboarding}
      />
    );
  }

  const effectiveProfile: UserProfile = userProfile ?? {
    uid: fbUser.uid,
    displayName:
      fbUser.displayName || fbUser.email?.split('@')[0] || 'Atleta SportUp',
    photoURL: fbUser.photoURL ?? undefined,
    xp: 0,
    streak: 0,
    achievements: [],
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <OfflineIndicator />

      <TopBar
        xp={effectiveProfile.xp}
        streak={effectiveProfile.streak}
        chips={chips}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenStore={() => setActiveTab('loja')}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-5 pb-24">
        {activeTab === 'aprender' && (
          <LearnTab
            selectedSport={selectedSport}
            selectedPositions={selectedPositions}
            positionsBySport={positionsBySport}
            onSelectSport={handleSelectSport}
            onUpdatePositions={handleUpdatePositions}
            progressMap={progressMap}
            onStartLesson={handleStartLesson}
          />
        )}

        {activeTab === 'time' && (
          <TeamTab
            userProfile={effectiveProfile}
            onUnlockTeamAchievement={handleUnlockTeamAchievement}
          />
        )}

        {activeTab === 'perfil' && (
          <ProfileTab
            userProfile={effectiveProfile}
            userEmail={fbUser.email}
            progressMap={progressMap}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}

        {activeTab === 'loja' && (
          <ChipsStoreTab
            chips={chips}
            onOpenAdReward={() => setShowAdModal(true)}
            onPurchasePack={async (packId) => {
              const res = await purchaseChipsOnServer(packId);
              setChips(res.chips);
              setSubscription(res.subscription);
            }}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation (4 Tabs) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="max-w-5xl mx-auto grid grid-cols-4 h-16">
          {(
            [
              { id: 'aprender', label: 'Aprender', icon: BookOpen },
              { id: 'time', label: 'Meu time', icon: Shield },
              { id: 'perfil', label: 'Perfil', icon: UserIcon },
              { id: 'loja', label: 'Loja de fichas', icon: Coins },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 transition ${
                  active
                    ? 'text-emerald-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${active ? 'stroke-[2.6]' : 'stroke-[2]'}`}
                />
                <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Active Lesson Fullscreen Modal */}
      {activeLesson && (
        <LessonPlayerModal
          lesson={activeLesson}
          currentStreak={effectiveProfile.streak}
          onClose={() => setActiveLesson(null)}
          onComplete={handleCompleteLesson}
        />
      )}

      {/* Video Ad Reward Modal */}
      {showAdModal && (
        <VideoRewardModal
          onClose={() => setShowAdModal(false)}
          onClaimReward={async () => {
            const res = await claimAdRewardOnServer();
            setChips(res.chips);
            setSubscription(res.subscription);
          }}
        />
      )}
      {/* Anúncio discreto para instalar o PWA na tela inicial (some ao instalar) */}
      <PWAInstallFloatingAd />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SportUpApp />
    </ErrorBoundary>
  );
}
