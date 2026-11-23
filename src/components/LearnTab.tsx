import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Infinity as InfinityIcon,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  WifiOff,
  X,
} from 'lucide-react';
import { getLessonsBySport, getSportLessonCount } from '../data/curriculumIndex';
import { MODULE_LABELS, SPORTS, SPORTS_BY_ID } from '../data/sportsMeta';
import { getOfflineLessonIds } from '../lib/offlineCache';
import type {
  Lesson,
  LessonLevel,
  LessonModuleType,
  LessonProgress,
  SportId,
} from '../types/sportup';
import { SportMascot } from './SportMascot';

interface LearnTabProps {
  selectedSport: SportId;
  selectedPositions: string[];
  positionsBySport: Partial<Record<SportId, string[]>>;
  onSelectSport: (sportId: SportId, positions?: string[]) => void;
  onUpdatePositions: (positions: string[]) => void;
  progressMap: Record<string, LessonProgress>;
  onStartLesson: (lesson: Lesson) => Promise<void>;
}

const LEVELS: LessonLevel[] = ['Iniciante', 'Intermediário', 'Avançado'];
const MODULES: LessonModuleType[] = [
  'regras',
  'fundamentos',
  'posicoes',
  'taticas',
  'preparacao',
  'cultura',
];
const PAGE_SIZE = 30;

