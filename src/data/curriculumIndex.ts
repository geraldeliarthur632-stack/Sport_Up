import type { Lesson, SportId } from '../types/sportup';
import { buildSportPlaybookLessons } from './curriculumBuilder';
import { FUTEBOL_LESSONS, FUTSAL_LESSONS } from './lessonsFutsalFutebol';
import {
  BASQUETE_LESSONS,
  PINGPONG_LESSONS,
  VOLEI_LESSONS,
} from './lessonsVoleiBasquetePingPong';
import { BASQUETE_TOPICS } from './playbooksBasquete';
import { FUTEBOL_TOPICS, FUTSAL_TOPICS } from './playbooksPart1';
import { PINGPONG_TOPICS } from './playbooksPingPong';
import type { PlayTopic } from './playbookTypes';
import { VOLEI_TOPICS } from './playbooksVolei';

const FLAGSHIP_BY_SPORT: Record<SportId, Lesson[]> = {
  futsal: FUTSAL_LESSONS,
  futebol: FUTEBOL_LESSONS,
  volei: VOLEI_LESSONS,
  basquete: BASQUETE_LESSONS,
  pingpong: PINGPONG_LESSONS,
};

const TOPICS_BY_SPORT: Record<SportId, PlayTopic[]> = {
  futsal: FUTSAL_TOPICS,
  futebol: FUTEBOL_TOPICS,
  volei: VOLEI_TOPICS,
  basquete: BASQUETE_TOPICS,
  pingpong: PINGPONG_TOPICS,
};

const CACHE = new Map<SportId, Lesson[]>();
const ID_INDEX = new Map<string, Lesson>();

export function getLessonsBySport(sportId: SportId): Lesson[] {
  const hit = CACHE.get(sportId);
  if (hit) return hit;

  const flagship = FLAGSHIP_BY_SPORT[sportId].map((lesson) => ({
    ...lesson,
    unitTitle: lesson.unitTitle || 'Essenciais do Esporte',
  }));
  const generated = buildSportPlaybookLessons(
    sportId,
    TOPICS_BY_SPORT[sportId],
    flagship.length + 1
  );
  const combined = [...flagship, ...generated].sort(
    (a, b) => a.order - b.order
  );

  CACHE.set(sportId, combined);
  for (const lesson of combined) {
    ID_INDEX.set(lesson.id, lesson);
  }
  return combined;
}

export function getSportLessonCount(sportId: SportId): number {
  return FLAGSHIP_BY_SPORT[sportId].length + TOPICS_BY_SPORT[sportId].length * 6;
}

export function getLessonById(lessonId: string): Lesson | undefined {
  const indexed = ID_INDEX.get(lessonId);
  if (indexed) return indexed;

  // Infer sport prefix if present to build only that sport lazily
  const prefixes: Array<[string, SportId]> = [
    ['fut_', 'futebol'],
    ['futsal_', 'futsal'],
    ['futebol_', 'futebol'],
    ['vol_', 'volei'],
    ['volei_', 'volei'],
    ['bas_', 'basquete'],
    ['basquete_', 'basquete'],
    ['pp_', 'pingpong'],
    ['pingpong_', 'pingpong'],
  ];
  for (const [prefix, sportId] of prefixes) {
    if (lessonId.startsWith(prefix)) {
      getLessonsBySport(sportId);
      const found = ID_INDEX.get(lessonId);
      if (found) return found;
    }
  }

  // Fallback across all sports
  const allSports: SportId[] = [
    'futsal',
    'futebol',
    'volei',
    'basquete',
    'pingpong',
  ];
  for (const sportId of allSports) {
    getLessonsBySport(sportId);
    const found = ID_INDEX.get(lessonId);
    if (found) return found;
  }
  return undefined;
}
