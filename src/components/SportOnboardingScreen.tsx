import React, { useState } from 'react';
import { Check, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { SPORTS, SPORTS_BY_ID } from '../data/sportsMeta';
import { auth } from '../lib/firebase';
import type { SportId } from '../types/sportup';
import { SportMascot } from './SportMascot';
import { SportUpLogo } from './SportUpLogo';

interface SportOnboardingScreenProps {
  displayName: string;
  onConfirmSport: (sportId: SportId) => Promise<void>;
}

export const SportOnboardingScreen: React.FC<SportOnboardingScreenProps> = ({
  displayName,
  onConfirmSport,
}) => {
  const [selected, setSelected] = useState<SportId>('futsal');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const firstName = displayName.trim().split(' ')[0] || 'Atleta';
  const selectedMeta = SPORTS_BY_ID[selected];

  const handleConfirm = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await onConfirmSport(selected);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      if (
        raw.includes('Missing or insufficient permissions') ||
        raw.includes('permission-denied')
      ) {
        setErrorMsg(
          'Não foi possível salvar seu perfil no momento. Verifique sua sessão e tente novamente.'
        );
      } else {
        setErrorMsg(
          raw && !raw.startsWith('{')
            ? raw
            : 'Não foi possível salvar o esporte escolhido. Tente novamente.'
        );
      }
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col justify-center px-4 py-8">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="flex justify-center">
          <SportUpLogo size="md" />
        </div>
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <SportMascot
            size="md"
            mood="cheer"
            message={`Olá, ${firstName}! Qual esporte você quer aprender primeiro no SportUp?`}
          />

          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight text-balance">
              Escolha seu esporte inicial
            </h1>
            <p className="text-sm text-slate-600">
              Sua trilha, suas 3 moedas diárias e seu progresso serão salvos na sua conta. Você poderá explorar os outros esportes quando quiser.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3.5 text-xs font-bold text-rose-800">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SPORTS.map((sport) => {
            const isSelected = selected === sport.id;
            return (
              <button
                key={sport.id}
                type="button"
                disabled={saving}
                onClick={() => setSelected(sport.id)}
                className={`text-left rounded-3xl border-2 border-b-4 p-4 transition flex items-center gap-3.5 min-h-[84px] ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={sport.courtImage}
                    alt={sport.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-extrabold text-slate-900 truncate">
                    {sport.name}
                  </p>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                    {sport.tagline}
                  </p>
                </div>

                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : 'bg-white border-slate-300 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleConfirm}
            className="w-full min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-extrabold text-base border-b-4 border-emerald-700 transition"
          >
            {saving
              ? 'Salvando sua escolha...'
              : `Começar a aprender ${selectedMeta.name}`}
          </button>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={saving}
              onClick={() => signOut(auth)}
              className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Entrar com outra conta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
