export type BreathPhaseId = "inhale" | "hold" | "exhale" | "rest";

export type BreathPhase = {
  id: BreathPhaseId;
  label: string;
  sanskrit: string;
  durationSeconds: number;
  prompt: string;
};

export type PranayamaPattern = {
  id: string;
  title: string;
  subtitle: string;
  sanskritName: string;
  icon: string;
  phases: readonly BreathPhase[];
  defaultRounds: number;
  totalRoundSeconds: number;
  description: string;
  benefit: string;
};

export const PRANAYAMA_PATTERNS: readonly PranayamaPattern[] = [
  {
    id: "prashanta",
    title: "Prashanta · Deep Calm",
    subtitle: "Calms the nervous system & eases tension",
    sanskritName: "प्रशान्त प्राणायाम",
    icon: "Leaf",
    phases: [
      {
        id: "inhale",
        label: "Inhale",
        sanskrit: "पूरक · Puraka",
        durationSeconds: 4,
        prompt: "Breathe in softly through your nose, expanding your heart.",
      },
      {
        id: "hold",
        label: "Hold",
        sanskrit: "आन्तर कुम्भक · Kumbhaka",
        durationSeconds: 2,
        prompt: "Rest gently in the quiet space between breaths.",
      },
      {
        id: "exhale",
        label: "Exhale",
        sanskrit: "रेचक · Rechaka",
        durationSeconds: 6,
        prompt: "Release slowly and soften your shoulders completely.",
      },
    ],
    defaultRounds: 5,
    totalRoundSeconds: 12,
    description: "4s Inhale · 2s Hold · 6s Exhale",
    benefit: "Reduces anxiety, stabilizes heart rate, cultivates peace",
  },
  {
    id: "sama_vritti",
    title: "Sama Vritti · Box Breath",
    subtitle: "Equal rhythm for supreme mental focus",
    sanskritName: "समवृत्ति प्राणायाम",
    icon: "Flower2",
    phases: [
      {
        id: "inhale",
        label: "Inhale",
        sanskrit: "पूरक · Puraka",
        durationSeconds: 4,
        prompt: "Inhale slowly and steadily for four count.",
      },
      {
        id: "hold",
        label: "Hold Full",
        sanskrit: "आन्तर कुम्भक · Antar",
        durationSeconds: 4,
        prompt: "Hold prana calmly with open awareness.",
      },
      {
        id: "exhale",
        label: "Exhale",
        sanskrit: "रेचक · Rechaka",
        durationSeconds: 4,
        prompt: "Smoothly exhale all breath without forcing.",
      },
      {
        id: "rest",
        label: "Hold Empty",
        sanskrit: "बाह्य कुम्भक · Bahya",
        durationSeconds: 4,
        prompt: "Rest in the serene stillness of emptiness.",
      },
    ],
    defaultRounds: 4,
    totalRoundSeconds: 16,
    description: "4s In · 4s Hold · 4s Out · 4s Rest",
    benefit: "Balances left & right hemispheres, sharpens clarity",
  },
  {
    id: "jagaran",
    title: "Prana Flow · Vital Energy",
    subtitle: "Awakens morning alertness & energy",
    sanskritName: "प्राण जागरण",
    icon: "Sunrise",
    phases: [
      {
        id: "inhale",
        label: "Inhale",
        sanskrit: "पूरक · Puraka",
        durationSeconds: 4,
        prompt: "Draw in vibrant morning prana deeply.",
      },
      {
        id: "exhale",
        label: "Exhale",
        sanskrit: "रेचक · Rechaka",
        durationSeconds: 4,
        prompt: "Exhale fully, grounding into the earth.",
      },
    ],
    defaultRounds: 8,
    totalRoundSeconds: 8,
    description: "4s Inhale · 4s Exhale",
    benefit: "Oxygenates blood, dispels lethargy, energizes mind",
  },
  {
    id: "ananda",
    title: "Ananda · 4-7-8 Stillness",
    subtitle: "Sacred deep restoration & grounding",
    sanskritName: "आनन्द प्राणायाम",
    icon: "Moon",
    phases: [
      {
        id: "inhale",
        label: "Inhale",
        sanskrit: "पूरक · Puraka",
        durationSeconds: 4,
        prompt: "Inhale quiet energy through your nose.",
      },
      {
        id: "hold",
        label: "Hold",
        sanskrit: "कुम्भक · Kumbhaka",
        durationSeconds: 7,
        prompt: "Let calmness soak into every single cell.",
      },
      {
        id: "exhale",
        label: "Exhale",
        sanskrit: "रेचक · Rechaka",
        durationSeconds: 8,
        prompt: "Sigh out smoothly, letting go of all thoughts.",
      },
    ],
    defaultRounds: 3,
    totalRoundSeconds: 19,
    description: "4s Inhale · 7s Hold · 8s Exhale",
    benefit: "Deepest parasympathetic activation and inner silence",
  },
] as const;

export const DEFAULT_PATTERN = PRANAYAMA_PATTERNS[0];
export const BREATH_PHASES = DEFAULT_PATTERN.phases;
export const ROUND_SECONDS = DEFAULT_PATTERN.totalRoundSeconds;
export const TOTAL_ROUNDS = DEFAULT_PATTERN.defaultRounds;
export const SESSION_SECONDS = ROUND_SECONDS * TOTAL_ROUNDS;

export type BreathSessionSnapshot = {
  phase: BreathPhase;
  phaseElapsedSeconds: number;
  phaseSecondsRemaining: number;
  phaseProgress: number;
  round: number;
  totalRounds: number;
  totalDurationSeconds: number;
  elapsedSeconds: number;
  complete: boolean;
};

/**
 * Computes snapshot of the breathing session.
 */
export function getBreathSessionSnapshot(
  elapsedMs: number,
  pattern: PranayamaPattern = DEFAULT_PATTERN,
  roundsMultiplier = 1,
): BreathSessionSnapshot {
  const totalRounds = Math.max(1, pattern.defaultRounds * roundsMultiplier);
  const totalDurationSeconds = pattern.totalRoundSeconds * totalRounds;

  const elapsedSeconds = Math.min(
    totalDurationSeconds,
    Math.max(0, Math.floor(elapsedMs / 1000)),
  );
  const complete = elapsedSeconds >= totalDurationSeconds;
  const secondInRound = complete
    ? pattern.totalRoundSeconds - 1
    : elapsedSeconds % pattern.totalRoundSeconds;

  let offset = 0;
  const phase =
    pattern.phases.find((candidate) => {
      const endsAt = offset + candidate.durationSeconds;
      const matches = secondInRound < endsAt;
      if (!matches) offset = endsAt;
      return matches;
    }) ?? pattern.phases[pattern.phases.length - 1];

  const phaseElapsedSeconds = Math.max(0, secondInRound - offset);

  return {
    phase,
    phaseElapsedSeconds,
    phaseSecondsRemaining: complete
      ? 0
      : Math.max(0, phase.durationSeconds - phaseElapsedSeconds),
    phaseProgress: complete
      ? 1
      : Math.min(1, phaseElapsedSeconds / phase.durationSeconds),
    round: complete
      ? totalRounds
      : Math.floor(elapsedSeconds / pattern.totalRoundSeconds) + 1,
    totalRounds,
    totalDurationSeconds,
    elapsedSeconds,
    complete,
  };
}
