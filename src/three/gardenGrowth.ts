import type { UpgradeId } from '../game/types';

export type GardenUpgradeId = Exclude<UpgradeId, 'kara' | 'kaitlyn' | 'joshua' | 'katy'>;

export const GARDEN_UPGRADE_IDS: readonly GardenUpgradeId[] = [
  'orchard',
  'windmill',
  'lanterns',
  'well',
  'cottage',
  'causeway',
  'pond',
  'fence',
  'farm',
];

export const GARDEN_BASE_SCALES: Record<GardenUpgradeId, number> = {
  orchard: 1.0,
  windmill: 0.78,
  lanterns: 1.0,
  well: 1.0,
  cottage: 1.0,
  causeway: 1.0,
  pond: 1.0,
  fence: 1.0,
  farm: 1.0,
};

export const GARDEN_RING_RADII: Record<GardenUpgradeId, [number, number]> = {
  orchard: [1.04, 1.24],
  windmill: [1.56, 1.82],
  lanterns: [1.45, 1.68],
  well: [1.14, 1.36],
  cottage: [2.25, 2.52],
  causeway: [1.25, 1.5],
  pond: [1.75, 2.0],
  fence: [11.8, 12.4],
  farm: [1.85, 2.1],
};

export interface GardenGrowthTrack {
  readyToGrow: boolean;
  pulsePhase: number;
  surgeTimer: number;
  surgeDuration: number;
  surgeKind: 'ready' | 'purchased';
  readyWeight: number;
}

export interface GardenGrowthTransform {
  sx: number;
  sy: number;
  sz: number;
  auraOpacity: number;
  auraScale: number;
}

export function createGardenGrowthMap(): Record<GardenUpgradeId, GardenGrowthTrack> {
  return {
    orchard: {
      readyToGrow: false,
      pulsePhase: 0,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
    windmill: {
      readyToGrow: false,
      pulsePhase: 0.9,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
    lanterns: {
      readyToGrow: false,
      pulsePhase: 1.8,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
    well: {
      readyToGrow: false,
      pulsePhase: 2.7,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
    cottage: {
      readyToGrow: false,
      pulsePhase: 3.6,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
    causeway: {
      readyToGrow: false,
      pulsePhase: 4.5,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
    pond: {
      readyToGrow: false,
      pulsePhase: 5.4,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
    fence: {
      readyToGrow: false,
      pulsePhase: 6.3,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
    farm: {
      readyToGrow: false,
      pulsePhase: 7.2,
      surgeTimer: 0,
      surgeDuration: 1.15,
      surgeKind: 'ready',
      readyWeight: 0,
    },
  };
}

export function syncGardenGrowthTracks(
  tracks: Record<GardenUpgradeId, GardenGrowthTrack>,
  prevLevels: Partial<Record<GardenUpgradeId, number>>,
  nextLevels: Partial<Record<UpgradeId, number>>,
  affordableUpgrades: readonly UpgradeId[],
  allowSurges: boolean
): {
  newlyReadyIds: GardenUpgradeId[];
  leveledUpIds: GardenUpgradeId[];
} {
  const affordableSet = new Set<UpgradeId>(affordableUpgrades);
  const newlyReadyIds: GardenUpgradeId[] = [];
  const leveledUpIds: GardenUpgradeId[] = [];

  for (const id of GARDEN_UPGRADE_IDS) {
    const track = tracks[id];
    const prevLvl = prevLevels[id] ?? 0;
    const nextLvl = nextLevels[id] ?? 0;
    const wasReady = track.readyToGrow;
    const isNowReady = affordableSet.has(id);

    track.readyToGrow = isNowReady;

    if (nextLvl > prevLvl) {
      leveledUpIds.push(id);
      if (allowSurges) {
        track.surgeKind = 'purchased';
        track.surgeDuration = 0.85;
        track.surgeTimer = 0.85;
      }
    } else if (!wasReady && isNowReady) {
      newlyReadyIds.push(id);
      if (allowSurges) {
        track.surgeKind = 'ready';
        track.surgeDuration = 1.15;
        track.surgeTimer = 1.15;
      }
    }

    if (!allowSurges) {
      track.readyWeight = isNowReady ? 1 : 0;
      track.surgeTimer = 0;
    }
  }

  return { newlyReadyIds, leveledUpIds };
}

export function stepGardenGrowthTracks(
  tracks: Record<GardenUpgradeId, GardenGrowthTrack>,
  dt: number
): void {
  const safeDt = Math.max(0, dt);

  for (const id of GARDEN_UPGRADE_IDS) {
    const track = tracks[id];
    const targetWeight = track.readyToGrow ? 1 : 0;
    const lambda = track.readyToGrow ? 7.0 : 10.0;
    const dampAlpha = 1 - Math.exp(-lambda * safeDt);
    track.readyWeight += (targetWeight - track.readyWeight) * dampAlpha;
    if (Math.abs(targetWeight - track.readyWeight) < 0.002) {
      track.readyWeight = targetWeight;
    }
    if (track.surgeTimer > 0) {
      track.surgeTimer = Math.max(0, track.surgeTimer - safeDt);
    }
  }
}

export function computeGardenGrowthTransform(
  track: GardenGrowthTrack,
  elapsed: number,
  baseScale: number,
  isPlant: boolean
): GardenGrowthTransform {
  let sx = baseScale;
  let sy = baseScale;
  let sz = baseScale;

  // 1. Continuous gentle growing breath while affordable
  if (track.readyWeight > 0.001) {
    const wave = 0.5 - 0.5 * Math.cos(elapsed * 3.5 + track.pulsePhase);
    const stretchAmp = isPlant ? 0.14 : 0.085;
    const widthAmp = isPlant ? 0.065 : 0.04;
    const w = track.readyWeight;
    sy *= 1 + stretchAmp * wave * w;
    sx *= 1 + widthAmp * wave * w;
    sz *= 1 + widthAmp * wave * w;
  }

  // 2. One-shot springy growth surge (on newly affordable OR newly upgraded stage)
  let surgeAura = 0;
  if (track.surgeTimer > 0 && track.surgeDuration > 0) {
    const p = 1 - track.surgeTimer / track.surgeDuration;
    if (track.surgeKind === 'purchased') {
      const dampTail = 1 - p * p;
      const sproutFactor =
        1 - Math.exp(-2.6 * p) * Math.cos(p * Math.PI * 2.1) * 0.58 * dampTail;
      sx *= sproutFactor;
      sy *= sproutFactor * (1 + 0.08 * Math.sin(p * Math.PI));
      sz *= sproutFactor;
    } else {
      const bounce = Math.sin(p * Math.PI * 2.5) * Math.exp(-2.4 * p) * (1 - p);
      const yBoost = isPlant ? 0.24 : 0.16;
      const xzBoost = isPlant ? 0.12 : 0.08;
      sy *= 1 + yBoost * bounce;
      sx *= 1 + xzBoost * bounce;
      sz *= 1 + xzBoost * bounce;
      surgeAura = 1 - p;
    }
  }

  const pulseWave = 0.5 - 0.5 * Math.cos(elapsed * 3.5 + track.pulsePhase);
  const auraOpacity = Math.min(
    0.88,
    Math.max(track.readyWeight * (0.38 + 0.34 * pulseWave), surgeAura * 0.85)
  );
  const auraScale = 1 + 0.08 * pulseWave * track.readyWeight + 0.12 * surgeAura;

  return { sx, sy, sz, auraOpacity, auraScale };
}
