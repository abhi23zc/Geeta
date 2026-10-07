import React from 'react';
import { DailyGoalCard } from './daily-goal-card';
import { GoalStreakBadge } from './goal-streak-badge';
import { MilestoneRoadmap } from './milestone-roadmap';
import { SadhanaCalendar } from './sadhana-calendar';
import { LedgerList } from './ledger-list';

export { DailyGoalCard, GoalStreakBadge, MilestoneRoadmap, SadhanaCalendar, LedgerList };

export function ProgressSummary({ link = true }: { link?: boolean }) {
  return <DailyGoalCard link={link} />;
}
