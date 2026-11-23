import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Square,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { SPORTS_BY_ID } from '../data/sportsMeta';
import type {
  MatchEvent,
  MatchEventKind,
  SportId,
  Team,
  TeamMember,
} from '../types/sportup';

interface LiveMatchModalProps {
  team: Team;
  members: TeamMember[];
  onClose: () => void;
  onFinishSave: (payload: {
    opponent: string;
    teamScore: number;
    opponentScore: number;
    location: string;
    durationMinutes: number;
    hasHalftime: boolean;
    teamFouls: number;
    opponentFouls: number;
    teamPenalties: number;
    opponentPenalties: number;
    yellowCards: number;
    redCards: number;
    setScores: string[];
    events: MatchEvent[];
  }) => Promise<void>;
}

const DEFAULT_DURATION_BY_SPORT: Record<SportId, number> = {
  futsal: 40,
  futebol: 90,
  volei: 60,
  basquete: 40,
  pingpong: 25,
};

const PERIOD_LABELS_BY_SPORT: Record<
  SportId,
  { withHalftime: string[]; withoutHalftime: string[] }
> = {
  futsal: {
    withHalftime: ['1º Tempo', 'Intervalo', '2º Tempo'],
    withoutHalftime: ['Tempo Único'],
  },
  futebol: {
    withHalftime: ['1º Tempo', 'Intervalo', '2º Tempo'],
    withoutHalftime: ['Tempo Único'],
  },
  basquete: {
    withHalftime: ['1º Quarto', '2º Quarto', 'Intervalo', '3º Quarto', '4º Quarto'],
    withoutHalftime: ['1º Tempo', '2º Tempo'],
  },
  volei: {
    withHalftime: ['1º Set', 'Intervalo', '2º Set', '3º Set', '4º Set', 'Tie-Break'],
    withoutHalftime: ['1º Set', '2º Set', '3º Set', '4º Set', 'Tie-Break'],
  },
  pingpong: {
    withHalftime: ['1º Set', 'Intervalo', '2º Set', '3º Set', '4º Set', '5º Set'],
    withoutHalftime: ['1º Set', '2º Set', '3º Set', '4º Set', '5º Set'],
  },
};

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LiveMatchModal: React.FC<LiveMatchModalProps> = ({
  team,
  members,
  onClose,
  onFinishSave,
}) => {
  const sport = SPORTS_BY_ID[team.sportId];
  const players = members.filter((m) => m.role === 'player');
  const isSetSport = team.sportId === 'volei' || team.sportId === 'pingpong';

  // Setup vs Active Live Match
  const [phase, setPhase] = useState<'setup' | 'live'>('setup');
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(
    DEFAULT_DURATION_BY_SPORT[team.sportId]
  );
  const [hasHalftime, setHasHalftime] = useState(true);

  // Live Scoreboard State
  const [teamScore, setTeamScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [setScores, setSetScores] = useState<string[]>([]);
  const [remainingSec, setRemainingSec] = useState(durationMinutes * 60);
  const [running, setRunning] = useState(false);
  const [periodIndex, setPeriodIndex] = useState(0);

  // Event & Disciplinary State (all 5 sports!)
  const [eventSide, setEventSide] = useState<'team' | 'opponent'>('team');
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const periods = hasHalftime
    ? PERIOD_LABELS_BY_SPORT[team.sportId].withHalftime
    : PERIOD_LABELS_BY_SPORT[team.sportId].withoutHalftime;
  const currentPeriodLabel = periods[Math.min(periodIndex, periods.length - 1)];

  useEffect(() => {
    if (phase !== 'live' || !running) return;
    const id = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, running]);

  const startLiveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim()) return;
    setRemainingSec(Math.max(1, durationMinutes) * 60);
    setPeriodIndex(0);
    setPhase('live');
    setRunning(true);
  };

  const elapsedSeconds = Math.max(0, durationMinutes * 60 - remainingSec);
  const currentMinuteLabel = `${Math.max(1, Math.ceil(elapsedSeconds / 60))}'`;

  const recordEvent = (
    kind: MatchEventKind,
    scoreDelta = 0,
    note?: string
  ) => {
    const evt: MatchEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind,
      side: eventSide,
      minuteLabel: currentMinuteLabel,
      periodLabel: currentPeriodLabel,
      playerName:
        eventSide === 'team' && selectedPlayerName ? selectedPlayerName : undefined,
      note,
    };
    setEvents((prev) => [evt, ...prev]);

    if (scoreDelta !== 0) {
      if (eventSide === 'team') {
        setTeamScore((s) => Math.max(0, s + scoreDelta));
      } else {
        setOpponentScore((s) => Math.max(0, s + scoreDelta));
      }
    }
  };

  const closeCurrentSet = () => {
    if (!isSetSport) return;
    const summary = `${teamScore}-${opponentScore}`;
    setSetScores((prev) => [...prev, summary]);
    setTeamScore(0);
    setOpponentScore(0);
    setPeriodIndex((i) => Math.min(periods.length - 1, i + 1));
  };

  const teamFouls = events.filter(
    (e) => e.kind === 'foul' && e.side === 'team'
  ).length;
  const opponentFouls = events.filter(
    (e) => e.kind === 'foul' && e.side === 'opponent'
  ).length;
  const teamPenalties = events.filter(
    (e) =>
      (e.kind === 'penalty_scored' || e.kind === 'penalty_missed') &&
      e.side === 'team'
  ).length;
  const opponentPenalties = events.filter(
    (e) =>
      (e.kind === 'penalty_scored' || e.kind === 'penalty_missed') &&
      e.side === 'opponent'
  ).length;
  const yellowCards = events.filter((e) => e.kind === 'yellow_card').length;
  const redCards = events.filter((e) => e.kind === 'red_card').length;

  const eventLabel = (kind: MatchEventKind): string => {
    switch (kind) {
      case 'goal_point':
        return team.sportId === 'basquete'
          ? 'Cesta / Ponto'
          : isSetSport
            ? 'Ponto'
            : 'Gol';
      case 'foul':
        return 'Falta';
      case 'penalty_scored':
        return isSetSport || team.sportId === 'basquete'
          ? 'Pênalti / Penalidade (Convertido)'
          : 'Pênalti Convertido';
      case 'penalty_missed':
        return isSetSport || team.sportId === 'basquete'
          ? 'Pênalti / Penalidade (Perdido)'
          : 'Pênalti Perdido';
      case 'yellow_card':
        return 'Cartão Amarelo';
      case 'red_card':
        return 'Cartão Vermelho';
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // If a set sport had closed sets, store final score as sets won (or current points if single set)
      let finalTeamScore = teamScore;
      let finalOppScore = opponentScore;
      const finalSetScores = [...setScores];
      if (isSetSport && finalSetScores.length > 0) {
        if (teamScore > 0 || opponentScore > 0) {
          finalSetScores.push(`${teamScore}-${opponentScore}`);
        }
        let tSets = 0;
        let oSets = 0;
        finalSetScores.forEach((pair) => {
          const [a, b] = pair.split('-').map(Number);
          if (a > b) tSets += 1;
          else if (b > a) oSets += 1;
        });
        finalTeamScore = tSets;
        finalOppScore = oSets;
      }

      await onFinishSave({
        opponent: opponent.trim(),
        teamScore: finalTeamScore,
        opponentScore: finalOppScore,
        location: location.trim(),
        durationMinutes,
        hasHalftime,
        teamFouls,
        opponentFouls,
        teamPenalties,
        opponentPenalties,
        yellowCards,
        redCards,
        setScores: finalSetScores,
        events,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 shadow-2xl border-2 border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
              Partida Ao Vivo · {sport.name}
            </p>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {phase === 'setup'
                ? 'Configurar tempo e intervalo'
                : `${team.name} vs ${opponent}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'setup' ? (
          <form onSubmit={startLiveMatch} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                Nome do adversário
              </label>
              <input
                type="text"
                required
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder={`Ex: ${sport.name} Clube`}
                className="w-full min-h-[44px] px-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                  Tempo que acaba a partida (minutos)
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  required
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-extrabold tabular-nums"
                />
                <div className="flex gap-1.5 mt-1.5">
                  {[15, 30, 40, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMinutes(m)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                        durationMinutes === m
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                  Vai ter intervalo?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHasHalftime(true)}
                    className={`min-h-[44px] rounded-2xl border-2 text-xs font-extrabold ${
                      hasHalftime
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Com intervalo
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasHalftime(false)}
                    className={`min-h-[44px] rounded-2xl border-2 text-xs font-extrabold ${
                      !hasHalftime
                        ? 'bg-sky-50 border-sky-500 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Sem intervalo
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                Local da partida (opcional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Quadra Central"
                className="w-full min-h-[44px] px-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[50px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Partida Ao Vivo</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Timer + Period Bar */}
            <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none tabular-nums">
                    {formatClock(remainingSec)}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {currentPeriodLabel} · {hasHalftime ? 'Com intervalo' : 'Sem intervalo'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRunning((r) => !r)}
                  className={`min-h-[38px] px-3 rounded-xl font-extrabold text-xs flex items-center gap-1 text-white ${
                    running ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                >
                  {running ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Retomar</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPeriodIndex((i) => (i + 1) % periods.length)
                  }
                  className="min-h-[38px] px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  Próx. etapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setRemainingSec(durationMinutes * 60);
                  }}
                  title="Reiniciar relógio"
                  className="min-w-[38px] min-h-[38px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {remainingSec === 0 && (
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3 text-xs font-extrabold text-amber-900 text-center">
                Tempo encerrado! Você pode adicionar acréscimos ou finalizar e salvar a partida.
              </div>
            )}

            {/* Live Scoreboard */}
            <div className="grid grid-cols-3 items-center gap-2 bg-emerald-50/70 dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-800 rounded-3xl p-4 text-center">
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">
                  {team.name}
                </p>
                <p className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {teamScore}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTeamScore((s) => Math.max(0, s - 1))}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamScore((s) => s + 1)}
                    className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-extrabold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {team.sportId === 'basquete' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setTeamScore((s) => s + 2)}
                        className="px-2 h-9 rounded-xl bg-emerald-600 text-white text-xs font-extrabold"
                      >
                        +2
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamScore((s) => s + 3)}
                        className="px-2 h-9 rounded-xl bg-emerald-700 text-white text-xs font-extrabold"
                      >
                        +3
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-extrabold text-slate-400">VS</span>
                {isSetSport && (
                  <div className="space-y-1">
                    {setScores.length > 0 && (
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                        Sets: {setScores.join(' · ')}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={closeCurrentSet}
                      className="px-2.5 py-1 rounded-xl bg-sky-500 text-white text-[11px] font-extrabold"
                    >
                      Fechar Set
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 truncate">
                  {opponent}
                </p>
                <p className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {opponentScore}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOpponentScore((s) => Math.max(0, s - 1))}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpponentScore((s) => s + 1)}
                    className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-extrabold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {team.sportId === 'basquete' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpponentScore((s) => s + 2)}
                        className="px-2 h-9 rounded-xl bg-rose-600 text-white text-xs font-extrabold"
                      >
                        +2
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpponentScore((s) => s + 3)}
                        className="px-2 h-9 rounded-xl bg-rose-700 text-white text-xs font-extrabold"
                      >
                        +3
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Event Side + Athlete Selector + Quick Events */}
            <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid grid-cols-2 gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => setEventSide('team')}
                    className={`min-h-[38px] px-2 rounded-xl text-xs font-extrabold border-2 ${
                      eventSide === 'team'
                        ? 'bg-emerald-500 border-emerald-700 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {team.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventSide('opponent')}
                    className={`min-h-[38px] px-2 rounded-xl text-xs font-extrabold border-2 ${
                      eventSide === 'opponent'
                        ? 'bg-rose-500 border-rose-700 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opponent}
                  </button>
                </div>

                {eventSide === 'team' && players.length > 0 && (
                  <select
                    value={selectedPlayerName}
                    onChange={(e) => setSelectedPlayerName(e.target.value)}
                    className="min-h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="">Atleta (opcional)</option>
                    {players.map((p) => (
                      <option key={p.uid} value={`${p.displayName} #${p.jerseyNumber || '0'}`}>
                        {p.displayName} (#{p.jerseyNumber || '0'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Buttons (Available across ALL 5 sports) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => recordEvent('goal_point', 1)}
                  className="min-h-[40px] px-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-900 text-xs font-extrabold flex items-center justify-center gap-1"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>
                    +1 {team.sportId === 'basquete' ? 'Ponto' : isSetSport ? 'Ponto' : 'Gol'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => recordEvent('foul', 0)}
                  className="min-h-[40px] px-2.5 rounded-xl bg-orange-100 hover:bg-orange-200 border border-orange-300 text-orange-900 text-xs font-extrabold flex items-center justify-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>+ Falta</span>
                </button>

                <button
                  type="button"
                  onClick={() => recordEvent('yellow_card', 0)}
                  className="min-h-[40px] px-2.5 rounded-xl bg-amber-200 hover:bg-amber-300 border border-amber-400 text-amber-950 text-xs font-extrabold flex items-center justify-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
                  <span>Cartão Amarelo</span>
                </button>

                <button
                  type="button"
                  onClick={() => recordEvent('red_card', 0)}
                  className="min-h-[40px] px-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-900 text-xs font-extrabold flex items-center justify-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cartão Vermelho</span>
                </button>

                <button
                  type="button"
                  onClick={() => recordEvent('penalty_scored', 1)}
                  className="min-h-[40px] px-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-900 text-xs font-extrabold flex items-center justify-center gap-1"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Pênalti (+1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => recordEvent('penalty_missed', 0)}
                  className="min-h-[40px] px-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-800 text-xs font-extrabold flex items-center justify-center gap-1"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Pênalti Perdido</span>
                </button>
              </div>
            </div>

            {/* Compact Live Stats + "Ver melhor" Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-bold tabular-nums">
              <div className="flex flex-wrap items-center gap-3 text-slate-700 dark:text-slate-300">
                <span>Faltas: {teamFouls} x {opponentFouls}</span>
                <span>Pênaltis: {teamPenalties} x {opponentPenalties}</span>
                <span className="text-amber-700 dark:text-amber-300">Amarelos: {yellowCards}</span>
                <span className="text-rose-700 dark:text-rose-400">Vermelhos: {redCards}</span>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="min-h-[34px] px-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 text-xs font-extrabold flex items-center gap-1.5 dark:bg-sky-950/60 dark:border-sky-700 dark:text-sky-200"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showDetails ? 'Ocultar lances' : `Ver melhor (${events.length})`}</span>
              </button>
            </div>

            {/* Expandable "Ver melhor" Event Timeline */}
            {showDetails && (
              <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                {events.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Nenhum lance ou cartão registrado ainda.
                  </p>
                ) : (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mr-1.5">
                          {ev.minuteLabel} ({ev.periodLabel})
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {eventLabel(ev.kind)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {' '}
                          · {ev.side === 'team' ? team.name : opponent}
                          {ev.playerName ? ` (${ev.playerName})` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEvents((prev) => prev.filter((item) => item.id !== ev.id))
                        }
                        title="Remover lance"
                        className="text-rose-500 p-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Finish Match CTA */}
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {saving ? 'Salvando partida...' : 'Encerrar Partida e Postar no Chat'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
