import { evaluateMilestones, getTodayDateKey } from './mathEngine';
import type { DailyLogEntry, Operation, PlayerProgress, UpgradeId } from './types';

const STORAGE_KEY = 'sunny_sprout_math_v1';
const COOKIE_NAME = 'super_karas_math_cookie';

export function createInitialProgress(): PlayerProgress {
  return {
    stars: 0,
    totalStarsEarned: 0,
    totalAttempted: 0,
    totalCorrect: 0,
    bestCombo: 0,
    currentCorrectStreak: 0,
    bestCorrectStreak: 0,
    currentDailyStreak: 0,
    lastPracticeDate: null,
    dailyGoal: 15,
    dailyChestClaimedDate: null,
    upgrades: {
      kara: 0,
      kaitlyn: 0,
      cottage: 0,
      orchard: 0,
      lanterns: 0,
      well: 0,
      windmill: 0,
    },
    equippedAccessory: 'none',
    unlockedAccessories: ['none'],
    karaOutfitLevel: 0,
    karaEquippedOutfit: 0,
    kaitlynOutfitLevel: 0,
    kaitlynEquippedOutfit: 0,
    karaUnlockedOutfits: [],
    karaEquippedOutfits: { hat: null, shirt: null, pants: null, shoes: null },
    kaitlynUnlockedOutfits: [],
    kaitlynEquippedOutfits: { hat: null, shirt: null, pants: null, shoes: null },
    operationStats: {
      add: { attempted: 0, correct: 0, totalResponseMs: 0, highestTier: 1 },
      sub: { attempted: 0, correct: 0, totalResponseMs: 0, highestTier: 1 },
      mul: { attempted: 0, correct: 0, totalResponseMs: 0, highestTier: 1 },
      div: { attempted: 0, correct: 0, totalResponseMs: 0, highestTier: 1 },
    },
    dailyHistory: [],
    unlockedMilestones: [],
    muted: false,
    inputMode: 'choices',
    selectedOps: ['add', 'sub'],
    selectedDifficulty: 1,
    adaptiveDifficulty: true,
  };
}

function hydrateProgress(parsed: Partial<PlayerProgress>): PlayerProgress {
  const base = createInitialProgress();
  const upgrades = { ...base.upgrades };
  for (const key of Object.keys(base.upgrades) as UpgradeId[]) {
    const val = parsed.upgrades?.[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      upgrades[key] = val;
    }
  }
  return {
    ...base,
    ...parsed,
    currentCorrectStreak:
      typeof parsed.currentCorrectStreak === 'number' ? parsed.currentCorrectStreak : 0,
    bestCorrectStreak:
      typeof parsed.bestCorrectStreak === 'number'
        ? parsed.bestCorrectStreak
        : typeof parsed.bestCombo === 'number'
          ? parsed.bestCombo
          : 0,
    upgrades,
    operationStats: {
      add: { ...base.operationStats.add, ...(parsed.operationStats?.add ?? {}) },
      sub: { ...base.operationStats.sub, ...(parsed.operationStats?.sub ?? {}) },
      mul: { ...base.operationStats.mul, ...(parsed.operationStats?.mul ?? {}) },
      div: { ...base.operationStats.div, ...(parsed.operationStats?.div ?? {}) },
    },
    dailyHistory: Array.isArray(parsed.dailyHistory) ? parsed.dailyHistory : [],
    unlockedMilestones: Array.isArray(parsed.unlockedMilestones) ? parsed.unlockedMilestones : [],
    unlockedAccessories: Array.isArray(parsed.unlockedAccessories) ? parsed.unlockedAccessories : ['none'],
    karaOutfitLevel: typeof parsed.karaOutfitLevel === 'number' ? parsed.karaOutfitLevel : 0,
    karaEquippedOutfit: typeof parsed.karaEquippedOutfit === 'number' ? parsed.karaEquippedOutfit : 0,
    kaitlynOutfitLevel: typeof parsed.kaitlynOutfitLevel === 'number' ? parsed.kaitlynOutfitLevel : 0,
    kaitlynEquippedOutfit: typeof parsed.kaitlynEquippedOutfit === 'number' ? parsed.kaitlynEquippedOutfit : 0,
    karaUnlockedOutfits: Array.isArray(parsed.karaUnlockedOutfits) ? parsed.karaUnlockedOutfits : [],
    karaEquippedOutfits: {
      ...base.karaEquippedOutfits,
      ...(parsed.karaEquippedOutfits ?? {}),
    },
    kaitlynUnlockedOutfits: Array.isArray(parsed.kaitlynUnlockedOutfits) ? parsed.kaitlynUnlockedOutfits : [],
    kaitlynEquippedOutfits: {
      ...base.kaitlynEquippedOutfits,
      ...(parsed.kaitlynEquippedOutfits ?? {}),
    },
    selectedOps:
      Array.isArray(parsed.selectedOps) && parsed.selectedOps.length > 0
        ? parsed.selectedOps
        : base.selectedOps,
  };
}

