export type SportId = 'futsal' | 'futebol' | 'volei' | 'basquete' | 'pingpong';

export type LessonLevel = 'Iniciante' | 'Intermediário' | 'Avançado';

export type LessonModuleType =
  | 'regras'
  | 'fundamentos'
  | 'posicoes'
  | 'taticas'
  | 'preparacao'
  | 'cultura';

export type LessonKind = 'pratica' | 'teorica';

export type QuestionKind =
  | 'multiple_choice'
  | 'true_false'
  | 'order_steps'
  | 'match_columns'
  | 'pick_position';

export interface PracticeKeyframe {
  label: string;
  description: string;
  playerX: number; // 0..100
  playerY: number; // 0..100
  ballX: number;   // 0..100
  ballY: number;   // 0..100
  pose: 'ready' | 'pass' | 'kick' | 'dribble' | 'jump' | 'block' | 'shoot' | 'swing';
  teammateX?: number;
  teammateY?: number;
}

export interface TheorySlide {
  title: string;
  body: string;
  highlight?: string;
  diagramType?: 'court_image' | 'positions_map' | 'referee_signals' | 'measures';
  imageUrl?: string;
  bulletPoints?: string[];
}

export interface QuizQuestion {
  id: string;
  kind: QuestionKind;
  prompt: string;
  explanation: string;
  // multiple_choice & true_false
  options?: string[];
  correctIndex?: number;
  // order_steps
  stepsCorrectOrder?: string[];
  // match_columns
  pairs?: Array<{ left: string; right: string }>;
  // pick_position
  courtSport?: SportId;
  positionZones?: Array<{ id: string; label: string; x: number; y: number }>;
  correctZoneId?: string;
}

export interface Lesson {
  id: string;
  sportId: SportId;
  level: LessonLevel;
  moduleType: LessonModuleType;
  kind: LessonKind;
  order: number;
  title: string;
  subtitle: string;
  xpReward: number;
  durationMin: number;
  theorySlides?: TheorySlide[];
  practiceSteps?: PracticeKeyframe[];
  questions: QuizQuestion[];
}

export interface SportPosition {
  id: string;
  name: string;
  shortRole: string;
  zoneX: number;
  zoneY: number;
}

export interface SportMeta {
  id: SportId;
  name: string;
  tagline: string;
  accentHex: string;
  bgTintClass: string;
  textAccentClass: string;
  borderAccentClass: string;
  courtImage: string;
  positions: SportPosition[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  xp: number;
  streak: number;
  lastActivityDate?: string;
  selectedSportId?: SportId;
  activeTeamId?: string;
  achievements?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChipWallet {
  userId: string;
  dailyChips: number;
  purchasedChips: number;
  subscriptionChips: number;
  lastResetDate: string;
  adsWatchedToday?: number;
  lastAdDate?: string;
  serverSignature?: string;
  updatedAt?: unknown;
}

export interface UserSubscription {
  userId: string;
  plan: 'free' | 'monthly_pro';
  status: 'active' | 'unpaid' | 'canceled';
  dailyAllowance: 3 | 5;
  accumulates: boolean;
  currentPeriodEnd?: string;
  serverSignature?: string;
  updatedAt?: unknown;
}

export interface LessonProgress {
  userId: string;
  lessonId: string;
  sportId: SportId;
  completed: boolean;
  score: number;
  xpEarned: number;
  updatedAt?: unknown;
}

export interface Team {
  id: string;
  name: string;
  logoURL?: string;
  sportId: SportId;
  inviteCode: string;
  ownerId: string;
  coachId?: string;
  wins: number;
  draws: number;
  losses: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TeamMember {
  uid: string;
  teamId: string;
  displayName: string;
  photoURL?: string;
  role: 'coach' | 'player';
  jerseyNumber?: string;
  position?: string;
  isStarter: boolean;
  joinedAt?: unknown;
  updatedAt?: unknown;
}

export interface TeamMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  senderPosition?: string;
  senderJersey?: string;
  senderRole?: 'coach' | 'player';
  type: 'text' | 'audio' | 'image' | 'video' | 'file' | 'match_card';
  text?: string;
  mediaURL?: string;
  fileName?: string;
  replyToId?: string;
  replyToPreview?: string;
  replyToSender?: string;
  matchCardData?: {
    matchId: string;
    opponent: string;
    teamScore: number;
    opponentScore: number;
    outcome: 'win' | 'draw' | 'loss';
    matchDate: string;
    location?: string;
  };
  deliveryStatus: 'delivered' | 'read';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TeamMatch {
  id: string;
  teamId: string;
  opponent: string;
  teamScore: number;
  opponentScore: number;
  outcome: 'win' | 'draw' | 'loss';
  matchDate: string;
  location?: string;
  createdBy: string;
  createdByName: string;
  createdAt?: unknown;
}

export interface UserTeamMembershipRef {
  userId: string;
  teamId: string;
  teamName: string;
  sportId: SportId;
  role: 'coach' | 'player';
  joinedAt?: unknown;
}
