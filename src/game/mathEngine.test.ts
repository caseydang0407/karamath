import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENT_STREAK_TARGETS,
  calculatePointsEarned,
  canUnlockOutfitItem,
  equipOutfitItem,
  equipOutfitStage,
  generateProblem,
  getAffordableUpgradeIds,
  getComboMultiplier,
  getDailyChestBonus,
  getEffectiveTier,
  getUpgradeCost,
  isUpgradeLocked,
  OUTFIT_ITEMS,
  purchaseOutfitItem,
  purchaseOutfitStage,
  purchaseUpgrade,
  recordAnswerResult,
  sortUpgradesForDisplay,
  UPGRADE_DEFS,
} from './mathEngine';
import { clearProgressCookies, createInitialProgress, loadProgress } from './storage';
import {
  breakEggContainer,
  buildEggUnits,
  hatchExactEggs,
  sumEggUnits,
} from './visualGroups';
import { computeLightingCycle } from '../three/lightingCycle';
import { getWeatherMoodModifiers, pickRandomWeather } from '../three/weatherSystem';
import type { DifficultyLevel, Operation } from './types';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('generates valid problems for all operations and tiers with 4 unique non-negative choices', () => {
  const ops: Operation[] = ['add', 'sub', 'mul', 'div'];
  const tiers: DifficultyLevel[] = [1, 2, 3, 4];
  const rng = seededRng(42);

  for (const op of ops) {
    for (const tier of tiers) {
      for (let i = 0; i < 15; i++) {
        const p = generateProblem([op], tier, rng);
        assert.equal(p.operation, op);
        assert.equal(p.choices.length, 4);
        assert.equal(new Set(p.choices).size, 4, 'choices must be unique');
        assert.ok(p.choices.includes(p.answer), 'choices must contain exact answer');
        assert.ok(p.answer >= 0, 'answer must be non-negative');
        assert.ok(Number.isInteger(p.answer), 'answer must be an integer');

        if (op === 'add') assert.equal(p.a + p.b, p.answer);
        if (op === 'sub') assert.equal(p.a - p.b, p.answer);
        if (op === 'mul') assert.equal(p.a * p.b, p.answer);
        if (op === 'div') assert.equal(p.a / p.b, p.answer);

        if (tier === 1 && (op === 'add' || op === 'sub')) {
          assert.ok(p.a <= 9 && p.b <= 9, 'tier 1 add/sub must be 1-digit');
        }
      }
    }
  }
});

test('combo multiplier scales up and respects pinwheel and flower upgrade caps', () => {
  assert.equal(getComboMultiplier(0, 0), 1);
  assert.equal(getComboMultiplier(2, 0), 1.5);
  assert.equal(getComboMultiplier(4, 0), 2);
  assert.equal(getComboMultiplier(10, 0), 3); // capped at 3x with pinwheel lv 0
  assert.equal(getComboMultiplier(10, 4), 3.5);
  assert.equal(getComboMultiplier(16, 4), 5);
  assert.equal(getComboMultiplier(2, 0, 1), 1.75);
});

test('adaptive difficulty steps up cleanly every 4 streak', () => {
  assert.equal(getEffectiveTier(1, false, 10), 1);
  assert.equal(getEffectiveTier(1, true, 0), 1);
  assert.equal(getEffectiveTier(1, true, 4), 2);
  assert.equal(getEffectiveTier(1, true, 8), 3);
  assert.equal(getEffectiveTier(1, true, 16), 4);
});

test('star reward system awards strictly 1 star per correct question across tiers and upgrades', () => {
  const initial = createInitialProgress();
  initial.stars = 50;

  assert.equal(calculatePointsEarned(1, 1, initial.upgrades), 1);
  assert.equal(calculatePointsEarned(4, 10, initial.upgrades), 1);

  const { next, purchased } = purchaseUpgrade(initial, 'orchard');
  assert.equal(purchased, true);
  assert.equal(next.upgrades.orchard, 1);
  assert.equal(next.stars, 48); // orchard lv 1 costs 2 stars
  assert.equal(calculatePointsEarned(3, 8, next.upgrades), 1);
});

