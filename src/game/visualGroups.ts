export interface EggUnit {
  id: string;
  value: 1 | 10 | 100;
  hatched: boolean;
}

/**
 * Decomposes any non-negative integer into visual egg units so the total value
 * is ALWAYS exact (no truncation on 2- or 3-digit problems).
 * - Up to `singleThreshold`, uses individual 1-egg icons.
 * - Above `singleThreshold`, groups into 100-egg crates, 10-egg cartons, and 1-egg icons.
 */
export function buildEggUnits(
  total: number,
  prefix: string,
  singleThreshold = 25
): EggUnit[] {
  const safe = Math.max(0, Math.floor(total));
  const units: EggUnit[] = [];
  let idx = 0;

  if (safe <= singleThreshold) {
    for (let i = 0; i < safe; i++) {
      units.push({ id: `${prefix}-1-${idx++}`, value: 1, hatched: false });
    }
    return units;
  }

  const hundreds = Math.floor(safe / 100);
  const tens = Math.floor((safe % 100) / 10);
  const ones = safe % 10;

  for (let i = 0; i < hundreds; i++) {
    units.push({ id: `${prefix}-100-${idx++}`, value: 100, hatched: false });
  }
  for (let i = 0; i < tens; i++) {
    units.push({ id: `${prefix}-10-${idx++}`, value: 10, hatched: false });
  }
  for (let i = 0; i < ones; i++) {
    units.push({ id: `${prefix}-1-${idx++}`, value: 1, hatched: false });
  }
  return units;
}

export function sumEggUnits(units: EggUnit[], hatchedFilter?: boolean): number {
  let sum = 0;
  for (const u of units) {
    if (hatchedFilter === undefined || u.hatched === hatchedFilter) {
      sum += u.value;
    }
  }
  return sum;
}

/**
 * Breaks one unhatched 100-crate into ten 10-cartons, or one unhatched 10-carton
 * into ten 1-eggs, preserving exact total value.
 */
export function breakEggContainer(units: EggUnit[], targetId?: string): EggUnit[] {
  const idx = targetId
    ? units.findIndex((u) => u.id === targetId && !u.hatched && u.value > 1)
    : units.findIndex((u) => !u.hatched && u.value === 10) !== -1
      ? units.findIndex((u) => !u.hatched && u.value === 10)
      : units.findIndex((u) => !u.hatched && u.value === 100);

  if (idx === -1) return units;
  const target = units[idx];
  const childValue: 10 | 1 = target.value === 100 ? 10 : 1;
  const stamp = `${target.id}-b${units.length}`;
  const children: EggUnit[] = Array.from({ length: 10 }, (_, k) => ({
    id: `${stamp}-${k}`,
    value: childValue,
    hatched: false,
  }));

  const next = [...units];
  next.splice(idx, 1, ...children);
  return next;
}

/**
 * Marks an exact total value of `amount` as hatched (taking away from whole eggs),
 * automatically breaking 100-crates or 10-cartons when needed so remaining whole eggs
 * ALWAYS equals total - amount.
 */
export function hatchExactEggs(units: EggUnit[], amount: number): EggUnit[] {
  let working = units.map((u) => ({ ...u, hatched: false }));
  let remainingToHatch = Math.min(Math.max(0, Math.floor(amount)), sumEggUnits(working));

  while (remainingToHatch >= 100) {
    const idx = working.findIndex((u) => !u.hatched && u.value === 100);
    if (idx === -1) break;
    working[idx] = { ...working[idx], hatched: true };
    remainingToHatch -= 100;
  }

  while (remainingToHatch >= 10) {
    let idx = working.findIndex((u) => !u.hatched && u.value === 10);
    if (idx === -1) {
      const crateIdx = working.findIndex((u) => !u.hatched && u.value === 100);
      if (crateIdx === -1) break;
      working = breakEggContainer(working, working[crateIdx].id);
      idx = working.findIndex((u) => !u.hatched && u.value === 10);
    }
    if (idx === -1) break;
    working[idx] = { ...working[idx], hatched: true };
    remainingToHatch -= 10;
  }

  while (remainingToHatch >= 1) {
    let idx = working.findIndex((u) => !u.hatched && u.value === 1);
    if (idx === -1) {
      const cartonIdx = working.findIndex((u) => !u.hatched && u.value === 10);
      if (cartonIdx !== -1) {
        working = breakEggContainer(working, working[cartonIdx].id);
      } else {
        const crateIdx = working.findIndex((u) => !u.hatched && u.value === 100);
        if (crateIdx === -1) break;
        working = breakEggContainer(working, working[crateIdx].id);
        const newCartonIdx = working.findIndex((u) => !u.hatched && u.value === 10);
        if (newCartonIdx !== -1) {
          working = breakEggContainer(working, working[newCartonIdx].id);
        }
      }
      idx = working.findIndex((u) => !u.hatched && u.value === 1);
    }
    if (idx === -1) break;
    working[idx] = { ...working[idx], hatched: true };
    remainingToHatch -= 1;
  }

  return working;
}
