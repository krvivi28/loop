import type { Goal, Targets } from './types';

/** Simple bodyweight-based targets. */
export function suggestTargets(weightKg: number, goal: Goal = 'maintenance'): Targets {
  const kcalPerKg = { muscle_gain: 35, fat_loss: 26, maintenance: 31, endurance: 36 }[goal];
  const proteinPerKg = { muscle_gain: 2.0, fat_loss: 2.2, maintenance: 1.6, endurance: 1.6 }[goal];
  const calories = Math.round((weightKg * kcalPerKg) / 10) * 10;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { calories, proteinG, fatG, carbsG, waterMl: Math.round((weightKg * 40) / 250) * 250 };
}
