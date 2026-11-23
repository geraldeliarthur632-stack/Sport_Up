import React, { useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Dumbbell,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import { getLessonsBySport } from '../data/curriculumIndex';
import { SPORTS_BY_ID } from '../data/sportsMeta';
import {
  REQUIRED_ROSTER_SIZE,
  suggestTeamTacticsWithAI,
  type AiTacticsSuggestion,
} from '../lib/aiApi';
import type { Team, TeamGamePlan, TeamMember } from '../types/sportup';
import { PlayerOvrCard } from './PlayerOvrCardModal';

interface GamePlanPanelProps {
  team: Team;
  members: TeamMember[];
  gamePlans: TeamGamePlan[];
  currentUserId: string;
  canManageRoster: boolean;
  onOpenEvaluateVideo: (member: TeamMember) => void;
  onAddRosterPlayer: (payload: {
    displayName: string;
    jerseyNumber: string;
    position: string;
    isStarter: boolean;
  }) => Promise<void>;
  onApplyAiLineup: (starterUids: string[]) => Promise<void>;
  onSaveGamePlan: (payload: {
    title: string;
    opponent: string;
    formation: string;
    tactics: string;
    trainingTitles: string[];
    starterUids: string[];
    aiSuggested: boolean;
  }) => Promise<void>;
  onSharePlanToChat: (plan: TeamGamePlan) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
}

export const GamePlanPanel: React.FC<GamePlanPanelProps> = ({
  team,
  members,
  gamePlans,
  currentUserId,
  canManageRoster,
  onOpenEvaluateVideo,
  onAddRosterPlayer,
  onApplyAiLineup,
  onSaveGamePlan,
  onSharePlanToChat,
  onDeletePlan,
}) => {
  const sport = SPORTS_BY_ID[team.sportId];
  const requiredPlayers = REQUIRED_ROSTER_SIZE[team.sportId];
  const players = useMemo(
    () => members.filter((m) => m.role === 'player'),
    [members]
  );
  const isTeamComplete = players.length >= requiredPlayers;
  const evaluatedCount = players.filter((p) => typeof p.ovr === 'number').length;

  // Quick Add Roster Player (so coach/captain can complete a full team easily)
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerJersey, setNewPlayerJersey] = useState('9');
  const [newPlayerPos, setNewPlayerPos] = useState(sport.positions[0].name);
  const [newPlayerStarter, setNewPlayerStarter] = useState(true);

  // AI Lineup & Tactics State
  const [aiOpponent, setAiOpponent] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AiTacticsSuggestion | null>(
    null
  );

  // Coach Game Plan Builder State
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planOpponent, setPlanOpponent] = useState('');
  const [planFormation, setPlanFormation] = useState(
    team.sportId === 'futsal'
      ? '2-2 Quadrado / Pressão Alta'
      : team.sportId === 'futebol'
        ? '4-3-3 Ofensivo'
        : team.sportId === 'volei'
          ? 'Sistema 5x1 com Líbero'
          : team.sportId === 'basquete'
            ? '4-Out 1-In (Pick & Roll)'
            : 'Ataque Topspin + Bloqueio Curto'
  );
  const [planTactics, setPlanTactics] = useState('');
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([]);
  const [trainingSearch, setTrainingSearch] = useState('');
  const [planFromAi, setPlanFromAi] = useState(false);
  const [busy, setBusy] = useState(false);

  // Curated training options from the sport's 756 lessons
  const availableTrainings = useMemo(() => {
    const all = getLessonsBySport(team.sportId);
    const q = trainingSearch.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            (l.unitTitle ?? '').toLowerCase().includes(q)
        )
      : all.filter(
          (l) =>
            l.moduleType === 'fundamentos' ||
            l.moduleType === 'taticas' ||
            l.moduleType === 'preparacao'
        );
    // Return unique clean training titles up to 40 options
    const seen = new Set<string>();
    const out: Array<{ id: string; title: string; unit: string }> = [];
    for (const item of filtered) {
      if (!seen.has(item.title)) {
        seen.add(item.title);
        out.push({
          id: item.id,
          title: item.title,
          unit: item.unitTitle || 'Treino SportUp',
        });
      }
      if (out.length >= 40) break;
    }
    return out;
  }, [team.sportId, trainingSearch]);

  const handleQuickAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setBusy(true);
    try {
      await onAddRosterPlayer({
        displayName: newPlayerName.trim(),
        jerseyNumber: newPlayerJersey.trim() || '0',
        position: newPlayerPos,
        isStarter: newPlayerStarter,
      });
      setNewPlayerName('');
      setShowAddPlayer(false);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateAiTactics = async () => {
    setAiError(null);
    setAiBusy(true);
    try {
      const res = await suggestTeamTacticsWithAI({
        sportId: team.sportId,
        teamName: team.name,
        opponent: aiOpponent.trim() || undefined,
        players,
      });
      setAiSuggestion(res);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Erro ao gerar sugestão tática com a IA.'
      );
    } finally {
      setAiBusy(false);
    }
  };

  const handleLoadAiIntoBuilder = () => {
    if (!aiSuggestion) return;
    setPlanTitle(
      aiOpponent.trim()
        ? `Plano de Jogo vs ${aiOpponent.trim()}`
        : `Plano Tático · ${team.name}`
    );
    setPlanOpponent(aiOpponent.trim());
    setPlanFormation(aiSuggestion.recommendedFormation);
    setPlanTactics(
      `${aiSuggestion.tacticalPlan}\n\nJogadas-chave:\n- ${aiSuggestion.keyPlays.join('\n- ')}`
    );
    setSelectedTrainings((aiSuggestion.recommendedTraining ?? []).slice(0, 5));
    setPlanFromAi(true);
    setShowPlanBuilder(true);
  };

  const toggleTrainingTitle = (title: string) => {
    setSelectedTrainings((prev) => {
      if (prev.includes(title)) return prev.filter((t) => t !== title);
      if (prev.length >= 6) return prev;
      return [...prev, title];
    });
  };

  const handleSubmitGamePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim() || !planTactics.trim()) return;
    setBusy(true);
    try {
      const starterIds =
        aiSuggestion?.starterUids && aiSuggestion.starterUids.length > 0
          ? aiSuggestion.starterUids
          : players.filter((p) => p.isStarter).map((p) => p.uid);
      await onSaveGamePlan({
        title: planTitle.trim(),
        opponent: planOpponent.trim(),
        formation: planFormation.trim(),
        tactics: planTactics.trim(),
        trainingTitles: selectedTrainings,
        starterUids: starterIds,
        aiSuggested: planFromAi,
      });
      setShowPlanBuilder(false);
      setPlanTitle('');
      setPlanTactics('');
      setSelectedTrainings([]);
      setPlanFromAi(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Team Completeness & Unlock Over Banner */}
      <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
              Cartas do Plano de Jogo · {sport.name}
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {isTeamComplete
                ? 'Time Completo! Gerar Over liberado para todos'
                : `Faltam ${requiredPlayers - players.length} jogador(es) para liberar Over para todos`}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Quando o time atinge {requiredPlayers} atletas em {sport.name}, cada jogador grava/envia um vídeo executando passe, chute, falta, saque ou arremesso e a IA calcula o OVR na carta.
            </p>
          </div>

          {canManageRoster && (
            <button
              type="button"
              onClick={() => setShowAddPlayer((v) => !v)}
              className="min-h-[40px] px-3.5 py-2 rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 text-sky-900 text-xs font-extrabold flex items-center gap-1.5 dark:bg-sky-950/60 dark:border-sky-700 dark:text-sky-200"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar jogador ao elenco</span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold tabular-nums">
            <span className="text-slate-600 dark:text-slate-300">
              Elenco completo: {players.length}/{requiredPlayers} atletas
            </span>
            <span className="text-emerald-700 dark:text-emerald-400">
              {evaluatedCount}/{players.length} com Over gerado
            </span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((players.length / requiredPlayers) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Quick Add Roster Form */}
        {showAddPlayer && (
          <form
            onSubmit={handleQuickAddPlayer}
            className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 space-y-3"
          >
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
              Cadastrar atleta no elenco (além do código de convite)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Nome do atleta"
                className="sm:col-span-2 min-h-[42px] px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
              />
              <input
                type="text"
                maxLength={4}
                value={newPlayerJersey}
                onChange={(e) => setNewPlayerJersey(e.target.value)}
                placeholder="Camisa"
                className="min-h-[42px] px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold tabular-nums"
              />
              <select
                value={newPlayerPos}
                onChange={(e) => setNewPlayerPos(e.target.value)}
                className="min-h-[42px] px-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                {sport.positions.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={newPlayerStarter}
                  onChange={(e) => setNewPlayerStarter(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span>Colocar como titular</span>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="min-h-[40px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs border-b-4 border-emerald-700"
              >
                {busy ? 'Adicionando...' : 'Salvar jogador'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* 2. Player OVR Cards Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Cartas do Elenco (Plano de Jogo)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {players.map((m) => (
            <PlayerOvrCard
              key={m.uid}
              member={m}
              sportId={team.sportId}
              unlocked={isTeamComplete}
              canEvaluate={canManageRoster || m.uid === currentUserId}
              onOpenEvaluate={onOpenEvaluateVideo}
            />
          ))}
        </div>
      </section>

      {/* 3. AI Lineup & Game Tactics Generator */}
      <section className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-sky-700 dark:text-sky-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Estrategista IA do SportUp</span>
            </p>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Sugerir Time Ideal e Táticas pelos Overs e Vídeos
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              A IA lê as notas OVR e os resumos dos vídeos de cada atleta para montar a escalação titular, formação e jogadas ensaiadas.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={aiOpponent}
            onChange={(e) => setAiOpponent(e.target.value)}
            placeholder="Adversário (opcional, ex: Time do Bairro)"
            className="flex-1 min-h-[44px] px-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
          />
          <button
            type="button"
            disabled={aiBusy || players.length === 0}
            onClick={handleGenerateAiTactics}
            className="min-h-[46px] px-5 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm border-b-4 border-sky-700 flex items-center justify-center gap-2 whitespace-nowrap transition"
          >
            {aiBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analisando elenco...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>IA Sugerir Time & Táticas</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200">
            {aiError}
          </div>
        )}

        {aiSuggestion && (
          <div className="bg-sky-50/70 dark:bg-slate-800 border-2 border-sky-200 dark:border-sky-700 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-sky-800 dark:text-sky-300">
                  Formação recomendada
                </p>
                <p className="text-base font-extrabold text-slate-900 dark:text-white">
                  {aiSuggestion.recommendedFormation}
                </p>
              </div>
              {canManageRoster && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await onApplyAiLineup(aiSuggestion.starterUids);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="min-h-[38px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold border-b-2 border-emerald-700"
                  >
                    Aplicar titulares sugeridos
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadAiIntoBuilder}
                    className="min-h-[38px] px-3 rounded-xl bg-white hover:bg-slate-50 border border-sky-300 text-sky-900 text-xs font-extrabold dark:bg-slate-900 dark:border-sky-600 dark:text-sky-200"
                  >
                    Usar no Plano do Técnico
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              {aiSuggestion.tacticalPlan}
            </p>

            {/* Player Roles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {aiSuggestion.playerRoles.map((pr) => (
                <div
                  key={pr.uid + pr.displayName}
                  className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-sky-200 dark:border-slate-700 text-xs"
                >
                  <p className="font-extrabold text-slate-900 dark:text-white">
                    {pr.displayName} ·{' '}
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {pr.assignedRole}
                    </span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    {pr.tacticalReason}
                  </p>
                </div>
              ))}
            </div>

            {/* Key Plays & Recommended Trainings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <p className="font-extrabold text-slate-900 dark:text-white mb-1">
                  Jogadas ensaiadas
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                  {aiSuggestion.keyPlays.map((kp, i) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <p className="font-extrabold text-slate-900 dark:text-white mb-1">
                  Treinos recomendados
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                  {aiSuggestion.recommendedTraining.map((tr, i) => (
                    <li key={i}>{tr}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. Coach Game Plans & Training Selector */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>Planos de Jogo & Treinos do Time</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {canManageRoster
                ? 'Crie planos táticos, escolha treinos das aulas e envie direto para o chat.'
                : 'Veja os planos de jogo e treinos publicados pelo treinador.'}
            </p>
          </div>

          {canManageRoster && (
            <button
              type="button"
              onClick={() => setShowPlanBuilder((v) => !v)}
              className="min-h-[42px] px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs border-b-4 border-emerald-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{showPlanBuilder ? 'Fechar criador' : 'Criar Plano de Jogo'}</span>
            </button>
          )}
        </div>

        {canManageRoster && showPlanBuilder && (
          <form
            onSubmit={handleSubmitGamePlan}
            className="bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-700 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                  Título do Plano de Jogo
                </label>
                <input
                  type="text"
                  required
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="Ex: Plano Semifinal Domingo"
                  className="w-full min-h-[42px] px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                  Adversário (opcional)
                </label>
                <input
                  type="text"
                  value={planOpponent}
                  onChange={(e) => setPlanOpponent(e.target.value)}
                  placeholder="Ex: Atlética Sul"
                  className="w-full min-h-[42px] px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                Formação / Esquema Tático
              </label>
              <input
                type="text"
                required
                value={planFormation}
                onChange={(e) => setPlanFormation(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1">
                Instruções e Tática do Jogo
              </label>
              <textarea
                required
                rows={4}
                value={planTactics}
                onChange={(e) => setPlanTactics(e.target.value)}
                placeholder="Explique a marcação, jogadas ensaiadas, cobranças de falta/saque e função dos titulares..."
                className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>

            {/* Training Selector */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Dumbbell className="w-4 h-4 text-emerald-600" />
                  <span>Selecionar treinos para o time ({selectedTrainings.length}/6)</span>
                </label>
                <input
                  type="text"
                  value={trainingSearch}
                  onChange={(e) => setTrainingSearch(e.target.value)}
                  placeholder="Filtrar treino..."
                  className="min-h-[34px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1">
                {availableTrainings.map((tr) => {
                  const active = selectedTrainings.includes(tr.title);
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => toggleTrainingTitle(tr.title)}
                      className={`text-left px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition ${
                        active
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{tr.title}</span>
                      {active && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[46px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700"
            >
              {busy ? 'Salvando plano...' : 'Salvar Plano de Jogo'}
            </button>
          </form>
        )}

        {/* Saved Game Plans List */}
        {gamePlans.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center text-xs text-slate-500">
            Nenhum plano de jogo salvo ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {gamePlans.map((gp) => (
              <div
                key={gp.id}
                className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                      {gp.formation}
                      {gp.opponent ? ` · vs ${gp.opponent}` : ''}
                      {gp.aiSuggested ? ' · Com IA' : ''}
                    </p>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {gp.title}
                    </h4>
                  </div>

                  {canManageRoster && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSharePlanToChat(gp)}
                        className="min-h-[38px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold border-b-2 border-emerald-700 flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Colocar no Chat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePlan(gp.id)}
                        title="Excluir plano"
                        className="min-w-[38px] min-h-[38px] rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {gp.tactics}
                </p>

                {gp.trainingTitles && gp.trainingTitles.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 space-y-1.5">
                    <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Treinos selecionados:</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {gp.trainingTitles.map((tt) => (
                        <span
                          key={tt}
                          className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300"
                        >
                          {tt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
