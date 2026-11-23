import { getLessonById } from '../data/curriculumIndex';
import type { Lesson } from '../types/sportup';

const CACHED_LESSONS_KEY = 'sportup_offline_lessons_v2';
const LEGACY_LESSONS_KEY = 'sportup_offline_lessons_v1';
const MAX_CACHED_IDS = 400;

interface CachedMeta {
  savedAt: string;
}

function readMetaMap(): Record<string, CachedMeta> {
  const map: Record<string, CachedMeta> = {};
  try {
    const raw = localStorage.getItem(CACHED_LESSONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, CachedMeta>;
      Object.assign(map, parsed);
    }
    // Migrate IDs lightly if legacy store exists, then clear legacy bloated payload
    const legacyRaw = localStorage.getItem(LEGACY_LESSONS_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Record<string, { savedAt?: string }>;
      for (const [id, entry] of Object.entries(legacy)) {
        if (!map[id]) {
          map[id] = { savedAt: entry?.savedAt || new Date().toISOString() };
        }
      }
      localStorage.removeItem(LEGACY_LESSONS_KEY);
      localStorage.setItem(CACHED_LESSONS_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore storage read errors
  }
  return map;
}

export function saveLessonForOffline(lesson: Lesson): void {
  try {
    const map = readMetaMap();
    map[lesson.id] = {
      savedAt: new Date().toISOString(),
    };

    const entries = Object.entries(map);
    if (entries.length > MAX_CACHED_IDS) {
      entries.sort((a, b) => a[1].savedAt.localeCompare(b[1].savedAt));
      const trimmed = entries.slice(entries.length - MAX_CACHED_IDS);
      const nextMap: Record<string, CachedMeta> = {};
      for (const [k, v] of trimmed) nextMap[k] = v;
      localStorage.setItem(CACHED_LESSONS_KEY, JSON.stringify(nextMap));
    } else {
      localStorage.setItem(CACHED_LESSONS_KEY, JSON.stringify(map));
    }
  } catch (err) {
    console.warn('Não foi possível registrar aula offline:', err);
  }
}

export function getOfflineLessonIds(): Set<string> {
  const map = readMetaMap();
  return new Set(Object.keys(map));
}

export function getOfflineLesson(lessonId: string): Lesson | null {
  return getLessonById(lessonId) ?? null;
}
