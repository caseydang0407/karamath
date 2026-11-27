import type { MathProblem } from './types';

export type MakeTenMode =
  | 'add-make-ten'
  | 'add-under-ten'
  | 'add-already-ten'
  | 'sub-bridge-ten'
  | 'sub-from-ten'
  | 'sub-simple'
  | 'mul-ten-split'
  | 'mul-ten-frames'
  | 'div-ten-chunk'
  | 'div-groups';

export interface MakeTenPlan {
  mode: MakeTenMode;
  a: number;
  b: number;
  answer: number;
  // Addition fields
  anchor: number;
  other: number;
  anchorTens: number;
  anchorOnes: number;
  neededToTen: number;
  friendlyTarget: number;
  leftover: number;
  canMakeTen: boolean;
  shortBy: number;
  otherBadges: number;
  otherDots: number;
  // Subtraction fields
  bridgeTake: number;
  bridgeRemainder: number;
  // Multiplication / Division fields
  mulTenCount: number;
  mulRemCount: number;
  divTenChunk: number;
  divRemGroups: number;
  // Shared coaching steps
  steps: string[];
}

export function buildMakeTenPlan(problem: MathProblem): MakeTenPlan {
  const { a, b, answer, operation } = problem;

  if (operation === 'add') {
    const anchor = Math.max(a, b);
    const other = Math.min(a, b);
    const anchorTens = Math.floor(anchor / 10) * 10;
    const anchorOnes = anchor % 10;
    const neededToTen = anchorOnes === 0 ? 0 : 10 - anchorOnes;

    if (neededToTen === 0) {
      return {
        mode: 'add-already-ten',
        a,
        b,
        answer,
        anchor,
        other,
        anchorTens,
        anchorOnes: 0,
        neededToTen: 0,
        friendlyTarget: anchor,
        leftover: other,
        canMakeTen: true,
        shortBy: 0,
        otherBadges: Math.floor(other / 10),
        otherDots: other % 10,
        bridgeTake: 0,
        bridgeRemainder: 0,
        mulTenCount: 0,
        mulRemCount: 0,
        divTenChunk: 0,
        divRemGroups: 0,
        steps: [
          `${anchor} is already a Friendly Ten (ends in 0)!`,
          `Keep ${anchor} whole and count on ${other} more.`,
          `${anchor} + ${other} = ${answer}.`,
        ],
      };
    }

    if (other >= neededToTen) {
      const friendlyTarget = anchor + neededToTen;
      const leftover = other - neededToTen;
      const otherDots =
        other <= 15 ? other : (leftover % 10) + neededToTen;
      const otherBadges = Math.max(0, Math.floor((other - otherDots) / 10));

      return {
        mode: 'add-make-ten',
        a,
        b,
        answer,
        anchor,
        other,
        anchorTens,
        anchorOnes,
        neededToTen,
        friendlyTarget,
        leftover,
        canMakeTen: true,
        shortBy: 0,
        otherBadges,
        otherDots,
        bridgeTake: 0,
        bridgeRemainder: 0,
        mulTenCount: 0,
        mulRemCount: 0,
        divTenChunk: 0,
        divRemGroups: 0,
        steps: [
          `Start with ${anchor}. It needs ${neededToTen} more to reach the Friendly Ten ${friendlyTarget}!`,
          `Split ${other} into ${neededToTen} + ${leftover}. Move ${neededToTen} into the Ten-Frame to make ${friendlyTarget}.`,
          `Now add the leftover: ${friendlyTarget} + ${leftover} = ${answer}!`,
        ],
      };
    }

    // Cannot reach 10 yet (e.g., 4 + 3 = 7 or 22 + 3 = 25)
    const shortBy = neededToTen - other;
    return {
      mode: 'add-under-ten',
      a,
      b,
      answer,
      anchor,
      other,
      anchorTens,
      anchorOnes,
      neededToTen,
      friendlyTarget: anchorTens + 10,
      leftover: 0,
      canMakeTen: false,
      shortBy,
      otherBadges: 0,
      otherDots: other,
      bridgeTake: 0,
      bridgeRemainder: 0,
      mulTenCount: 0,
      mulRemCount: 0,
      divTenChunk: 0,
      divRemGroups: 0,
      steps: [
        `Place ${anchorOnes} blue dots in the Ten-Frame${anchorTens > 0 ? ` (with ${anchorTens} beside it)` : ''}.`,
        `Put ${other} orange dots into the open spaces: ${anchorOnes} + ${other} = ${anchorOnes + other}.`,
        `${anchorOnes + other} fills ${anchorOnes + other} of 10 spaces (${shortBy} away from ${anchorTens + 10}), so ${anchor} + ${other} = ${answer}!`,
      ],
    };
  }

  if (operation === 'sub') {
    const onesA = a % 10;
    const baseTens = Math.floor(a / 10) * 10;

    // Crosses down through a friendly 10 (e.g. 14 - 6 or 32 - 14)
    if (a > 10 && onesA > 0 && b > onesA) {
      const bridgeTake = onesA;
      const friendlyTarget = a - onesA;
      const bridgeRemainder = b - onesA;
      return {
        mode: 'sub-bridge-ten',
        a,
        b,
        answer,
        anchor: a,
        other: b,
        anchorTens: baseTens,
        anchorOnes: onesA,
        neededToTen: 0,
        friendlyTarget,
        leftover: 0,
        canMakeTen: true,
        shortBy: 0,
        otherBadges: 0,
        otherDots: 0,
        bridgeTake,
        bridgeRemainder,
        mulTenCount: 0,
        mulRemCount: 0,
        divTenChunk: 0,
        divRemGroups: 0,
        steps: [
          `Start at ${a}. Take away ${bridgeTake} ones first to land squarely on Friendly Ten ${friendlyTarget}!`,
          `You took ${bridgeTake} out of ${b}, so take ${bridgeRemainder} more from ${friendlyTarget}.`,
          `${friendlyTarget} − ${bridgeRemainder} = ${answer}!`,
        ],
      };
    }

    // Subtracting directly from a friendly ten (e.g. 20 - 6 or 10 - 3)
    if (a >= 10 && onesA === 0 && b > 0) {
      return {
        mode: 'sub-from-ten',
        a,
        b,
        answer,
        anchor: a,
        other: b,
        anchorTens: baseTens,
        anchorOnes: 0,
        neededToTen: 0,
        friendlyTarget: a,
        leftover: 0,
        canMakeTen: true,
        shortBy: 0,
        otherBadges: 0,
        otherDots: 0,
        bridgeTake: 0,
        bridgeRemainder: b,
        mulTenCount: 0,
        mulRemCount: 0,
        divTenChunk: 0,
        divRemGroups: 0,
        steps: [
          `${a} is already a Friendly Ten! Open one Ten-Frame of 10 dots.`,
          `Take away ${b} from that 10-frame${b > 10 ? ` (and ${b - 10} more from the next ten)` : ''}.`,
          `${a} − ${b} = ${answer}!`,
        ],
      };
    }

    // Within same ten (e.g. 8 - 3 or 27 - 4)
    return {
      mode: 'sub-simple',
      a,
      b,
      answer,
      anchor: a,
      other: b,
      anchorTens: baseTens,
      anchorOnes: onesA,
      neededToTen: 0,
      friendlyTarget: baseTens,
      leftover: 0,
      canMakeTen: false,
      shortBy: 0,
      otherBadges: 0,
      otherDots: 0,
      bridgeTake: b,
      bridgeRemainder: 0,
      mulTenCount: 0,
      mulRemCount: 0,
      divTenChunk: 0,
      divRemGroups: 0,
      steps: [
        `Look at the ${onesA} ones in the Ten-Frame${baseTens > 0 ? ` beside ${baseTens}` : ''}.`,
        `Cross out ${b} dot${b === 1 ? '' : 's'} right inside the Ten-Frame: ${onesA} − ${b} = ${onesA - b}.`,
        `${baseTens > 0 ? `Keep the ${baseTens} tens with ${onesA - b} ones: ` : ''}${a} − ${b} = ${answer}!`,
      ],
    };
  }

  if (operation === 'mul') {
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    if (big > 10) {
      const tensPart = Math.floor(big / 10) * 10;
      const onesPart = big % 10;
      return {
        mode: 'mul-ten-split',
        a,
        b,
        answer,
        anchor: big,
        other: small,
        anchorTens: tensPart,
        anchorOnes: onesPart,
        neededToTen: 0,
        friendlyTarget: tensPart * small,
        leftover: onesPart * small,
        canMakeTen: true,
        shortBy: 0,
        otherBadges: 0,
        otherDots: 0,
        bridgeTake: 0,
        bridgeRemainder: 0,
        mulTenCount: tensPart,
        mulRemCount: onesPart,
        divTenChunk: 0,
        divRemGroups: 0,
        steps: [
          `Split ${big} into Friendly Tens and Ones: ${big} = ${tensPart} + ${onesPart}.`,
          `Multiply the Friendly Tens first: ${tensPart} × ${small} = ${tensPart * small}.`,
          onesPart > 0
            ? `Multiply the ones (${onesPart} × ${small} = ${onesPart * small}) and add: ${tensPart * small} + ${onesPart * small} = ${answer}!`
            : `All groups are Friendly Tens: ${tensPart} × ${small} = ${answer}!`,
        ],
      };
    }

    return {
      mode: 'mul-ten-frames',
      a,
      b,
      answer,
      anchor: a,
      other: b,
      anchorTens: 0,
      anchorOnes: 0,
      neededToTen: 0,
      friendlyTarget: Math.floor(answer / 10) * 10,
      leftover: answer % 10,
      canMakeTen: answer >= 10,
      shortBy: 0,
      otherBadges: 0,
      otherDots: 0,
      bridgeTake: 0,
      bridgeRemainder: 0,
      mulTenCount: a,
      mulRemCount: b,
      divTenChunk: 0,
      divRemGroups: 0,
      steps: [
        `Pour ${a} equal groups of ${b} dots into Ten-Frames.`,
        answer >= 10
          ? `Every time 10 dots fill a frame, you make a Friendly 10 (${Math.floor(answer / 10)} full ten${Math.floor(answer / 10) === 1 ? '' : 's'} + ${answer % 10} ones).`
          : `Count the dots inside the Ten-Frame: ${a} × ${b} = ${answer}.`,
        `Count all full 10s plus extra dots: ${a} × ${b} = ${answer}!`,
      ],
    };
  }

  // Division
  const quotient = b > 0 ? Math.floor(a / b) : 0;
  if (quotient >= 10) {
    const tenChunk = 10 * b;
    const remTotal = a - tenChunk;
    const remGroups = quotient - 10;
    return {
      mode: 'div-ten-chunk',
      a,
      b,
      answer,
      anchor: a,
      other: b,
      anchorTens: tenChunk,
      anchorOnes: remTotal,
      neededToTen: 0,
      friendlyTarget: tenChunk,
      leftover: remTotal,
      canMakeTen: true,
      shortBy: 0,
      otherBadges: 0,
      otherDots: 0,
      bridgeTake: 0,
      bridgeRemainder: 0,
      mulTenCount: 0,
      mulRemCount: 0,
      divTenChunk: 10,
      divRemGroups: remGroups,
      steps: [
        `Take a Friendly 10-group chunk first: 10 × ${b} = ${tenChunk}.`,
        `Subtract from ${a}: ${a} − ${tenChunk} = ${remTotal} left to share by ${b}.`,
        `${remTotal} ÷ ${b} = ${remGroups} more group${remGroups === 1 ? '' : 's'}, so 10 + ${remGroups} = ${quotient}!`,
      ],
    };
  }

  return {
    mode: 'div-groups',
    a,
    b,
    answer,
    anchor: a,
    other: b,
    anchorTens: 0,
    anchorOnes: 0,
    neededToTen: 0,
    friendlyTarget: Math.floor(a / 10) * 10,
    leftover: a % 10,
    canMakeTen: a >= 10,
    shortBy: 0,
    otherBadges: 0,
    otherDots: 0,
    bridgeTake: 0,
    bridgeRemainder: 0,
    mulTenCount: 0,
    mulRemCount: 0,
    divTenChunk: 0,
    divRemGroups: quotient,
    steps: [
      `Count up in groups of ${b} until you reach ${a}.`,
      `Watch how groups fill Friendly Ten-Frames along the way.`,
      `It takes ${quotient} equal group${quotient === 1 ? '' : 's'} of ${b} to make ${a}!`,
    ],
  };
}
