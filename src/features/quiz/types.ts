export type Language = 'hi' | 'en' | 'hinglish';
export type Localized = Record<Language, string>;
export type Difficulty = 'easy' | 'medium' | 'advanced';
export type Mode = 'journey' | 'quick' | 'revision' | 'together' | 'turns';
export type QuizQuestion = {
  id: string; revision: string; topic: string; lesson: string; difficulty: Difficulty;
  prompt: Localized; options: { id: string; label: Localized }[]; correct: string;
  explanation: Localized; source: Localized; context: Localized; review: 'editorial-pending' | 'reviewed';
  translationUnavailable?: boolean;
};
export type QuizLesson = { id: string; topic: string; number: number; questionIds: string[] };
export type QuizTopic = { id: string; title: Localized; count: number };
export type KnowledgeCard = { id: string; topic: string; milestone: number; title: Localized; body: Localized };
export type QuizBank = { version: 1; revision: string; questions: QuizQuestion[]; lessons: QuizLesson[]; topics: QuizTopic[]; cards: KnowledgeCard[] };
export type QuestionProgress = { revision: string; seen: number; wrong: number; lastSeen: string; stage: number; lastRecall: string | null; due: string; mastered: boolean };
export type QuizSession = {
  id: string; mode: Mode; lesson?: string; topic: string; difficulty: Difficulty | 'any';
  questions: QuizQuestion[]; index: number; answers: Record<string, string>;
  phase: 'handover' | 'question' | 'feedback' | 'results'; players: string[];
  acknowledged: string[]; startedAt: string;
};
export type RoundSummary = { id: string; mode: Mode; topic: string; difficulty: Difficulty | 'any'; score: number; total: number; date: string; playerScores: number[]; players: string[]; unlockedCards: string[] };
export type QuizProgress = {
  version: 1; settings: { language: Language; textSize: 'standard' | 'large' | 'extra'; haptics: boolean };
  questions: Record<string, QuestionProgress>; saved: string[];
  lessons: Record<string, { complete: boolean; best: number }>;
  cards: string[]; active: QuizSession | null; history: RoundSummary[];
  bests: Record<string, number>;
  totals: { soloRounds: number; familyRounds: number; answered: number; correct: number };
};
export type StartOptions = { mode: Mode; topic?: string; difficulty?: Difficulty | 'any'; count?: number; lesson?: string; revision?: 'wrong' | 'due' | 'saved'; players?: string[] };
export interface QuizBankRepository { load(): Promise<QuizBank> }
