import type { Lesson, SportId } from '../types/sportup';
import { FUTEBOL_LESSONS, FUTSAL_LESSONS } from './lessonsFutsalFutebol';
import {
  BASQUETE_LESSONS,
  PINGPONG_LESSONS,
  VOLEI_LESSONS,
} from './lessonsVoleiBasquetePingPong';

export const ALL_LESSONS: Lesson[] = [
  ...FUTSAL_LESSONS,
  ...FUTEBOL_LESSONS,
  ...VOLEI_LESSONS,
  ...BASQUETE_LESSONS,
  ...PINGPONG_LESSONS,
];

export function getLessonsBySport(sportId: SportId): Lesson[] {
  return ALL_LESSONS.filter((l) => l.sportId === sportId).sort(
    (a, b) => a.order - b.order
  );
}

export function getLessonById(lessonId: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === lessonId);
}