test('Moonbeam Cottage starts from flat ground with Stone Foundation at 2 stars and 30 stages', () => {
  const cottageDef = UPGRADE_DEFS.find((u) => u.id === 'cottage');
  assert.ok(cottageDef);
  assert.equal(cottageDef.name, 'Moonbeam Cottage');
  assert.equal(cottageDef.maxLevel, 30);
  assert.equal(cottageDef.stageNames?.length, 30);
  assert.equal(cottageDef.stageNames?.[0], 'Stone Foundation');
  assert.equal(cottageDef.stageNames?.[1], 'Wooden Pillar #1 (Front Left)');
  assert.equal(cottageDef.stageNames?.[21], 'Add Designs on the Wall');
  assert.equal(cottageDef.stageNames?.[29], 'Porch Bench & Welcome Mat');

  const initial = createInitialProgress();
  assert.equal(initial.upgrades.cottage, 0);
  assert.equal(getUpgradeCost(cottageDef, 0), 2);
  assert.equal(getUpgradeCost(cottageDef, 1), 3);
  assert.equal(getUpgradeCost(cottageDef, 2), 4);
  assert.equal(getUpgradeCost(cottageDef, 3), 6);

  initial.stars = 2;
  const res = purchaseUpgrade(initial, 'cottage');
  assert.equal(res.purchased, true);
  assert.equal(res.next.upgrades.cottage, 1);
  assert.equal(res.next.stars, 0);
});

test('recording answers updates daily streak, daily goal chest, and lantern combo shield', () => {
  let progress = createInitialProgress();
  progress.dailyGoal = 2;
  progress.upgrades.lanterns = 1;

  const p1 = generateProblem(['add'], 1, seededRng(1));
  const day1 = new Date(2026, 10, 22, 10, 0, 0);
  const res1 = recordAnswerResult(progress, p1, true, 2400, 0, 1, day1);
  progress = res1.nextProgress;
  assert.equal(res1.starsGained, 1);
  assert.equal(res1.nextCombo, 1);
  assert.equal(progress.currentDailyStreak, 1);
  assert.equal(res1.chestClaimedBonus, 0);

  // Second correct answer on same day hits dailyGoal=2 and claims modest chest bonus (3)
  const res2 = recordAnswerResult(progress, p1, true, 2000, res1.nextCombo, res1.nextShields, day1);
  progress = res2.nextProgress;
  assert.equal(res2.starsGained, 1);
  assert.equal(res2.nextCombo, 2);
  assert.equal(res2.chestClaimedBonus, 3);

  // Wrong answer uses Firefly Lantern shield and preserves combo!
  const res3 = recordAnswerResult(progress, p1, false, 3000, res2.nextCombo, 1, day1);
  assert.equal(res3.shieldUsed, true);
  assert.equal(res3.nextShields, 0);
  assert.equal(res3.nextCombo, 2);

  // Next day continues streak
  const day2 = new Date(2026, 10, 23, 10, 0, 0);
  const res4 = recordAnswerResult(res3.nextProgress, p1, true, 1800, 2, 0, day2);
  assert.equal(res4.nextProgress.currentDailyStreak, 2);
});

test('progressive outfit stages unlock sequentially and equip cleanly for Kara and Kaitlyn', () => {
  let p = createInitialProgress();
  p.stars = 10;

  // Unlock Kara stage 1 (undershirt, cost 2)
  const k1 = purchaseOutfitStage(p, 'kara');
  assert.equal(k1.purchased, true);
  assert.equal(k1.next.karaOutfitLevel, 1);
  assert.equal(k1.next.karaEquippedOutfit, 1);
  assert.equal(k1.next.stars, 8);

  // Unlock Kara stage 2 (buttons, cost 3)
  const k2 = purchaseOutfitStage(k1.next, 'kara');
  assert.equal(k2.purchased, true);
  assert.equal(k2.next.karaOutfitLevel, 2);
  assert.equal(k2.next.karaEquippedOutfit, 2);
  assert.equal(k2.next.stars, 5);

  // Can switch back to stage 1 or 0, cannot equip locked stage 5
  const eq1 = equipOutfitStage(k2.next, 'kara', 1);
  assert.equal(eq1.karaEquippedOutfit, 1);
  const eqClamped = equipOutfitStage(eq1, 'kara', 5);
  assert.equal(eqClamped.karaEquippedOutfit, 2);

  // Unlock Kaitlyn stage 1 (cost 2)
  const c1 = purchaseOutfitStage(eqClamped, 'kaitlyn');
  assert.equal(c1.purchased, true);
  assert.equal(c1.next.kaitlynOutfitLevel, 1);
  assert.equal(c1.next.kaitlynEquippedOutfit, 1);
  assert.equal(c1.next.stars, 3);
});

