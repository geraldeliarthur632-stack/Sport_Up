import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { Camera, KeyRound, Mail, User as UserIcon } from 'lucide-react';
import {
  auth,
  googleProvider,
  setPendingRegistrationProfile,
  uploadMediaToStorage,
} from '../lib/firebase';
import { SportMascot } from './SportMascot';
import { SportUpLogo } from './SportUpLogo';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [showProviderHelp, setShowProviderHelp] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const translateAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/operation-not-allowed') {
      setShowProviderHelp(true);
      return 'O login por E-mail/Senha ainda precisa ser ativado no Firebase Console (Authentication → Sign-in method). Você pode entrar com o Google agora mesmo!';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'E-mail ou senha incorretos.';
    }
    if (code === 'auth/user-not-found') {
      return 'Nenhuma conta encontrada com esse e-mail.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha.';
    }
    if (code === 'auth/weak-password') {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Login com Google cancelado.';
    }
    return err instanceof Error ? err.message : 'Erro ao autenticar.';
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else if (mode === 'register') {
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error('Informe seu nome para criar o perfil.');
        }
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        setPendingRegistrationProfile(cred.user.uid, {
          displayName: trimmedName,
        });
        let photoURL = '';
        if (photoFile) {
          try {
            photoURL = await uploadMediaToStorage(
              `avatars/${cred.user.uid}_${Date.now()}`,
              photoFile
            );
          } catch {
            // Storage opcional caso bucket ainda esteja sendo habilitado
            photoURL = '';
          }
        }
        setPendingRegistrationProfile(cred.user.uid, {
          displayName: trimmedName,
          photoURL: photoURL || undefined,
        });
        await updateProfile(cred.user, {
          displayName: trimmedName,
          photoURL: photoURL || undefined,
        });
        await cred.user.reload().catch(() => {});
        await sendEmailVerification(cred.user).catch(() => {});
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim());
        setInfoMsg(
          'Enviamos um link de redefinição de senha para o seu e-mail. Verifique também a caixa de spam.'
        );
        setMode('login');
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col justify-center px-4 py-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <SportUpLogo size="lg" />
          </div>
          <div className="flex justify-center">
            <SportMascot
              size="md"
              mood="cheer"
              message="Bem-vindo ao SportUp! Aprenda esportes jogando e monte seu time."
            />
          </div>
          <p className="text-sm text-slate-600">
            Futsal, Futebol, Vôlei, Basquete e Ping Pong em trilhas gamificadas.
          </p>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          {/* Google Login */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full min-h-[50px] rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 border-b-4 font-bold text-sm text-slate-800 flex items-center justify-center gap-3 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continuar com Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">ou use seu e-mail</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`min-h-[40px] rounded-xl text-xs font-bold transition ${
                mode === 'login' || mode === 'reset'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`min-h-[40px] rounded-xl text-xs font-bold transition ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Criar conta
            </button>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 text-xs font-semibold text-rose-800 leading-relaxed">
              {error}
            </div>
          )}

          {showProviderHelp && (
            <div className="rounded-2xl bg-sky-50 border-2 border-sky-200 p-3 text-xs text-sky-900 space-y-1">
              <p className="font-bold">Como ativar E-mail e Senha no Firebase:</p>
              <p>
                1. Acesse o Firebase Console → Authentication → Sign-in method.
                <br />
                2. Clique em &ldquo;E-mail/senha&rdquo; e ative a primeira chave.
              </p>
            </div>
          )}

          {infoMsg && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                <div className="flex items-center gap-3">
                  <label className="relative w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden shrink-0 hover:border-emerald-400">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Prévia"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Seu nome
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Gabriel Silva"
                        className="w-full min-h-[44px] pl-10 pr-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="w-full min-h-[44px] pl-10 pr-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full min-h-[44px] pl-10 pr-3 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                  }}
                  className="text-xs font-bold text-sky-600 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-bold text-slate-600 hover:underline"
                >
                  Voltar ao login
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[50px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-extrabold text-sm border-b-4 border-emerald-700 transition"
            >
              {loading
                ? 'Aguarde...'
                : mode === 'login'
                  ? 'Entrar no SportUp'
                  : mode === 'register'
                    ? 'Criar minha conta'
                    : 'Enviar link de recuperação'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