export function readProgressCookie(): Partial<PlayerProgress> | null {
  try {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const prefix = `${COOKIE_NAME}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        const raw = decodeURIComponent(trimmed.slice(prefix.length));
        if (!raw) return null;
        return JSON.parse(raw) as Partial<PlayerProgress>;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function writeProgressCookie(progress: PlayerProgress): void {
  try {
    if (typeof document === 'undefined') return;
    // Keep compact cookie payload well under the 4096-byte cookie limit
    const compact: Partial<PlayerProgress> = {
      stars: progress.stars,
      totalStarsEarned: progress.totalStarsEarned,
      totalAttempted: progress.totalAttempted,
      totalCorrect: progress.totalCorrect,
      bestCombo: progress.bestCombo,
      currentCorrectStreak: progress.currentCorrectStreak,
      bestCorrectStreak: progress.bestCorrectStreak,
      currentDailyStreak: progress.currentDailyStreak,
      lastPracticeDate: progress.lastPracticeDate,
      dailyGoal: progress.dailyGoal,
      dailyChestClaimedDate: progress.dailyChestClaimedDate,
      upgrades: progress.upgrades,
      operationStats: progress.operationStats,
      dailyHistory: progress.dailyHistory.slice(-14),
      unlockedMilestones: progress.unlockedMilestones,
      muted: progress.muted,
      inputMode: progress.inputMode,
      selectedOps: progress.selectedOps,
      selectedDifficulty: progress.selectedDifficulty,
      adaptiveDifficulty: progress.adaptiveDifficulty,
    };
    const encoded = encodeURIComponent(JSON.stringify(compact));
    if (encoded.length <= 3900) {
      document.cookie = `${COOKIE_NAME}=${encoded}; max-age=31536000; path=/; SameSite=Lax`;
    }
  } catch {
    // Ignore cookie errors cleanly
  }
}

export function clearProgressCookies(): void {
  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
    }
  } catch {
    // Ignore cookie clear errors
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage remove errors
  }
}

export function loadProgress(): PlayerProgress {
  const base = createInitialProgress();
  try {
    const cookieParsed = readProgressCookie();
    let lsParsed: Partial<PlayerProgress> | null = null;
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        lsParsed = JSON.parse(raw) as Partial<PlayerProgress>;
      }
    }
    if (!cookieParsed && !lsParsed) return base;
    if (cookieParsed && !lsParsed) return hydrateProgress(cookieParsed);
    if (!cookieParsed && lsParsed) return hydrateProgress(lsParsed);

    // Prefer whichever store reflects more recent progress (or cookie as primary)
    const cScore = (cookieParsed!.totalAttempted ?? 0) + (cookieParsed!.totalStarsEarned ?? 0);
    const lScore = (lsParsed!.totalAttempted ?? 0) + (lsParsed!.totalStarsEarned ?? 0);
    return hydrateProgress(cScore >= lScore ? cookieParsed! : lsParsed!);
  } catch {
    return base;
  }
}

export function saveProgress(progress: PlayerProgress): void {
  writeProgressCookie(progress);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function getTodaySolvedCount(progress: PlayerProgress, now: Date = new Date()): number {
  const key = getTodayDateKey(now);
  return progress.dailyHistory.find((e) => e.date === key)?.correct ?? 0;
}

export function getLastNDaysChartData(
  progress: PlayerProgress,
  days: number = 7,
  now: Date = new Date()
): Array<DailyLogEntry & { label: string }> {
  const map = new Map<string, DailyLogEntry>();
  for (const entry of progress.dailyHistory) {
    map.set(entry.date, entry);
  }
  const result: Array<DailyLogEntry & { label: string }> = [];
  const weekdayFmt = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() - i);
    const key = getTodayDateKey(d);
    const found = map.get(key);
    result.push({
      date: key,
      label: i === 0 ? 'Today' : weekdayFmt[d.getDay()],
      solved: found?.solved ?? 0,
      correct: found?.correct ?? 0,
      starsEarned: found?.starsEarned ?? 0,
    });
  }
  return result;
}

export function generateSampleWeekProgress(base: PlayerProgress, now: Date = new Date()): PlayerProgress {
  const sampleDays: Array<{ offset: number; solved: number; correct: number; stars: number }> = [
    { offset: 5, solved: 12, correct: 10, stars: 165 },
    { offset: 4, solved: 16, correct: 15, stars: 260 },
    { offset: 3, solved: 18, correct: 16, stars: 310 },
    { offset: 2, solved: 15, correct: 14, stars: 245 },
    { offset: 1, solved: 20, correct: 18, stars: 350 },
  ];

  const mergedMap = new Map<string, DailyLogEntry>();
  for (const item of base.dailyHistory) {
    mergedMap.set(item.date, item);
  }
  for (const s of sampleDays) {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() - s.offset);
    const key = getTodayDateKey(d);
    if (!mergedMap.has(key)) {
      mergedMap.set(key, {
        date: key,
        solved: s.solved,
        correct: s.correct,
        starsEarned: s.stars,
      });
    }
  }

  const next: PlayerProgress = {
    ...base,
    stars: base.stars + 140,
    totalStarsEarned: base.totalStarsEarned + 1330,
    totalAttempted: base.totalAttempted + 81,
    totalCorrect: base.totalCorrect + 73,
    bestCombo: Math.max(base.bestCombo, 9),
    currentDailyStreak: Math.max(base.currentDailyStreak, 5),
    lastPracticeDate: base.lastPracticeDate ?? getTodayDateKey(new Date(now.getTime() - 86400000)),
    dailyHistory: Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    operationStats: {
      add: {
        attempted: base.operationStats.add.attempted + 28,
        correct: base.operationStats.add.correct + 26,
        totalResponseMs: base.operationStats.add.totalResponseMs + 72800,
        highestTier: Math.max(base.operationStats.add.highestTier, 2) as 1 | 2 | 3 | 4,
      },
      sub: {
        attempted: base.operationStats.sub.attempted + 24,
        correct: base.operationStats.sub.correct + 21,
        totalResponseMs: base.operationStats.sub.totalResponseMs + 79200,
        highestTier: Math.max(base.operationStats.sub.highestTier, 2) as 1 | 2 | 3 | 4,
      },
      mul: {
        attempted: base.operationStats.mul.attempted + 17,
        correct: base.operationStats.mul.correct + 15,
        totalResponseMs: base.operationStats.mul.totalResponseMs + 61200,
        highestTier: Math.max(base.operationStats.mul.highestTier, 2) as 1 | 2 | 3 | 4,
      },
      div: {
        attempted: base.operationStats.div.attempted + 12,
        correct: base.operationStats.div.correct + 11,
        totalResponseMs: base.operationStats.div.totalResponseMs + 48000,
        highestTier: Math.max(base.operationStats.div.highestTier, 1) as 1 | 2 | 3 | 4,
      },
    },
  };
  next.unlockedMilestones = evaluateMilestones(next);
  return next;
}

export function buildParentRecommendation(progress: PlayerProgress): string {
  const ops: Operation[] = ['add', 'sub', 'mul', 'div'];
  const practiced = ops.filter((o) => progress.operationStats[o].attempted > 0);
  if (practiced.length === 0) {
    return 'Start with a 10-question Addition or Subtraction round at Sprout level to establish a baseline.';
  }

  let lowestOp = practiced[0];
  let lowestAcc = 2;
  for (const op of practiced) {
    const st = progress.operationStats[op];
    const acc = st.correct / Math.max(1, st.attempted);
    if (acc < lowestAcc) {
      lowestAcc = acc;
      lowestOp = op;
    }
  }

  const names: Record<Operation, string> = {
    add: 'Addition',
    sub: 'Subtraction',
    mul: 'Multiplication',
    div: 'Division',
  };

  if (lowestAcc < 0.78) {
    return `Focus next on ${names[lowestOp]} (${Math.round(lowestAcc * 100)}% accuracy) using the helpful step-by-step hints.`;
  }

  const unpracticed = ops.find((o) => progress.operationStats[o].attempted === 0);
  if (unpracticed) {
    return `Strong mastery so far! Try introducing ${names[unpracticed]} at Sprout (1-digit) level next.`;
  }

  return 'Wonderful balanced fluency across all 4 operations! Try Adaptive or Oak (2-digit) mode to keep growing.';
}

export function exportProgressCsv(progress: PlayerProgress): string {
  const lines: string[] = [
    'Date,Problems Attempted,Problems Correct,Accuracy %,Stars Earned',
  ];
  for (const row of progress.dailyHistory) {
    const acc = row.solved > 0 ? Math.round((row.correct / row.solved) * 100) : 0;
    lines.push(`${row.date},${row.solved},${row.correct},${acc}%,${row.starsEarned}`);
  }
  lines.push('');
  lines.push('Operation,Attempted,Correct,Accuracy %,Avg Seconds,Highest Tier');
  (['add', 'sub', 'mul', 'div'] as Operation[]).forEach((op) => {
    const s = progress.operationStats[op];
    const acc = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
    const avgSec = s.attempted > 0 ? (s.totalResponseMs / s.attempted / 1000).toFixed(1) : '0.0';
    lines.push(`${op},${s.attempted},${s.correct},${acc}%,${avgSec},${s.highestTier}`);
  });
  return lines.join('\n');
}
