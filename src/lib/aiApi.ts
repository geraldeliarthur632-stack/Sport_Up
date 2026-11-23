import { auth } from './firebase';
import type { SportId, TeamMember } from '../types/sportup';

export const REQUIRED_ROSTER_SIZE: Record<SportId, number> = {
  futsal: 5,
  futebol: 11,
  volei: 6,
  basquete: 5,
  pingpong: 2,
};

export const SPORT_OVR_STATS: Record<
  SportId,
  Array<{ code: string; label: string }>
> = {
  futsal: [
    { code: 'PAS', label: 'Passe' },
    { code: 'CHU', label: 'Chute' },
    { code: 'DRI', label: 'Drible' },
    { code: 'VEL', label: 'Velocidade' },
    { code: 'DEF', label: 'Defesa' },
    { code: 'FIS', label: 'Físico' },
  ],
  futebol: [
    { code: 'PAS', label: 'Passe' },
    { code: 'CHU', label: 'Chute' },
    { code: 'DRI', label: 'Drible' },
    { code: 'VEL', label: 'Velocidade' },
    { code: 'DEF', label: 'Defesa' },
    { code: 'FIS', label: 'Físico' },
  ],
  volei: [
    { code: 'SAQ', label: 'Saque' },
    { code: 'REC', label: 'Manchete' },
    { code: 'LEV', label: 'Levantamento' },
    { code: 'ATA', label: 'Cortada' },
    { code: 'BLO', label: 'Bloqueio' },
    { code: 'AGI', label: 'Agilidade' },
  ],
  basquete: [
    { code: 'ARR', label: 'Arremesso' },
    { code: 'INF', label: 'Bandeja' },
    { code: 'PAS', label: 'Passe' },
    { code: 'DEF', label: 'Defesa' },
    { code: 'REB', label: 'Rebote' },
    { code: 'FIS', label: 'Atlético' },
  ],
  pingpong: [
    { code: 'SAQ', label: 'Saque' },
    { code: 'FOR', label: 'Forehand' },
    { code: 'BCK', label: 'Backhand' },
    { code: 'EFE', label: 'Topspin/Spin' },
    { code: 'REF', label: 'Reflexo' },
    { code: 'TAT', label: 'Tática' },
  ],
};

export const SPORT_VIDEO_SKILLS: Record<SportId, string[]> = {
  futsal: [
    'Passe curto e pisada',
    'Chute de bico / finalização',
    'Cobrança de falta / tiro livre',
    'Drible em espaço curto',
    'Defesa de goleiro / saída',
  ],
  futebol: [
    'Passe longo / lançamento',
    'Chute de média distância',
    'Cobrança de falta / pênalti',
    'Drible e 1 contra 1',
    'Marcação / defesa de goleiro',
  ],
  volei: [
    'Saque (viagem ou flutuante)',
    'Manchete e recepção',
    'Levantamento de toque',
    'Cortada / ataque na rede',
    'Bloqueio duplo ou simples',
  ],
  basquete: [
    'Arremesso de 3 pontos / jump',
    'Bandeja e infiltração',
    'Controle de bola e passe',
    'Lance livre',
    'Defesa e rebote',
  ],
  pingpong: [
    'Saque com efeito',
    'Forehand Topspin',
    'Backhand drive / bloqueio',
    'Cozinhada (Chop / Backspin)',
    'Ataque rápido / Smash',
  ],
};

export interface VideoEvaluationResult {
  ovr: number;
  ovrAttributes: Record<string, number>;
  videoSummary: string;
  strengths: string;
  improvementTip: string;
}

export interface AiTacticsSuggestion {
  recommendedFormation: string;
  starterUids: string[];
  reserveUids: string[];
  tacticalPlan: string;
  keyPlays: string[];
  playerRoles: Array<{
    uid: string;
    displayName: string;
    assignedRole: string;
    tacticalReason: string;
  }>;
  recommendedTraining: string[];
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Não foi possível ler o arquivo de vídeo.'));
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler vídeo selecionado.'));
    reader.readAsDataURL(file);
  });
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para usar a avaliação por IA.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function evaluateSkillVideoWithAI(params: {
  sportId: SportId;
  playerName: string;
  position?: string;
  skillType: string;
  videoBlob: Blob;
  mimeType?: string;
}): Promise<VideoEvaluationResult> {
  if (params.videoBlob.size > 20 * 1024 * 1024) {
    throw new Error(
      'O vídeo precisa ter no máximo 20 MB. Grave um clipe curto de 5 a 15 segundos.'
    );
  }

  const videoBase64 = await fileToBase64(params.videoBlob);
  const res = await fetch('/api/ai/evaluate-video', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      sportId: params.sportId,
      playerName: params.playerName,
      position: params.position || 'Geral',
      skillType: params.skillType,
      videoBase64,
      mimeType: params.mimeType || params.videoBlob.type || 'video/mp4',
    }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Servidor de avaliação por IA indisponível neste ambiente estático.'
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao avaliar vídeo com a IA.');
  }
  return data as VideoEvaluationResult;
}

export async function suggestTeamTacticsWithAI(params: {
  sportId: SportId;
  teamName: string;
  opponent?: string;
  players: TeamMember[];
}): Promise<AiTacticsSuggestion> {
  const res = await fetch('/api/ai/suggest-tactics', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      sportId: params.sportId,
      teamName: params.teamName,
      opponent: params.opponent,
      players: params.players.map((p) => ({
        uid: p.uid,
        displayName: p.displayName,
        position: p.position,
        jerseyNumber: p.jerseyNumber,
        ovr: p.ovr,
        ovrAttributes: p.ovrAttributes,
        lastVideoSkill: p.lastVideoSkill,
        aiSummary: p.aiSummary,
      })),
    }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Servidor de táticas por IA indisponível neste ambiente estático.'
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao gerar sugestão tática com a IA.');
  }
  return data as AiTacticsSuggestion;
}
