import type { MathProblem } from './types';

export type NumberLineHopKind = 'thousand' | 'hundred' | 'ten' | 'one' | 'group';

export interface NumberLineHop {
  label: string;
  kind: NumberLineHopKind;
  delta: number;
  targetValue: number;
}

export interface NumberLinePlan {
  startVal: number;
  hops: NumberLineHop[];
  isBackward: boolean;
  /** In division mode, hops count equal jumps up to `problem.a`, plus a final "Total jumps" input for the quotient. */
  isDivisionCountMode: boolean;
  /** In division mode when quotient > MAX_INTERACTIVE_DIV_HOPS, we show the first 3 jumps and a dashed jump to dividend `a`. */
  hasDivisionEllipsis: boolean;
  expectedFinalAnswer: number;
  subtitle: string;
}

export interface NumberLineCheckResult {
  allFilled: boolean;
  tickValid: boolean[];
  finalValid: boolean;
  allCorrect: boolean;
  message: string;
}

const MAX_INTERACTIVE_DIV_HOPS = 5;

function decomposeAmount(amount: number): Array<{ chunk: number; kind: NumberLineHopKind }> {
  if (amount <= 0) return [];
  if (amount <= 5) {
    return Array.from({ length: amount }, () => ({ chunk: 1, kind: 'one' as const }));
  }

  const parts: Array<{ chunk: number; kind: NumberLineHopKind }> = [];
  let rem = amount;

  // Higher place values (1,000s+) grouped into a single clean hop so 4–6 digit jumps stay concise
  const thousands = Math.floor(rem / 1000) * 1000;
  if (thousands > 0) {
    parts.push({ chunk: thousands, kind: 'thousand' });
    rem -= thousands;
  }

  const hundredsCount = Math.floor(rem / 100);
  if (hundredsCount > 0) {
    if (hundredsCount <= 2 && thousands === 0) {
      for (let i = 0; i < hundredsCount; i++) {
        parts.push({ chunk: 100, kind: 'hundred' });
      }
    } else {
      parts.push({ chunk: hundredsCount * 100, kind: 'hundred' });
    }
    rem -= hundredsCount * 100;
  }

  const tensCount = Math.floor(rem / 10);
  if (tensCount > 0) {
    if (tensCount <= 2 && parts.length <= 2) {
      for (let i = 0; i < tensCount; i++) {
        parts.push({ chunk: 10, kind: 'ten' });
      }
    } else {
      parts.push({ chunk: tensCount * 10, kind: 'ten' });
    }
    rem -= tensCount * 10;
  }

  if (rem > 0) {
    if (rem <= 2 && parts.length <= 3) {
      for (let i = 0; i < rem; i++) {
        parts.push({ chunk: 1, kind: 'one' });
      }
    } else {
      parts.push({ chunk: rem, kind: 'one' });
    }
  }

  return parts;
}