export const LearnTab: React.FC<LearnTabProps> = ({
  selectedSport,
  selectedPositions,
  positionsBySport,
  onSelectSport,
  onUpdatePositions,
  progressMap,
  onStartLesson,
}) => {
  const [trainingMode, setTrainingMode] = useState<'posicoes' | 'todas'>('posicoes');
  const [selectedLevel, setSelectedLevel] = useState<LessonLevel | 'Todos'>('Todos');
  const [selectedModule, setSelectedModule] = useState<LessonModuleType | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeLessonPreview, setActiveLessonPreview] = useState<Lesson | null>(null);
  const [starting, setStarting] = useState(false);

  // Position Picker Modal state (triggered on sport selection or "Alterar posições")
  const [pickerSportId, setPickerSportId] = useState<SportId | null>(null);
  const [draftPositions, setDraftPositions] = useState<string[]>([]);
  const [pickerHint, setPickerHint] = useState<string | null>(null);

  const sport = SPORTS_BY_ID[selectedSport];
  const allLessons = useMemo(
    () => getLessonsBySport(selectedSport),
    [selectedSport]
  );
  const offlineIds = useMemo(() => getOfflineLessonIds(), [progressMap]);

  const effectivePositions = useMemo(() => {
    const validIds = new Set(sport.positions.map((p) => p.id));
    const filtered = selectedPositions.filter((p) => validIds.has(p));
    if (filtered.length > 0) return filtered.slice(0, 3);
    return [sport.positions[0].id];
  }, [sport, selectedPositions]);

  const selectedPosLabels = useMemo(
    () =>
      effectivePositions
        .map((id) => sport.positions.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[],
    [sport, effectivePositions]
  );

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setActiveLessonPreview(null);
  }, [selectedSport, trainingMode, selectedLevel, selectedModule, searchTerm, effectivePositions]);

  const completedInSport = useMemo(
    () => allLessons.filter((l) => progressMap[l.id]?.completed).length,
    [allLessons, progressMap]
  );

  const filteredLessons = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const posSet = new Set(effectivePositions);
    const totalSportPositions = sport.positions.length;

    const list = allLessons.filter((lesson) => {
      if (selectedLevel !== 'Todos' && lesson.level !== selectedLevel) {
        return false;
      }
      if (selectedModule !== 'Todos' && lesson.moduleType !== selectedModule) {
        return false;
      }
      if (trainingMode === 'posicoes') {
        const targets = lesson.targetPositions ?? [];
        if (targets.length > 0 && !targets.some((t) => posSet.has(t))) {
          return false;
        }
      }
      if (query) {
        const hay = `${lesson.title} ${lesson.subtitle} ${lesson.unitTitle ?? ''} ${lesson.simpleTip ?? ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (trainingMode === 'posicoes') {
      // Prioritize position-specific lessons first within each level, keeping order otherwise
      const levelRank: Record<LessonLevel, number> = {
        Iniciante: 0,
        Intermediário: 1,
        Avançado: 2,
      };
      return [...list].sort((a, b) => {
        const lvlDiff = levelRank[a.level] - levelRank[b.level];
        if (lvlDiff !== 0) return lvlDiff;

        const aTargets = a.targetPositions ?? [];
        const bTargets = b.targetPositions ?? [];
        const aSpec =
          aTargets.length > 0 &&
          aTargets.length < totalSportPositions &&
          aTargets.some((t) => posSet.has(t));
        const bSpec =
          bTargets.length > 0 &&
          bTargets.length < totalSportPositions &&
          bTargets.some((t) => posSet.has(t));
        if (aSpec !== bSpec) return aSpec ? -1 : 1;
        return a.order - b.order;
      });
    }

    return list;
  }, [
    allLessons,
    effectivePositions,
    sport.positions.length,
    trainingMode,
    selectedLevel,
    selectedModule,
    searchTerm,
  ]);

  const visibleLessons = useMemo(
    () => filteredLessons.slice(0, visibleCount),
    [filteredLessons, visibleCount]
  );

  const openPositionPicker = (targetSportId: SportId) => {
    const targetMeta = SPORTS_BY_ID[targetSportId];
    const validIds = new Set(targetMeta.positions.map((p) => p.id));
    const saved =
      targetSportId === selectedSport
        ? effectivePositions
        : (positionsBySport[targetSportId] ?? []).filter((id) => validIds.has(id));

    setDraftPositions(saved.length > 0 ? saved.slice(0, 3) : []);
    setPickerHint(null);
    setPickerSportId(targetSportId);
  };

  const toggleDraftPosition = (posId: string) => {
    setPickerHint(null);
    setDraftPositions((prev) => {
      if (prev.includes(posId)) {
        return prev.filter((id) => id !== posId);
      }
      if (prev.length >= 3) {
        setPickerHint(
          'Limite de 3 posições! Toque em uma marcada se quiser trocar.'
        );
        return prev;
      }
      return [...prev, posId];
    });
  };

  const confirmPositionPicker = () => {
    if (!pickerSportId || draftPositions.length === 0) {
      setPickerHint('Escolha pelo menos 1 posição (ou até 3) para continuar.');
      return;
    }
    if (pickerSportId === selectedSport) {
      onUpdatePositions(draftPositions);
    } else {
      onSelectSport(pickerSportId, draftPositions);
    }
    setPickerSportId(null);
  };

  const handleLaunch = async (lesson: Lesson) => {
    setStarting(true);
    try {
      await onStartLesson(lesson);
      setActiveLessonPreview(null);
    } finally {
      setStarting(false);
    }
  };

  const pickerSportMeta = pickerSportId ? SPORTS_BY_ID[pickerSportId] : null;

  return (
    <div className="space-y-5 pb-8">
      {/* Sport Switcher */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold text-slate-500">
            1. Escolha o esporte e depois até 3 posições
          </h2>
          <span className="text-xs font-bold text-emerald-700 tabular-nums">
            {completedInSport}/{allLessons.length} concluídas
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {SPORTS.map((s) => {
            const active = s.id === selectedSport;
            const totalCount = getSportLessonCount(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => openPositionPicker(s.id)}
                className={`min-h-[44px] px-4 py-2 rounded-2xl font-bold text-sm border-2 border-b-4 whitespace-nowrap shrink-0 flex items-center gap-2 transition ${
                  active
                    ? 'bg-emerald-500 border-emerald-700 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{s.name}</span>
                <span
                  className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-lg tabular-nums ${
                    active
                      ? 'bg-emerald-700/40 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {totalCount}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sport + Position Training Banner */}
      <section className="bg-white border-2 border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
              <InfinityIcon className="w-3.5 h-3.5" />
              <span>{allLessons.length} aulas liberadas · assista quanto quiser</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 pt-1">
              {sport.name} explicado fácil
            </h1>
            <p className="text-sm text-slate-600">{sport.tagline}</p>
          </div>

          <SportMascot
            size="md"
            mood="happy"
            message={`Treino focado em ${selectedPosLabels.join(' + ')}! Todas as aulas são grátis para assistir quantas vezes quiser.`}
          />
        </div>

        {/* Selected Positions Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 inline-flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              Suas posições ({selectedPosLabels.length}/3):
            </span>
            {selectedPosLabels.map((label) => (
              <span
                key={label}
                className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold"
              >
                {label}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openPositionPicker(selectedSport)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Trocar posições (1 a 3)</span>
          </button>
        </div>
      </section>

      {/* Training Mode Toggle (Position-based vs All 756) */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-2xl">
        <button
          type="button"
          onClick={() => setTrainingMode('posicoes')}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition ${
            trainingMode === 'posicoes'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Treino das minhas posições
        </button>
        <button
          type="button"
          onClick={() => setTrainingMode('todas')}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition ${
            trainingMode === 'todas'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Todas as {allLessons.length} aulas
        </button>
      </div>

      {/* Search + Level + Module Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Buscar jogada, regra ou fundamento de ${sport.name}...`}
            className="w-full min-h-[44px] pl-10 pr-10 rounded-2xl bg-white border-2 border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl overflow-x-auto">
          {(['Todos', ...LEVELS] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedLevel === lvl
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Module Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedModule('Todos')}
            className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition ${
              selectedModule === 'Todos'
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            Tudo ({filteredLessons.length})
          </button>
          {MODULES.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setSelectedModule(mod)}
              className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition ${
                selectedModule === mod
                  ? 'bg-emerald-600 border-emerald-700 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {MODULE_LABELS[mod].shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
        <span>
          Mostrando {visibleLessons.length} de {filteredLessons.length} aulas
        </span>
        {trainingMode === 'posicoes' && (
          <span className="text-emerald-700">
            Ordenado para {selectedPosLabels.join(', ')}
          </span>
        )}
      </div>

      {/* Winding Duolingo-Style Path */}
      {visibleLessons.length === 0 ? (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 text-center space-y-3">
          <p className="text-base font-extrabold text-slate-900">
            Nenhuma aula encontrada com esses filtros
          </p>
          <p className="text-xs text-slate-600">
            Limpe a busca ou mude para &ldquo;Todas as {allLessons.length} aulas&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedLevel('Todos');
              setSelectedModule('Todos');
            }}
            className="min-h-[42px] px-4 py-2 rounded-2xl bg-emerald-500 text-white font-bold text-xs border-b-4 border-emerald-700"
          >
            Mostrar todas
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 pt-2">
          {visibleLessons.map((lesson, idx) => {
            const isDone = Boolean(progressMap[lesson.id]?.completed);
            const isCached = offlineIds.has(lesson.id);
            const isSelected = activeLessonPreview?.id === lesson.id;
            const modInfo = MODULE_LABELS[lesson.moduleType];
            const prevUnit = idx > 0 ? visibleLessons[idx - 1].unitTitle : null;
            const showUnitHeader = lesson.unitTitle && lesson.unitTitle !== prevUnit;

            const targets = lesson.targetPositions ?? [];
            const isPositionFocus =
              targets.length > 0 &&
              targets.length < sport.positions.length &&
              effectivePositions.some((p) => targets.includes(p));

            const offsetClass =
              idx % 3 === 1
                ? 'translate-x-8 sm:translate-x-12'
                : idx % 3 === 2
                  ? '-translate-x-8 sm:-translate-x-12'
                  : '';

            return (
              <React.Fragment key={lesson.id}>
                {showUnitHeader && (
                  <div className="w-full flex items-center gap-3 pt-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-extrabold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-1 text-center">
                      {lesson.unitTitle}
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                )}

                <div
                  className={`flex flex-col items-center gap-2 transition-transform ${offsetClass}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveLessonPreview(isSelected ? null : lesson)
                    }
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

                  <div className="text-center max-w-[235px]">
                    <p className="text-[11px] font-bold text-slate-500">
                      {modInfo.shortLabel} ·{' '}
                      {lesson.kind === 'pratica' ? 'Prática' : 'Saber'} ·{' '}
                      {lesson.level}
                    </p>
                    <p
                      className={`text-sm font-extrabold leading-tight ${
                        isDone
                          ? 'text-slate-500'
                          : 'text-slate-900'
                      }`}
                    >
                      {lesson.title}
                    </p>
                    {isPositionFocus && (
                      <p className="text-[11px] font-extrabold text-emerald-700 mt-0.5">
                        Foco na sua posição
                      </p>
                    )}
                    {isDone && (
                      <p className="text-[11px] font-bold text-amber-700 inline-flex items-center gap-1 mt-0.5">
                        <RotateCcw className="w-3 h-3" />
                        <span>Concluída · Assistir de novo</span>
                      </p>
                    )}
                    {isCached && (
                      <p className="text-[11px] font-semibold text-sky-700 inline-flex items-center gap-1 mt-0.5 ml-2">
                        <WifiOff className="w-3 h-3" />
                        <span>Offline</span>
                      </p>
                    )}
                  </div>

                  {/* Expanded Lesson Launch Card */}
                  {isSelected && (
                    <div className="w-72 sm:w-80 bg-white border-2 border-slate-200 rounded-3xl p-4 shadow-xl space-y-3 text-left z-10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>{modInfo.title}</span>
                        <span className="text-amber-600 flex items-center gap-1 tabular-nums">
                          <Sparkles className="w-3.5 h-3.5" />+{lesson.xpReward} XP
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {lesson.subtitle}
                      </p>

                      {lesson.simpleTip && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-950 font-semibold">
                          Dica simples: {lesson.simpleTip}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={starting}
                        onClick={() => handleLaunch(lesson)}
                        className="w-full min-h-[46px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700 flex items-center justify-center gap-2 transition"
                      >
                        {starting ? (
                          <span>Abrindo aula...</span>
                        ) : isDone ? (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            <span>Assistir de novo (ilimitado)</span>
                          </>
                        ) : (
                          <span>
                            {lesson.kind === 'pratica'
                              ? 'Praticar jogada grátis'
                              : 'Assistir aula grátis'}
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {visibleCount < filteredLessons.length && (
            <div className="pt-4 w-full max-w-sm">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full min-h-[48px] rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-300 border-b-4 text-slate-800 font-extrabold text-sm transition"
              >
                Carregar mais{' '}
                {Math.min(PAGE_SIZE, filteredLessons.length - visibleCount)}{' '}
                aulas ({filteredLessons.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Position Picker Modal (After selecting sport or clicking "Trocar posições") */}
      {pickerSportMeta && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[88vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-emerald-700">
                  Treino de {pickerSportMeta.name}
                </p>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Escolha de 1 até 3 posições
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Pode escolher só <strong>1 posição</strong>, <strong>2</strong> ou até <strong>3</strong>! As aulas do seu treino vão priorizar o que você marcar.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar escolha de posição"
                onClick={() => setPickerSportId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-slate-500">
                Toque para marcar ou desmarcar:
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 tabular-nums">
                {draftPositions.length} de 3 selecionadas
              </span>
            </div>

            {pickerHint && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs font-bold text-amber-900">
                {pickerHint}
              </div>
            )}

            <div className="space-y-2.5">
              {pickerSportMeta.positions.map((pos) => {
                const orderIdx = draftPositions.indexOf(pos.id);
                const isSel = orderIdx !== -1;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => toggleDraftPosition(pos.id)}
                    className={`w-full text-left rounded-2xl border-2 border-b-4 p-3.5 flex items-center gap-3 transition ${
                      isSel
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${
                        isSel
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isSel ? `${orderIdx + 1}ª` : '+'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">
                        {pos.name}
                      </p>
                      <p className="text-xs text-slate-600 leading-snug">
                        {pos.shortRole}
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSel
                          ? 'bg-emerald-500 border-emerald-600 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPickerSportId(null)}
                className="px-4 min-h-[46px] rounded-2xl bg-white border-2 border-slate-300 text-slate-700 font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={draftPositions.length === 0}
                onClick={confirmPositionPicker}
                className="flex-1 min-h-[46px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-500 text-white font-extrabold text-sm border-b-4 border-emerald-700 transition"
              >
                {draftPositions.length === 0
                  ? 'Escolha 1, 2 ou 3 posições'
                  : `Treinar ${pickerSportMeta.name} (${draftPositions.length} ${draftPositions.length === 1 ? 'posição' : 'posições'})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
