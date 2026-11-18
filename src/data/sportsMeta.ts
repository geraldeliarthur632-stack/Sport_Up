import type { LessonModuleType, SportId, SportMeta } from '../types/sportup';
import campoFutebolImg from '../assets/images/campo_futebol_esquema_1794703923073.jpg';
import mascoteImg from '../assets/images/mascote_sportup_1794703922260.jpg';
import mesaPingPongImg from '../assets/images/mesa_pingpong_raquete_1794703924552.jpg';
import quadraFutsalImg from '../assets/images/quadra_futsal_esquema_1794703923415.jpg';
import quadraVoleiBasqueteImg from '../assets/images/quadra_volei_basquete_1794703924277.jpg';

export const MASCOT_IMAGE_PATH = mascoteImg;

export const MODULE_LABELS: Record<
  LessonModuleType,
  { title: string; shortLabel: string }
> = {
  regras: {
    title: 'Regras, Quadra e Árbitro',
    shortLabel: 'Regras & Medidas',
  },
  fundamentos: {
    title: 'Fundamentos e Técnicas',
    shortLabel: 'Fundamentos',
  },
  posicoes: {
    title: 'Posições e Funções',
    shortLabel: 'Posições',
  },
  taticas: {
    title: 'Táticas e Jogadas',
    shortLabel: 'Táticas',
  },
  preparacao: {
    title: 'Preparação Física e Lesões',
    shortLabel: 'Preparação Física',
  },
  cultura: {
    title: 'Cultura, História e Fair Play',
    shortLabel: 'Cultura & Fair Play',
  },
};