test('lighting cycle transitions smoothly between day, sunset, and night by local time', () => {
  const noon = computeLightingCycle(new Date(2026, 10, 23, 12, 0, 0));
  assert.equal(noon.theme, 'day');
  assert.equal(noon.nightStarsOpacity, 0);
  assert.ok(noon.sunIntensity > 1.3);

  const sunset = computeLightingCycle(new Date(2026, 10, 23, 18, 0, 0));
  assert.equal(sunset.theme, 'sunset');
  assert.ok(sunset.ambientGlowFactor > 0.5);

  const night = computeLightingCycle(new Date(2026, 10, 23, 22, 30, 0));
  assert.equal(night.theme, 'night');
  assert.ok(night.nightStarsOpacity > 0.8);
  assert.ok(night.sunIntensity < 0.8);
});

test('Sunbeam Orchard, Sky Spinner, Firefly Pergola & Wishing Well progress across 20 stages, Moonbeam Cottage across 30, and removed upgrades are absent', () => {
  assert.equal(UPGRADE_DEFS.some((u) => (u.id as string) === 'trees'), false);
  assert.equal(UPGRADE_DEFS.some((u) => (u.id as string) === 'fountain'), false);
  assert.equal(UPGRADE_DEFS.some((u) => (u.id as string) === 'flowers'), false);
  assert.equal(UPGRADE_DEFS.some((u) => (u.id as string) === 'pinwheel'), false);
  assert.equal(UPGRADE_DEFS.some((u) => (u.id as string) === 'animals'), false);

  const orchardDef = UPGRADE_DEFS.find((u) => u.id === 'orchard');
  assert.ok(orchardDef);
  assert.equal(orchardDef.maxLevel, 20);
  assert.equal(orchardDef.stageNames?.length, 20);
  assert.equal(orchardDef.stageNames?.[0], 'Seed');
  assert.equal(orchardDef.stageNames?.[8], 'White Flowers');
  assert.equal(orchardDef.stageNames?.[13], 'Wild Flowers Around Trunk');
  assert.equal(orchardDef.stageNames?.[19], 'Branch Lantern & Golden Fireflies');

  const windmillDef = UPGRADE_DEFS.find((u) => u.id === 'windmill');
  assert.ok(windmillDef);
  assert.equal(windmillDef.name, 'Sky Spinner');
  assert.equal(windmillDef.maxLevel, 20);
  assert.equal(windmillDef.stageNames?.length, 20);

  const pergolaDef = UPGRADE_DEFS.find((u) => u.id === 'lanterns');
  assert.ok(pergolaDef);
  assert.equal(pergolaDef.name, 'Firefly Pergola');
  assert.equal(pergolaDef.maxLevel, 20);
  assert.equal(pergolaDef.stageNames?.length, 20);

  const wellDef = UPGRADE_DEFS.find((u) => u.id === 'well');
  assert.ok(wellDef);
  assert.equal(wellDef.name, 'Wishing Well');
  assert.equal(wellDef.maxLevel, 20);
  assert.equal(wellDef.stageNames?.length, 20);
  assert.equal(getDailyChestBonus(0), 3);
  assert.equal(getDailyChestBonus(4), 5);

  let p = createInitialProgress();
  p.stars = 500000;
  for (let i = 1; i <= 30; i++) {
    const res = purchaseUpgrade(p, 'cottage');
    assert.equal(res.purchased, true);
    p = res.next;
    assert.equal(p.upgrades.cottage, i);
  }
  assert.equal(purchaseUpgrade(p, 'cottage').purchased, false);

  for (const id of ['orchard', 'windmill', 'lanterns', 'well'] as const) {
    for (let i = 1; i <= 20; i++) {
      const res = purchaseUpgrade(p, id);
      assert.equal(res.purchased, true);
      p = res.next;
      assert.equal(p.upgrades[id], i);
    }
    assert.equal(purchaseUpgrade(p, id).purchased, false);
  }
});

