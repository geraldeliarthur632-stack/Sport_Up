import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { SPORTS, SPORTS_BY_ID } from '../data/sportsMeta';
import { auth } from '../lib/firebase';
import type { SportId } from '../types/sportup';
import { SportMascot } from './SportMascot';
import { SportUpLogo } from './SportUpLogo';

interface SportOnboardingScreenProps {
  displayName: string;
  onConfirmSport: (sportId: SportId, positions: string[]) => Promise<void>;
}

export const SportOnboardingScreen: React.FC<SportOnboardingScreenProps> = ({
  displayName,
  onConfirmSport,
}) => {
  const [step, setStep] = useState<'sport' | 'positions'>('sport');
  const [selected, setSelected] = useState<SportId>('futsal');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [limitHint, setLimitHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const firstName = displayName.trim().split(' ')[0] || 'Atleta';
  const selectedMeta = SPORTS_BY_ID[selected];

  const handleChooseSportNext = () => {
    setErrorMsg(null);
    setLimitHint(null);
    // Keep only positions valid for this sport if user went back
    const validIds = new Set(selectedMeta.positions.map((p) => p.id));
    setSelectedPositions((prev) => prev.filter((id) => validIds.has(id)));
    setStep('positions');
  };

  const togglePosition = (posId: string) => {
    setLimitHint(null);
    setErrorMsg(null);
    setSelectedPositions((prev) => {
      if (prev.includes(posId)) {
        return prev.filter((id) => id !== posId);
      }
      if (prev.length >= 3) {
        setLimitHint(
          'Você já escolheu 3 posições. Toque em uma marcada se quiser trocar.'
        );
        return prev;
      }
      return [...prev, posId];
    });
  };

  const handleConfirm = async () => {
    if (selectedPositions.length === 0) {
      setErrorMsg('Escolha pelo menos 1 posição para montar seu treino.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await onConfirmSport(selected, selectedPositions);
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
            : 'Não foi possível salvar sua escolha. Tente novamente.'
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

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs font-extrabold">
          <span
            className={`px-3 py-1 rounded-full ${
              step === 'sport'
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            1. Esporte
          </span>
          <span className="text-slate-400">→</span>
          <span
            className={`px-3 py-1 rounded-full ${
              step === 'positions'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            2. Posição (1 a 3)
          </span>
        </div>

        {step === 'sport' ? (
          <>
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <SportMascot
                size="md"
                mood="cheer"
                message={`Olá, ${firstName}! Qual esporte você quer aprender primeiro no SportUp?`}
              />

              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight text-balance">
                  Passo 1: Escolha seu esporte inicial
                </h1>
                <p className="text-sm text-slate-600">
                  São mais de 750 aulas por esporte explicadas com palavras simples, liberadas para você assistir quantas vezes quiser!
                </p>
              </div>
            </div>

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
                onClick={handleChooseSportNext}
                className="w-full min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-base border-b-4 border-emerald-700 flex items-center justify-center gap-2 transition"
              >
                <span>Continuar: escolher posição em {selectedMeta.name}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Entrar com outra conta</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <SportMascot
                size="md"
                mood="happy"
                message={`Boa escolha! Agora me diga em qual posição você quer treinar em ${selectedMeta.name}.`}
              />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Passo 2: Escolha de 1 até 3 posições
                  </h1>
                  <p className="text-sm text-slate-600">
                    Você pode marcar só <strong>1 posição</strong>, escolher <strong>2</strong> ou até <strong>3</strong>! Seu treino vai focar primeiro nas jogadas dessa(s) função(ões).
                  </p>
                </div>

                <span className="px-3 py-1.5 rounded-2xl bg-emerald-100 text-emerald-800 text-xs font-extrabold tabular-nums shrink-0">
                  {selectedPositions.length} de 3 selecionadas
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3.5 text-xs font-bold text-rose-800">
                {errorMsg}
              </div>
            )}

            {limitHint && (
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 text-xs font-bold text-amber-900">
                {limitHint}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedMeta.positions.map((pos) => {
                const orderIdx = selectedPositions.indexOf(pos.id);
                const isSelected = orderIdx !== -1;

                return (
                  <button
                    key={pos.id}
                    type="button"
                    disabled={saving}
                    onClick={() => togglePosition(pos.id)}
                    className={`text-left rounded-3xl border-2 border-b-4 p-4 transition flex items-center gap-3.5 min-h-[82px] ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl font-extrabold text-sm flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isSelected ? `${orderIdx + 1}ª` : '+'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-base font-extrabold text-slate-900">
                        {pos.name}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                        {pos.shortRole}
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
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setErrorMsg(null);
                    setLimitHint(null);
                    setStep('sport');
                  }}
                  className="sm:w-44 min-h-[52px] rounded-2xl bg-white border-2 border-slate-300 border-b-4 text-slate-700 font-extrabold text-sm flex items-center justify-center gap-1.5 hover:bg-slate-50 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Trocar esporte</span>
                </button>

                <button
                  type="button"
                  disabled={saving || selectedPositions.length === 0}
                  onClick={handleConfirm}
                  className="flex-1 min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-500 text-white font-extrabold text-base border-b-4 border-emerald-700 transition"
                >
                  {saving
                    ? 'Montando seu treino...'
                    : selectedPositions.length === 0
                      ? 'Selecione pelo menos 1 posição'
                      : `Começar treino de ${selectedMeta.name} (${selectedPositions.length} ${selectedPositions.length === 1 ? 'posição' : 'posições'})`}
                </button>
              </div>

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
          </>
        )}
      </div>
    </div>
  );
};
