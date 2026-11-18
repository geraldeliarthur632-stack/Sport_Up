import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Coins,
  Film,
  Play,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { getLessonsBySport } from '../data/curriculumIndex';
import { MODULE_LABELS, SPORTS, SPORTS_BY_ID } from '../data/sportsMeta';
import { getOfflineLessonIds } from '../lib/offlineCache';
import type {
  ChipWallet,
  Lesson,
  LessonLevel,
  LessonProgress,
  SportId,
} from '../types/sportup';
import { SportMascot } from './SportMascot';

interface LearnTabProps {
  selectedSport: SportId;
  onSelectSport: (sportId: SportId) => void;
  progressMap: Record<string, LessonProgress>;
  chips: ChipWallet | null;
  onStartLesson: (lesson: Lesson, isFreeReview: boolean) => Promise<void>;
  onOpenAdReward: () => void;
  onOpenStore: () => void;
}

const LEVELS: LessonLevel[] = ['Iniciante', 'Intermediário', 'Avançado'];

export const LearnTab: React.FC<LearnTabProps> = ({
  selectedSport,
  onSelectSport,
  progressMap,
  chips,
  onStartLesson,
  onOpenAdReward,
  onOpenStore,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<LessonLevel | 'Todos'>('Todos');
  const [activeLessonPreview, setActiveLessonPreview] = useState<Lesson | null>(null);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sport = SPORTS_BY_ID[selectedSport];
  const lessons = useMemo(() => getLessonsBySport(selectedSport), [selectedSport]);
  const offlineIds = useMemo(() => getOfflineLessonIds(), [progressMap]);

  const totalChips =
    (chips?.dailyChips ?? 0) +
    (chips?.purchasedChips ?? 0);

  const completedInSport = lessons.filter(
    (l) => progressMap[l.id]?.completed
  ).length;

  const visibleLevels =
    selectedLevel === 'Todos' ? LEVELS : [selectedLevel];

  const handleLaunch = async (lesson: Lesson) => {
    setErrorMsg(null);
    const alreadyDone = Boolean(progressMap[lesson.id]?.completed);
    const alreadyCachedOffline = offlineIds.has(lesson.id);
    const isFreeReview = alreadyDone || alreadyCachedOffline;

    if (chips !== null && !isFreeReview && totalChips < 1) {
      setErrorMsg(
        'Suas moedas acabaram! Assista a um anúncio curto para ganhar +1 moeda ou visite a Loja.'
      );
      return;
    }

    setStarting(true);
    try {
      await onStartLesson(lesson, isFreeReview);
      setActiveLessonPreview(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Não foi possível iniciar a aula.'
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Sport Switcher */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold text-slate-500">
            Escolha o esporte
          </h2>
          <span className="text-xs font-bold text-emerald-700 tabular-nums">
            {completedInSport}/{lessons.length} aulas concluídas
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {SPORTS.map((s) => {
            const active = s.id === selectedSport;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelectSport(s.id);
                  setActiveLessonPreview(null);
                }}
                className={`min-h-[44px] px-4 py-2 rounded-2xl font-bold text-sm border-2 border-b-4 whitespace-nowrap shrink-0 transition ${
                  active
                    ? 'bg-emerald-500 border-emerald-700 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Sport Banner + Mascot */}
      <section className="bg-white border-2 border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-bold text-emerald-700">
            Trilha de {sport.name}
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Domine a quadra passo a passo
          </h1>
          <p className="text-sm text-slate-600">{sport.tagline}</p>
        </div>

        <SportMascot
          size="md"
          mood="happy"
          message={
            chips === null
              ? 'Carregando suas 3 moedas diárias...'
              : totalChips > 0
                ? `Você tem ${totalChips} moeda(s) pronta(s) para treinar!`
                : 'Sem moedas? Assista a um vídeo rápido e ganhe +1!'
          }
        />
      </section>

      {/* Out of chips banner */}
      {chips !== null && totalChips === 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-extrabold text-amber-950">
              Suas fichas diárias acabaram
            </p>
            <p className="text-xs text-amber-800">
              Aulas já abertas continuam liberadas offline. Para abrir uma nova aula:
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAdReward}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs border-b-4 border-sky-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Film className="w-4 h-4" />
              <span>Ver vídeo (+1)</span>
            </button>
            <button
              type="button"
              onClick={onOpenStore}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs border-b-4 border-amber-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Loja</span>
            </button>
          </div>
        </div>
      )}

      {/* Level Filter */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl overflow-x-auto">
        {(['Todos', ...LEVELS] as const).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setSelectedLevel(lvl)}
            className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedLevel === lvl
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Winding Duolingo-Style Path */}
      <div className="space-y-8">
        {visibleLevels.map((level) => {
          const levelLessons = lessons.filter((l) => l.level === level);
          if (levelLessons.length === 0) return null;

          return (
            <section key={level} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-extrabold text-slate-500 px-2">
                  Nível {level}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="flex flex-col items-center gap-6">
                {levelLessons.map((lesson, idx) => {
                  const isDone = Boolean(progressMap[lesson.id]?.completed);
                  const isCached = offlineIds.has(lesson.id);
                  const isSelected = activeLessonPreview?.id === lesson.id;
                  const modInfo = MODULE_LABELS[lesson.moduleType];

                  // Winding offset left / center / right
                  const offsetClass =
                    idx % 3 === 1
                      ? 'translate-x-8 sm:translate-x-12'
                      : idx % 3 === 2
                        ? '-translate-x-8 sm:-translate-x-12'
                        : '';

                  return (
                    <div
                      key={lesson.id}
                      className={`flex flex-col items-center gap-2 transition-transform ${offsetClass}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setActiveLessonPreview(isSelected ? null : lesson);
                        }}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center border-4 border-b-[8px] shadow-md transition active:translate-y-1 ${
                          isDone
                            ? 'bg-amber-400 border-amber-600 text-amber-950'
                            : lesson.kind === 'pratica'
                              ? 'bg-emerald-500 border-emerald-700 text-white'
                              : 'bg-sky-500 border-sky-700 text-white'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-9 h-9 stroke-[3]" />
                        ) : lesson.kind === 'pratica' ? (
                          <Play className="w-8 h-8 fill-current ml-0.5" />
                        ) : (
                          <BookOpen className="w-8 h-8" />
                        )}
                      </button>

                      <div className="text-center max-w-[220px]">
                        <p className="text-[11px] font-bold text-slate-500">
                          {modInfo.shortLabel} ·{' '}
                          {lesson.kind === 'pratica' ? 'Prática' : 'Saber'}
                        </p>
                        <p
                          className={`text-sm font-extrabold leading-tight ${
                            isDone
                              ? 'text-slate-400 line-through decoration-2 decoration-slate-500'
                              : 'text-slate-900'
                          }`}
                        >
                          {lesson.title}
                        </p>
                        {isDone && (
                          <p className="text-[11px] font-bold text-amber-700 inline-flex items-center gap-1 mt-0.5">
                            <RotateCcw className="w-3 h-3" />
                            <span>Feita · Fazer de novo</span>
                          </p>
                        )}
                        {isCached && (
                          <p className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1 mt-0.5">
                            <WifiOff className="w-3 h-3" />
                            <span>Salvo offline</span>
                          </p>
                        )}
                      </div>

                      {/* Expanded Lesson Launch Card */}
                      {isSelected && (
                        <div className="w-72 sm:w-80 bg-white border-2 border-slate-200 rounded-3xl p-4 shadow-xl space-y-3 text-left z-10">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                            <span>{modInfo.title}</span>
                            <span className="text-amber-600 flex items-center gap-1 tabular-nums">
                              <Sparkles className="w-3.5 h-3.5" />+
                              {lesson.xpReward} XP
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {lesson.subtitle}
                          </p>

                          {isDone && (
                            <p className="text-xs font-semibold text-amber-800">
                              Aula já concluída — você pode fazer de novo grátis para treinar.
                            </p>
                          )}

                          {errorMsg && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-800 space-y-2">
                              <p>{errorMsg}</p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={onOpenAdReward}
                                  className="px-2.5 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-bold"
                                >
                                  Ver vídeo (+1)
                                </button>
                                <button
                                  type="button"
                                  onClick={onOpenStore}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold"
                                >
                                  Loja
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={starting}
                            onClick={() => handleLaunch(lesson)}
                            className="w-full min-h-[46px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700 flex items-center justify-center gap-2 transition"
                          >
                            {starting ? (
                              <span>Preparando aula...</span>
                            ) : isDone ? (
                              <>
                                <RotateCcw className="w-4 h-4" />
                                <span>Fazer de novo (grátis)</span>
                              </>
                            ) : isCached ? (
                              <span>Revisar grátis</span>
                            ) : (
                              <>
                                <span>Começar aula</span>
                                <span className="inline-flex items-center gap-1 text-amber-200">
                                  (-1 <Coins className="w-3.5 h-3.5" />)
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