test('Achievements badge system triggers at 10..100 consecutive correct answers and saves to progress', () => {
  let p = createInitialProgress();
  const prob = generateProblem(['add'], 1, seededRng(7));
  const day = new Date(2026, 10, 24, 10, 0, 0);

  const triggeredAt: number[] = [];
  for (let i = 1; i <= 100; i++) {
    const res = recordAnswerResult(p, prob, true, 1500, i - 1, 0, day);
    p = res.nextProgress;
    assert.equal(p.currentCorrectStreak, i);
    for (const target of ACHIEVEMENT_STREAK_TARGETS) {
      if (res.newlyUnlockedMilestones.includes(`streak_${target}`)) {
        triggeredAt.push(i);
      }
    }
  }

  assert.deepEqual(triggeredAt, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  for (const target of ACHIEVEMENT_STREAK_TARGETS) {
    assert.equal(p.unlockedMilestones.includes(`streak_${target}`), true);
  }

  // Wrong answer resets currentCorrectStreak to 0 but preserves unlocked badges and bestCorrectStreak
  const wrongRes = recordAnswerResult(p, prob, false, 2000, 100, 0, day);
  assert.equal(wrongRes.nextProgress.currentCorrectStreak, 0);
  assert.equal(wrongRes.nextProgress.bestCorrectStreak, 100);
  assert.equal(wrongRes.nextProgress.unlockedMilestones.includes('streak_100'), true);
});

test('categorized wardrobe unlocks sequentially per category and equips mix-and-match slots independently', () => {
  let p = createInitialProgress();
  p.stars = 30;

  const hatTier2 = OUTFIT_ITEMS.find((i) => i.id === 'hat_straw')!;
  assert.equal(canUnlockOutfitItem(p.karaUnlockedOutfits, hatTier2), false);

  // Unlock hat tier 1 + pants tier 1 + shoes tier 1 independently
  const rHat = purchaseOutfitItem(p, 'kara', 'hat_knit');
  assert.equal(rHat.purchased, true);
  assert.equal(rHat.next.karaEquippedOutfits.hat, 'hat_knit');

  const rPants = purchaseOutfitItem(rHat.next, 'kara', 'pants_shorts');
  assert.equal(rPants.purchased, true);
  assert.equal(rPants.next.karaEquippedOutfits.hat, 'hat_knit');
  assert.equal(rPants.next.karaEquippedOutfits.pants, 'pants_shorts');

  const rShoes = purchaseOutfitItem(rPants.next, 'kara', 'shoes_sneakers');
  assert.equal(rShoes.purchased, true);
  assert.equal(rShoes.next.karaEquippedOutfits.shoes, 'shoes_sneakers');

  // Now hat tier 2 can unlock
  assert.equal(canUnlockOutfitItem(rShoes.next.karaUnlockedOutfits, hatTier2), true);
  const rHat2 = purchaseOutfitItem(rShoes.next, 'kara', 'hat_straw');
  assert.equal(rHat2.purchased, true);
  assert.equal(rHat2.next.karaEquippedOutfits.hat, 'hat_straw');

  // Take off hat while keeping pants & shoes on
  const removedHat = equipOutfitItem(rHat2.next, 'kara', 'hat', null);
  assert.equal(removedHat.karaEquippedOutfits.hat, null);
  assert.equal(removedHat.karaEquippedOutfits.pants, 'pants_shorts');
  assert.equal(removedHat.karaEquippedOutfits.shoes, 'shoes_sneakers');

  // Cannot equip unowned item on Kaitlyn
  const invalidEquip = equipOutfitItem(removedHat, 'kaitlyn', 'shirt', 'shirt_jacket');
  assert.equal(invalidEquip.kaitlynEquippedOutfits.shirt, null);
});

test('weather system returns distinct mood modifiers and valid weather transitions', () => {
  const clearMood = getWeatherMoodModifiers('clear');
  const rainMood = getWeatherMoodModifiers('rain');
  const snowMood = getWeatherMoodModifiers('snow');

  assert.equal(clearMood.rainOpacity, 0);
  assert.equal(clearMood.snowOpacity, 0);
  assert.ok(rainMood.rainOpacity > 0.5 && rainMood.sunMultiplier < 0.7);
  assert.ok(snowMood.snowOpacity > 0.7 && snowMood.fogDensity > clearMood.fogDensity);

  const rng = seededRng(99);
  for (let i = 0; i < 15; i++) {
    const nextW = pickRandomWeather(rng, 'clear');
    assert.ok(nextW === 'rain' || nextW === 'snow');
  }
});

test('upgrade costs scale by x1.3 rounded up to a whole number and Kaitlyn unlocks only after Kara completes 20 stages', () => {
  const orchardDef = UPGRADE_DEFS.find((u) => u.id === 'orchard')!;
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((lvl) => getUpgradeCost(orchardDef, lvl)),
    [2, 3, 4, 6, 8]
  );

  const kaitlynDef = UPGRADE_DEFS.find((u) => u.id === 'kaitlyn')!;
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((lvl) => getUpgradeCost(kaitlynDef, lvl)),
    [4, 6, 8, 11, 15]
  );

  const windmillDef = UPGRADE_DEFS.find((u) => u.id === 'windmill')!;
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => getUpgradeCost(windmillDef, lvl)),
    [2, 3, 4, 6, 8, 11, 15, 20, 26, 34, 45]
  );

  let p = createInitialProgress();
  p.stars = 50000;

  // Kaitlyn locked initially
  assert.equal(isUpgradeLocked(p, 'kaitlyn'), true);
  assert.equal(getAffordableUpgradeIds(p).includes('kaitlyn'), false);
  const blocked = purchaseUpgrade(p, 'kaitlyn');
  assert.equal(blocked.purchased, false);

  // Upgrade Kara across all 20 stages
  for (let i = 1; i <= 20; i++) {
    const res = purchaseUpgrade(p, 'kara');
    assert.equal(res.purchased, true);
    p = res.next;
    assert.equal(p.upgrades.kara, i);
  }
  assert.equal(isUpgradeLocked(p, 'kaitlyn'), false);
  assert.equal(getAffordableUpgradeIds(p).includes('kaitlyn'), true);

  // Upgrade Kaitlyn across all 21 stages
  for (let i = 1; i <= 21; i++) {
    const res = purchaseUpgrade(p, 'kaitlyn');
    assert.equal(res.purchased, true);
    p = res.next;
    assert.equal(p.upgrades.kaitlyn, i);
  }
  assert.equal(purchaseUpgrade(p, 'kaitlyn').purchased, false);
});

