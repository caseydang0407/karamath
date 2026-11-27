import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignRight,
  Boxes,
  Check,
  Eraser,
  Lightbulb,
  MoveHorizontal,
  PenLine,
  RotateCcw,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import type { MathProblem, ScratchStrategy } from '../game/types';
import { buildMakeTenPlan } from '../game/makeTen';
import {
  buildNumberLinePlan,
  checkNumberLineAnswers,
  type NumberLineCheckResult,
  type NumberLineHopKind,
} from '../game/numberLine';
import {
  breakBlockInZone,
  buildInitialBlocksForProblem,
  countZoneByValue,
  decomposeToBlocks,
  moveBlockToZone,
  sumZoneValue,
  tradeBlocksInZone,
  type BlockValue,
  type BlockZone,
  type MovableBlock,
} from '../game/baseBlocks';

interface ScratchPaperModalProps {
  problem: MathProblem;
  wrongAttempts: number;
  onSubmitAnswer?: (val: number) => void;
  onClose: () => void;
}

const STRATEGIES: Array<{
  id: ScratchStrategy;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'vertical', label: 'Vertical & Alignment', shortLabel: 'Vertical', icon: AlignRight },
  { id: 'numberline', label: 'Number Line', shortLabel: 'Number Line', icon: MoveHorizontal },
  { id: 'blocks', label: 'Base-10 Blocks', shortLabel: 'Base Blocks', icon: Boxes },
  { id: 'make10', label: 'Make a 10', shortLabel: 'Make 10', icon: Target },
];

const PEN_COLORS = [
  { hex: '#1e293b', name: 'Pencil Ink' },
  { hex: '#dc2626', name: 'Carry Red' },
  { hex: '#2563eb', name: 'Sky Blue' },
];

function getColumnDigits(n: number, cols: number): string[] {
  const s = String(n).padStart(cols, ' ');
  return s.split('');
}

function getInitialWorkingDigits(n: number, cols: number): Array<number | null> {
  return getColumnDigits(n, cols).map((ch) => (ch === ' ' ? null : Number.parseInt(ch, 10)));
}

