import type { LessonModuleType, PracticeKeyframe } from '../types/sportup';

export interface PlayTopic {
  slug: string;
  unitGroup: string;
  title: string;
  simpleSummary: string;
  howToDo: string;
  whenToUse: string;
  commonMistake: string;
  counterOrTip: string;
  moduleType: LessonModuleType;
  positions: string[];
  pose: PracticeKeyframe['pose'];
  startPos: [number, number];
  endPos: [number, number];
  ballTarget: [number, number];
  matePos?: [number, number];
}
