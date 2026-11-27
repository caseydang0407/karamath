import type { MathProblem } from './types';

export type BlockValue = 100 | 10 | 1;
export type BlockZone = 'set1' | 'set2' | 'mat' | 'takeaway' | 'groupbin';

export interface MovableBlock {
  id: number;
  value: BlockValue;
  zone: BlockZone;
  originSet?: 'set1' | 'set2';
  note?: string;
}

export function decomposeToBlocks(
  n: number,
  startId: number,
  zone: BlockZone,
  originSet?: 'set1' | 'set2'
): { blocks: MovableBlock[]; nextId: number } {
  const clamped = Math.max(0, Math.min(999, Math.floor(n)));
  const h = Math.floor(clamped / 100);
  const t = Math.floor((clamped % 100) / 10);
  const o = clamped % 10;

  const blocks: MovableBlock[] = [];
  let nextId = startId;

  for (let i = 0; i < h; i++) {
    blocks.push({ id: nextId++, value: 100, zone, originSet });
  }
  for (let i = 0; i < t; i++) {
    blocks.push({ id: nextId++, value: 10, zone, originSet });
  }
  for (let i = 0; i < o; i++) {
    blocks.push({ id: nextId++, value: 1, zone, originSet });
  }

  return { blocks, nextId };
}

export function buildInitialBlocksForProblem(problem: MathProblem): {
  blocks: MovableBlock[];
  nextId: number;
  isLargeStarlight: boolean;
} {
  const isLargeStarlight = problem.a > 999 || problem.b > 999;
  if (isLargeStarlight) {
    // Provide a tactile sandbox set for 4-6 digit Starlight problems
    return {
      blocks: [
        { id: 1, value: 100, zone: 'set1', originSet: 'set1' },
        { id: 2, value: 10, zone: 'set1', originSet: 'set1' },
        { id: 3, value: 10, zone: 'set1', originSet: 'set1' },
        { id: 4, value: 1, zone: 'set1', originSet: 'set1' },
        { id: 5, value: 1, zone: 'set1', originSet: 'set1' },
      ],
      nextId: 6,
      isLargeStarlight: true,
    };
  }

  if (problem.operation === 'add') {
    const r1 = decomposeToBlocks(problem.a, 1, 'set1', 'set1');
    const r2 = decomposeToBlocks(problem.b, r1.nextId, 'set2', 'set2');
    return {
      blocks: [...r1.blocks, ...r2.blocks],
      nextId: r2.nextId,
      isLargeStarlight: false,
    };
  }

  if (problem.operation === 'sub' || problem.operation === 'div') {
    const r1 = decomposeToBlocks(problem.a, 1, 'set1', 'set1');
    return {
      blocks: r1.blocks,
      nextId: r1.nextId,
      isLargeStarlight: false,
    };
  }

  // Multiplication: start with empty mat; user drags blocks or "+Group of b" bundles onto the mat
  return {
    blocks: [],
    nextId: 1,
    isLargeStarlight: false,
  };
}

export function sumZoneValue(blocks: MovableBlock[], zone: BlockZone): number {
  return blocks
    .filter((b) => b.zone === zone)
    .reduce((sum, b) => sum + b.value, 0);
}

export function countZoneByValue(
  blocks: MovableBlock[],
  zone: BlockZone
): { h: number; t: number; o: number } {
  let h = 0;
  let t = 0;
  let o = 0;
  for (const b of blocks) {
    if (b.zone !== zone) continue;
    if (b.value === 100) h++;
    else if (b.value === 10) t++;
    else o++;
  }
  return { h, t, o };
}

export function moveBlockToZone(
  blocks: MovableBlock[],
  blockId: number,
  targetZone: BlockZone
): MovableBlock[] {
  return blocks.map((b) => (b.id === blockId ? { ...b, zone: targetZone } : b));
}

export function breakBlockInZone(
  blocks: MovableBlock[],
  zone: BlockZone,
  fromValue: 100 | 10,
  nextIdStart: number
): { blocks: MovableBlock[]; nextId: number; broke: boolean } {
  const idx = blocks.findIndex((b) => b.zone === zone && b.value === fromValue);
  if (idx === -1) return { blocks, nextId: nextIdStart, broke: false };

  const source = blocks[idx];
  const childValue: BlockValue = fromValue === 100 ? 10 : 1;
  const next = [...blocks];
  next.splice(idx, 1);

  let nextId = nextIdStart;
  for (let i = 0; i < 10; i++) {
    next.push({
      id: nextId++,
      value: childValue,
      zone,
      originSet: source.originSet,
      note: `Unpacked from ${fromValue}`,
    });
  }

  return { blocks: next, nextId, broke: true };
}

export function tradeBlocksInZone(
  blocks: MovableBlock[],
  zone: BlockZone,
  fromValue: 10 | 1,
  nextIdStart: number
): { blocks: MovableBlock[]; nextId: number; traded: boolean } {
  const candidates = blocks.filter((b) => b.zone === zone && b.value === fromValue);
  if (candidates.length < 10) {
    return { blocks, nextId: nextIdStart, traded: false };
  }

  const consumedIds = new Set(candidates.slice(0, 10).map((b) => b.id));
  const bundledValue: BlockValue = fromValue === 1 ? 10 : 100;
  const remaining = blocks.filter((b) => !consumedIds.has(b.id));
  remaining.push({
    id: nextIdStart,
    value: bundledValue,
    zone,
    originSet: candidates[0].originSet,
    note: `Traded 10×${fromValue}`,
  });

  return { blocks: remaining, nextId: nextIdStart + 1, traded: true };
}
