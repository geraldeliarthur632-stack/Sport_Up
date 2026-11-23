import type {
  Lesson,
  LessonLevel,
  PracticeKeyframe,
  QuizQuestion,
  SportId,
} from '../types/sportup';
import type { PlayTopic } from './playbookTypes';
import { SPORTS_BY_ID } from './sportsMeta';

function clamp(v: number, min = 8, max = 92): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function makeMcq(
  id: string,
  prompt: string,
  correct: string,
  distractors: [string, string, string],
  explanation: string,
  seed: number
): QuizQuestion {
  const uniqueDistractors = distractors.map((d, i) =>
    d === correct ? `${d} (${i + 1})` : d
  );
  const items = [correct, ...uniqueDistractors];
  const shift = ((seed % 4) + 4) % 4;
  const options: string[] = [];
  for (let i = 0; i < 4; i++) {
    options.push(items[(i - shift + 4) % 4]);
  }
  const correctIndex = options.indexOf(correct);
  return {
    id,
    kind: 'multiple_choice',
    prompt,
    options,
    correctIndex,
    explanation,
  };
}

function makeTrueFalse(
  id: string,
  prompt: string,
  isTrue: boolean,
  explanation: string
): QuizQuestion {
  return {
    id,
    kind: 'true_false',
    prompt,
    options: ['Verdadeiro', 'Falso'],
    correctIndex: isTrue ? 0 : 1,
    explanation,
  };
}

function makePracticeSteps(
  topic: PlayTopic,
  variant: 'core' | 'team' | 'pressure'
): PracticeKeyframe[] {
  const [sx, sy] = topic.startPos;
  const [ex, ey] = topic.endPos;
  const [bx, by] = topic.ballTarget;
  const midX = clamp((sx + ex) / 2);
  const midY = clamp((sy + ey) / 2);

  const mateBaseX = topic.matePos?.[0] ?? clamp(ex + 10);
  const mateBaseY =
    topic.matePos?.[1] ?? clamp(ey > 50 ? ey - 18 : ey + 18);

  const includeMate = variant === 'team' || topic.matePos != null;

  const prepPose: PracticeKeyframe['pose'] =
    variant === 'pressure' ? 'dribble' : 'ready';

  const step1Label =
    variant === 'team'
      ? '1. Posição do time'
      : variant === 'pressure'
        ? '1. Leitura sob pressão'
        : '1. Ponto de partida';

  const step2Label =
    variant === 'team'
      ? '2. Movimento de apoio'
      : variant === 'pressure'
        ? '2. Ajuste rápido'
        : '2. Preparação do corpo';

  const step3Label =
    variant === 'team'
      ? '3. Conexão da jogada'
      : variant === 'pressure'
        ? '3. Execução firme'
        : '3. Execução principal';

  const step4Label =
    variant === 'team'
      ? '4. Conclusão em equipe'
      : variant === 'pressure'
        ? '4. Finalização segura'
        : '4. Resultado na quadra';

  return [
    {
      label: step1Label,
      description: `Comece na posição equilibrada: ${topic.simpleSummary}`,
      playerX: clamp(sx),
      playerY: clamp(sy),
      ballX: clamp(sx + 2),
      ballY: clamp(sy + 1),
      pose: 'ready',
      ...(includeMate
        ? { teammateX: clamp(mateBaseX - 6), teammateY: clamp(mateBaseY) }
        : {}),
    },
    {
      label: step2Label,
      description:
        variant === 'team'
          ? `Observe o colega se aproximando da linha de apoio para facilitar: ${topic.howToDo}`
          : variant === 'pressure'
            ? `Antecipe a marcação antes de agir e mantenha o foco: ${topic.howToDo}`
            : `Ajuste postura, pés e olhar antes do toque: ${topic.howToDo}`,
      playerX: midX,
      playerY: midY,
      ballX: clamp(midX + (bx - sx) * 0.25),
      ballY: clamp(midY + (by - sy) * 0.25),
      pose: prepPose,
      ...(includeMate
        ? { teammateX: clamp(mateBaseX), teammateY: clamp(mateBaseY) }
        : {}),
    },
    {
      label: step3Label,
      description:
        variant === 'team'
          ? `Execute a jogada junto com seu companheiro no momento certo: ${topic.whenToUse}`
          : variant === 'pressure'
            ? `Não caia na pressa (${topic.commonMistake}) — faça o movimento limpo!`
            : `Faça o movimento principal no tempo certo: ${topic.whenToUse}`,
      playerX: clamp(ex),
      playerY: clamp(ey),
      ballX: clamp((ex + bx) / 2),
      ballY: clamp((ey + by) / 2),
      pose: topic.pose,
      ...(includeMate
        ? {
            teammateX: clamp(variant === 'team' ? bx : mateBaseX + 4),
            teammateY: clamp(variant === 'team' ? by : mateBaseY),
          }
        : {}),
    },
    {
      label: step4Label,
      description: `Dica de ouro para fechar com perfeição: ${topic.counterOrTip}`,
      playerX: clamp(ex + (variant === 'pressure' ? 3 : 0)),
      playerY: clamp(ey),
      ballX: clamp(bx),
      ballY: clamp(by),
      pose: topic.pose === 'block' ? 'block' : 'ready',
      ...(includeMate
        ? { teammateX: clamp(bx), teammateY: clamp(by) }
        : {}),
    },
  ];
}

