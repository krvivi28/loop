import {
  Sun, CloudSun, Sunset, Moon, Zap, Dumbbell, Pill, Citrus, Gem, Milk, FlaskConical, Fish,
  Sprout, Leaf, Package, type LucideIcon,
} from 'lucide-react';
import type { FoodInstruction, Form, Goal, MealType, Slot } from './types';

export const SLOT_ORDER: Slot[] = ['morning', 'pre_workout', 'afternoon', 'post_workout', 'evening', 'night'];

export const SLOTS: Record<Slot, { label: string; icon: LucideIcon; defaultTime: string; endsAt: number }> = {
  morning: { label: 'Morning', icon: Sun, defaultTime: '08:00', endsAt: 12 },
  afternoon: { label: 'Afternoon', icon: CloudSun, defaultTime: '14:00', endsAt: 17 },
  evening: { label: 'Evening', icon: Sunset, defaultTime: '19:00', endsAt: 21 },
  night: { label: 'Night', icon: Moon, defaultTime: '22:00', endsAt: 24 },
  pre_workout: { label: 'Pre-workout', icon: Zap, defaultTime: '', endsAt: 24 },
  post_workout: { label: 'Post-workout', icon: Dumbbell, defaultTime: '', endsAt: 24 },
};

export const DEFAULT_CATEGORIES = [
  'Medicine', 'Vitamin', 'Mineral', 'Protein', 'Pre-Workout', 'Creatine',
  'Omega-3 / Fish Oil', 'Probiotic', 'Herbal / Ayurvedic', 'Other',
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Medicine: Pill,
  Vitamin: Citrus,
  Mineral: Gem,
  Protein: Milk,
  'Pre-Workout': Zap,
  Creatine: FlaskConical,
  'Omega-3 / Fish Oil': Fish,
  Probiotic: Sprout,
  'Herbal / Ayurvedic': Leaf,
};
export const categoryIcon = (c: string): LucideIcon => CATEGORY_ICONS[c] ?? Package;

export const FORMS: Record<Form, { label: string; one: string; many: string }> = {
  tablet: { label: 'Tablet', one: 'tablet', many: 'tablets' },
  capsule: { label: 'Capsule', one: 'capsule', many: 'capsules' },
  scoop: { label: 'Scoop / Powder', one: 'scoop', many: 'scoops' },
  liquid: { label: 'Liquid', one: 'ml', many: 'ml' },
  drops: { label: 'Drops', one: 'drop', many: 'drops' },
  gummy: { label: 'Gummy', one: 'gummy', many: 'gummies' },
  injection: { label: 'Injection', one: 'shot', many: 'shots' },
};
export const unitLabel = (form: Form, n: number) => `${n} ${n === 1 ? FORMS[form].one : FORMS[form].many}`;

export const FOOD_INSTRUCTIONS: Record<FoodInstruction, string> = {
  before: 'Before food',
  with: 'With food',
  after: 'After food',
  empty_stomach: 'Empty stomach',
  none: 'Any time',
};

export const MEAL_TYPES: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
};

export const GOALS: Record<Goal, string> = {
  muscle_gain: 'Muscle gain',
  fat_loss: 'Fat loss',
  maintenance: 'Maintenance',
  endurance: 'Endurance',
};

export const ACCENTS = [
  { name: 'Energy Orange', hex: '#FF6B00' },
  { name: 'Neon Lime', hex: '#C6FF00' },
  { name: 'Electric Blue', hex: '#00B4FF' },
  { name: 'Beast Red', hex: '#FF1744' },
  { name: 'Ultra Violet', hex: '#7C4DFF' },
  { name: 'Mint', hex: '#00E5A0' },
];

export const SUPP_COLORS = [
  '#FF6B00', '#FFC400', '#C6FF00', '#00E5A0', '#00B4FF', '#3D5AFE',
  '#7C4DFF', '#E040FB', '#FF4081', '#FF1744', '#8D6E63', '#90A4AE',
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SKIP_REASONS = ['Forgot', 'Ran out', 'Felt unwell', 'Doctor advised', 'Other'];
