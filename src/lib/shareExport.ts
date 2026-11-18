import type { TeamMatch, TeamMember } from '../types/sportup';

export function getAppShareUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildTelegramUrl(text: string, url?: string): string {
  const targetUrl = url || getAppShareUrl();
  return `https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(text)}`;
}

export function formatTeamInviteShareText(params: {
  teamName: string;
  sportName: string;
  inviteCode: string;
}): string {
  const appUrl = getAppShareUrl();
  return [
    `Entre para o meu time "${params.teamName}" (${params.sportName}) no SportUp!`,
    `Código de convite: ${params.inviteCode}`,
    appUrl ? `Acesse: ${appUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatTeamLineupShareText(params: {
  teamName: string;
  sportName: string;
  inviteCode: string;
  starters: TeamMember[];
  reserves: TeamMember[];
  coaches: TeamMember[];
}): string {
  const lines: string[] = [
    `Escalação Oficial — ${params.teamName} (${params.sportName})`,
    '',
    `TITULARES (${params.starters.length}):`,
  ];

  if (params.starters.length === 0) {
    lines.push('- Nenhum titular escalado');
  } else {
    params.starters.forEach((p) => {
      lines.push(
        `- #${p.jerseyNumber || '0'} ${p.displayName} (${p.position || 'Jogador'})`
      );
    });
  }

  lines.push('', `RESERVAS (${params.reserves.length}):`);
  if (params.reserves.length === 0) {
    lines.push('- Nenhum reserva no banco');
  } else {
    params.reserves.forEach((p) => {
      lines.push(
        `- #${p.jerseyNumber || '0'} ${p.displayName} (${p.position || 'Jogador'})`
      );
    });
  }

  if (params.coaches.length > 0) {
    lines.push(
      '',
      `TÉCNICO: ${params.coaches.map((c) => c.displayName).join(', ')}`
    );
  }

  lines.push('', `Código do time no SportUp: ${params.inviteCode}`);
  const appUrl = getAppShareUrl();
  if (appUrl) lines.push(appUrl);

  return lines.join('\n');
}

export function formatMatchShareText(params: {
  teamName: string;
  sportName: string;
  match: TeamMatch;
}): string {
  const outcomeLabel =
    params.match.outcome === 'win'
      ? 'Vitória'
      : params.match.outcome === 'draw'
        ? 'Empate'
        : 'Derrota';

  const lines = [
    `Resultado da Partida (${params.sportName}) — ${outcomeLabel}`,
    `${params.teamName} ${params.match.teamScore} x ${params.match.opponentScore} ${params.match.opponent}`,
    `Data: ${params.match.matchDate}`,
  ];
  if (params.match.location) {
    lines.push(`Local: ${params.match.location}`);
  }
  const appUrl = getAppShareUrl();
  if (appUrl) lines.push(`Registrado no SportUp: ${appUrl}`);
  return lines.join('\n');
}

export function formatChatMatchCardShareText(params: {
  teamName: string;
  opponent: string;
  teamScore: number;
  opponentScore: number;
  outcome: 'win' | 'draw' | 'loss';
  matchDate: string;
  location?: string;
}): string {
  const outcomeLabel =
    params.outcome === 'win'
      ? 'Vitória'
      : params.outcome === 'draw'
        ? 'Empate'
        : 'Derrota';

  const lines = [
    `Placar do Jogo — ${outcomeLabel}`,
    `${params.teamName} ${params.teamScore} x ${params.opponentScore} ${params.opponent}`,
    `Data: ${params.matchDate}`,
  ];
  if (params.location) lines.push(`Local: ${params.location}`);
  const appUrl = getAppShareUrl();
  if (appUrl) lines.push(`SportUp: ${appUrl}`);
  return lines.join('\n');
}

export function formatProfileShareText(params: {
  displayName: string;
  sportName?: string;
  xp: number;
  streak: number;
  completedLessons: number;
  achievementsCount: number;
}): string {
  const lines = [
    `Meu progresso no SportUp (${params.displayName})`,
    params.sportName ? `Esporte principal: ${params.sportName}` : '',
    `XP total: ${params.xp} XP`,
    `Sequência: ${params.streak} dia(s) seguido(s)`,
    `Aulas concluídas: ${params.completedLessons}`,
    `Conquistas desbloqueadas: ${params.achievementsCount}`,
  ].filter(Boolean);

  const appUrl = getAppShareUrl();
  if (appUrl) lines.push(`Venha aprender esportes comigo: ${appUrl}`);
  return lines.join('\n');
}
