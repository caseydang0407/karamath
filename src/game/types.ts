export type Operation = 'add' | 'sub' | 'mul' | 'div';

export type DifficultyLevel = 1 | 2 | 3 | 4;

export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type UpgradeId =
  | 'kara'
  | 'kaitlyn'
  | 'cottage'
  | 'orchard'
  | 'lanterns'
  | 'well'
  | 'windmill';

export type VisitorSpecies = 'rabbit' | 'squirrel';

export type ScratchStrategy = 'vertical' | 'numberline' | 'blocks' | 'visual';

export type AccessoryId = 'none' | 'leaf_crown' | 'sun_hat' | 'wizard_cap' | 'star_glasses';

export type CharacterId = 'kara' | 'kaitlyn';

export type OutfitCategory = 'hat' | 'shirt' | 'pants' | 'shoes';

export type WeatherType = 'clear' | 'rain' | 'snow';

export interface OutfitItemDef {
  id: string;
  category: OutfitCategory;
  tier: number;
  name: string;
  description: string;
  cost: number;
}

export interface CharacterOutfitSelection {
  hat: string | null;
  shirt: string | null;
  pants: string | null;
  shoes: string | null;
}

export interface OutfitStageDef {
  level: number;
  name: string;
  description: string;
  cost: number;
}

export interface MathProblem {
  id: string;
  a: number;
  b: number;
  operation: Operation;
  symbol: '+' | '−' | '×' | '÷';
  answer: number;
  choices: number[];
  hint: string;
  tier: DifficultyLevel;
}

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  tagline: string;
  effectSummary: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
  accentHex: string;
  stageNames?: string[];
}

export interface OperationStat {
  attempted: number;
  correct: number;
  totalResponseMs: number;
  highestTier: DifficultyLevel;
}

export interface DailyLogEntry {
  date: string; // YYYY-MM-DD
  solved: number;
  correct: number;
  starsEarned: number;
}

export interface MilestoneDef {
  id: string;
  title: string;
  description: string;
  category: 'practice' | 'mastery' | 'streak' | 'garden' | 'achievement';
  target: number;
  getValue: (progress: PlayerProgress) => number;
}

export interface PlayerProgress {
  stars: number;
  totalStarsEarned: number;
  totalAttempted: number;
  totalCorrect: number;
  bestCombo: number;
  currentCorrectStreak: number;
  bestCorrectStreak: number;
  currentDailyStreak: number;
  lastPracticeDate: string | null;
  dailyGoal: number;
  dailyChestClaimedDate: string | null;
  upgrades: Record<UpgradeId, number>;
  equippedAccessory: AccessoryId;
  unlockedAccessories: AccessoryId[];
  karaOutfitLevel: number;
  karaEquippedOutfit: number;
  kaitlynOutfitLevel: number;
  kaitlynEquippedOutfit: number;
  karaUnlockedOutfits: string[];
  karaEquippedOutfits: CharacterOutfitSelection;
  kaitlynUnlockedOutfits: string[];
  kaitlynEquippedOutfits: CharacterOutfitSelection;
  operationStats: Record<Operation, OperationStat>;
  dailyHistory: DailyLogEntry[];
  unlockedMilestones: string[];
  muted: boolean;
  inputMode: 'choices' | 'keypad';
  selectedOps: Operation[];
  selectedDifficulty: DifficultyLevel;
  adaptiveDifficulty: boolean;
}

export interface RoundSummary {
  questionsAnswered: number;
  correctCount: number;
  bestCombo: number;
  starsEarned: number;
  chestBonus: number;
  cottageBonus?: number;
  averageMs: number;
}
