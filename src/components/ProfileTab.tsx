import React, { useState } from 'react';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  Award,
  Camera,
  Check,
  Flame,
  HelpCircle,
  LogOut,
  Moon,
  Share2,
  Sparkles,
  Sun,
  Trophy,
  X,
} from 'lucide-react';
import { ACHIEVEMENTS_CATALOG, SPORTS_BY_ID } from '../data/sportsMeta';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  uploadMediaToStorage,
} from '../lib/firebase';
import { formatProfileShareText } from '../lib/shareExport';
import type { LessonProgress, UserProfile } from '../types/sportup';
import { PWAInstallButton } from './PWAInstallBanner';
import { ShareExportModal, type ShareExportPayload } from './ShareExportModal';

interface ProfileTabProps {
  userProfile: UserProfile;
  userEmail: string | null;
  progressMap: Record<string, LessonProgress>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userProfile,
  userEmail,
  progressMap,
  theme,
  onToggleTheme,
}) => {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile.displayName);
  const [saving, setSaving] = useState(false);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [sharePayload, setSharePayload] = useState<ShareExportPayload | null>(null);

  const completedLessonsCount = Object.values(progressMap).filter(
    (p) => p.completed
  ).length;
  const unlockedIds = new Set(userProfile.achievements ?? []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: nameInput.trim(),
        });
      }
      await updateDoc(doc(db, 'users', userProfile.uid), {
        displayName: nameInput.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditing(false);
      setStatusMsg('Perfil atualizado!');
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${userProfile.uid}`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const url = await uploadMediaToStorage(
        `avatars/${userProfile.uid}_${Date.now()}`,
        file
      );
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url });
      }
      await updateDoc(doc(db, 'users', userProfile.uid), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      });
      setStatusMsg('Foto de perfil atualizada!');
    } catch {
      setStatusMsg(
        'Não foi possível enviar a foto. Verifique se o Firebase Storage está habilitado no console.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Profile Header Card */}
      <section className="bg-white border-2 border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="relative w-20 h-20 rounded-3xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center overflow-hidden cursor-pointer shrink-0 group">
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-extrabold text-emerald-800">
                {userProfile.displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera className="w-5 h-5 text-white" />
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>

          <div className="flex-1 min-w-0">
            {editing ? (
              <form onSubmit={handleSaveProfile} className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 min-w-0 min-h-[40px] px-3 rounded-xl border-2 border-emerald-400 text-sm font-bold"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="min-w-[40px] min-h-[40px] rounded-xl bg-emerald-500 text-white flex items-center justify-center"
                >
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <>
                <h1 className="text-xl font-extrabold text-slate-900 truncate">
                  {userProfile.displayName}
                </h1>
                {userEmail && (
                  <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-1.5 text-xs font-bold text-sky-600 hover:underline"
                >
                  Editar nome
                </button>
              </>
            )}
          </div>
        </div>

        {userProfile.selectedSportId && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-extrabold text-slate-500">
              Esporte ativo:
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold">
              {SPORTS_BY_ID[userProfile.selectedSportId]?.name}
            </span>
            {(userProfile.selectedPositions ?? []).map((posId) => {
              const posName = SPORTS_BY_ID[
                userProfile.selectedSportId!
              ]?.positions.find((p) => p.id === posId)?.name;
              if (!posName) return null;
              return (
                <span
                  key={posId}
                  className="px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 font-bold"
                >
                  {posName}
                </span>
              );
            })}
          </div>
        )}

        {statusMsg && (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
            {statusMsg}
          </p>
        )}
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-center">
          <Sparkles className="w-5 h-5 text-amber-500 mx-auto" />
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {userProfile.xp}
          </p>
          <p className="text-xs font-bold text-slate-500">XP Total</p>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-center">
          <Flame className="w-5 h-5 text-orange-500 mx-auto" />
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {userProfile.streak}
          </p>
          <p className="text-xs font-bold text-slate-500">Dias seguidos</p>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-center">
          <Trophy className="w-5 h-5 text-emerald-600 mx-auto" />
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {completedLessonsCount}
          </p>
          <p className="text-xs font-bold text-slate-500">Aulas</p>
        </div>
      </section>

      {/* Achievements */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-slate-900">Conquistas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS_CATALOG.map((ach) => {
            const unlocked = unlockedIds.has(ach.id);
            return (
              <div
                key={ach.id}
                className={`border-2 rounded-2xl p-3.5 flex items-start gap-3 ${
                  unlocked
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-white border-slate-200 opacity-70'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    unlocked
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {ach.title}
                  </p>
                  <p className="text-xs text-slate-600">{ach.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Share Progress, PWA Install & Firebase Setup Guide */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() =>
            setSharePayload({
              title: 'Meu progresso no SportUp',
              fileName: 'meu-progresso-sportup.txt',
              text: formatProfileShareText({
                displayName: userProfile.displayName,
                sportName: userProfile.selectedSportId
                  ? SPORTS_BY_ID[userProfile.selectedSportId]?.name
                  : undefined,
                xp: userProfile.xp,
                streak: userProfile.streak,
                completedLessons: completedLessonsCount,
                achievementsCount: unlockedIds.size,
              }),
            })
          }
          className="w-full min-h-[48px] rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-sm border-b-4 border-[#15803D] flex items-center justify-center gap-2 transition"
        >
          <Share2 className="w-4 h-4" />
          <span>Exportar progresso (WhatsApp e mais)</span>
        </button>

        <PWAInstallButton />

        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              Aparência do SportUp
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {theme === 'light'
                ? 'Modo Claro ativado (alta visibilidade em quadra)'
                : 'Modo Escuro ativado'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[42px] px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-900 font-extrabold text-xs flex items-center gap-2 shrink-0 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
          >
            {theme === 'light' ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-sky-400" />
                <span>Modo Escuro</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowFirebaseGuide(true)}
          className="w-full min-h-[46px] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition"
        >
          <HelpCircle className="w-4 h-4 text-sky-600" />
          <span>Instruções de configuração do Firebase</span>
        </button>

        <button
          type="button"
          onClick={() => signOut(auth)}
          className="w-full min-h-[46px] rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-700 font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-rose-100 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da conta</span>
        </button>
      </section>

      {sharePayload && (
        <ShareExportModal
          payload={sharePayload}
          onClose={() => setSharePayload(null)}
        />
      )}

      {showFirebaseGuide && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">
                Configuração do Firebase no SportUp
              </h3>
              <button
                type="button"
                onClick={() => setShowFirebaseGuide(false)}
                className="p-1 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
                <p className="font-extrabold text-slate-900">
                  1. Authentication (Login)
                </p>
                <p>
                  O login com Google já vem provisionado. Para permitir cadastro com E-mail e Senha e recuperação de senha, ative o provedor <strong>E-mail/senha</strong> em Firebase Console → Authentication → Sign-in method.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
                <p className="font-extrabold text-slate-900">
                  2. Cloud Firestore e Security Rules
                </p>
                <p>
                  As coleções <code>users</code>, <code>progress</code>, <code>chips</code>, <code>subscriptions</code>, <code>teams</code>, <code>teamInvites</code>, <code>members</code>, <code>messages</code> e <code>matches</code> já estão protegidas pelo arquivo <code>firestore.rules</code> implantado no projeto.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
                <p className="font-extrabold text-slate-900">
                  3. Firebase Storage (Fotos, Áudios, Vídeos e Arquivos)
                </p>
                <p>
                  Para uploads de avatares, logos de times e mídias do chat, ative o Firebase Storage no console e defina regras exigindo <code>request.auth != null</code>.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
                <p className="font-extrabold text-slate-900">
                  4. Validação de Fichas no Servidor
                </p>
                <p>
                  No runtime do SportUp, o backend Express (<code>server.ts</code>) valida tokens Firebase e aplica as regras de renovação diária (3 moedas) e prioridade de gasto. O projeto também inclui fallback direto no Firestore para hospedagem estática (como GitHub Pages) e código pronto para Cloud Functions v2 em <code>functions/index.ts</code>.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 space-y-1">
                <p className="font-extrabold text-slate-900">
                  5. Hospedagem no GitHub Pages
                </p>
                <p>
                  Ative <strong>Settings → Pages → GitHub Actions</strong> no repositório do GitHub. Em seguida, adicione seu domínio (ex.: <code>seu-usuario.github.io</code>) em Firebase Console → Authentication → Settings → <strong>Authorized domains</strong> para liberar o login e a instalação do PWA com o logo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFirebaseGuide(false)}
              className="w-full min-h-[46px] rounded-2xl bg-emerald-500 text-white font-extrabold text-sm border-b-4 border-emerald-700"
            >
              Fechar guia
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