export const ScratchPaperModal: React.FC<ScratchPaperModalProps> = ({
  problem,
  wrongAttempts,
  onSubmitAnswer,
  onClose,
}) => {
  const [strategy, setStrategy] = useState<ScratchStrategy>('vertical');
  const [penColor, setPenColor] = useState<string>('#1e293b');
  const [eraserOn, setEraserOn] = useState(false);

  // Vertical alignment columns count (adapts dynamically from 2 up to 6+ digits)
  const colCount = useMemo(() => {
    const maxVal = Math.max(problem.a, problem.b, problem.answer);
    return Math.max(2, String(maxVal).length);
  }, [problem]);

  const [carryMarks, setCarryMarks] = useState<number[]>(() =>
    Array.from({ length: colCount }, () => 0)
  );

  // Interactive Subtraction Borrowing state & Result Digit Entry
  const [topWorkingDigits, setTopWorkingDigits] = useState<Array<number | null>>(() =>
    getInitialWorkingDigits(problem.a, colCount)
  );
  const [borrowedFlags, setBorrowedFlags] = useState<boolean[]>(() =>
    Array.from({ length: colCount }, () => false)
  );
  const [resultInputs, setResultInputs] = useState<string[]>(() =>
    Array.from({ length: colCount }, () => '')
  );
  const [divInput, setDivInput] = useState('');
  const [verticalFeedback, setVerticalFeedback] = useState<{
    checked: boolean;
    correct: boolean;
    enteredValue: number | null;
    message: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const resultInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Reset vertical helper & result states when problem changes
  useEffect(() => {
    setCarryMarks(Array.from({ length: colCount }, () => 0));
    setTopWorkingDigits(getInitialWorkingDigits(problem.a, colCount));
    setBorrowedFlags(Array.from({ length: colCount }, () => false));
    setResultInputs(Array.from({ length: colCount }, () => ''));
    setDivInput('');
    setVerticalFeedback(null);
  }, [problem.id, problem.a, colCount]);

  // Configure crisp canvas resolution once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 640;
    canvas.height = 240;
  }, []);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getCanvasPoint(e);
    lastPtRef.current = pt;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    if (eraserOn) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = penColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getCanvasPoint(e);
    const prev = lastPtRef.current ?? pt;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (eraserOn) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 24;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.lineWidth = 4;
      ctx.strokeStyle = penColor;
    }
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    lastPtRef.current = pt;
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPtRef.current = null;
  };

  const clearScratchPad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const cycleCarryMark = (colIdx: number) => {
    setCarryMarks((prev) => {
      const next = [...prev];
      const curr = next[colIdx] ?? 0;
      next[colIdx] = (curr + 1) % 10;
      return next;
    });
  };

  // Interactive Subtraction Borrow: borrowing from colIdx gives +10 to colIdx + 1 and subtracts 1 from colIdx
  const handleBorrowFromColumn = (colIdx: number) => {
    if (problem.operation !== 'sub') return;
    if (colIdx >= colCount - 1) return;
    const val = topWorkingDigits[colIdx];
    const rightVal = topWorkingDigits[colIdx + 1];
    if (val === null || val <= 0 || rightVal === null) return;

    setTopWorkingDigits((prev) => {
      const next = [...prev];
      next[colIdx] = (next[colIdx] ?? 0) - 1;
      next[colIdx + 1] = (next[colIdx + 1] ?? 0) + 10;
      return next;
    });
    setBorrowedFlags((prev) => {
      const next = [...prev];
      next[colIdx] = true;
      next[colIdx + 1] = true;
      return next;
    });
  };

  const resetVerticalHelpers = () => {
    setCarryMarks(Array.from({ length: colCount }, () => 0));
    setTopWorkingDigits(getInitialWorkingDigits(problem.a, colCount));
    setBorrowedFlags(Array.from({ length: colCount }, () => false));
    setResultInputs(Array.from({ length: colCount }, () => ''));
    setDivInput('');
    setVerticalFeedback(null);
  };

  const handleResultDigitChange = (idx: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(-1);
    setResultInputs((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    setVerticalFeedback(null);
  };

  const handleCheckVerticalAnswer = () => {
    let entered: number | null = null;
    if (problem.operation === 'div') {
      const trimmed = divInput.trim();
      if (trimmed.length > 0) {
        entered = Number.parseInt(trimmed, 10);
      }
    } else {
      const joined = resultInputs.map((d) => (d === '' ? '' : d)).join('');
      if (joined.length > 0) {
        entered = Number.parseInt(joined, 10);
      }
    }

    if (entered === null || Number.isNaN(entered)) {
      setVerticalFeedback({
        checked: true,
        correct: false,
        enteredValue: null,
        message: 'Enter digits in the answer boxes first!',
      });
      return;
    }

    if (entered === problem.answer) {
      setVerticalFeedback({
        checked: true,
        correct: true,
        enteredValue: entered,
        message: `Awesome! ${entered} is right!`,
      });
    } else {
      setVerticalFeedback({
        checked: true,
        correct: false,
        enteredValue: entered,
        message: `${entered} is close—check each column from right to left!`,
      });
    }
  };

  const coachSteps = useMemo(() => {
    if (strategy === 'make10') {
      return buildMakeTenPlan(problem).steps;
    }

    if (strategy === 'numberline') {
      if (problem.operation === 'div') {
        return [
          `Follow each +${problem.b} jump starting from 0 on the left.`,
          `Type the landing number into each box below the number line.`,
          `Enter the total number of jumps to reach ${problem.a}, then click Check Answer!`,
        ];
      }
      if (problem.operation === 'sub') {
        return [
          `Start at ${problem.a} on the right and follow each backward jump.`,
          `Fill in every landing number box below the number line from right to left.`,
          `Click Check Answer at the end to verify your landing spot!`,
        ];
      }
      return [
        `Start at the green dot and follow each color-coded hop arrow.`,
        `Fill in the running number inside every box below the number line.`,
        `Click Check Answer at the end to verify your final answer!`,
      ];
    }

    if (strategy === 'blocks') {
      if (problem.operation === 'add') {
        return [
          `Drag blocks (or tap them) from Set 1 and Set 2 onto the Answer Mat below.`,
          `If you collect 10 yellow Ones cubes, click "Trade 10 Ones → 10" to bundle a Ten rod.`,
          `Click Check Answer to verify your total on the Answer Mat!`,
        ];
      }
      if (problem.operation === 'sub') {
        return [
          `Drag (or tap) blocks totaling ${problem.b} from Start With into the Take Away tray.`,
          `Need more Ones or Tens? Click "Break 10 → 10 Ones" or "Break 100 → 10 Tens" first!`,
          `Check what remains in Start With—that leftover total is your answer!`,
        ];
      }
      if (problem.operation === 'mul') {
        return [
          `Drag blocks or "+Group of ${problem.b}" bundles from the Supply onto the Answer Mat.`,
          `Build ${problem.a} equal groups of ${problem.b}, trading 10 Ones into a Ten rod anytime.`,
          `Click Check Answer when your Answer Mat matches ${problem.a} × ${problem.b}!`,
        ];
      }
      return [
        `Drag blocks from the Total Pile (${problem.a}) into the Group of ${problem.b} bin.`,
        `Each time the bin reaches ${problem.b}, it banks 1 Equal Group automatically!`,
        `Use "Break 10 → 10 Ones" if needed until all blocks are grouped, then Check Answer!`,
      ];
    }

    const { a, b, operation } = problem;
    const onesA = a % 10;
    const onesB = b % 10;

    if (operation === 'add') {
      const onesSum = onesA + onesB;
      return [
        `Line up the Ones under Ones and Tens under Tens on the right.`,
        onesSum >= 10
          ? `Add the Ones first: ${onesA} + ${onesB} = ${onesSum}. Enter ${onesSum % 10} in Ones and tap + above Tens to carry +1!`
          : `Add the Ones first: ${onesA} + ${onesB}. Enter your digit right in the Ones box!`,
        a >= 10 || b >= 10
          ? `Next, add the Tens column (plus any carried number) and check your total.`
          : `Type your answer below the line and click Check Answer!`,
      ];
    }

    if (operation === 'sub') {
      return [
        `Stack the bigger number (${a}) on top and ${b} underneath by place value.`,
        onesA < onesB
          ? `Ones check: ${onesA} is smaller than ${onesB}! Click the Tens digit (${Math.floor(a / 10) % 10}) or "Borrow" to regroup 1 ten into 10 ones!`
          : `Subtract the Ones column first: ${onesA} − ${onesB}, and type the digit below.`,
        a >= 10 ? `Then subtract the Tens column on the left and click Check Answer!` : `Check by adding your answer + ${b} = ${a}.`,
      ];
    }

    if (operation === 'mul') {
      return [
        `Stack ${a} on top and × ${b} aligned on the right under the Ones place.`,
        a >= 10
          ? `Multiply ${b} × ${onesA} (Ones) first! Tap the Carry circle above Tens if needed.`
          : `Think of ${a} equal groups of ${b}, and enter the result under the bar!`,
        a >= 10
          ? `Then multiply ${b} × ${Math.floor(a / 10)} (Tens), add your carry, and enter the digits.`
          : `Click Check Answer when your digits are filled in!`,
      ];
    }

    return [
      `Place ${a} inside the cozy division house and ${b} outside on the left.`,
      `Ask: "How many equal groups of ${b} fit into ${a}?"`,
      `Type your quotient into the box on top of the division house and check!`,
    ];
  }, [problem, strategy]);

  const placePalette = [
    { label: 'O', name: 'Ones', color: 'text-[#15803d] bg-[#dcfce7]' },
    { label: 'T', name: 'Tens', color: 'text-[#1d4ed8] bg-[#dbeafe]' },
    { label: 'H', name: 'Hundreds', color: 'text-[#7e22ce] bg-[#f3e8ff]' },
    { label: 'Th', name: 'Thousands', color: 'text-[#b45309] bg-[#fef3c7]' },
    { label: 'TTh', name: 'Ten-Thousands', color: 'text-[#be123c] bg-[#ffe4e6]' },
    { label: 'HTh', name: 'Hundred-Thousands', color: 'text-[#0f766e] bg-[#ccfbf1]' },
    { label: 'M', name: 'Millions', color: 'text-[#4338ca] bg-[#e0e7ff]' },
  ];
  const colHeaders = Array.from({ length: colCount }, (_, idx) => {
    const placeIdx = colCount - 1 - idx;
    return (
      placePalette[placeIdx] ?? {
        label: `10^${placeIdx}`,
        name: `Place ${placeIdx}`,
        color: 'text-[#334155] bg-[#f1f5f9]',
      }
    );
  });

  const opColPx = colCount >= 5 ? 32 : 44;
  const digitColPx = colCount >= 6 ? 38 : colCount === 5 ? 44 : colCount === 4 ? 50 : 56;
  const gridTemplateColumns = `${opColPx}px repeat(${colCount}, ${digitColPx}px)`;
  const gridGapClass = colCount >= 5 ? 'gap-1' : 'gap-2';
  const digitFontClass = colCount >= 6 ? 'text-2xl' : colCount === 5 ? 'text-3xl' : 'text-4xl';

  const digitsA = getColumnDigits(problem.a, colCount);
  const digitsB = getColumnDigits(problem.b, colCount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kara's Methods"
      data-testid="scratch-paper-modal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-3 sm:p-5"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#8c5a2b] bg-[#fffaf0] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#e7d8c0] bg-[#fef3c7] px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-[#b45309]" />
              <h2 className="font-display text-2xl font-bold text-[#451a03]">
                Kara&apos;s Methods
              </h2>
              <span className="rounded-xl border-2 border-[#d97706] bg-white px-2.5 py-0.5 font-display text-base font-bold text-[#78350f] tabular-nums">
                {problem.a} {problem.symbol} {problem.b} = ?
              </span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-[#92400e]">
              Pick a solving method below, trade blocks or borrow digits, and test your answer!
            </p>
          </div>
          <button
            type="button"
            aria-label="Close methods"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#8c5a2b] bg-white text-[#5c3d1e] hover:bg-[#fde68a]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Guided Hint Callout */}
        <div className="border-b-2 border-[#fde68a] bg-[#fffbeb] px-5 py-2.5">
          <div className="flex items-start gap-2.5 text-xs font-extrabold text-[#78350f] sm:text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />
            <div>
              <span>Hint: {problem.hint}</span>
              {wrongAttempts >= 2 && (
                <span className="ml-2 rounded-lg bg-[#fef3c7] px-2 py-0.5 text-xs text-[#b45309]">
                  Take your time—work it step-by-step right here!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Strategy Picker Tabs */}
        <div className="flex flex-wrap gap-2 border-b-2 border-[#e7d8c0] bg-[#fcf7ec] px-5 py-2.5">
          {STRATEGIES.map((s) => {
            const Icon = s.icon;
            const active = strategy === s.id;
            return (
              <button
                key={s.id}
                type="button"
                data-testid={`strategy-tab-${s.id}`}
                aria-pressed={active}
                onClick={() => setStrategy(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition sm:text-sm ${
                  active
                    ? 'border-[#b45309] bg-[#f59e0b] text-white shadow-[0_2px_0_#b45309]'
                    : 'border-[#e7d8c0] bg-white text-[#78532a] hover:bg-[#fef3c7]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body: Left Strategy Visualizer + Right Interactive Drawing Pad */}
        <div className="cozy-scroll grid flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-2">
          {/* Strategy Workspace */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-[#d6be9b] bg-white p-4 shadow-sm">
            <div>
              {strategy === 'vertical' && (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
                      Interactive Vertical Alignment
                    </span>
                    <button
                      type="button"
                      data-testid="vertical-reset-btn"
                      onClick={resetVerticalHelpers}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d6be9b] bg-[#fcf7ec] px-2 py-0.5 text-[11px] font-extrabold text-[#78532a] hover:bg-[#fef3c7]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </button>
                  </div>

                  {problem.operation === 'div' ? (
                    /* Interactive Long Division House Layout */
                    <div className="flex flex-col items-center rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] py-5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#64748b]">Quotient:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          aria-label="Enter division quotient"
                          data-testid="vertical-div-input"
                          value={divInput}
                          onChange={(e) => {
                            setDivInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                            setVerticalFeedback(null);
                          }}
                          placeholder="?"
                          className="h-11 w-32 rounded-xl border-2 border-[#0284c7] bg-white text-center font-display text-2xl font-bold text-[#0c4a6e] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
                        />
                      </div>
                      <div className="flex items-center gap-2 font-display text-3xl sm:text-4xl font-bold text-[#1e293b] tabular-nums">
                        <span className="rounded-xl bg-[#f3e8ff] px-3 py-1 text-[#6b21a8]">
                          {problem.b}
                        </span>
                        <div className="rounded-tl-md border-t-4 border-l-4 border-[#1e293b] px-4 pt-2 pb-1">
                          {problem.a}
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-extrabold text-[#475569]">
                        How many groups of {problem.b} go into {problem.a}?
                      </p>
                    </div>
                  ) : (
                    /* Stacked Place Value Alignment Grid with Borrow & Result Input */
                    <div className="flex flex-col items-center overflow-x-auto rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] px-3 py-4">
                      <div className="inline-block">
                        {/* Place Value Column Headers */}
                        <div
                          className={`mb-2 grid items-center ${gridGapClass} text-center`}
                          style={{ gridTemplateColumns }}
                        >
                          <div />
                          {colHeaders.map((h) => (
                            <div
                              key={h.label}
                              title={h.name}
                              className={`rounded-lg py-0.5 text-[11px] font-extrabold ${h.color}`}
                            >
                              {h.label}
                            </div>
                          ))}
                        </div>

                        {/* Interactive Borrow (Subtraction) or Carry (Add/Mul) Row */}
                        <div
                          className={`mb-1.5 grid items-center ${gridGapClass} text-center`}
                          style={{ gridTemplateColumns }}
                        >
                          <div className="text-[10px] font-extrabold text-[#64748b]">
                            {problem.operation === 'sub' ? 'Work' : 'Carry'}
                          </div>
                          {colHeaders.map((_, idx) => {
                            if (problem.operation === 'sub') {
                              const working = topWorkingDigits[idx];
                              const wasChanged = borrowedFlags[idx];
                              const canBorrow =
                                idx < colCount - 1 &&
                                working !== null &&
                                working > 0 &&
                                topWorkingDigits[idx + 1] !== null;
                              return (
                                <div key={idx} className="flex flex-col items-center">
                                  {wasChanged && working !== null ? (
                                    <span
                                      data-testid={`borrowed-value-${idx}`}
                                      className="inline-flex min-w-[30px] items-center justify-center rounded-full border-2 border-[#dc2626] bg-[#fee2e2] px-1 py-0.5 font-display text-xs font-bold text-[#b91c1c] tabular-nums"
                                    >
                                      {working}
                                    </span>
                                  ) : canBorrow ? (
                                    <button
                                      type="button"
                                      data-testid={`borrow-btn-${idx}`}
                                      onClick={() => handleBorrowFromColumn(idx)}
                                      className="rounded-lg border border-dashed border-[#f59e0b] bg-[#fef3c7] px-1 py-0.5 text-[9px] font-extrabold text-[#92400e] hover:bg-[#fde68a]"
                                    >
                                      {colCount >= 5 ? 'Brw' : 'Borrow'}
                                    </button>
                                  ) : (
                                    <span className="h-6" />
                                  )}
                                </div>
                              );
                            }

                            const carryVal = carryMarks[idx] ?? 0;
                            return (
                              <button
                                key={idx}
                                type="button"
                                data-testid={`carry-btn-${idx}`}
                                aria-label={`Set carry note for column ${idx + 1}`}
                                onClick={() => cycleCarryMark(idx)}
                                className={`mx-auto flex h-7 ${colCount >= 5 ? 'w-8' : 'w-10'} items-center justify-center rounded-full border-2 border-dashed text-xs font-extrabold transition ${
                                  carryVal > 0
                                    ? 'border-[#dc2626] bg-[#fee2e2] text-[#b91c1c]'
                                    : 'border-[#cbd5e1] bg-white text-[#94a3b8] hover:border-[#f59e0b]'
                                }`}
                              >
                                {carryVal > 0 ? `+${carryVal}` : '+'}
                              </button>
                            );
                          })}
                        </div>

                        {/* Top Number Row (clicking Tens/Hundreds in subtraction also triggers Borrow!) */}
                        <div
                          className={`grid items-center ${gridGapClass} text-center font-display ${digitFontClass} font-bold text-[#1e293b] tabular-nums`}
                          style={{ gridTemplateColumns }}
                        >
                          <div />
                          {digitsA.map((d, idx) => {
                            const canBorrowThis =
                              problem.operation === 'sub' &&
                              idx < colCount - 1 &&
                              (topWorkingDigits[idx] ?? 0) > 0 &&
                              topWorkingDigits[idx + 1] !== null;
                            const isCrossed = problem.operation === 'sub' && borrowedFlags[idx];
                            if (d === ' ') {
                              return <div key={idx} className="py-1">&nbsp;</div>;
                            }
                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={!canBorrowThis}
                                data-testid={`top-digit-${idx}`}
                                title={
                                  canBorrowThis
                                    ? 'Click to borrow 1 to the right column'
                                    : undefined
                                }
                                onClick={() => canBorrowThis && handleBorrowFromColumn(idx)}
                                className={`relative rounded-lg border py-1 transition ${
                                  isCrossed
                                    ? 'border-[#fca5a5] bg-[#fef2f2] text-[#94a3b8] line-through'
                                    : canBorrowThis
                                      ? 'cursor-pointer border-[#cbd5e1] bg-white hover:border-[#f59e0b] hover:bg-[#fffbeb]'
                                      : 'cursor-default border-[#e2e8f0] bg-white'
                                }`}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>

                        {/* Operator + Bottom Number Row */}
                        <div
                          className={`mt-1.5 grid items-center ${gridGapClass} text-center font-display ${digitFontClass} font-bold text-[#1e293b] tabular-nums`}
                          style={{ gridTemplateColumns }}
                        >
                          <div className="text-2xl text-[#b45309] sm:text-3xl">{problem.symbol}</div>
                          {digitsB.map((d, idx) => (
                            <div
                              key={idx}
                              className={`rounded-lg border py-1 ${
                                d === ' '
                                  ? 'border-transparent bg-transparent'
                                  : 'border-[#e2e8f0] bg-white'
                              }`}
                            >
                              {d === ' ' ? '\u00A0' : d}
                            </div>
                          ))}
                        </div>

                        {/* Equals Line & Interactive Answer Digit Inputs */}
                        <div className="my-2 h-1 w-full rounded-full bg-[#334155]" />
                        <div
                          className={`grid items-center ${gridGapClass} text-center`}
                          style={{ gridTemplateColumns }}
                        >
                          <div className="text-lg font-extrabold text-[#64748b]">=</div>
                          {colHeaders.map((h, idx) => (
                            <input
                              key={idx}
                              ref={(el) => {
                                resultInputRefs.current[idx] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              aria-label={`${h.name} digit`}
                              data-testid={`vertical-result-input-${idx}`}
                              value={resultInputs[idx] ?? ''}
                              onChange={(e) => handleResultDigitChange(idx, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCheckVerticalAnswer();
                                }
                              }}
                              placeholder={h.label}
                              className="h-11 w-full rounded-xl border-2 border-[#0284c7] bg-white text-center font-display text-xl font-bold text-[#0f172a] tabular-nums placeholder:text-[10px] placeholder:font-extrabold placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] sm:h-12 sm:text-2xl"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Check & Submit Controls for Vertical Workspace */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid="vertical-check-btn"
                      onClick={handleCheckVerticalAnswer}
                      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#0369a1] bg-[#0ea5e9] px-3.5 py-2 font-display text-sm font-bold text-white shadow-[0_3px_0_#0369a1] hover:bg-[#0284c7] active:translate-y-0.5"
                    >
                      <Check className="h-4 w-4" />
                      Check Answer
                    </button>

                    {verticalFeedback?.correct && onSubmitAnswer && verticalFeedback.enteredValue !== null && (
                      <button
                        type="button"
                        data-testid="vertical-submit-btn"
                        onClick={() => onSubmitAnswer(verticalFeedback.enteredValue!)}
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#15803d] bg-[#22c55e] px-3.5 py-2 font-display text-sm font-bold text-white shadow-[0_3px_0_#15803d] hover:bg-[#16a34a] active:translate-y-0.5"
                      >
                        Submit {verticalFeedback.enteredValue} ★
                      </button>
                    )}

                    {verticalFeedback && (
                      <span
                        data-testid="vertical-feedback-msg"
                        className={`text-xs font-extrabold ${
                          verticalFeedback.correct ? 'text-[#15803d]' : 'text-[#b45309]'
                        }`}
                      >
                        {verticalFeedback.message}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {strategy === 'numberline' && (
                <NumberLineView problem={problem} onSubmitAnswer={onSubmitAnswer} />
              )}
              {strategy === 'blocks' && (
                <BaseBlocksView problem={problem} onSubmitAnswer={onSubmitAnswer} />
              )}
              {strategy === 'make10' && (
                <MakeTenView problem={problem} onSubmitAnswer={onSubmitAnswer} />
              )}
            </div>

            {/* Step-by-step Coaching Box */}
            <div className="mt-4 rounded-xl border-2 border-[#e7d8c0] bg-[#fcf7ec] p-3">
              <div className="mb-1 text-[11px] font-extrabold tracking-wide text-[#92400e] uppercase">
                Step-by-Step Guide
              </div>
              <ol className="list-decimal space-y-1 pl-4 text-xs font-bold text-[#5c3d1e]">
                {coachSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Interactive Lined Scratch Pad Canvas */}
          <div className="flex flex-col rounded-2xl border-2 border-[#d6be9b] bg-white p-4 shadow-sm">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
                Doodle &amp; Work Pad
              </span>
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.name}
                    onClick={() => {
                      setEraserOn(false);
                      setPenColor(c.hex);
                    }}
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      !eraserOn && penColor === c.hex
                        ? 'scale-110 border-[#f59e0b] ring-2 ring-[#fde68a]'
                        : 'border-[#cbd5e1]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <button
                  type="button"
                  aria-label="Eraser"
                  aria-pressed={eraserOn}
                  onClick={() => setEraserOn((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-lg border-2 px-2 py-1 text-xs font-extrabold ${
                    eraserOn
                      ? 'border-[#0284c7] bg-[#e0f2fe] text-[#0c4a6e]'
                      : 'border-[#cbd5e1] bg-white text-[#5c3d1e]'
                  }`}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Erase
                </button>
                <button
                  type="button"
                  onClick={clearScratchPad}
                  className="inline-flex items-center gap-1 rounded-lg border-2 border-[#fca5a5] bg-[#fef2f2] px-2 py-1 text-xs font-extrabold text-[#b91c1c] hover:bg-[#fee2e2]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
            </div>

            {/* Notebook lined paper backdrop behind transparent drawing canvas */}
            <div
              className="relative flex-1 overflow-hidden rounded-2xl border-2 border-[#bfdbfe]"
              style={{
                backgroundColor: '#fffef9',
                backgroundImage:
                  'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                minHeight: '220px',
              }}
            >
              <canvas
                ref={canvasRef}
                data-testid="scratch-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="h-full w-full cursor-crosshair touch-none"
              />
            </div>
            <p className="mt-2 text-[11px] font-bold text-[#8c7355]">
              Tip: Write stacked numbers, tally marks, or draw hops right on the grid above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* --- Interactive Number Line Strategy (Fillable Ticks Below Line + Check Answer) --- */

const HOP_STYLE: Record<
  NumberLineHopKind,
  { stroke: string; text: string; pillBg: string; pillBorder: string; peakY: number }
> = {
  thousand: {
    stroke: '#0f766e',
    text: '#115e59',
    pillBg: '#ccfbf1',
    pillBorder: '#14b8a6',
    peakY: 8,
  },
  hundred: {
    stroke: '#7e22ce',
    text: '#581c87',
    pillBg: '#f3e8ff',
    pillBorder: '#a855f7',
    peakY: 16,
  },
  ten: {
    stroke: '#2563eb',
    text: '#1e3a8a',
    pillBg: '#dbeafe',
    pillBorder: '#3b82f6',
    peakY: 28,
  },
  one: {
    stroke: '#16a34a',
    text: '#14532d',
    pillBg: '#dcfce7',
    pillBorder: '#22c55e',
    peakY: 42,
  },
  group: {
    stroke: '#d97706',
    text: '#78350f',
    pillBg: '#fef3c7',
    pillBorder: '#f59e0b',
    peakY: 26,
  },
};

const NumberLineView: React.FC<{
  problem: MathProblem;
  onSubmitAnswer?: (val: number) => void;
}> = ({ problem, onSubmitAnswer }) => {
  const plan = useMemo(() => buildNumberLinePlan(problem), [problem]);
  const [tickInputs, setTickInputs] = useState<string[]>(() =>
    Array.from({ length: plan.hops.length }, () => '')
  );
  const [finalJumpInput, setFinalJumpInput] = useState('');
  const [activeHopIdx, setActiveHopIdx] = useState<number | null>(0);
  const [checkResult, setCheckResult] = useState<NumberLineCheckResult | null>(null);

  useEffect(() => {
    setTickInputs(Array.from({ length: plan.hops.length }, () => ''));
    setFinalJumpInput('');
    setActiveHopIdx(0);
    setCheckResult(null);
  }, [problem.id, plan.hops.length]);

  const count = Math.max(1, plan.hops.length);
  const startX = plan.isBackward ? 352 : 48;
  const endX = plan.isBackward ? 48 : 352;
  const stepX = (endX - startX) / count;

  const hasThousand = plan.hops.some((h) => h.kind === 'thousand');
  const hasHundred = plan.hops.some((h) => h.kind === 'hundred');
  const hasTen = plan.hops.some((h) => h.kind === 'ten');
  const hasOne = plan.hops.some((h) => h.kind === 'one');
  const hasGroup = plan.hops.some((h) => h.kind === 'group');

  const maxDigits = Math.max(
    String(plan.startVal).length,
    String(problem.a).length,
    String(problem.answer).length
  );
  const inputWidthClass =
    maxDigits >= 6 ? 'w-16 text-xs' : maxDigits >= 4 ? 'w-14 text-xs' : 'w-12 text-sm';

  const handleTickChange = (idx: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 7);
    setTickInputs((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    setCheckResult(null);
  };

  const handleReset = () => {
    setTickInputs(Array.from({ length: plan.hops.length }, () => ''));
    setFinalJumpInput('');
    setActiveHopIdx(0);
    setCheckResult(null);
  };

  const handleCheck = () => {
    const res = checkNumberLineAnswers(plan, tickInputs, finalJumpInput);
    setCheckResult(res);
  };

  return (
    <div data-testid="number-line-view">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
          Interactive Number Line
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Place-Value Hop Color Legend */}
          <div
            data-testid="numberline-legend"
            className="flex flex-wrap items-center gap-1 text-[10px] font-extrabold"
          >
            {hasThousand && (
              <span className="rounded-md border border-[#14b8a6] bg-[#ccfbf1] px-1.5 py-0.5 text-[#115e59]">
                1000s Teal
              </span>
            )}
            {(hasHundred || (!hasThousand && (problem.a >= 100 || problem.b >= 100))) && (
              <span className="rounded-md border border-[#a855f7] bg-[#f3e8ff] px-1.5 py-0.5 text-[#581c87]">
                100s Purple
              </span>
            )}
            {hasTen && (
              <span className="rounded-md border border-[#3b82f6] bg-[#dbeafe] px-1.5 py-0.5 text-[#1e3a8a]">
                10s Blue
              </span>
            )}
            {hasOne && (
              <span className="rounded-md border border-[#22c55e] bg-[#dcfce7] px-1.5 py-0.5 text-[#14532d]">
                1s Green
              </span>
            )}
            {hasGroup && (
              <span className="rounded-md border border-[#f59e0b] bg-[#fef3c7] px-1.5 py-0.5 text-[#78350f]">
                Equal Jumps
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid="numberline-reset-btn"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-lg border border-[#d6be9b] bg-[#fcf7ec] px-2 py-0.5 text-[11px] font-extrabold text-[#78532a] hover:bg-[#fef3c7]"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
        <div className="overflow-x-auto">
          <div className={count >= 6 || (count >= 4 && maxDigits >= 4) ? 'min-w-[390px]' : 'w-full'}>
          {/* SVG Number Line with Hops & Tick Marks */}
          <svg
            viewBox="0 0 400 106"
            className="w-full"
            role="img"
            aria-label="Interactive number line with hops and fillable tick boxes below"
          >
            <line
              x1="24"
              y1="88"
              x2="376"
              y2="88"
              stroke="#334155"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <polygon points="376,83 386,88 376,93" fill="#334155" />
            <polygon points="24,83 14,88 24,93" fill="#334155" />

            {/* Start Tick */}
            <line x1={startX} y1="81" x2={startX} y2="96" stroke="#14532d" strokeWidth="2.5" />

            {plan.hops.map((hop, idx) => {
              const x1 = startX + idx * stepX;
              const x2 = startX + (idx + 1) * stepX;
              const midX = (x1 + x2) / 2;
              const st = HOP_STYLE[hop.kind];
              const isHighlighted = activeHopIdx === idx;
              const apexY = (85 + st.peakY) / 2;
              const pillW = Math.max(26, hop.label.length * 6.8 + 10);
              const pillY = Math.max(2, apexY - 17);
              const isDashed = plan.hasDivisionEllipsis && idx === plan.hops.length - 1;
              const tickColor =
                checkResult && !isDashed
                  ? checkResult.tickValid[idx]
                    ? '#16a34a'
                    : '#dc2626'
                  : idx === plan.hops.length - 1 && !plan.isDivisionCountMode
                    ? '#d97706'
                    : '#475569';

              return (
                <g key={idx}>
                  <path
                    d={`M ${x1} 85 Q ${midX} ${st.peakY} ${x2} 85`}
                    fill="none"
                    stroke={st.stroke}
                    strokeWidth={isHighlighted ? '4' : '2.8'}
                    strokeDasharray={isDashed ? '4 3' : undefined}
                    opacity={activeHopIdx === null || isHighlighted ? 1 : 0.72}
                  />
                  <line x1={x2} y1="81" x2={x2} y2="96" stroke={tickColor} strokeWidth="2.5" />
                  <circle cx={x1} cy="88" r="3.8" fill={st.stroke} />
                  <circle cx={x2} cy="88" r="4" fill={tickColor} />
                  <rect
                    x={midX - pillW / 2}
                    y={pillY}
                    width={pillW}
                    height={16}
                    rx={6}
                    fill={st.pillBg}
                    stroke={st.pillBorder}
                    strokeWidth={isHighlighted ? '2' : '1.2'}
                  />
                  <text
                    x={midX}
                    y={pillY + 11.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="800"
                    fill={st.text}
                  >
                    {hop.label}
                  </text>
                </g>
              );
            })}

            <circle cx={startX} cy="88" r="5.5" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
            <circle
              cx={endX}
              cy="88"
              r="5.5"
              fill={checkResult?.allCorrect ? '#22c55e' : '#facc15'}
              stroke={checkResult?.allCorrect ? '#14532d' : '#92400e'}
              strokeWidth="2"
            />
          </svg>

          {/* Aligned Interactive Tick Input Boxes Directly Below the Number Line */}
          <div className="relative mt-0.5 h-14 w-full">
            {/* Fixed Start Number Pill */}
            <div
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${(startX / 400) * 100}%` }}
            >
              <span
                data-testid="numberline-start-val"
                className="rounded-lg border-2 border-[#16a34a] bg-[#dcfce7] px-2 py-0.5 font-display text-xs font-bold text-[#14532d] tabular-nums"
              >
                {plan.startVal}
              </span>
              <span className="mt-0.5 text-[9px] font-extrabold text-[#15803d] uppercase">
                Start
              </span>
            </div>

            {/* Interactive Landing Number Inputs for Every Hop */}
            {plan.hops.map((hop, idx) => {
              const tickX = startX + (idx + 1) * stepX;
              const isEllipsisEnd = plan.hasDivisionEllipsis && idx === plan.hops.length - 1;
              const isFinalTarget = !plan.isDivisionCountMode && idx === plan.hops.length - 1;
              const isChecked = checkResult !== null;
              const isValid = checkResult?.tickValid[idx] ?? false;

              if (isEllipsisEnd) {
                return (
                  <div
                    key={idx}
                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${(tickX / 400) * 100}%` }}
                  >
                    <span className="rounded-lg border-2 border-[#f59e0b] bg-[#fef3c7] px-2 py-0.5 font-display text-xs font-bold text-[#78350f] tabular-nums">
                      {hop.targetValue}
                    </span>
                    <span className="mt-0.5 text-[9px] font-extrabold text-[#92400e] uppercase">
                      Target
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${(tickX / 400) * 100}%` }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    data-testid={`numberline-tick-input-${idx}`}
                    aria-label={
                      isFinalTarget
                        ? 'Final answer below number line'
                        : `Number below tick ${idx + 1}`
                    }
                    value={tickInputs[idx] ?? ''}
                    onFocus={() => setActiveHopIdx(idx)}
                    onChange={(e) => handleTickChange(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCheck();
                    }}
                    placeholder="?"
                    className={`h-8 rounded-lg border-2 px-1 text-center font-display font-bold tabular-nums focus:outline-none focus:ring-2 ${inputWidthClass} ${
                      isChecked
                        ? isValid
                          ? 'border-[#16a34a] bg-[#dcfce7] text-[#14532d] focus:ring-[#4ade80]'
                          : 'border-[#dc2626] bg-[#fee2e2] text-[#991b1b] focus:ring-[#f87171]'
                        : isFinalTarget
                          ? 'border-[#d97706] bg-[#fffbeb] text-[#78350f] focus:ring-[#fbbf24]'
                          : 'border-[#0284c7] bg-white text-[#0f172a] focus:ring-[#38bdf8]'
                    }`}
                  />
                  {isFinalTarget && (
                    <span className="mt-0.5 text-[9px] font-extrabold text-[#b45309] uppercase">
                      Answer
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>

        {/* Division: Extra "How many jumps?" box */}
        {plan.isDivisionCountMode && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-[#f59e0b] bg-[#fffbeb] px-3 py-2">
            <label
              htmlFor="numberline-final-jumps"
              className="text-xs font-extrabold text-[#78350f]"
            >
              How many total jumps of {problem.b} reach {problem.a}?
            </label>
            <input
              id="numberline-final-jumps"
              type="text"
              inputMode="numeric"
              data-testid="numberline-final-input"
              value={finalJumpInput}
              onChange={(e) => {
                setFinalJumpInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                setCheckResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCheck();
              }}
              placeholder="?"
              className={`h-8 w-20 rounded-lg border-2 px-2 text-center font-display text-sm font-bold tabular-nums focus:outline-none focus:ring-2 ${
                checkResult
                  ? checkResult.finalValid
                    ? 'border-[#16a34a] bg-[#dcfce7] text-[#14532d] focus:ring-[#4ade80]'
                    : 'border-[#dc2626] bg-[#fee2e2] text-[#991b1b] focus:ring-[#f87171]'
                  : 'border-[#d97706] bg-white text-[#78350f] focus:ring-[#fbbf24]'
              }`}
            />
          </div>
        )}

        <p className="mt-1.5 text-center text-xs font-extrabold text-[#475569]">{plan.subtitle}</p>
      </div>

      {/* Check & Submit Controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="numberline-check-btn"
          onClick={handleCheck}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#0369a1] bg-[#0ea5e9] px-3.5 py-2 font-display text-sm font-bold text-white shadow-[0_3px_0_#0369a1] hover:bg-[#0284c7] active:translate-y-0.5"
        >
          <Check className="h-4 w-4" />
          Check Answer
        </button>

        {checkResult?.allCorrect && onSubmitAnswer && (
          <button
            type="button"
            data-testid="numberline-submit-btn"
            onClick={() => onSubmitAnswer(plan.expectedFinalAnswer)}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#15803d] bg-[#22c55e] px-3.5 py-2 font-display text-sm font-bold text-white shadow-[0_3px_0_#15803d] hover:bg-[#16a34a] active:translate-y-0.5"
          >
            Submit {plan.expectedFinalAnswer} ★
          </button>
        )}

        {checkResult && (
          <span
            data-testid="numberline-feedback-msg"
            className={`text-xs font-extrabold ${
              checkResult.allCorrect ? 'text-[#15803d]' : 'text-[#b45309]'
            }`}
          >
            {checkResult.message}
          </span>
        )}
      </div>
    </div>
  );
};

/* --- Interactive Movable Base-10 Blocks Strategy --- */

interface DragBlockState {
  blockId: number | null;
  spawnValue?: BlockValue;
  spawnGroupSize?: number;
  sourceZone: BlockZone | 'supply';
  value: BlockValue;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
}

const BlockVisual: React.FC<{
  value: BlockValue;
  note?: string;
  dimmed?: boolean;
}> = ({ value, note, dimmed = false }) => {
  if (value === 100) {
    return (
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded border-2 text-[10px] font-extrabold transition ${
          dimmed
            ? 'border-[#d8b4fe] bg-[#faf5ff] text-[#a855f7] opacity-35'
            : 'border-[#7e22ce] bg-[#e9d5ff] text-[#581c87] shadow-xs'
        }`}
        style={
          dimmed
            ? undefined
            : {
                backgroundImage:
                  'linear-gradient(#c084fc55 1px, transparent 1px), linear-gradient(90deg, #c084fc55 1px, transparent 1px)',
                backgroundSize: '4px 4px',
              }
        }
      >
        100
      </span>
    );
  }
  if (value === 10) {
    return (
      <span
        className={`relative block h-10 w-3.5 rounded border transition ${
          dimmed
            ? 'border-[#bfdbfe] bg-[#eff6ff] opacity-35'
            : note
              ? 'border-[#15803d] bg-[#86efac] ring-2 ring-[#22c55e]/50 shadow-xs'
              : 'border-[#1d4ed8] bg-[#93c5fd] shadow-xs'
        }`}
        style={
          dimmed
            ? undefined
            : {
                backgroundImage: 'linear-gradient(rgba(30,58,138,0.22) 1px, transparent 1px)',
                backgroundSize: '100% 4px',
              }
        }
      />
    );
  }
  return (
    <span
      className={`block h-4.5 w-4.5 rounded-sm border transition ${
        dimmed
          ? 'border-[#fde68a] bg-[#fefce8] opacity-35'
          : note
            ? 'border-[#c2410c] bg-[#fed7aa] ring-1 ring-[#fb923c]'
            : 'border-[#b45309] bg-[#fde047] shadow-[inset_0_-1px_0_rgba(180,83,9,0.35)]'
      }`}
    />
  );
};

const DraggableBlockButton: React.FC<{
  block: MovableBlock;
  isDraggingThis: boolean;
  hintText: string;
  onStartPointer: (e: React.PointerEvent<HTMLButtonElement>, block: MovableBlock) => void;
}> = ({ block, isDraggingThis, hintText, onStartPointer }) => (
  <button
    type="button"
    data-testid={`movable-block-${block.id}`}
    data-block-value={block.value}
    data-block-zone={block.zone}
    aria-label={`${block.value} block in ${block.zone} (${hintText})`}
    title={hintText}
    onPointerDown={(e) => onStartPointer(e, block)}
    className="cursor-grab touch-none rounded p-0.5 transition hover:scale-105 active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-[#f59e0b]"
  >
    <BlockVisual value={block.value} note={block.note} dimmed={isDraggingThis} />
  </button>
);

const BaseBlocksView: React.FC<{
  problem: MathProblem;
  onSubmitAnswer?: (val: number) => void;
}> = ({ problem, onSubmitAnswer }) => {
  const nextIdRef = useRef(1);
  const initData = useMemo(() => buildInitialBlocksForProblem(problem), [problem]);

  const [blocks, setBlocks] = useState<MovableBlock[]>(() => {
    nextIdRef.current = initData.nextId;
    return initData.blocks;
  });
  const [bankedGroups, setBankedGroups] = useState<MovableBlock[][]>([]);
  const [dragState, setDragState] = useState<DragBlockState | null>(null);
  const dragRef = useRef<DragBlockState | null>(null);
  const [hoverZone, setHoverZone] = useState<string | null>(null);
  const [checkFeedback, setCheckFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    nextIdRef.current = initData.nextId;
    setBlocks(initData.blocks);
    setBankedGroups([]);
    dragRef.current = null;
    setDragState(null);
    setHoverZone(null);
    setCheckFeedback(null);
  }, [problem.id, initData]);

  const isLargeStarlight = initData.isLargeStarlight;
  const op = problem.operation;

  const getDefaultTapDestination = (block: MovableBlock): BlockZone | 'remove' => {
    if (op === 'add') {
      if (block.zone === 'mat') return block.originSet ?? 'set1';
      return 'mat';
    }
    if (op === 'sub') {
      return block.zone === 'set1' ? 'takeaway' : 'set1';
    }
    if (op === 'div') {
      return block.zone === 'set1' ? 'groupbin' : 'set1';
    }
    // mul: tapping a block on the mat removes it
    return block.zone === 'mat' ? 'remove' : 'mat';
  };

  const applyZoneMove = (
    blockId: number,
    targetZone: BlockZone | 'supply'
  ) => {
    setCheckFeedback(null);
    if (targetZone === 'supply') {
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      return;
    }

    setBlocks((prev) => {
      const next = moveBlockToZone(prev, blockId, targetZone);
      if (op === 'div' && targetZone === 'groupbin') {
        const binSum = sumZoneValue(next, 'groupbin');
        if (binSum === problem.b && problem.b > 0) {
          const groupPieces = next.filter((b) => b.zone === 'groupbin');
          setBankedGroups((groups) => [...groups, groupPieces]);
          return next.filter((b) => b.zone !== 'groupbin');
        }
      }
      return next;
    });
  };

  const spawnIntoZone = (value: BlockValue, targetZone: BlockZone) => {
    setCheckFeedback(null);
    setBlocks((prev) => [
      ...prev,
      { id: nextIdRef.current++, value, zone: targetZone, originSet: 'set1' },
    ]);
  };

  const spawnGroupBundleIntoZone = (groupSize: number, targetZone: BlockZone) => {
    setCheckFeedback(null);
    setBlocks((prev) => {
      const res = decomposeToBlocks(groupSize, nextIdRef.current, targetZone, 'set1');
      nextIdRef.current = res.nextId;
      return [...prev, ...res.blocks];
    });
  };

  const isPointerTracking = dragState !== null;

  // Pointer drag-and-drop listeners (mounted once per drag gesture)
  useEffect(() => {
    if (!isPointerTracking) return;

    const handleMove = (e: PointerEvent) => {
      const curr = dragRef.current;
      if (!curr) return;
      const dist = Math.hypot(e.clientX - curr.startX, e.clientY - curr.startY);
      const active = curr.active || dist >= 5;
      const updated: DragBlockState = { ...curr, x: e.clientX, y: e.clientY, active };
      dragRef.current = updated;
      setDragState(updated);

      if (active) {
        const hit = document
          .elementsFromPoint(e.clientX, e.clientY)
          .find((el) => el.hasAttribute('data-dropzone'));
        setHoverZone(hit ? hit.getAttribute('data-dropzone') : null);
      }
    };

    const handleUp = (e: PointerEvent) => {
      const curr = dragRef.current;
      dragRef.current = null;
      setDragState(null);
      setHoverZone(null);
      if (!curr) return;

      const dist = Math.hypot(e.clientX - curr.startX, e.clientY - curr.startY);
      const wasDrag = curr.active || dist >= 5;
      const hit = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el) => el.hasAttribute('data-dropzone'));
      const dropTarget = hit?.getAttribute('data-dropzone') as BlockZone | 'supply' | null;

      if (curr.blockId !== null) {
        const movedBlock = blocks.find((b) => b.id === curr.blockId);
        if (movedBlock) {
          if (!wasDrag) {
            const tapTarget = getDefaultTapDestination(movedBlock);
            applyZoneMove(movedBlock.id, tapTarget === 'remove' ? 'supply' : tapTarget);
          } else if (dropTarget && dropTarget !== curr.sourceZone) {
            applyZoneMove(movedBlock.id, dropTarget);
          }
        }
      } else if (curr.sourceZone === 'supply') {
        if (!wasDrag || dropTarget === 'mat') {
          if (curr.spawnGroupSize !== undefined) {
            spawnGroupBundleIntoZone(curr.spawnGroupSize, 'mat');
          } else if (curr.spawnValue) {
            spawnIntoZone(curr.spawnValue, 'mat');
          }
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPointerTracking, blocks, op, problem.b]);

  const startBlockPointer = (e: React.PointerEvent<HTMLButtonElement>, block: MovableBlock) => {
    e.preventDefault();
    const init: DragBlockState = {
      blockId: block.id,
      sourceZone: block.zone,
      value: block.value,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
    };
    dragRef.current = init;
    setDragState(init);
  };

  const startSupplyPointer = (
    e: React.PointerEvent<HTMLButtonElement>,
    value: BlockValue,
    groupSize?: number
  ) => {
    e.preventDefault();
    const init: DragBlockState = {
      blockId: null,
      spawnValue: value,
      spawnGroupSize: groupSize,
      sourceZone: 'supply',
      value,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
    };
    dragRef.current = init;
    setDragState(init);
  };

  const handleReset = () => {
    nextIdRef.current = initData.nextId;
    setBlocks(initData.blocks);
    setBankedGroups([]);
    dragRef.current = null;
    setDragState(null);
    setHoverZone(null);
    setCheckFeedback(null);
  };

  const activeHoverZone = dragState?.active ? hoverZone : null;

  // Zone summaries
  const activeRegroupZone: BlockZone =
    op === 'sub' || op === 'div' ? 'set1' : op === 'mul' ? 'mat' : 'mat';
  const regroupCounts = countZoneByValue(blocks, activeRegroupZone);
  // In Addition, allow Break/Trade on whichever zone holds blocks (prefer Mat if non-empty, else Set 1)
  const addEffectiveZone: BlockZone =
    op === 'add' && sumZoneValue(blocks, 'mat') === 0
      ? sumZoneValue(blocks, 'set1') > 0
        ? 'set1'
        : 'set2'
      : activeRegroupZone;
  const effectiveCounts =
    op === 'add' ? countZoneByValue(blocks, addEffectiveZone) : regroupCounts;

  const handleBreakBlock = (fromValue: 100 | 10) => {
    setCheckFeedback(null);
    setBlocks((prev) => {
      const res = breakBlockInZone(prev, addEffectiveZone, fromValue, nextIdRef.current);
      nextIdRef.current = res.nextId;
      return res.blocks;
    });
  };

  const handleTradeOnes = () => {
    setCheckFeedback(null);
    setBlocks((prev) => {
      const res = tradeBlocksInZone(prev, addEffectiveZone, 1, nextIdRef.current);
      nextIdRef.current = res.nextId;
      return res.blocks;
    });
  };

  const set1Blocks = blocks.filter((b) => b.zone === 'set1');
  const set2Blocks = blocks.filter((b) => b.zone === 'set2');
  const matBlocks = blocks.filter((b) => b.zone === 'mat');
  const takeawayBlocks = blocks.filter((b) => b.zone === 'takeaway');
  const groupBinBlocks = blocks.filter((b) => b.zone === 'groupbin');

  const set1Total = sumZoneValue(blocks, 'set1');
  const set2Total = sumZoneValue(blocks, 'set2');
  const matTotal = sumZoneValue(blocks, 'mat');
  const takeawayTotal = sumZoneValue(blocks, 'takeaway');
  const groupBinTotal = sumZoneValue(blocks, 'groupbin');

  const handleUndoBankedGroup = () => {
    setCheckFeedback(null);
    setBankedGroups((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setBlocks((bPrev) => [
        ...bPrev,
        ...last.map((item) => ({ ...item, zone: 'set1' as const })),
      ]);
      return prev.slice(0, -1);
    });
  };

  const handleCheckBlocks = () => {
    if (isLargeStarlight) {
      setCheckFeedback({
        correct: false,
        message: 'Starlight numbers are over 999—use Vertical Alignment or Number Line to solve!',
      });
      return;
    }

    if (op === 'add') {
      if (matTotal === problem.answer && set1Blocks.length === 0 && set2Blocks.length === 0) {
        setCheckFeedback({
          correct: true,
          message: `Awesome! You moved both sets onto the Answer Mat to make ${matTotal}!`,
        });
      } else if (matTotal === problem.answer) {
        setCheckFeedback({
          correct: true,
          message: `Awesome! Your Answer Mat makes ${matTotal}!`,
        });
      } else if (set1Blocks.length > 0 || set2Blocks.length > 0) {
        setCheckFeedback({
          correct: false,
          message: `Answer Mat has ${matTotal}. Keep moving blocks from Set 1 & Set 2 onto the Mat!`,
        });
      } else {
        setCheckFeedback({
          correct: false,
          message: `Your Answer Mat totals ${matTotal}, not ${problem.answer}. Adjust the blocks!`,
        });
      }
      return;
    }

    if (op === 'sub') {
      if (takeawayTotal === problem.b && set1Total === problem.answer) {
        setCheckFeedback({
          correct: true,
          message: `Awesome! You took away ${problem.b}, leaving ${set1Total}!`,
        });
      } else if (takeawayTotal < problem.b) {
        setCheckFeedback({
          correct: false,
          message: `You moved ${takeawayTotal} into Take Away—move ${problem.b - takeawayTotal} more from Start With!`,
        });
      } else {
        setCheckFeedback({
          correct: false,
          message: `Take Away has ${takeawayTotal} (needs ${problem.b}). Drag ${takeawayTotal - problem.b} back to Start With!`,
        });
      }
      return;
    }

    if (op === 'mul') {
      if (matTotal === problem.answer) {
        setCheckFeedback({
          correct: true,
          message: `Awesome! Your ${problem.a} groups of ${problem.b} make ${matTotal}!`,
        });
      } else {
        setCheckFeedback({
          correct: false,
          message: `Answer Mat currently has ${matTotal}. Build ${problem.a} groups of ${problem.b}!`,
        });
      }
      return;
    }

    // Division
    if (
      set1Blocks.length === 0 &&
      groupBinBlocks.length === 0 &&
      bankedGroups.length === problem.answer
    ) {
      setCheckFeedback({
        correct: true,
        message: `Awesome! ${problem.a} splits evenly into ${bankedGroups.length} groups of ${problem.b}!`,
      });
    } else {
      setCheckFeedback({
        correct: false,
        message: `${bankedGroups.length} group(s) made so far, with ${set1Total + groupBinTotal} still ungrouped!`,
      });
    }
  };

  return (
    <div data-testid="interactive-base-blocks" className="relative">
      {/* Header Row */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
          Movable Base-10 Blocks
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold text-[#78532a]">
            Drag or tap blocks to move
          </span>
          <button
            type="button"
            data-testid="blocks-reset-btn"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-lg border border-[#d6be9b] bg-[#fcf7ec] px-2 py-0.5 text-[11px] font-extrabold text-[#78532a] hover:bg-[#fef3c7]"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {isLargeStarlight && (
        <div className="mb-2 rounded-xl border border-[#f59e0b] bg-[#fffbeb] px-2.5 py-1.5 text-[11px] font-extrabold text-[#92400e]">
          Starlight numbers are over 999! Practice moving sample blocks below, or switch to Vertical Alignment / Number Line to solve.
        </div>
      )}

      {/* Break & Trade Controls */}
      <div className="mb-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="blocks-break-ten"
          disabled={effectiveCounts.t < 1 && effectiveCounts.h < 1}
          onClick={() =>
            handleBreakBlock(effectiveCounts.t >= 1 ? 10 : 100)
          }
          className={`flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 text-left ${
            effectiveCounts.t >= 1 || effectiveCounts.h >= 1
              ? 'border-[#ea580c] bg-[#fff7ed] text-[#9a3412] shadow-[0_2px_0_#ea580c] hover:bg-[#ffedd5] active:translate-y-0.5'
              : 'cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] opacity-75'
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex shrink-0 items-center gap-0.5 rounded-md border bg-white px-1 py-0.5 ${
              effectiveCounts.t >= 1 || effectiveCounts.h >= 1
                ? 'border-[#fdba74]'
                : 'border-[#cbd5e1]'
            }`}
          >
            <span className="h-3.5 w-1.5 rounded-xs bg-[#3b82f6]" />
            <span className="text-[9px] font-black text-[#ea580c]">→</span>
            <span className="grid grid-cols-2 gap-0.5">
              <span className="h-1.5 w-1.5 rounded-xs bg-[#facc15]" />
              <span className="h-1.5 w-1.5 rounded-xs bg-[#facc15]" />
              <span className="h-1.5 w-1.5 rounded-xs bg-[#facc15]" />
              <span className="h-1.5 w-1.5 rounded-xs bg-[#facc15]" />
            </span>
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block whitespace-nowrap text-[10.5px] font-extrabold">
              {effectiveCounts.t >= 1 || effectiveCounts.h === 0
                ? 'Break 10 → 10 Ones'
                : 'Break 100 → 10 Tens'}
            </span>
            <span className="block text-[9.5px] font-bold opacity-85">
              {effectiveCounts.t >= 1
                ? 'Unpack 1 rod to borrow'
                : effectiveCounts.h >= 1
                  ? 'Unpack 1 flat into tens'
                  : 'Need 1+ Ten or Flat'}
            </span>
          </span>
        </button>

        <button
          type="button"
          data-testid="blocks-trade-ones"
          disabled={effectiveCounts.o < 10}
          onClick={handleTradeOnes}
          className={`flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 text-left ${
            effectiveCounts.o >= 10
              ? 'border-[#16a34a] bg-[#f0fdf4] text-[#166534] shadow-[0_2px_0_#16a34a] hover:bg-[#dcfce7] active:translate-y-0.5'
              : 'cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] opacity-75'
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex shrink-0 items-center gap-0.5 rounded-md border bg-white px-1 py-0.5 ${
              effectiveCounts.o >= 10 ? 'border-[#86efac]' : 'border-[#cbd5e1]'
            }`}
          >
            <span className="grid grid-cols-2 gap-0.5">
              <span className="h-1.5 w-1.5 rounded-xs bg-[#facc15]" />
              <span className="h-1.5 w-1.5 rounded-xs bg-[#facc15]" />
              <span className="h-1.5 w-1.5 rounded-xs bg-[#facc15]" />
              <span className="h-1.5 w-1.5 rounded-xs bg-[#facc15]" />
            </span>
            <span className="text-[9px] font-black text-[#16a34a]">→</span>
            <span className="h-3.5 w-1.5 rounded-xs bg-[#22c55e]" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block whitespace-nowrap text-[10.5px] font-extrabold">
              Trade 10 Ones → 10
            </span>
            <span className="block text-[9.5px] font-bold opacity-85">
              {effectiveCounts.o >= 10
                ? 'Bundle 10 cubes to carry'
                : `Need ${10 - effectiveCounts.o} more Ones`}
            </span>
          </span>
        </button>
      </div>

      {/* ADDITION: Two Source Sets -> Combined Answer Mat */}
      {op === 'add' && (
        <div className="space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <div
              data-dropzone="set1"
              data-testid="blocks-set-1"
              className={`rounded-xl border-2 p-2.5 transition ${
                activeHoverZone === 'set1'
                  ? 'border-[#0284c7] bg-[#e0f2fe] ring-2 ring-[#38bdf8]'
                  : 'border-[#7dd3fc] bg-[#f0f9ff]'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#0c4a6e]">
                  Set 1 · {problem.a}
                </span>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-[#0369a1] tabular-nums">
                  {set1Total}
                </span>
              </div>
              <div className="flex min-h-[48px] flex-wrap items-end gap-1">
                {set1Blocks.map((b) => (
                  <DraggableBlockButton
                    key={b.id}
                    block={b}
                    isDraggingThis={dragState?.active === true && dragState.blockId === b.id}
                    hintText="Drag or tap to move onto Answer Mat"
                    onStartPointer={startBlockPointer}
                  />
                ))}
                {set1Blocks.length === 0 && (
                  <span className="text-[11px] font-bold text-[#0369a1]">Moved to Mat ✓</span>
                )}
              </div>
            </div>

            <div
              data-dropzone="set2"
              data-testid="blocks-set-2"
              className={`rounded-xl border-2 p-2.5 transition ${
                activeHoverZone === 'set2'
                  ? 'border-[#16a34a] bg-[#dcfce7] ring-2 ring-[#4ade80]'
                  : 'border-[#86efac] bg-[#f0fdf4]'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#14532d]">
                  Set 2 · {problem.b}
                </span>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-[#15803d] tabular-nums">
                  {set2Total}
                </span>
              </div>
              <div className="flex min-h-[48px] flex-wrap items-end gap-1">
                {set2Blocks.map((b) => (
                  <DraggableBlockButton
                    key={b.id}
                    block={b}
                    isDraggingThis={dragState?.active === true && dragState.blockId === b.id}
                    hintText="Drag or tap to move onto Answer Mat"
                    onStartPointer={startBlockPointer}
                  />
                ))}
                {set2Blocks.length === 0 && (
                  <span className="text-[11px] font-bold text-[#15803d]">Moved to Mat ✓</span>
                )}
              </div>
            </div>
          </div>

          <div
            data-dropzone="mat"
            data-testid="blocks-answer-mat"
            className={`rounded-2xl border-2 border-dashed p-3 transition ${
              activeHoverZone === 'mat'
                ? 'border-[#d97706] bg-[#fef3c7] ring-2 ring-[#f59e0b]'
                : 'border-[#cbd5e1] bg-[#fffef8]'
            }`}
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-extrabold text-[#78350f]">
                Combined Answer Mat (Drop blocks here)
              </span>
              <span
                data-testid="blocks-active-total"
                className="rounded-lg bg-[#fef3c7] px-2 py-0.5 text-[11px] font-extrabold text-[#92400e] tabular-nums"
              >
                Mat Total: {matTotal} ({countZoneByValue(blocks, 'mat').h}×100,{' '}
                {countZoneByValue(blocks, 'mat').t}×10, {countZoneByValue(blocks, 'mat').o}×1)
              </span>
            </div>
            <div className="flex min-h-[56px] flex-wrap items-end gap-1.5">
              {matBlocks.map((b) => (
                <DraggableBlockButton
                  key={b.id}
                  block={b}
                  isDraggingThis={dragState?.active === true && dragState.blockId === b.id}
                  hintText="Drag or tap to move back to original set"
                  onStartPointer={startBlockPointer}
                />
              ))}
              {matBlocks.length === 0 && (
                <span className="text-xs font-bold text-[#94a3b8]">
                  Drag or tap blocks from Set 1 and Set 2 into this mat to add them together!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTRACTION: Start With (a) -> Drag into Take Away (b) */}
      {op === 'sub' && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div
            data-dropzone="set1"
            data-testid="blocks-set-1"
            className={`rounded-2xl border-2 p-3 transition ${
              activeHoverZone === 'set1'
                ? 'border-[#0284c7] bg-[#e0f2fe] ring-2 ring-[#38bdf8]'
                : 'border-[#7dd3fc] bg-[#f0f9ff]'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-[#0c4a6e]">
                Start With {problem.a} (Remaining)
              </span>
              <span
                data-testid="blocks-active-total"
                className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-[#0369a1] tabular-nums"
              >
                Left: {set1Total}
              </span>
            </div>
            <div className="flex min-h-[76px] flex-wrap items-end gap-1">
              {set1Blocks.map((b) => (
                <DraggableBlockButton
                  key={b.id}
                  block={b}
                  isDraggingThis={dragState?.active === true && dragState.blockId === b.id}
                  hintText="Drag or tap to move into Take Away tray"
                  onStartPointer={startBlockPointer}
                />
              ))}
              {set1Blocks.length === 0 && (
                <span className="text-[11px] font-bold text-[#64748b]">0 blocks remaining</span>
              )}
            </div>
          </div>

          <div
            data-dropzone="takeaway"
            data-testid="blocks-takeaway-tray"
            className={`rounded-2xl border-2 border-dashed p-3 transition ${
              activeHoverZone === 'takeaway'
                ? 'border-[#ea580c] bg-[#ffedd5] ring-2 ring-[#fb923c]'
                : takeawayTotal === problem.b
                  ? 'border-[#16a34a] bg-[#f0fdf4]'
                  : 'border-[#fdba74] bg-[#fff7ed]'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-[#9a3412]">
                Take Away {problem.b} (Drop here)
              </span>
              <span
                data-testid="blocks-takeaway-total"
                className={`rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                  takeawayTotal === problem.b ? 'text-[#15803d]' : 'text-[#c2410c]'
                }`}
              >
                {takeawayTotal} / {problem.b}
              </span>
            </div>
            <div className="flex min-h-[76px] flex-wrap items-end gap-1">
              {takeawayBlocks.map((b) => (
                <DraggableBlockButton
                  key={b.id}
                  block={b}
                  isDraggingThis={dragState?.active === true && dragState.blockId === b.id}
                  hintText="Drag or tap to return to Start With"
                  onStartPointer={startBlockPointer}
                />
              ))}
              {takeawayBlocks.length === 0 && (
                <span className="text-[11px] font-bold text-[#9a3412]">
                  Drag {problem.b} worth of blocks here from Start With!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MULTIPLICATION: Draggable Supply + Group Bundle -> Answer Mat */}
      {op === 'mul' && (
        <div className="space-y-2.5">
          <div
            data-dropzone="supply"
            data-testid="blocks-supply-tray"
            className={`rounded-xl border-2 p-2.5 transition ${
              activeHoverZone === 'supply'
                ? 'border-[#dc2626] bg-[#fee2e2] ring-2 ring-[#f87171]'
                : 'border-[#e7d8c0] bg-[#fcf7ec]'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-extrabold text-[#78350f]">
              <span>Block Supply (Drag onto Answer Mat, or drag back here to remove)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {problem.b > 0 && problem.b <= 99 && (
                <button
                  type="button"
                  data-testid="blocks-add-group"
                  onPointerDown={(e) => startSupplyPointer(e, 10, problem.b)}
                  className="cursor-grab touch-none rounded-xl border-2 border-[#d97706] bg-[#fef3c7] px-2.5 py-1 text-xs font-extrabold text-[#92400e] shadow-xs hover:bg-[#fde68a] active:cursor-grabbing"
                >
                  + Group of {problem.b}
                </button>
              )}
              <button
                type="button"
                data-testid="blocks-add-100"
                onPointerDown={(e) => startSupplyPointer(e, 100)}
                className="cursor-grab touch-none rounded-lg border border-[#7e22ce] bg-[#f3e8ff] px-2 py-1 text-xs font-extrabold text-[#581c87] hover:bg-[#e9d5ff] active:cursor-grabbing"
              >
                +100 Flat
              </button>
              <button
                type="button"
                data-testid="blocks-add-10"
                onPointerDown={(e) => startSupplyPointer(e, 10)}
                className="cursor-grab touch-none rounded-lg border border-[#1d4ed8] bg-[#dbeafe] px-2 py-1 text-xs font-extrabold text-[#1e3a8a] hover:bg-[#bfdbfe] active:cursor-grabbing"
              >
                +10 Rod
              </button>
              <button
                type="button"
                data-testid="blocks-add-1"
                onPointerDown={(e) => startSupplyPointer(e, 1)}
                className="cursor-grab touch-none rounded-lg border border-[#b45309] bg-[#fef9c3] px-2 py-1 text-xs font-extrabold text-[#854d0e] hover:bg-[#fef08a] active:cursor-grabbing"
              >
                +1 Cube
              </button>
            </div>
          </div>

          <div
            data-dropzone="mat"
            data-testid="blocks-answer-mat"
            className={`rounded-2xl border-2 border-dashed p-3 transition ${
              activeHoverZone === 'mat'
                ? 'border-[#d97706] bg-[#fef3c7] ring-2 ring-[#f59e0b]'
                : 'border-[#cbd5e1] bg-[#fffef8]'
            }`}
          >
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-extrabold text-[#78350f]">
                Answer Mat · Build {problem.a} × {problem.b}
              </span>
              <span
                data-testid="blocks-active-total"
                className="rounded-lg bg-[#fef3c7] px-2 py-0.5 text-[11px] font-extrabold text-[#92400e] tabular-nums"
              >
                Mat Total: {matTotal}
              </span>
            </div>
            <div className="flex min-h-[64px] flex-wrap items-end gap-1.5">
              {matBlocks.map((b) => (
                <DraggableBlockButton
                  key={b.id}
                  block={b}
                  isDraggingThis={dragState?.active === true && dragState.blockId === b.id}
                  hintText="Drag back to supply or tap to remove"
                  onStartPointer={startBlockPointer}
                />
              ))}
              {matBlocks.length === 0 && (
                <span className="text-xs font-bold text-[#94a3b8]">
                  Drag "+ Group of {problem.b}" or individual blocks here to build {problem.a} ×{' '}
                  {problem.b}!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIVISION: Total Pile (a) -> Equal Groups of (b) */}
      {op === 'div' && (
        <div className="space-y-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div
              data-dropzone="set1"
              data-testid="blocks-set-1"
              className={`rounded-2xl border-2 p-3 transition ${
                activeHoverZone === 'set1'
                  ? 'border-[#0284c7] bg-[#e0f2fe] ring-2 ring-[#38bdf8]'
                  : 'border-[#7dd3fc] bg-[#f0f9ff]'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#0c4a6e]">
                  Total Pile · {problem.a}
                </span>
                <span
                  data-testid="blocks-active-total"
                  className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-[#0369a1] tabular-nums"
                >
                  Left: {set1Total}
                </span>
              </div>
              <div className="flex min-h-[68px] flex-wrap items-end gap-1">
                {set1Blocks.map((b) => (
                  <DraggableBlockButton
                    key={b.id}
                    block={b}
                    isDraggingThis={dragState?.active === true && dragState.blockId === b.id}
                    hintText="Drag or tap to move into Group Builder"
                    onStartPointer={startBlockPointer}
                  />
                ))}
                {set1Blocks.length === 0 && (
                  <span className="text-[11px] font-bold text-[#15803d]">All blocks grouped ✓</span>
                )}
              </div>
            </div>

            <div
              data-dropzone="groupbin"
              data-testid="blocks-group-bin"
              className={`rounded-2xl border-2 border-dashed p-3 transition ${
                activeHoverZone === 'groupbin'
                  ? 'border-[#9333ea] bg-[#f3e8ff] ring-2 ring-[#c084fc]'
                  : groupBinTotal > problem.b
                    ? 'border-[#dc2626] bg-[#fef2f2]'
                    : 'border-[#c084fc] bg-[#faf5ff]'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#6b21a8]">
                  Group of {problem.b} Builder
                </span>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-[#7e22ce] tabular-nums">
                  {groupBinTotal} / {problem.b}
                </span>
              </div>
              <div className="flex min-h-[68px] flex-wrap items-end gap-1">
                {groupBinBlocks.map((b) => (
                  <DraggableBlockButton
                    key={b.id}
                    block={b}
                    isDraggingThis={dragState?.active === true && dragState.blockId === b.id}
                    hintText="Drag or tap to return to Total Pile"
                    onStartPointer={startBlockPointer}
                  />
                ))}
                {groupBinBlocks.length === 0 && (
                  <span className="text-[11px] font-bold text-[#7e22ce]">
                    Drag {problem.b} here to complete a group!
                  </span>
                )}
              </div>
              {groupBinTotal > problem.b && (
                <p className="mt-1 text-[10px] font-extrabold text-[#dc2626]">
                  Over {problem.b}! Return a block and Break 10 → 10 Ones if needed.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d8b4fe] bg-[#faf5ff] px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#581c87]">
                Equal Groups Built: {bankedGroups.length}
              </span>
              {bankedGroups.slice(0, 8).map((_, idx) => (
                <span
                  key={idx}
                  className="rounded-md border border-[#a855f7] bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-[#6b21a8] tabular-nums"
                >
                  #{idx + 1} ({problem.b})
                </span>
              ))}
              {bankedGroups.length > 8 && (
                <span className="text-[11px] font-extrabold text-[#6b21a8]">
                  +{bankedGroups.length - 8} more
                </span>
              )}
            </div>
            {bankedGroups.length > 0 && (
              <button
                type="button"
                onClick={handleUndoBankedGroup}
                className="rounded-lg border border-[#a855f7] bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#6b21a8] hover:bg-[#f3e8ff]"
              >
                Undo Group
              </button>
            )}
          </div>
        </div>
      )}

      {/* Check & Submit Action */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="blocks-check-btn"
          onClick={handleCheckBlocks}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#0369a1] bg-[#0ea5e9] px-3.5 py-2 font-display text-sm font-bold text-white shadow-[0_3px_0_#0369a1] hover:bg-[#0284c7] active:translate-y-0.5"
        >
          <Check className="h-4 w-4" />
          Check Answer
        </button>
        {onSubmitAnswer && checkFeedback?.correct && (
          <button
            type="button"
            data-testid="blocks-submit-btn"
            onClick={() => onSubmitAnswer(problem.answer)}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#15803d] bg-[#22c55e] px-3.5 py-2 font-display text-sm font-bold text-white shadow-[0_3px_0_#15803d] hover:bg-[#16a34a] active:translate-y-0.5"
          >
            Submit {problem.answer} ★
          </button>
        )}
        {checkFeedback && (
          <span
            data-testid="blocks-feedback-msg"
            className={`text-xs font-extrabold ${
              checkFeedback.correct ? 'text-[#15803d]' : 'text-[#b45309]'
            }`}
          >
            {checkFeedback.message}
          </span>
        )}
      </div>

      {/* Floating Drag Ghost Preview */}
      {dragState?.active && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 scale-110 drop-shadow-lg"
          style={{ left: dragState.x, top: dragState.y }}
        >
          {dragState.spawnGroupSize !== undefined ? (
            <span className="rounded-xl border-2 border-[#d97706] bg-[#fef3c7] px-2.5 py-1 text-xs font-extrabold text-[#92400e] shadow-md">
              + Group of {dragState.spawnGroupSize}
            </span>
          ) : (
            <BlockVisual value={dragState.value} />
          )}
        </div>
      )}
    </div>
  );
};

/* --- Interactive Make a 10 Strategy (Ten-Frames & Friendly 10 Bridges) --- */

type TenFrameSlotKind = 'primary' | 'added' | 'crossed' | 'target' | 'empty';

const TenFrameGrid: React.FC<{
  primaryCount: number;
  addedCount?: number;
  targetNeeded?: number;
  crossedFromEnd?: number;
  crossedColor?: 'red' | 'amber';
  completeHighlight?: boolean;
  label?: string;
  interactiveHint?: string;
  onSlotClick?: (slotKind: TenFrameSlotKind, idx: number) => void;
}> = ({
  primaryCount,
  addedCount = 0,
  targetNeeded = 0,
  crossedFromEnd = 0,
  crossedColor = 'red',
  completeHighlight = false,
  label,
  interactiveHint,
  onSlotClick,
}) => {
  const filledTotal = Math.min(10, primaryCount + addedCount);
  const crossedStartIdx = Math.max(0, filledTotal - crossedFromEnd);

  return (
    <div
      className={`inline-flex flex-col rounded-2xl border-2 p-2 transition ${
        completeHighlight
          ? 'border-[#16a34a] bg-[#f0fdf4] shadow-xs'
          : 'border-[#94a3b8] bg-white'
      }`}
    >
      {label && (
        <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-extrabold tracking-wide text-[#475569] uppercase">
          <span>{label}</span>
          <span className="tabular-nums">
            {Math.max(0, filledTotal - crossedFromEnd)} / 10
          </span>
        </div>
      )}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }).map((_, idx) => {
          const isPrimary = idx < primaryCount;
          const isAdded = idx >= primaryCount && idx < primaryCount + addedCount;
          const isCrossed = idx < filledTotal && idx >= crossedStartIdx;
          const isTarget =
            !isPrimary &&
            !isAdded &&
            idx < primaryCount + addedCount + targetNeeded;

          const slotKind: TenFrameSlotKind = isCrossed
            ? 'crossed'
            : isPrimary
              ? 'primary'
              : isAdded
                ? 'added'
                : isTarget
                  ? 'target'
                  : 'empty';

          const isClickable = Boolean(
            onSlotClick &&
              (slotKind === 'target' ||
                slotKind === 'added' ||
                slotKind === 'primary' ||
                slotKind === 'crossed')
          );

          const cellContent = isCrossed ? (
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[11px] font-black ${
                crossedColor === 'amber'
                  ? 'border-[#d97706] bg-[#fef3c7] text-[#b45309] line-through'
                  : 'border-[#dc2626] bg-[#fee2e2] text-[#b91c1c]'
              }`}
            >
              ×
            </span>
          ) : isPrimary ? (
            <span className="h-5 w-5 rounded-full border-2 border-[#1d4ed8] bg-[#3b82f6] shadow-xs" />
          ) : isAdded ? (
            <span className="h-5 w-5 rounded-full border-2 border-[#c2410c] bg-[#f97316] shadow-xs" />
          ) : isTarget ? (
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#f59e0b]" />
          ) : null;

          if (isClickable && onSlotClick) {
            return (
              <button
                key={idx}
                type="button"
                data-testid={`tenframe-slot-${idx}`}
                aria-label={`Ten frame slot ${idx + 1} (${slotKind})`}
                onClick={() => onSlotClick(slotKind, idx)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition hover:scale-110 active:scale-95 ${
                  isTarget
                    ? 'border-2 border-dashed border-[#f59e0b] bg-[#fffbeb] hover:bg-[#fef3c7]'
                    : 'border-[#cbd5e1] bg-[#f8fafc] hover:border-[#94a3b8]'
                }`}
              >
                {cellContent}
              </button>
            );
          }

          return (
            <div
              key={idx}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                isTarget
                  ? 'border-2 border-dashed border-[#f59e0b] bg-[#fffbeb]'
                  : 'border-[#cbd5e1] bg-[#f8fafc]'
              }`}
            >
              {cellContent}
            </div>
          );
        })}
      </div>
      {interactiveHint && (
        <div className="mt-1 text-[10px] font-bold text-[#64748b]">{interactiveHint}</div>
      )}
    </div>
  );
};

const FriendlyTenBadges: React.FC<{ count: number; tone?: 'blue' | 'amber' | 'green' }> = ({
  count,
  tone = 'blue',
}) => {
  if (count <= 0) return null;
  const shown = Math.min(count, 10);
  const toneClass =
    tone === 'green'
      ? 'border-[#16a34a] bg-[#dcfce7] text-[#166534]'
      : tone === 'amber'
        ? 'border-[#d97706] bg-[#fef3c7] text-[#92400e]'
        : 'border-[#0284c7] bg-[#e0f2fe] text-[#0c4a6e]';

  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: shown }).map((_, idx) => (
        <span
          key={idx}
          className={`inline-flex h-7 items-center rounded-lg border-2 px-2 font-display text-xs font-extrabold tabular-nums ${toneClass}`}
        >
          10
        </span>
      ))}
      {count > shown && (
        <span className="text-xs font-extrabold text-[#475569]">
          (+{count - shown} tens = {count * 10})
        </span>
      )}
    </div>
  );
};

const MakeTenView: React.FC<{
  problem: MathProblem;
  onSubmitAnswer?: (val: number) => void;
}> = ({ problem, onSubmitAnswer }) => {
  const plan = useMemo(() => buildMakeTenPlan(problem), [problem]);
  // Granular interactive progress states
  const [movedCount, setMovedCount] = useState(0);
  const [subPhase1Taken, setSubPhase1Taken] = useState(0);
  const [subPhase2Taken, setSubPhase2Taken] = useState(0);
  const [revealCardA, setRevealCardA] = useState(false);
  const [revealCardB, setRevealCardB] = useState(false);
  const [groupCount, setGroupCount] = useState(1);

  const resetAll = () => {
    setMovedCount(0);
    setSubPhase1Taken(0);
    setSubPhase2Taken(0);
    setRevealCardA(false);
    setRevealCardB(false);
    setGroupCount(problem.a === 0 ? 0 : 1);
  };

  useEffect(() => {
    resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id, problem.a]);

  // 1. ADDITION: Make a 10 (or reach Friendly 10)
  if (problem.operation === 'add') {
    if (plan.mode === 'add-already-ten') {
      const targetClicks = Math.max(1, plan.otherDots);
      const combined = movedCount >= targetClicks;
      return (
        <div data-testid="interactive-make10-add">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
              Friendly Ten Already Ready ({plan.anchor} + {plan.other})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="make10-action-btn"
                disabled={combined}
                onClick={() => setMovedCount(targetClicks)}
                className="rounded-lg border border-[#15803d] bg-[#dcfce7] px-2.5 py-0.5 text-xs font-extrabold text-[#166534] hover:bg-[#bbf7d0] disabled:opacity-50"
              >
                Combine {plan.anchor} + {plan.other}
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border-2 border-[#bae6fd] bg-[#f0f9ff] p-2.5">
                <div className="mb-1 text-[11px] font-extrabold text-[#0c4a6e]">
                  Friendly Ten: {plan.anchor}
                </div>
                <FriendlyTenBadges count={Math.floor(plan.anchor / 10)} tone="blue" />
              </div>
              <span className="font-display text-xl font-black text-[#64748b]">+</span>
              <div className="rounded-xl border-2 border-[#fed7aa] bg-[#fff7ed] p-2.5">
                <div className="mb-1 text-[11px] font-extrabold text-[#9a3412]">
                  Tap dots to count on ({movedCount}/{plan.otherDots || 0}):
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FriendlyTenBadges count={plan.otherBadges} tone="amber" />
                  {plan.otherDots > 0 && (
                    <TenFrameGrid
                      primaryCount={0}
                      addedCount={Math.min(movedCount, plan.otherDots)}
                      targetNeeded={Math.max(0, plan.otherDots - movedCount)}
                      onSlotClick={(kind) => {
                        if (kind === 'target') {
                          setMovedCount((c) => Math.min(targetClicks, c + 1));
                        } else if (kind === 'added') {
                          setMovedCount((c) => Math.max(0, c - 1));
                        }
                      }}
                      interactiveHint="Tap a pulsing dot to count on!"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2">
              <span className="font-display text-sm font-extrabold text-[#166534] tabular-nums">
                {combined
                  ? `${plan.anchor} + ${plan.other} = ${plan.answer}`
                  : `${plan.anchor} + ${plan.otherBadges * 10 + Math.min(movedCount, plan.otherDots)} = ${plan.anchor + plan.otherBadges * 10 + Math.min(movedCount, plan.otherDots)} (keep counting!)`}
              </span>
              {onSubmitAnswer && combined && (
                <button
                  type="button"
                  data-testid="make10-submit-btn"
                  onClick={() => onSubmitAnswer(plan.answer)}
                  className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
                >
                  Submit {plan.answer} ★
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (plan.mode === 'add-under-ten') {
      const filled = movedCount >= plan.other;
      const currentSum = plan.anchor + movedCount;
      const remainingToPut = Math.max(0, plan.other - movedCount);
      return (
        <div data-testid="interactive-make10-add">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
              Fill the Ten-Frame ({plan.anchor} + {plan.other})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="make10-action-btn"
                disabled={filled}
                onClick={() => setMovedCount(plan.other)}
                className="rounded-lg border border-[#0369a1] bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd] disabled:opacity-50"
              >
                {movedCount === 0
                  ? `Put ${plan.other} in Ten-Frame`
                  : `Put ${remainingToPut} More`}
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
            <div className="flex flex-wrap items-center gap-3">
              {plan.anchorTens > 0 && (
                <div className="rounded-xl border-2 border-[#bae6fd] bg-[#f0f9ff] p-2">
                  <div className="mb-1 text-[10px] font-extrabold text-[#0c4a6e]">
                    {plan.anchorTens} Tens
                  </div>
                  <FriendlyTenBadges count={plan.anchorTens / 10} tone="blue" />
                </div>
              )}
              <TenFrameGrid
                primaryCount={plan.anchorOnes}
                addedCount={movedCount}
                targetNeeded={remainingToPut}
                label={filled ? 'Filled Together' : `Start (${plan.anchorOnes} + ${movedCount})`}
                interactiveHint={
                  filled
                    ? 'Tap an orange dot to take 1 back out'
                    : 'Tap a dashed slot or orange dot to add +1!'
                }
                onSlotClick={(kind) => {
                  if (kind === 'target') {
                    setMovedCount((c) => Math.min(plan.other, c + 1));
                  } else if (kind === 'added') {
                    setMovedCount((c) => Math.max(0, c - 1));
                  }
                }}
              />
              {!filled && (
                <div className="rounded-xl border-2 border-[#fed7aa] bg-[#fff7ed] p-2.5">
                  <div className="mb-1 text-[11px] font-extrabold text-[#9a3412]">
                    Tap to Move ({remainingToPut} left):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: remainingToPut }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Add 1 dot to Ten-Frame (${remainingToPut} left)`}
                        onClick={() => setMovedCount((c) => Math.min(plan.other, c + 1))}
                        className="h-6 w-6 rounded-full border-2 border-[#c2410c] bg-[#f97316] shadow-xs transition hover:scale-115 active:scale-95"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2">
              <span
                className={`font-display text-sm font-extrabold tabular-nums ${
                  filled ? 'text-[#166534]' : 'text-[#475569]'
                }`}
              >
                {filled
                  ? `${plan.anchor} + ${plan.other} = ${plan.answer} (${plan.shortBy} spaces away from ${plan.friendlyTarget})`
                  : `${plan.anchor} + ${movedCount} = ${currentSum} (${remainingToPut} more to add)`}
              </span>
              {onSubmitAnswer && filled && (
                <button
                  type="button"
                  data-testid="make10-submit-btn"
                  onClick={() => onSubmitAnswer(plan.answer)}
                  className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
                >
                  Submit {plan.answer} ★
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Classic Make a 10 (add-make-ten) — step dot-by-dot OR click Move button
    const remainingToMove = Math.max(0, plan.neededToTen - movedCount);
    const madeTen = remainingToMove === 0;
    const baseTenCount = plan.anchorTens / 10;
    const liveAnchorVal = plan.anchor + movedCount;
    const liveOtherVal = plan.other - movedCount;
    const liveDotsInTray2 = Math.max(0, plan.otherDots - movedCount);
    const leftoverTens = Math.floor(plan.leftover / 10);
    const leftoverOnes = plan.leftover % 10;

    return (
      <div data-testid="interactive-make10-add">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
            Make a Friendly {plan.friendlyTarget} ({plan.anchor} + {plan.other})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="make10-action-btn"
              disabled={madeTen}
              onClick={() => setMovedCount(plan.neededToTen)}
              className="rounded-lg border border-[#b45309] bg-[#fef3c7] px-2.5 py-0.5 text-xs font-extrabold text-[#92400e] hover:bg-[#fde68a] disabled:opacity-50"
            >
              {movedCount === 0
                ? `Move ${plan.neededToTen} to Make ${plan.friendlyTarget}!`
                : `Move ${remainingToMove} More!`}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
          {/* Interactive Number Bond Split Callout */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs font-extrabold text-[#78350f]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>Split {plan.other}:</span>
              <span className="rounded-lg border border-[#f59e0b] bg-white px-2 py-0.5 text-[#b45309] tabular-nums">
                {plan.neededToTen} (fills 10)
              </span>
              <span>+</span>
              <span className="rounded-lg border border-[#cbd5e1] bg-white px-2 py-0.5 text-[#334155] tabular-nums">
                {plan.leftover} (leftover)
              </span>
            </div>
            <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-black text-[#b45309] tabular-nums">
              Moved: {movedCount} / {plan.neededToTen}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Tray 1: Anchor Ten-Frame */}
            <div
              className={`rounded-xl border-2 p-2.5 transition ${
                madeTen
                  ? 'border-[#16a34a] bg-[#f0fdf4]'
                  : 'border-[#93c5fd] bg-[#eff6ff]'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between text-xs font-extrabold">
                <span className={madeTen ? 'text-[#166534]' : 'text-[#1e40af]'}>
                  {madeTen
                    ? `Friendly ${plan.friendlyTarget}!`
                    : `Start: ${liveAnchorVal} (Needs ${remainingToMove} more)`}
                </span>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-black text-[#0f172a] tabular-nums">
                  {liveAnchorVal}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FriendlyTenBadges
                  count={baseTenCount}
                  tone={madeTen ? 'green' : 'blue'}
                />
                <TenFrameGrid
                  primaryCount={plan.anchorOnes}
                  addedCount={movedCount}
                  targetNeeded={remainingToMove}
                  completeHighlight={madeTen}
                  label={
                    madeTen
                      ? 'Full 10!'
                      : `${plan.anchorOnes + movedCount} + ${remainingToMove} = 10`
                  }
                  interactiveHint={
                    madeTen
                      ? 'Tap an orange dot to move 1 back'
                      : 'Tap a dashed slot to pull 1 dot here!'
                  }
                  onSlotClick={(kind) => {
                    if (kind === 'target') {
                      setMovedCount((c) => Math.min(plan.neededToTen, c + 1));
                    } else if (kind === 'added') {
                      setMovedCount((c) => Math.max(0, c - 1));
                    }
                  }}
                />
              </div>
            </div>

            {/* Tray 2: Second Addend / Leftover */}
            <div className="rounded-xl border-2 border-[#fdba74] bg-[#fff7ed] p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-extrabold text-[#9a3412]">
                <span>
                  {madeTen ? `Leftover: ${plan.leftover}` : `Tap dots to move (${liveOtherVal} here)`}
                </span>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-black text-[#9a3412] tabular-nums">
                  {liveOtherVal}
                </span>
              </div>

              {!madeTen ? (
                <div className="space-y-2">
                  <FriendlyTenBadges count={plan.otherBadges} tone="amber" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Array.from({ length: liveDotsInTray2 }).map((_, idx) => {
                      const willMove = idx < remainingToMove;
                      return (
                        <button
                          key={idx}
                          type="button"
                          data-testid={`make10-tray-dot-${idx}`}
                          aria-label={
                            willMove
                              ? `Move 1 orange dot to make ${plan.friendlyTarget}`
                              : 'Leftover dot'
                          }
                          onClick={() =>
                            setMovedCount((c) => Math.min(plan.neededToTen, c + 1))
                          }
                          className={`h-6 w-6 rounded-full border-2 transition hover:scale-115 active:scale-95 ${
                            willMove
                              ? 'border-[#b45309] bg-[#f97316] ring-2 ring-[#fde68a]'
                              : 'border-[#cbd5e1] bg-[#fdba74]'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="text-[11px] font-bold text-[#9a3412]">
                    Tap any dot to move 1 into the Ten-Frame ({remainingToMove} needed to make{' '}
                    {plan.friendlyTarget})!
                  </div>
                </div>
              ) : plan.leftover === 0 ? (
                <div className="py-3 text-center text-xs font-extrabold text-[#166534]">
                  All {plan.other} moved to make {plan.friendlyTarget}! (0 left over)
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <FriendlyTenBadges count={leftoverTens} tone="amber" />
                  {leftoverOnes > 0 && (
                    <TenFrameGrid
                      primaryCount={0}
                      addedCount={leftoverOnes}
                      label="Leftover Ones"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Result Equation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2">
            {!madeTen ? (
              <span className="text-xs font-extrabold text-[#475569] tabular-nums">
                {liveAnchorVal} + {liveOtherVal} = ? (Move {remainingToMove} more to reach{' '}
                {plan.friendlyTarget})
              </span>
            ) : (
              <>
                <span
                  data-testid="make10-result-equation"
                  className="font-display text-sm font-extrabold text-[#15803d] tabular-nums"
                >
                  {plan.friendlyTarget} + {plan.leftover} = {plan.answer}
                </span>
                {onSubmitAnswer && (
                  <button
                    type="button"
                    data-testid="make10-submit-btn"
                    onClick={() => onSubmitAnswer(plan.answer)}
                    className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
                  >
                    Submit {plan.answer} ★
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. SUBTRACTION: Bridge Down to Friendly 10
  if (problem.operation === 'sub') {
    if (plan.mode === 'sub-bridge-ten') {
      const doneStep1 = subPhase1Taken >= plan.bridgeTake;
      const phase2FrameTarget = plan.bridgeRemainder % 10 === 0 ? 10 : plan.bridgeRemainder % 10;
      const doneStep2 = doneStep1 && subPhase2Taken >= phase2FrameTarget;
      const targetTensAfterStep1 = Math.floor(plan.friendlyTarget / 10);
      const remAfterStep2 = plan.friendlyTarget - plan.bridgeRemainder;
      const remTens = Math.floor(remAfterStep2 / 10);
      const remOnes = remAfterStep2 % 10;

      return (
        <div data-testid="interactive-make10-sub">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
              Subtract Down to Friendly {plan.friendlyTarget} ({plan.a} − {plan.b})
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {!doneStep1 ? (
                <button
                  type="button"
                  data-testid="make10-action-btn"
                  onClick={() => setSubPhase1Taken(plan.bridgeTake)}
                  className="rounded-lg border border-[#b45309] bg-[#fef3c7] px-2.5 py-0.5 text-xs font-extrabold text-[#92400e] hover:bg-[#fde68a]"
                >
                  Step 1: Take {plan.bridgeTake - subPhase1Taken} → {plan.friendlyTarget}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="make10-action-btn"
                  disabled={doneStep2}
                  onClick={() => setSubPhase2Taken(phase2FrameTarget)}
                  className="rounded-lg border border-[#dc2626] bg-[#fee2e2] px-2.5 py-0.5 text-xs font-extrabold text-[#b91c1c] hover:bg-[#fecaca] disabled:opacity-50"
                >
                  Step 2: Take {plan.bridgeRemainder - subPhase2Taken} More
                </button>
              )}
              <button
                type="button"
                onClick={resetAll}
                className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs font-extrabold text-[#78350f]">
              <span>Split {plan.b}:</span>
              <span className="rounded-lg border border-[#f59e0b] bg-white px-2 py-0.5 text-[#b45309] tabular-nums">
                {plan.bridgeTake} (down to {plan.friendlyTarget})
              </span>
              <span>+</span>
              <span className="rounded-lg border border-[#fca5a5] bg-white px-2 py-0.5 text-[#b91c1c] tabular-nums">
                {plan.bridgeRemainder} (from {plan.friendlyTarget})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!doneStep1 ? (
                <>
                  <div className="rounded-xl border-2 border-[#bae6fd] bg-[#f0f9ff] p-2.5">
                    <div className="mb-1 text-[11px] font-extrabold text-[#0c4a6e]">
                      {plan.anchorTens} Tens
                    </div>
                    <FriendlyTenBadges count={targetTensAfterStep1} tone="blue" />
                  </div>
                  <TenFrameGrid
                    primaryCount={plan.anchorOnes}
                    crossedFromEnd={subPhase1Taken}
                    crossedColor="amber"
                    label={`Ones (${plan.anchorOnes - subPhase1Taken} left)`}
                    interactiveHint={`Tap dots to take ${plan.bridgeTake} away → ${plan.friendlyTarget}!`}
                    onSlotClick={(kind) => {
                      if (kind === 'primary') {
                        setSubPhase1Taken((c) => Math.min(plan.bridgeTake, c + 1));
                      } else if (kind === 'crossed') {
                        setSubPhase1Taken((c) => Math.max(0, c - 1));
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  {remTens > 0 && (
                    <div className="rounded-xl border-2 border-[#bae6fd] bg-[#f0f9ff] p-2.5">
                      <div className="mb-1 text-[11px] font-extrabold text-[#0c4a6e]">
                        {doneStep2 ? 'Remaining Tens' : `Friendly ${plan.friendlyTarget}`}
                      </div>
                      <FriendlyTenBadges
                        count={doneStep2 ? remTens : Math.max(0, targetTensAfterStep1 - 1)}
                        tone="green"
                      />
                    </div>
                  )}
                  <TenFrameGrid
                    primaryCount={10}
                    crossedFromEnd={subPhase2Taken}
                    crossedColor="red"
                    completeHighlight={doneStep2}
                    label={`10 − ${subPhase2Taken} = ${10 - subPhase2Taken}`}
                    interactiveHint={
                      doneStep2
                        ? `Reached ${remOnes} ones! Tap × to undo`
                        : `Tap ${phase2FrameTarget - subPhase2Taken} more dots to cross out!`
                    }
                    onSlotClick={(kind) => {
                      if (kind === 'primary') {
                        setSubPhase2Taken((c) => Math.min(phase2FrameTarget, c + 1));
                      } else if (kind === 'crossed') {
                        setSubPhase2Taken((c) => Math.max(0, c - 1));
                      }
                    }}
                  />
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2">
              {!doneStep1 ? (
                <span className="text-xs font-extrabold text-[#475569] tabular-nums">
                  {plan.a - subPhase1Taken} now (take {plan.bridgeTake - subPhase1Taken} more to
                  land on {plan.friendlyTarget})
                </span>
              ) : !doneStep2 ? (
                <span className="text-xs font-extrabold text-[#b45309] tabular-nums">
                  At Friendly {plan.friendlyTarget}! Cross out {phase2FrameTarget - subPhase2Taken}{' '}
                  more dot{phase2FrameTarget - subPhase2Taken === 1 ? '' : 's'}
                </span>
              ) : (
                <>
                  <span
                    data-testid="make10-result-equation"
                    className="font-display text-sm font-extrabold text-[#15803d] tabular-nums"
                  >
                    {plan.friendlyTarget} − {plan.bridgeRemainder} = {plan.answer}
                  </span>
                  {onSubmitAnswer && (
                    <button
                      type="button"
                      data-testid="make10-submit-btn"
                      onClick={() => onSubmitAnswer(plan.answer)}
                      className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
                    >
                      Submit {plan.answer} ★
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // sub-from-ten or sub-simple — tap dots to cross out 1-by-1!
    const isFromTen = plan.mode === 'sub-from-ten';
    const remTens = Math.floor(plan.answer / 10);
    const framePrimary = isFromTen ? 10 : plan.anchorOnes;
    const frameCrossedTarget = isFromTen
      ? Math.min(10, plan.b % 10 === 0 && plan.b > 0 ? 10 : plan.b)
      : plan.b;
    const done = subPhase1Taken >= frameCrossedTarget;

    return (
      <div data-testid="interactive-make10-sub">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
            Ten-Frame Take Away ({plan.a} − {plan.b})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="make10-action-btn"
              disabled={done}
              onClick={() => setSubPhase1Taken(frameCrossedTarget)}
              className="rounded-lg border border-[#dc2626] bg-[#fee2e2] px-2.5 py-0.5 text-xs font-extrabold text-[#b91c1c] hover:bg-[#fecaca] disabled:opacity-50"
            >
              Take {frameCrossedTarget - subPhase1Taken} Away
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
          <div className="flex flex-wrap items-center gap-3">
            {(isFromTen ? (done ? remTens : plan.anchorTens / 10 - 1) : plan.anchorTens / 10) > 0 && (
              <div className="rounded-xl border-2 border-[#bae6fd] bg-[#f0f9ff] p-2.5">
                <div className="mb-1 text-[11px] font-extrabold text-[#0c4a6e]">Tens</div>
                <FriendlyTenBadges
                  count={
                    isFromTen
                      ? done
                        ? remTens
                        : Math.max(0, plan.anchorTens / 10 - 1)
                      : plan.anchorTens / 10
                  }
                  tone="blue"
                />
              </div>
            )}
            <TenFrameGrid
              primaryCount={framePrimary}
              crossedFromEnd={subPhase1Taken}
              crossedColor="red"
              completeHighlight={done}
              label={`${framePrimary} − ${subPhase1Taken} = ${framePrimary - subPhase1Taken}`}
              interactiveHint={
                done
                  ? 'All crossed out! Tap × to restore 1'
                  : `Tap ${frameCrossedTarget - subPhase1Taken} dot${frameCrossedTarget - subPhase1Taken === 1 ? '' : 's'} to cross out!`
              }
              onSlotClick={(kind) => {
                if (kind === 'primary') {
                  setSubPhase1Taken((c) => Math.min(frameCrossedTarget, c + 1));
                } else if (kind === 'crossed') {
                  setSubPhase1Taken((c) => Math.max(0, c - 1));
                }
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2">
            <span
              data-testid="make10-result-equation"
              className={`font-display text-sm font-extrabold tabular-nums ${
                done ? 'text-[#166534]' : 'text-[#475569]'
              }`}
            >
              {done
                ? `${plan.a} − ${plan.b} = ${plan.answer}`
                : `${plan.a} − ${subPhase1Taken} = ${plan.a - subPhase1Taken} (take ${frameCrossedTarget - subPhase1Taken} more)`}
            </span>
            {onSubmitAnswer && done && (
              <button
                type="button"
                data-testid="make10-submit-btn"
                onClick={() => onSubmitAnswer(plan.answer)}
                className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
              >
                Submit {plan.answer} ★
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. MULTIPLICATION: Break Apart by 10s or Fill Ten-Frames
  if (problem.operation === 'mul') {
    if (plan.mode === 'mul-ten-split') {
      const done = revealCardA && revealCardB;
      return (
        <div data-testid="interactive-make10-mul">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
              Friendly 10s Split ({plan.a} × {plan.b})
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="make10-action-btn"
                disabled={done}
                onClick={() => {
                  setRevealCardA(true);
                  setRevealCardB(true);
                }}
                className="rounded-lg border border-[#0369a1] bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd] disabled:opacity-50"
              >
                Solve Both Parts
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRevealCardA((v) => !v)}
                className={`rounded-xl border-2 p-3 text-left transition hover:scale-[1.02] ${
                  revealCardA
                    ? 'border-[#0284c7] bg-[#e0f2fe]'
                    : 'border-[#bae6fd] bg-[#f0f9ff]'
                }`}
              >
                <div className="text-xs font-extrabold text-[#0c4a6e]">
                  Friendly Tens Part (tap to reveal)
                </div>
                <div className="mt-1 font-display text-lg font-black text-[#0369a1] tabular-nums">
                  {plan.anchorTens} × {plan.other} = {revealCardA ? plan.friendlyTarget : '?'}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRevealCardB((v) => !v)}
                className={`rounded-xl border-2 p-3 text-left transition hover:scale-[1.02] ${
                  revealCardB
                    ? 'border-[#ea580c] bg-[#ffedd5]'
                    : 'border-[#fed7aa] bg-[#fff7ed]'
                }`}
              >
                <div className="text-xs font-extrabold text-[#9a3412]">
                  Ones Part (tap to reveal)
                </div>
                <div className="mt-1 font-display text-lg font-black text-[#c2410c] tabular-nums">
                  {plan.anchorOnes} × {plan.other} = {revealCardB ? plan.leftover : '?'}
                </div>
              </button>
            </div>

            {done && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#16a34a] bg-[#f0fdf4] px-3 py-2">
                <span
                  data-testid="make10-result-equation"
                  className="font-display text-sm font-extrabold text-[#166534] tabular-nums"
                >
                  {plan.friendlyTarget} + {plan.leftover} = {plan.answer}
                </span>
                {onSubmitAnswer && (
                  <button
                    type="button"
                    data-testid="make10-submit-btn"
                    onClick={() => onSubmitAnswer(plan.answer)}
                    className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
                  >
                    Submit {plan.answer} ★
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    const pouredDots = groupCount * plan.b;
    const fullFrames = Math.floor(pouredDots / 10);
    const partialDots = pouredDots % 10;

    return (
      <div data-testid="interactive-make10-mul">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
            Fill Ten-Frames ({groupCount} / {plan.a} groups × {plan.b})
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={groupCount <= 0}
              onClick={() => setGroupCount((g) => Math.max(0, g - 1))}
              className="rounded-lg border border-[#cbd5e1] bg-white px-2 py-0.5 text-xs font-extrabold text-[#475569] disabled:opacity-50"
            >
              −1 Group
            </button>
            <button
              type="button"
              data-testid="make10-action-btn"
              disabled={groupCount >= plan.a}
              onClick={() => setGroupCount((g) => Math.min(plan.a, g + 1))}
              className="rounded-lg border border-[#0369a1] bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd] disabled:opacity-50"
            >
              +1 Group ({plan.b})
            </button>
            <button
              type="button"
              onClick={() => setGroupCount(plan.a)}
              className="rounded-lg border border-[#d6be9b] bg-[#fcf7ec] px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
            >
              Fill All
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {Array.from({ length: Math.min(fullFrames, 4) }).map((_, i) => (
              <TenFrameGrid
                key={i}
                primaryCount={10}
                completeHighlight
                label={`Ten #${i + 1}`}
              />
            ))}
            {fullFrames > 4 && (
              <FriendlyTenBadges count={fullFrames - 4} tone="green" />
            )}
            {(partialDots > 0 || pouredDots === 0) && (
              <TenFrameGrid
                primaryCount={partialDots}
                targetNeeded={10 - partialDots}
                label="Next 10"
                onSlotClick={
                  groupCount < plan.a
                    ? (kind) => {
                        if (kind === 'target') {
                          setGroupCount((g) => Math.min(plan.a, g + 1));
                        }
                      }
                    : undefined
                }
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2">
            <span className="text-xs font-extrabold text-[#475569] tabular-nums">
              {fullFrames} Friendly 10{fullFrames === 1 ? '' : 's'} + {partialDots} ones ={' '}
              {pouredDots}
            </span>
            {onSubmitAnswer && groupCount === plan.a && (
              <button
                type="button"
                data-testid="make10-submit-btn"
                onClick={() => onSubmitAnswer(pouredDots)}
                className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
              >
                Submit {pouredDots} ★
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. DIVISION: Friendly 10-Groups or Count Up in Equal Groups
  if (plan.mode === 'div-ten-chunk') {
    const done = revealCardA && revealCardB;
    return (
      <div data-testid="interactive-make10-div">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
            Friendly 10-Group Chunk ({plan.a} ÷ {plan.b})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="make10-action-btn"
              disabled={done}
              onClick={() => {
                setRevealCardA(true);
                setRevealCardB(true);
              }}
              className="rounded-lg border border-[#0369a1] bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd] disabled:opacity-50"
            >
              Take 10 Groups ({plan.friendlyTarget})
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRevealCardA((v) => !v)}
              className={`rounded-xl border-2 p-3 text-left transition hover:scale-[1.02] ${
                revealCardA
                  ? 'border-[#0284c7] bg-[#e0f2fe]'
                  : 'border-[#bae6fd] bg-[#f0f9ff]'
              }`}
            >
              <div className="text-xs font-extrabold text-[#0c4a6e]">
                Friendly 10-Chunk (tap)
              </div>
              <div className="mt-1 font-display text-lg font-black text-[#0369a1] tabular-nums">
                10 × {plan.b} = {revealCardA ? plan.friendlyTarget : '?'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRevealCardB((v) => !v)}
              className={`rounded-xl border-2 p-3 text-left transition hover:scale-[1.02] ${
                revealCardB
                  ? 'border-[#ea580c] bg-[#ffedd5]'
                  : 'border-[#fed7aa] bg-[#fff7ed]'
              }`}
            >
              <div className="text-xs font-extrabold text-[#9a3412]">
                Remaining Groups (tap)
              </div>
              <div className="mt-1 font-display text-lg font-black text-[#c2410c] tabular-nums">
                {revealCardB
                  ? `${plan.leftover} ÷ ${plan.b} = ${plan.divRemGroups}`
                  : `${plan.a} − ${plan.friendlyTarget} = ${plan.leftover}`}
              </div>
            </button>
          </div>

          {done && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#16a34a] bg-[#f0fdf4] px-3 py-2">
              <span
                data-testid="make10-result-equation"
                className="font-display text-sm font-extrabold text-[#166534] tabular-nums"
              >
                10 + {plan.divRemGroups} = {plan.answer} groups
              </span>
              {onSubmitAnswer && (
                <button
                  type="button"
                  data-testid="make10-submit-btn"
                  onClick={() => onSubmitAnswer(plan.answer)}
                  className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
                >
                  Submit {plan.answer} ★
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const targetGroups = Math.max(0, plan.answer);
  const currentShown = Math.min(plan.a, groupCount * plan.b);
  const fullTenCount = Math.floor(currentShown / 10);
  const remDots = currentShown % 10;

  return (
    <div data-testid="interactive-make10-div">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
          Build Groups of {plan.b} up to {plan.a}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={groupCount <= 0}
            onClick={() => setGroupCount((g) => Math.max(0, g - 1))}
            className="rounded-lg border border-[#cbd5e1] bg-white px-2 py-0.5 text-xs font-extrabold text-[#475569] disabled:opacity-50"
          >
            −1 Group
          </button>
          <button
            type="button"
            data-testid="make10-action-btn"
            disabled={groupCount >= targetGroups}
            onClick={() => setGroupCount((g) => Math.min(targetGroups, g + 1))}
            className="rounded-lg border border-[#0369a1] bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd] disabled:opacity-50"
          >
            +1 Group (+{plan.b})
          </button>
          <button
            type="button"
            onClick={() => setGroupCount(targetGroups)}
            className="rounded-lg border border-[#d6be9b] bg-[#fcf7ec] px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
          >
            Reach {plan.a}
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {Array.from({ length: Math.min(fullTenCount, 4) }).map((_, i) => (
            <TenFrameGrid key={i} primaryCount={10} completeHighlight label={`Ten #${i + 1}`} />
          ))}
          {fullTenCount > 4 && (
            <FriendlyTenBadges count={fullTenCount - 4} tone="green" />
          )}
          {(remDots > 0 || currentShown === 0) && (
            <TenFrameGrid
              primaryCount={remDots}
              targetNeeded={10 - remDots}
              label="Filling"
              onSlotClick={
                groupCount < targetGroups
                  ? (kind) => {
                      if (kind === 'target') {
                        setGroupCount((g) => Math.min(targetGroups, g + 1));
                      }
                    }
                  : undefined
              }
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2">
          <span className="text-xs font-extrabold text-[#475569] tabular-nums">
            {groupCount} group{groupCount === 1 ? '' : 's'} of {plan.b} = {currentShown} / {plan.a}
          </span>
          {onSubmitAnswer && groupCount === targetGroups && (
            <button
              type="button"
              data-testid="make10-submit-btn"
              onClick={() => onSubmitAnswer(targetGroups)}
              className="rounded-lg border border-[#15803d] bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-[#16a34a]"
            >
              Submit {targetGroups} ★
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
