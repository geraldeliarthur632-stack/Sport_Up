import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Flame,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import { SPORTS_BY_ID } from '../data/sportsMeta';
import { saveLessonForOffline } from '../lib/offlineCache';
import type { Lesson, QuizQuestion } from '../types/sportup';
import { AnimatedPracticeStage } from './AnimatedPracticeStage';
import { CourtPositionPicker } from './CourtPositionPicker';
import { SportMascot } from './SportMascot';

interface LessonPlayerModalProps {
  lesson: Lesson;
  currentStreak: number;
  onClose: () => void;
  onComplete: (result: {
    lesson: Lesson;
    scorePercent: number;
    xpEarned: number;
  }) => Promise<void>;
}

function deterministicShuffle<T>(arr: T[], seedStr: string): T[] {
  const copy = [...arr];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 9973;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 17 + 13) % 9973;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const LessonPlayerModal: React.FC<LessonPlayerModalProps> = ({
  lesson,
  currentStreak,
  onClose,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'learn' | 'quiz' | 'summary'>('learn');
  const [slideIdx, setSlideIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);

  // Quiz answer states
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [orderedSteps, setOrderedSteps] = useState<string[]>([]);
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const sport = SPORTS_BY_ID[lesson.sportId];
  const slides = lesson.theorySlides ?? [];
  const currentQuestion: QuizQuestion | undefined = lesson.questions[qIdx];

  // Cache lesson immediately on open for offline access
  useEffect(() => {
    saveLessonForOffline(lesson);
  }, [lesson]);

  // Reset question state when moving to next question
  useEffect(() => {
    if (!currentQuestion) return;
    setSelectedOption(null);
    setActiveLeft(null);
    setMatchedPairs({});
    setSelectedZoneId(null);
    setChecked(false);
    setIsCorrect(false);

    if (
      currentQuestion.kind === 'order_steps' &&
      currentQuestion.stepsCorrectOrder
    ) {
      const shuffled = deterministicShuffle(
        currentQuestion.stepsCorrectOrder,
        currentQuestion.id
      );
      // Ensure not already identical if possible
      if (
        shuffled.length > 1 &&
        shuffled.every((s, idx) => s === currentQuestion.stepsCorrectOrder?.[idx])
      ) {
        [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
      }
      setOrderedSteps(shuffled);
    } else {
      setOrderedSteps([]);
    }
  }, [currentQuestion]);

  const shuffledRightPairs = useMemo(() => {
    if (currentQuestion?.kind !== 'match_columns' || !currentQuestion.pairs) {
      return [];
    }
    return deterministicShuffle(
      currentQuestion.pairs.map((p) => p.right),
      `${currentQuestion.id}_right`
    );
  }, [currentQuestion]);

  const totalSteps =
    (lesson.kind === 'teorica' ? Math.max(slides.length, 1) : 1) +
    lesson.questions.length;
  const completedSteps =
    phase === 'learn'
      ? lesson.kind === 'teorica'
        ? slideIdx
        : 0
      : phase === 'quiz'
        ? (lesson.kind === 'teorica' ? Math.max(slides.length, 1) : 1) + qIdx
        : totalSteps;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const canCheck = useMemo(() => {
    if (!currentQuestion) return false;
    switch (currentQuestion.kind) {
      case 'multiple_choice':
      case 'true_false':
        return selectedOption !== null;
      case 'order_steps':
        return orderedSteps.length > 0;
      case 'match_columns':
        return (
          Object.keys(matchedPairs).length ===
          (currentQuestion.pairs?.length ?? 0)
        );
      case 'pick_position':
        return selectedZoneId !== null;
    }
  }, [
    currentQuestion,
    selectedOption,
    orderedSteps,
    matchedPairs,
    selectedZoneId,
  ]);

  const handleCheckAnswer = () => {
    if (!currentQuestion || checked) return;
    let hit = false;

    if (
      currentQuestion.kind === 'multiple_choice' ||
      currentQuestion.kind === 'true_false'
    ) {
      hit = selectedOption === currentQuestion.correctIndex;
    } else if (currentQuestion.kind === 'order_steps') {
      hit = orderedSteps.every(
        (step, idx) => step === currentQuestion.stepsCorrectOrder?.[idx]
      );
    } else if (currentQuestion.kind === 'match_columns') {
      hit = (currentQuestion.pairs ?? []).every(
        (pair) => matchedPairs[pair.left] === pair.right
      );
    } else if (currentQuestion.kind === 'pick_position') {
      hit = selectedZoneId === currentQuestion.correctZoneId;
    }

    setIsCorrect(hit);
    setChecked(true);
    if (hit) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleContinueQuiz = async () => {
    if (qIdx + 1 < lesson.questions.length) {
      setQIdx((i) => i + 1);
      return;
    }

    const totalQ = Math.max(lesson.questions.length, 1);
    const scorePercent = Math.round((correctCount / totalQ) * 100);
    const xpEarned = Math.max(
      15,
      Math.round(lesson.xpReward * (0.4 + 0.6 * (correctCount / totalQ)))
    );

    setPhase('summary');
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setSaving(true);
    try {
      await onComplete({ lesson, scorePercent, xpEarned });
    } finally {
      setSaving(false);
    }
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    if (checked) return;
    const target = index + dir;
    if (target < 0 || target >= orderedSteps.length) return;
    const copy = [...orderedSteps];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setOrderedSteps(copy);
  };

  const handleSelectPairRight = (rightItem: string) => {
    if (checked || !activeLeft) return;
    setMatchedPairs((prev) => {
      const next = { ...prev };
      // Remove any previous link pointing to rightItem
      for (const [k, v] of Object.entries(next)) {
        if (v === rightItem) delete next[k];
      }
      next[activeLeft] = rightItem;
      return next;
    });
    setActiveLeft(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F9FA] flex flex-col overflow-hidden">
      {/* Header Progress */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar aula"
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-transform duration-300 origin-left"
              style={{ width: `${Math.max(progressPercent, 8)}%` }}
            />
          </div>

          <span className="text-xs font-bold text-slate-600 whitespace-nowrap shrink-0 tabular-nums">
            {lesson.kind === 'pratica' ? 'Prática' : 'Saber'} · +{lesson.xpReward} XP
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {phase === 'learn' && (
            <>
              <div>
                <p className="text-xs font-bold text-emerald-700">
                  {sport.name} · {lesson.level}
                </p>
                <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                  {lesson.title}
                </h1>
                <p className="text-sm text-slate-600 mt-1">{lesson.subtitle}</p>
              </div>

              {lesson.kind === 'pratica' && lesson.practiceSteps ? (
                <AnimatedPracticeStage
                  sportId={lesson.sportId}
                  steps={lesson.practiceSteps}
                />
              ) : (
                slides[slideIdx] && (
                  <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900">
                      {slides[slideIdx].title}
                    </h2>
                    <p className="text-base text-slate-700 leading-relaxed">
                      {slides[slideIdx].body}
                    </p>

                    {slides[slideIdx].imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img
                          src={slides[slideIdx].imageUrl}
                          alt={slides[slideIdx].title}
                          referrerPolicy="no-referrer"
                          className="w-full h-48 sm:h-60 object-cover"
                        />
                      </div>
                    )}

                    {slides[slideIdx].diagramType === 'positions_map' && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500">
                          Esquema de posições em {sport.name}:
                        </p>
                        <CourtPositionPicker
                          sportId={sport.id}
                          zones={sport.positions.map((p) => ({
                            id: p.id,
                            label: p.name,
                            x: p.zoneX,
                            y: p.zoneY,
                          }))}
                          selectedZoneId={null}
                          onSelect={() => {}}
                        />
                      </div>
                    )}

                    {slides[slideIdx].highlight && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3.5 text-sm font-semibold text-amber-900">
                        {slides[slideIdx].highlight}
                      </div>
                    )}

                    {slides[slideIdx].bulletPoints && (
                      <ul className="space-y-2 pt-1">
                        {slides[slideIdx].bulletPoints.map((bp, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-slate-700"
                          >
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>{bp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              )}
            </>
          )}

          {phase === 'quiz' && currentQuestion && (
            <div className="space-y-5">
              <SportMascot
                size="sm"
                mood={checked ? (isCorrect ? 'cheer' : 'thinking') : 'happy'}
                message={
                  checked
                    ? isCorrect
                      ? 'Mandou bem! Ponto garantido!'
                      : 'Quase lá! Veja a explicação abaixo para fixar.'
                    : `Pergunta ${qIdx + 1} de ${lesson.questions.length}`
                }
              />

              <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                {currentQuestion.prompt}
              </h2>

              {/* 1 & 2: Multiple Choice / True-False */}
              {(currentQuestion.kind === 'multiple_choice' ||
                currentQuestion.kind === 'true_false') &&
                currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, idx) => {
                      const isSel = selectedOption === idx;
                      const isRightOpt =
                        checked && currentQuestion.correctIndex === idx;
                      const isWrongOpt =
                        checked && isSel && currentQuestion.correctIndex !== idx;

                      let cls =
                        'bg-white border-slate-200 text-slate-800 hover:border-sky-400';
                      if (isRightOpt) {
                        cls = 'bg-emerald-50 border-emerald-500 text-emerald-900';
                      } else if (isWrongOpt) {
                        cls = 'bg-rose-50 border-rose-500 text-rose-900 animate-shake';
                      } else if (isSel) {
                        cls = 'bg-sky-50 border-sky-500 text-sky-900';
                      }

                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={checked}
                          onClick={() => setSelectedOption(idx)}
                          className={`w-full min-h-[56px] px-4 py-3.5 rounded-2xl border-2 border-b-4 text-left font-semibold text-sm sm:text-base flex items-center gap-3 transition ${cls}`}
                        >
                          <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

              {/* 3: Order Steps */}
              {currentQuestion.kind === 'order_steps' && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-500">
                    Use as setas para colocar os passos na ordem certa (do 1º ao último):
                  </p>
                  {orderedSteps.map((step, idx) => (
                    <div
                      key={step}
                      className={`bg-white border-2 border-b-4 rounded-2xl px-4 py-3 flex items-center gap-3 ${
                        checked
                          ? step === currentQuestion.stepsCorrectOrder?.[idx]
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-rose-400 bg-rose-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}º
                      </span>
                      <span className="flex-1 text-sm font-semibold text-slate-800">
                        {step}
                      </span>
                      {!checked && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveStep(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Mover para cima"
                            className="min-w-[36px] min-h-[36px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(idx, 1)}
                            disabled={idx === orderedSteps.length - 1}
                            aria-label="Mover para baixo"
                            className="min-w-[36px] min-h-[36px] rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 hover:bg-slate-100"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 4: Match Columns */}
              {currentQuestion.kind === 'match_columns' &&
                currentQuestion.pairs && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Toque em um item à esquerda e depois no correspondente à direita:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        {currentQuestion.pairs.map((p, idx) => {
                          const linkedRight = matchedPairs[p.left];
                          const isSelected = activeLeft === p.left;
                          const pairOk =
                            checked && linkedRight === p.right;
                          const pairBad =
                            checked && linkedRight !== p.right;

                          return (
                            <button
                              key={p.left}
                              type="button"
                              disabled={checked}
                              onClick={() => setActiveLeft(p.left)}
                              className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-2xl border-2 border-b-4 text-left text-sm font-bold transition ${
                                pairOk
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                  : pairBad
                                    ? 'bg-rose-50 border-rose-500 text-rose-900'
                                    : isSelected
                                      ? 'bg-sky-500 border-sky-700 text-white'
                                      : linkedRight
                                        ? 'bg-sky-50 border-sky-300 text-sky-900'
                                        : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <span className="text-xs opacity-70 mr-1.5 tabular-nums">
                                {idx + 1}.
                              </span>
                              {p.left}
                              {linkedRight && (
                                <span className="block text-[11px] font-medium mt-0.5 opacity-80 truncate">
                                  → {linkedRight}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        {shuffledRightPairs.map((rightItem) => {
                          const linkedLeft = Object.entries(matchedPairs).find(
                            ([, v]) => v === rightItem
                          )?.[0];

                          return (
                            <button
                              key={rightItem}
                              type="button"
                              disabled={checked || !activeLeft}
                              onClick={() => handleSelectPairRight(rightItem)}
                              className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-2xl border-2 border-b-4 text-left text-sm font-semibold transition ${
                                linkedLeft
                                  ? 'bg-sky-50 border-sky-300 text-sky-900'
                                  : activeLeft
                                    ? 'bg-white border-sky-400 text-slate-800 hover:bg-sky-50'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              {rightItem}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              {/* 5: Pick Position */}
              {currentQuestion.kind === 'pick_position' &&
                currentQuestion.positionZones && (
                  <CourtPositionPicker
                    sportId={currentQuestion.courtSport ?? lesson.sportId}
                    zones={currentQuestion.positionZones}
                    selectedZoneId={selectedZoneId}
                    correctZoneId={currentQuestion.correctZoneId}
                    showResult={checked}
                    onSelect={(id) => setSelectedZoneId(id)}
                  />
                )}
            </div>
          )}

          {phase === 'summary' && (
            <div className="py-6 text-center space-y-6">
              <div className="flex justify-center">
                <SportMascot size="lg" mood="cheer" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-900">
                  Aula concluída!
                </h2>
                <p className="text-slate-600 text-sm">
                  Você finalizou <strong>{lesson.title}</strong> e a aula já está salva para acesso offline.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border-2 border-amber-200 rounded-2xl p-4">
                  <Sparkles className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    +
                    {Math.max(
                      15,
                      Math.round(
                        lesson.xpReward *
                          (0.4 +
                            0.6 *
                              (correctCount /
                                Math.max(lesson.questions.length, 1)))
                      )
                    )}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">XP ganho</p>
                </div>

                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4">
                  <Trophy className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    {Math.round(
                      (correctCount / Math.max(lesson.questions.length, 1)) * 100
                    )}
                    %
                  </p>
                  <p className="text-xs font-semibold text-slate-500">Precisão</p>
                </div>

                <div className="bg-white border-2 border-orange-200 rounded-2xl p-4">
                  <Flame className="w-6 h-6 text-orange-500 mx-auto" />
                  <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    {Math.max(currentStreak, 1)}d
                  </p>
                  <p className="text-xs font-semibold text-slate-500">Sequência</p>
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="w-full min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-base border-b-4 border-emerald-700 transition"
              >
                {saving ? 'Salvando progresso...' : 'Voltar para a trilha'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Action Footer */}
      {phase !== 'summary' && (
        <footer
          className={`shrink-0 border-t-2 px-4 py-4 transition-colors ${
            checked
              ? isCorrect
                ? 'bg-[#D7FFB8] border-emerald-300'
                : 'bg-[#FFDFE0] border-rose-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="max-w-2xl mx-auto space-y-3">
            {checked && currentQuestion && (
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-extrabold text-base ${
                      isCorrect ? 'text-emerald-900' : 'text-rose-900'
                    }`}
                  >
                    {isCorrect ? 'Excelente! Resposta certa' : 'Ops! Atenção à regra'}
                  </p>
                  <p
                    className={`text-sm mt-0.5 leading-snug ${
                      isCorrect ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            )}

            {phase === 'learn' ? (
              <div className="flex items-center gap-3">
                {lesson.kind === 'teorica' && slides.length > 1 && slideIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setSlideIdx((s) => s - 1)}
                    className="min-h-[48px] px-5 rounded-2xl bg-white border-2 border-slate-300 border-b-4 font-bold text-sm text-slate-700"
                  >
                    Anterior
                  </button>
                )}

                {lesson.kind === 'teorica' && slideIdx + 1 < slides.length ? (
                  <button
                    type="button"
                    onClick={() => setSlideIdx((s) => s + 1)}
                    className="flex-1 min-h-[48px] rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm border-b-4 border-sky-700 transition"
                  >
                    Próximo card
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhase('quiz')}
                    className="flex-1 min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-base border-b-4 border-emerald-700 transition"
                  >
                    Ir para o desafio ({lesson.questions.length} perguntas)
                  </button>
                )}
              </div>
            ) : !checked ? (
              <button
                type="button"
                disabled={!canCheck}
                onClick={handleCheckAnswer}
                className="w-full min-h-[50px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 text-white font-extrabold text-base border-b-4 border-emerald-700 transition"
              >
                Verificar resposta
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContinueQuiz}
                className={`w-full min-h-[50px] rounded-2xl font-extrabold text-base text-white border-b-4 transition ${
                  isCorrect
                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-800'
                    : 'bg-rose-600 hover:bg-rose-700 border-rose-800'
                }`}
              >
                {qIdx + 1 < lesson.questions.length
                  ? 'Continuar'
                  : 'Concluir aula'}
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};