export function buildNumberLinePlan(problem: MathProblem): NumberLinePlan {
  const { a, b, operation, answer } = problem;

  if (operation === 'add') {
    const startVal = Math.max(a, b);
    const jump = Math.min(a, b);
    const parts = decomposeAmount(jump);
    const hops: NumberLineHop[] = [];
    let running = startVal;

    if (parts.length === 0) {
      hops.push({ label: '+0', kind: 'one', delta: 0, targetValue: startVal });
    } else {
      for (const p of parts) {
        running += p.chunk;
        hops.push({
          label: `+${p.chunk}`,
          kind: p.kind,
          delta: p.chunk,
          targetValue: running,
        });
      }
    }

    return {
      startVal,
      hops,
      isBackward: false,
      isDivisionCountMode: false,
      hasDivisionEllipsis: false,
      expectedFinalAnswer: answer,
      subtitle: `Start at ${startVal}, fill in each landing number below the line, and check the final sum!`,
    };
  }

  if (operation === 'sub') {
    const startVal = a;
    const parts = decomposeAmount(b);
    const hops: NumberLineHop[] = [];
    let running = startVal;

    if (parts.length === 0) {
      hops.push({ label: '−0', kind: 'one', delta: 0, targetValue: startVal });
    } else {
      for (const p of parts) {
        running -= p.chunk;
        hops.push({
          label: `−${p.chunk}`,
          kind: p.kind,
          delta: -p.chunk,
          targetValue: running,
        });
      }
    }

    return {
      startVal,
      hops,
      isBackward: true,
      isDivisionCountMode: false,
      hasDivisionEllipsis: false,
      expectedFinalAnswer: answer,
      subtitle: `Start at ${startVal} on the right, hop backward, and fill each landing number below the line!`,
    };
  }

  if (operation === 'mul') {
    const startVal = 0;
    const hops: NumberLineHop[] = [];
    let running = 0;

    if (a === 0 || b === 0) {
      hops.push({ label: '+0', kind: 'group', delta: 0, targetValue: 0 });
    } else if (a <= 5) {
      for (let i = 0; i < a; i++) {
        running += b;
        hops.push({ label: `+${b}`, kind: 'group', delta: b, targetValue: running });
      }
    } else {
      // Break large group counts into clean place-value group jumps (e.g. 14 * 6 -> 10*6, 4*6)
      const groupsParts = decomposeAmount(a);
      for (const gp of groupsParts) {
        const delta = gp.chunk * b;
        running += delta;
        hops.push({
          label: `+${delta}`,
          kind: gp.kind === 'one' ? 'group' : gp.kind,
          delta,
          targetValue: running,
        });
      }
    }

    return {
      startVal,
      hops,
      isBackward: false,
      isDivisionCountMode: false,
      hasDivisionEllipsis: false,
      expectedFinalAnswer: answer,
      subtitle: `Skip-count from 0 by filling each landing number below the line to find ${a} × ${b}!`,
    };
  }

  // Division: count equal jumps of +b from 0 up to dividend a
  const quotient = answer;
  const hops: NumberLineHop[] = [];
  if (quotient <= MAX_INTERACTIVE_DIV_HOPS) {
    let running = 0;
    const count = Math.max(1, quotient);
    for (let i = 0; i < count; i++) {
      const delta = quotient === 0 ? 0 : b;
      running += delta;
      hops.push({ label: `+${delta}`, kind: 'group', delta, targetValue: running });
    }
    return {
      startVal: 0,
      hops,
      isBackward: false,
      isDivisionCountMode: true,
      hasDivisionEllipsis: false,
      expectedFinalAnswer: quotient,
      subtitle: `Fill the skip-count numbers below the line, then enter how many jumps of ${b} reach ${a}!`,
    };
  }

  // Larger quotient: show first 3 equal jumps of +b, then dashed jump to dividend a
  let running = 0;
  for (let i = 0; i < 3; i++) {
    running += b;
    hops.push({ label: `+${b}`, kind: 'group', delta: b, targetValue: running });
  }
  hops.push({
    label: `... to ${a}`,
    kind: 'group',
    delta: a - running,
    targetValue: a,
  });

  return {
    startVal: 0,
    hops,
    isBackward: false,
    isDivisionCountMode: true,
    hasDivisionEllipsis: true,
    expectedFinalAnswer: quotient,
    subtitle: `Fill the first 3 jumps of +${b} below the line, then enter total jumps to reach ${a}!`,
  };
}

export function checkNumberLineAnswers(
  plan: NumberLinePlan,
  tickInputs: string[],
  finalJumpInput: string = ''
): NumberLineCheckResult {
  const editableTickIndices = plan.hops
    .map((_, idx) => idx)
    .filter((idx) => !(plan.hasDivisionEllipsis && idx === plan.hops.length - 1));

  const tickValid = plan.hops.map((hop, idx) => {
    if (plan.hasDivisionEllipsis && idx === plan.hops.length - 1) return true;
    const raw = (tickInputs[idx] ?? '').trim();
    if (raw.length === 0) return false;
    const parsed = Number.parseInt(raw, 10);
    return !Number.isNaN(parsed) && parsed === hop.targetValue;
  });

  const allTicksFilled = editableTickIndices.every(
    (idx) => (tickInputs[idx] ?? '').trim().length > 0
  );

  let finalValid = true;
  let allFilled = allTicksFilled;

  if (plan.isDivisionCountMode) {
    const trimmedFinal = finalJumpInput.trim();
    allFilled = allTicksFilled && trimmedFinal.length > 0;
    const parsedFinal = Number.parseInt(trimmedFinal, 10);
    finalValid =
      trimmedFinal.length > 0 &&
      !Number.isNaN(parsedFinal) &&
      parsedFinal === plan.expectedFinalAnswer;
  } else {
    finalValid = tickValid[tickValid.length - 1] ?? false;
  }

  if (!allFilled) {
    return {
      allFilled: false,
      tickValid,
      finalValid: false,
      allCorrect: false,
      message: plan.isDivisionCountMode
        ? 'Fill in every number box below the line and the total jumps box!'
        : 'Fill in every number box below the number line first!',
    };
  }

  const allTicksRight = tickValid.every(Boolean);
  const allCorrect = allTicksRight && finalValid;

  if (allCorrect) {
    return {
      allFilled: true,
      tickValid,
      finalValid: true,
      allCorrect: true,
      message: `Awesome! Every hop landed right on ${plan.expectedFinalAnswer}!`,
    };
  }

  if (!allTicksRight) {
    return {
      allFilled: true,
      tickValid,
      finalValid,
      allCorrect: false,
      message: 'Some landing numbers are off—check the highlighted box(es) and try again!',
    };
  }

  return {
    allFilled: true,
    tickValid,
    finalValid: false,
    allCorrect: false,
    message: `Your skip-counts look great! Double-check how many total jumps reach ${plan.hops[plan.hops.length - 1]?.targetValue ?? ''}.`,
  };
}