export const SPORTS: SportMeta[] = [
  {
    id: 'futsal',
    name: 'Futsal',
    tagline: 'Velocidade, passe curto e leitura tática em quadra',
    accentHex: '#16A34A',
    bgTintClass: 'bg-emerald-50',
    textAccentClass: 'text-emerald-700',
    borderAccentClass: 'border-emerald-300',
    courtImage: quadraFutsalImg,
    positions: [
      { id: 'goleiro', name: 'Goleiro', shortRole: 'Defende a meta e inicia contra-ataques', zoneX: 12, zoneY: 50 },
      { id: 'fixo', name: 'Fixo', shortRole: 'Último homem de defesa e organizador da saída', zoneX: 32, zoneY: 50 },
      { id: 'ala_esq', name: 'Ala Esquerda', shortRole: 'Amplitude, drible e chutes pelo corredor esquerdo', zoneX: 54, zoneY: 22 },
      { id: 'ala_dir', name: 'Ala Direita', shortRole: 'Transição rápida e apoio pela direita', zoneX: 54, zoneY: 78 },
      { id: 'pivo', name: 'Pivô', shortRole: 'Referência ofensiva, protege a bola e finaliza', zoneX: 78, zoneY: 50 },
    ],
  },
  {
    id: 'futebol',
    name: 'Futebol',
    tagline: 'Campo oficial, sistemas táticos e fundamentos do jogo',
    accentHex: '#059669',
    bgTintClass: 'bg-teal-50',
    textAccentClass: 'text-teal-700',
    borderAccentClass: 'border-teal-300',
    courtImage: campoFutebolImg,
    positions: [
      { id: 'goleiro', name: 'Goleiro', shortRole: 'Protege o gol e orienta a linha defensiva', zoneX: 10, zoneY: 50 },
      { id: 'zagueiro', name: 'Zagueiro', shortRole: 'Marcação na área, jogo aéreo e cobertura', zoneX: 26, zoneY: 50 },
      { id: 'lateral', name: 'Lateral', shortRole: 'Fecha os lados e apoia o ataque pelos corredores', zoneX: 34, zoneY: 18 },
      { id: 'volante', name: 'Volante', shortRole: 'Protege a entrada da área e distribui passes', zoneX: 48, zoneY: 50 },
      { id: 'meia', name: 'Meia', shortRole: 'Criação de jogadas e infiltração entre linhas', zoneX: 65, zoneY: 50 },
      { id: 'atacante', name: 'Atacante', shortRole: 'Finalização, pressão na saída e profundidade', zoneX: 84, zoneY: 50 },
    ],
  },
  {
    id: 'volei',
    name: 'Vôlei',
    tagline: 'Rodízio inteligente, manchete firme e bloqueio na rede',
    accentHex: '#0284C7',
    bgTintClass: 'bg-sky-50',
    textAccentClass: 'text-sky-700',
    borderAccentClass: 'border-sky-300',
    courtImage: quadraVoleiBasqueteImg,
    positions: [
      { id: 'levantador', name: 'Levantador', shortRole: 'Cérebro do time, organiza o 2º toque', zoneX: 66, zoneY: 32 },
      { id: 'ponteiro', name: 'Ponteiro', shortRole: 'Recepção de saque e ataque pelas pontas', zoneX: 68, zoneY: 78 },
      { id: 'oposto', name: 'Oposto', shortRole: 'Principal atacante de definição pela saída de rede', zoneX: 40, zoneY: 78 },
      { id: 'central', name: 'Central', shortRole: 'Bloqueio na rede e ataques rápidos de meio', zoneX: 72, zoneY: 50 },
      { id: 'libero', name: 'Líbero', shortRole: 'Especialista defensivo no fundo de quadra', zoneX: 25, zoneY: 50 },
    ],
  },
  {
    id: 'basquete',
    name: 'Basquete',
    tagline: 'Arremesso, rebote, pick-and-roll e defesa em quadra',
    accentHex: '#EA580C',
    bgTintClass: 'bg-orange-50',
    textAccentClass: 'text-orange-700',
    borderAccentClass: 'border-orange-300',
    courtImage: quadraVoleiBasqueteImg,
    positions: [
      { id: 'armador', name: 'Armador (PG)', shortRole: 'Controla o ritmo, drible e distribui passes', zoneX: 35, zoneY: 50 },
      { id: 'ala_armador', name: 'Ala-Armador (SG)', shortRole: 'Arremessador de perímetro e cortes rápidos', zoneX: 52, zoneY: 20 },
      { id: 'ala', name: 'Ala (SF)', shortRole: 'Versátil no ataque, infiltração e defesa', zoneX: 60, zoneY: 80 },
      { id: 'ala_pivo', name: 'Ala-Pivô (PF)', shortRole: 'Bloqueios, média distância e briga pelo rebote', zoneX: 74, zoneY: 30 },
      { id: 'pivo', name: 'Pivô (C)', shortRole: 'Protetor do garrafão, rebotes e enterradas', zoneX: 82, zoneY: 55 },
    ],
  },
  {
    id: 'pingpong',
    name: 'Ping Pong',
    tagline: 'Reflexo rápido, efeito topspin e controle de raquete',
    accentHex: '#7C3AED',
    bgTintClass: 'bg-violet-50',
    textAccentClass: 'text-violet-700',
    borderAccentClass: 'border-violet-300',
    courtImage: mesaPingPongImg,
    positions: [
      { id: 'classico', name: 'Estilo Clássico (Shakehand)', shortRole: 'Empunhadura europeia equilibrada para forehand e backhand', zoneX: 24, zoneY: 50 },
      { id: 'caneta', name: 'Estilo Caneta (Penhold)', shortRole: 'Agilidade de punho no forehand próximo à mesa', zoneX: 28, zoneY: 34 },
      { id: 'defensor', name: 'Defensor (Chopper)', shortRole: 'Recuado da mesa usando backspin pesado', zoneX: 12, zoneY: 50 },
      { id: 'duplas_dir', name: 'Duplas — Alternância Direita', shortRole: 'Movimentação lateral sincronizada em duplas', zoneX: 32, zoneY: 72 },
    ],
  },
];

export const SPORTS_BY_ID: Record<SportId, SportMeta> = SPORTS.reduce(
  (acc, sport) => {
    acc[sport.id] = sport;
    return acc;
  },
  {} as Record<SportId, SportMeta>
);

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  xpBonus: number;
}

export const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  {
    id: 'primeiro_passo',
    title: 'Primeiro Passo',
    description: 'Conclua sua primeira aula no SportUp.',
    xpBonus: 25,
  },
  {
    id: 'nota_maxima',
    title: 'Precisão Cirúrgica',
    description: 'Acerte 100% das perguntas em uma aula.',
    xpBonus: 40,
  },
  {
    id: 'sequencia_3',
    title: 'Em Ritmo de Treino',
    description: 'Mantenha uma sequência ativa de estudo.',
    xpBonus: 30,
  },
  {
    id: 'multi_esporte',
    title: 'Atleta Completo',
    description: 'Conclua aulas em 2 ou mais esportes diferentes.',
    xpBonus: 60,
  },
  {
    id: 'capitao_time',
    title: 'Espírito de Equipe',
    description: 'Crie ou entre em um time na aba Meu time.',
    xpBonus: 50,
  },
  {
    id: 'mestre_100xp',
    title: 'Centurião da Quadra',
    description: 'Alcance 100 XP acumulados.',
    xpBonus: 50,
  },
];
