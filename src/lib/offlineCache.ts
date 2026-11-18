import type { Lesson } from '../types/sportup';

const CACHED_LESSONS_KEY = 'sportup_offline_lessons_v1';

export function saveLessonForOffline(lesson: Lesson): void {
  try {
    const raw = localStorage.getItem(CACHED_LESSONS_KEY);
    const map: Record<string, { lesson: Lesson; savedAt: string }> = raw
      ? JSON.parse(raw)
      : {};
    map[lesson.id] = {
      lesson,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHED_LESSONS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Não foi possível salvar aula offline:', err);
  }
}

export function getOfflineLessonIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CACHED_LESSONS_KEY);
    if (!raw) return new Set();
    const map = JSON.parse(raw) as Record<string, unknown>;
    return new Set(Object.keys(map));
  } catch {
    return new Set();
  }
}

export function getOfflineLesson(lessonId: string): Lesson | null {
  try {
    const raw = localStorage.getItem(CACHED_LESSONS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, { lesson: Lesson }>;
    return map[lessonId]?.lesson ?? null;
  } catch {
    return null;
  }
}