function formatPositionNames(sportId: SportId, posIds: string[]): string {
  const sport = SPORTS_BY_ID[sportId];
  const names = posIds
    .map((id) => sport.positions.find((p) => p.id === id)?.name)
    .filter(Boolean) as string[];
  if (names.length === 0 || names.length === sport.positions.length) {
    return `Todas as posições de ${sport.name}`;
  }
  return names.join(', ');
}

function getTargetPosLabel(sportId: SportId, posId: string): string {
  const sport = SPORTS_BY_ID[sportId];
  return sport.positions.find((p) => p.id === posId)?.name ?? sport.positions[0].name;
}

export function buildSportPlaybookLessons(
  sportId: SportId,
  topics: PlayTopic[],
  startingOrder = 7
): Lesson[] {
  const sport = SPORTS_BY_ID[sportId];
  const validPosSet = new Set(sport.positions.map((p) => p.id));

  // Generate 6 lessons per topic (125 * 6 = 750 lessons), organized by level first
  // so Iniciante -> Intermediário -> Avançado flows naturally across all 125 topics!
  type AngleSpec = {
    angleIdx: number;
    level: LessonLevel;
    kind: 'teorica' | 'pratica';
    xp: number;
    durationMin: number;
  };

  const angles: AngleSpec[] = [
    { angleIdx: 1, level: 'Iniciante', kind: 'teorica', xp: 20, durationMin: 3 },
    { angleIdx: 2, level: 'Iniciante', kind: 'pratica', xp: 25, durationMin: 4 },
    { angleIdx: 3, level: 'Intermediário', kind: 'teorica', xp: 25, durationMin: 4 },
    { angleIdx: 4, level: 'Intermediário', kind: 'pratica', xp: 30, durationMin: 4 },
    { angleIdx: 5, level: 'Avançado', kind: 'teorica', xp: 30, durationMin: 4 },
    { angleIdx: 6, level: 'Avançado', kind: 'pratica', xp: 35, durationMin: 5 },
  ];

  // Group into 3 clean level blocks: Iniciante (angles 1&2), Intermediário (3&4), Avançado (5&6)
  const levelBlocks: AngleSpec[][] = [
    [angles[0], angles[1]],
    [angles[2], angles[3]],
    [angles[4], angles[5]],
  ];

  const lessons: Lesson[] = [];
  let orderCounter = startingOrder;

  for (const block of levelBlocks) {
    for (let tIdx = 0; tIdx < topics.length; tIdx++) {
      const topic = topics[tIdx];
      const targetPositions = topic.positions.filter((p) => validPosSet.has(p));
      const safeTargetPositions =
        targetPositions.length > 0 ? targetPositions : sport.positions.map((p) => p.id);
      const primaryPosId = safeTargetPositions[0];
      const primaryPosName = getTargetPosLabel(sportId, primaryPosId);
      const posNamesList = formatPositionNames(sportId, safeTargetPositions);

      const courtZones = sport.positions.map((p) => ({
        id: p.id,
        label: p.name,
        x: p.zoneX,
        y: p.zoneY,
      }));

      for (const spec of block) {
        const seed = tIdx * 13 + spec.angleIdx * 7;
        const unitTitle = `${spec.level} · ${topic.unitGroup}`;
        const id = `${sportId}_${topic.slug}_a${spec.angleIdx}`;
        const currentOrder = orderCounter++;

        if (spec.angleIdx === 1) {
          // 1. Simple Concept (Iniciante Saber)
          lessons.push({
            id,
            sportId,
            level: spec.level,
            moduleType: topic.moduleType,
            kind: 'teorica',
            order: currentOrder,
            title: `O que é: ${topic.title}`,
            subtitle: `Explicação bem simples sobre ${topic.title.toLowerCase()} para entender rápido.`,
            unitTitle,
            playTag: topic.unitGroup,
            simpleTip: topic.counterOrTip,
            targetPositions: safeTargetPositions,
            xpReward: spec.xp,
            durationMin: spec.durationMin,
            theorySlides: [
              {
                title: `Entendendo em palavras fáceis`,
                body: topic.simpleSummary,
                diagramType: 'court_image',
                imageUrl: sport.courtImage,
                highlight: `Quem mais usa: ${posNamesList}.`,
              },
              {
                title: `Como fazer na prática`,
                body: topic.howToDo,
                bulletPoints: [
                  `Quando acontece: ${topic.whenToUse}`,
                  `Evite este erro: ${topic.commonMistake}`,
                  `Dica de ouro: ${topic.counterOrTip}`,
                ],
              },
            ],
            questions: [
              makeMcq(
                `${id}_q1`,
                `Em palavras simples, o que significa "${topic.title}" no ${sport.name}?`,
                topic.simpleSummary,
                [
                  'É uma pausa proibida que sempre dá cartão automático.',
                  'Só pode ser usado no último minuto da prorrogação.',
                  'Serve apenas para o treinador preencher a súmula do jogo.',
                ],
                `Isso mesmo! ${topic.simpleSummary}`,
                seed
              ),
              makeTrueFalse(
                `${id}_q2`,
                `Verdadeiro ou falso: Para executar bem "${topic.title}", vale fazer assim — ${topic.howToDo}`,
                true,
                `Verdadeiro! ${topic.counterOrTip}`
              ),
            ],
          });
        } else if (spec.angleIdx === 2) {
          // 2. Guided Animation (Iniciante Prática)
          lessons.push({
            id,
            sportId,
            level: spec.level,
            moduleType: topic.moduleType,
            kind: 'pratica',
            order: currentOrder,
            title: `Na prática: ${topic.title}`,
            subtitle: `Veja o movimento animado passo a passo na quadra/mesa de ${sport.name}.`,
            unitTitle,
            playTag: topic.unitGroup,
            simpleTip: topic.counterOrTip,
            targetPositions: safeTargetPositions,
            xpReward: spec.xp,
            durationMin: spec.durationMin,
            theorySlides: [
              {
                title: `Resumo do movimento`,
                body: topic.howToDo,
                highlight: `Dica simples: ${topic.counterOrTip}`,
              },
            ],
            practiceSteps: makePracticeSteps(topic, 'core'),
            questions: [
              {
                id: `${id}_q1`,
                kind: 'order_steps',
                prompt: `Coloque na ordem certa os 3 momentos de "${topic.title}":`,
                stepsCorrectOrder: [
                  '1º Preparar postura equilibrada e olhar o espaço',
                  `2º Aplicar a técnica: ${topic.howToDo}`,
                  `3º Confirmar o momento certo (${topic.whenToUse})`,
                ],
                explanation: `Ordem perfeita! Primeiro a base, depois a técnica limpa e atenção ao momento do jogo.`,
              },
              makeMcq(
                `${id}_q2`,
                `Qual é a dica simples que ajuda a não errar "${topic.title}"?`,
                topic.counterOrTip,
                [
                  'Fazer tudo de olhos fechados sem olhar os colegas.',
                  'Ignorar completamente onde a bola e o rival estão.',
                  'Parar no meio do lance e esperar o adversário decidir.',
                ],
                `Exato! ${topic.counterOrTip}`,
                seed + 1
              ),
            ],
          });
        } else if (spec.angleIdx === 3) {
          // 3. When & Which Position Uses It (Intermediário Saber)
          lessons.push({
            id,
            sportId,
            level: spec.level,
            moduleType: topic.moduleType,
            kind: 'teorica',
            order: currentOrder,
            title: `Quando usar: ${topic.title}`,
            subtitle: `Descubra o momento exato da partida e como a função (${primaryPosName}) aplica essa jogada.`,
            unitTitle,
            playTag: topic.unitGroup,
            simpleTip: `Momento ideal: ${topic.whenToUse}`,
            targetPositions: safeTargetPositions,
            xpReward: spec.xp,
            durationMin: spec.durationMin,
            theorySlides: [
              {
                title: `A hora certa do lance`,
                body: `No ${sport.name}, saber O QUE fazer é metade do caminho — saber QUANDO fazer é o que decide o ponto. Use "${topic.title}": ${topic.whenToUse}`,
                diagramType: 'positions_map',
                highlight: `Foco principal para: ${posNamesList}.`,
              },
              {
                title: `Leitura antes de agir`,
                body: `${topic.howToDo} Lembre que o erro mais comum nessa hora é: ${topic.commonMistake}`,
                bulletPoints: [
                  `Resumo rápido: ${topic.simpleSummary}`,
                  `Truque prático: ${topic.counterOrTip}`,
                ],
              },
            ],
            questions: [
              {
                id: `${id}_q1`,
                kind: 'pick_position',
                prompt: `Toque no mapa na posição principal ligada a "${topic.title}" (ex: ${primaryPosName}):`,
                courtSport: sportId,
                positionZones: courtZones,
                correctZoneId: primaryPosId,
                explanation: `Boa leitura! ${primaryPosName} aplica muito isso: ${topic.whenToUse}`,
              },
              {
                id: `${id}_q2`,
                kind: 'match_columns',
                prompt: `Ligue cada parte de "${topic.title}" ao significado certo:`,
                pairs: [
                  { left: 'O que é', right: topic.simpleSummary },
                  { left: 'Quando usar', right: topic.whenToUse },
                  { left: 'Dica de ouro', right: topic.counterOrTip },
                ],
                explanation: `Muito bem! Ligou a ideia, o momento certo e o segredo prático.`,
              },
            ],
          });
        } else if (spec.angleIdx === 4) {
          // 4. Team Connection & Play Variation (Intermediário Prática)
          lessons.push({
            id,
            sportId,
            level: spec.level,
            moduleType: topic.moduleType,
            kind: 'pratica',
            order: currentOrder,
            title: `Em equipe: ${topic.title}`,
            subtitle: `Treine na animação como conectar essa ação com seu colega/parceiro.`,
            unitTitle,
            playTag: topic.unitGroup,
            simpleTip: topic.counterOrTip,
            targetPositions: safeTargetPositions,
            xpReward: spec.xp,
            durationMin: spec.durationMin,
            theorySlides: [
              {
                title: `Jogando junto em ${sport.name}`,
                body: `Mesmo quando você executa "${topic.title}", seus companheiros ajudam abrindo espaço ou dando opção. ${topic.howToDo}`,
                highlight: `Quem participa mais: ${posNamesList}.`,
              },
            ],
            practiceSteps: makePracticeSteps(topic, 'team'),
            questions: [
              makeMcq(
                `${id}_q1`,
                `Em qual situação do jogo "${topic.title}" funciona melhor com o time?`,
                topic.whenToUse,
                [
                  'Quando todo o time fica parado no mesmo canto sem se falar.',
                  'Somente durante o intervalo antes do segundo tempo.',
                  'Apenas quando o jogo já terminou após o apito final.',
                ],
                `Perfeito! Funciona exatamente assim: ${topic.whenToUse}`,
                seed + 2
              ),
              makeTrueFalse(
                `${id}_q2`,
                `Verdadeiro ou falso: Um erro que atrapalha o time inteiro nessa jogada é "${topic.commonMistake}".`,
                true,
                `Verdadeiro! Evitando isso e aplicando "${topic.counterOrTip}", a jogada flui limpa.`
              ),
            ],
          });
        } else if (spec.angleIdx === 5) {
          // 5. Common Mistakes & Fixes (Avançado Saber)
          lessons.push({
            id,
            sportId,
            level: spec.level,
            moduleType: topic.moduleType,
            kind: 'teorica',
            order: currentOrder,
            title: `Erros e consertos: ${topic.title}`,
            subtitle: `Descubra o que costuma dar errado em "${topic.title}" e como corrigir na hora.`,
            unitTitle,
            playTag: topic.unitGroup,
            simpleTip: `Conserto rápido: ${topic.counterOrTip}`,
            targetPositions: safeTargetPositions,
            xpReward: spec.xp,
            durationMin: spec.durationMin,
            theorySlides: [
              {
                title: `O erro que mais acontece`,
                body: `Até jogadores experientes às vezes erram "${topic.title}" por um detalhe: ${topic.commonMistake}`,
                highlight: `Como corrigir na hora: ${topic.howToDo}`,
              },
              {
                title: `Solução de quem domina o jogo`,
                body: topic.counterOrTip,
                bulletPoints: [
                  `Lembre o objetivo: ${topic.simpleSummary}`,
                  `Momento certo: ${topic.whenToUse}`,
                  `Posições-chave: ${posNamesList}`,
                ],
              },
            ],
            questions: [
              makeMcq(
                `${id}_q1`,
                `Qual é o erro clássico que você deve evitar em "${topic.title}"?`,
                topic.commonMistake,
                [
                  topic.counterOrTip,
                  topic.howToDo,
                  `Comunicar com clareza para ajudar os colegas de ${sport.name}.`,
                ],
                `Na mosca! Esse erro (${topic.commonMistake}) se resolve com: ${topic.counterOrTip}`,
                seed + 3
              ),
              makeTrueFalse(
                `${id}_q2`,
                `Verdadeiro ou falso: Fazer "${topic.commonMistake}" ajuda a melhorar sua precisão em "${topic.title}".`,
                false,
                `Falso! Esse é justamente o erro que atrapalha o lance. O certo é: ${topic.howToDo}`
              ),
            ],
          });
        } else {
          // 6. Mastery Under Pressure (Avançado Prática)
          lessons.push({
            id,
            sportId,
            level: spec.level,
            moduleType: topic.moduleType,
            kind: 'pratica',
            order: currentOrder,
            title: `Domínio sob pressão: ${topic.title}`,
            subtitle: `Simulação rápida com marcação apertada para você decidir em segundos.`,
            unitTitle,
            playTag: topic.unitGroup,
            simpleTip: topic.counterOrTip,
            targetPositions: safeTargetPositions,
            xpReward: spec.xp,
            durationMin: spec.durationMin,
            theorySlides: [
              {
                title: `Tomada de decisão rápida`,
                body: `Com o placar apertado, mantenha a calma e lembre: ${topic.counterOrTip}`,
                highlight: `Base técnica: ${topic.howToDo}`,
              },
            ],
            practiceSteps: makePracticeSteps(topic, 'pressure'),
            questions: [
              makeMcq(
                `${id}_q1`,
                `Sob pressão no jogo decisivo, qual é a melhor atitude em "${topic.title}"?`,
                `Aplicar o ajuste: ${topic.counterOrTip}`,
                [
                  `Repetir o erro: ${topic.commonMistake}`,
                  'Desistir do lance e reclamar da marcação durante a jogada.',
                  'Esquecer os colegas e agir sem pensar no espaço.',
                ],
                `Show! Quem mantém a cabeça fria e lembra de "${topic.counterOrTip}" vence lances decisivos.`,
                seed + 1
              ),
              {
                id: `${id}_q2`,
                kind: 'order_steps',
                prompt: `Ordene a reação perfeita sob pressão em "${topic.title}":`,
                stepsCorrectOrder: [
                  `1º Identificar o momento: ${topic.whenToUse}`,
                  `2º Executar limpo: ${topic.howToDo}`,
                  `3º Fechar com vantagem: ${topic.counterOrTip}`,
                ],
                explanation: `Sequência de nível campeão concluída!`,
              },
            ],
          });
        }
      }
    }
  }

  return lessons;
}