test('cookie persistence helpers degrade safely in non-DOM test environment', () => {
  clearProgressCookies();
  const loaded = loadProgress();
  assert.equal(loaded.stars, 0);
  assert.equal(loaded.upgrades.kara, 0);
  assert.equal(loaded.upgrades.kaitlyn, 0);
});

test('sortUpgradesForDisplay puts eligible affordable upgrades at the top and maxed/locked at the bottom', () => {
  const p = createInitialProgress();
  p.upgrades.kara = 1; // Lv 1 -> next costs 3 stars
  p.upgrades.cottage = 1; // Lv 1 -> next costs 3 stars
  p.upgrades.lanterns = 1; // Lv 1 -> next costs 3 stars
  p.upgrades.well = 20; // Maxed out
  p.upgrades.orchard = 0; // Next costs 2 stars (affordable!)
  p.upgrades.windmill = 0; // Next costs 2 stars (affordable!)
  p.stars = 2;

  const sortedIds = sortUpgradesForDisplay(p).map((u) => u.id);
  // Affordable unlocked items ('orchard', 'windmill') must come before unaffordable ones
  assert.deepEqual(sortedIds.slice(0, 2), ['orchard', 'windmill']);
  // Locked 'kaitlyn' and maxed 'well' must trail at the end
  assert.equal(sortedIds[sortedIds.length - 1], 'well');
  assert.equal(sortedIds[sortedIds.length - 2], 'kaitlyn');
});

test('visual egg/chick groups stay exact across 1-digit, 2-digit, and 3-digit problems', () => {
  // Small numbers stay individual 1-egg units
  const smallUnits = buildEggUnits(14, 'test', 24);
  assert.equal(smallUnits.length, 14);
  assert.equal(sumEggUnits(smallUnits), 14);

  // Larger numbers decompose cleanly into 100-crates, 10-cartons, and 1-eggs
  const bigUnits = buildEggUnits(147, 'test', 30);
  assert.equal(sumEggUnits(bigUnits), 147);
  assert.equal(bigUnits.filter((u) => u.value === 100).length, 1);
  assert.equal(bigUnits.filter((u) => u.value === 10).length, 4);
  assert.equal(bigUnits.filter((u) => u.value === 1).length, 7);

  // Unpacking a 10-tray preserves exact total
  const broken = breakEggContainer(bigUnits);
  assert.equal(sumEggUnits(broken), 147);
  assert.equal(broken.filter((u) => u.value === 1).length, 17);

  // Hatching exact subtraction amount across regrouping boundaries (e.g. 142 - 68 = 74)
  const subStart = buildEggUnits(142, 'sub', 30);
  const subAfter = hatchExactEggs(subStart, 68);
  assert.equal(sumEggUnits(subAfter, true), 68);
  assert.equal(sumEggUnits(subAfter, false), 74);

  // Zero edge case
  assert.equal(sumEggUnits(buildEggUnits(0, 'zero', 24)), 0);
});

