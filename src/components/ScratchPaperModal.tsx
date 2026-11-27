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

function splitPlaceValues(n: number): { h: number; t: number; o: number } {
  return {
    h: Math.floor(n / 100),
    t: Math.floor((n % 100) / 10),
    o: n % 10,
  };
}

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

              {strategy === 'numberline' && <NumberLineView problem={problem} />}
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

/* --- Sub-visualizers for Number Line, Base-10 Blocks, and Picture Groups --- */

type HopKind = 'hundred' | 'ten' | 'one' | 'group';

const HOP_STYLE: Record<
  HopKind,
  { stroke: string; text: string; pillBg: string; pillBorder: string; peakY: number }
> = {
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
    peakY: 36,
  },
  one: {
    stroke: '#16a34a',
    text: '#14532d',
    pillBg: '#dcfce7',
    pillBorder: '#22c55e',
    peakY: 56,
  },
  group: {
    stroke: '#d97706',
    text: '#78350f',
    pillBg: '#fef3c7',
    pillBorder: '#f59e0b',
    peakY: 34,
  },
};

const NumberLineView: React.FC<{ problem: MathProblem }> = ({ problem }) => {
  const { a, b, operation } = problem;

  const hops: Array<{ label: string; kind: HopKind; delta?: number }> = [];
  let startVal = a;
  let startLabel = String(a);
  let subtitle = '';

  const pushPlaceHops = (amount: number, sign: 1 | -1) => {
    const prefix = sign === 1 ? '+' : '−';
    const hundreds = Math.floor(amount / 100);
    const tens = Math.floor((amount % 100) / 10);
    const ones = amount % 10;

    if (amount <= 8) {
      for (let i = 0; i < amount; i++) {
        hops.push({ label: `${prefix}1`, kind: 'one', delta: sign });
      }
      return;
    }

    const shownHundreds = Math.min(hundreds, 3);
    for (let i = 0; i < shownHundreds; i++) {
      hops.push({ label: `${prefix}100`, kind: 'hundred', delta: sign * 100 });
    }
    if (hundreds > 3) {
      const rem = (hundreds - 3) * 100;
      hops.push({ label: `${prefix}${rem}`, kind: 'hundred', delta: sign * rem });
    }

    const shownTens = Math.min(tens, 4);
    for (let i = 0; i < shownTens; i++) {
      hops.push({ label: `${prefix}10`, kind: 'ten', delta: sign * 10 });
    }
    if (tens > 4) {
      const rem = (tens - 4) * 10;
      hops.push({ label: `${prefix}${rem}`, kind: 'ten', delta: sign * rem });
    }

    if (ones > 0) {
      if (ones <= 3 && hops.length <= 6) {
        for (let i = 0; i < ones; i++) {
          hops.push({ label: `${prefix}1`, kind: 'one', delta: sign });
        }
      } else {
        hops.push({ label: `${prefix}${ones}`, kind: 'one', delta: sign * ones });
      }
    }
  };

  if (operation === 'add') {
    const start = Math.max(a, b);
    const jump = Math.min(a, b);
    startVal = start;
    startLabel = String(start);
    pushPlaceHops(jump, 1);
    if (jump <= 8) {
      subtitle = `Start at ${start} and hop forward ${jump} Ones (green)!`;
    } else if (jump >= 100) {
      subtitle = `Jump Hundreds (purple), then Tens (blue), then Ones (green)!`;
    } else if (jump % 10 > 0) {
      subtitle = `Start at ${start}, jump Tens (blue), then add Ones (green)!`;
    } else {
      subtitle = `Start at ${start} and jump forward by Tens (blue)!`;
    }
  } else if (operation === 'sub') {
    startVal = a;
    startLabel = String(a);
    pushPlaceHops(b, -1);
    if (b <= 8) {
      subtitle = `Start at ${a} and hop backward ${b} Ones (green)!`;
    } else if (b >= 100) {
      subtitle = `Hop back Hundreds (purple), Tens (blue), then Ones (green)!`;
    } else if (b % 10 > 0) {
      subtitle = `Start at ${a}, hop back Tens (blue), then Ones (green)!`;
    } else {
      subtitle = `Start at ${a} and hop back by Tens (blue)!`;
    }
  } else if (operation === 'mul') {
    startVal = 0;
    startLabel = '0';
    const shown = Math.min(a, 6);
    const kind: HopKind =
      b >= 100 && b % 100 === 0
        ? 'hundred'
        : b >= 10 && b % 10 === 0
          ? 'ten'
          : b < 10
            ? 'group'
            : 'group';
    for (let i = 0; i < shown; i++) hops.push({ label: `+${b}`, kind, delta: b });
    if (a > 6) hops.push({ label: `... (${a} total)`, kind: 'group' });
    subtitle = `Skip-count from 0 by +${b}, doing ${a} equal jumps!`;
  } else {
    startVal = 0;
    startLabel = '0';
    hops.push({ label: `+${b}`, kind: 'group', delta: b });
    if (a > b) {
      hops.push({ label: `+${b}`, kind: 'group', delta: b });
      hops.push({ label: '... (? jumps)', kind: 'group' });
    }
    subtitle = `Count how many jumps of +${b} take you from 0 to ${a}!`;
  }

  const isBackward = operation === 'sub';
  const count = Math.max(1, hops.length);
  const startX = isBackward ? 352 : 48;
  const endX = isBackward ? 48 : 352;
  const stepX = (endX - startX) / count;

  const hasHundred = hops.some((h) => h.kind === 'hundred');
  const hasTen = hops.some((h) => h.kind === 'ten');
  const hasOne = hops.some((h) => h.kind === 'one');
  const hasGroup = hops.some((h) => h.kind === 'group');

  // Precompute intermediate tick values (never reveal final answer)
  const intermediateTicks: Array<{ x: number; label: string; color: string }> = [];
  if (operation !== 'div' && hops.every((h) => typeof h.delta === 'number') && hops.length <= 8) {
    let running = startVal;
    for (let i = 0; i < hops.length - 1; i++) {
      running += hops[i].delta ?? 0;
      intermediateTicks.push({
        x: startX + (i + 1) * stepX,
        label: String(running),
        color: HOP_STYLE[hops[i].kind].text,
      });
    }
  }

  return (
    <div data-testid="number-line-view">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
          Number Line Strategy
        </span>
        {/* Place-Value Hop Color Legend */}
        <div data-testid="numberline-legend" className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
          {(hasHundred || problem.a >= 100 || problem.b >= 100) && (
            <span className="rounded-md border border-[#a855f7] bg-[#f3e8ff] px-1.5 py-0.5 text-[#581c87]">
              100s Purple
            </span>
          )}
          {(hasTen || operation === 'add' || operation === 'sub') && (
            <span className="rounded-md border border-[#3b82f6] bg-[#dbeafe] px-1.5 py-0.5 text-[#1e3a8a]">
              10s Blue
            </span>
          )}
          {(hasOne || operation === 'add' || operation === 'sub') && (
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
      </div>
      <div className="rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
        <svg viewBox="0 0 400 148" className="w-full" role="img" aria-label="Color-coded place value number line hops">
          <line x1="28" y1="106" x2="372" y2="106" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <polygon points="372,101 382,106 372,111" fill="#334155" />
          <polygon points="28,101 18,106 28,111" fill="#334155" />

          {hops.map((hop, idx) => {
            const x1 = startX + idx * stepX;
            const x2 = startX + (idx + 1) * stepX;
            const midX = (x1 + x2) / 2;
            const st = HOP_STYLE[hop.kind];
            // Place label slightly above the quadratic Bezier apex (which sits halfway between 103 and peakY)
            const apexY = (103 + st.peakY) / 2;
            const pillW = Math.max(24, hop.label.length * 7.2 + 8);
            const pillY = Math.max(2, apexY - 19);
            return (
              <g key={idx}>
                <path
                  d={`M ${x1} 103 Q ${midX} ${st.peakY} ${x2} 103`}
                  fill="none"
                  stroke={st.stroke}
                  strokeWidth="3"
                  strokeDasharray={hop.label.startsWith('...') ? '4 3' : undefined}
                />
                <circle cx={x1} cy="106" r="4.2" fill={st.stroke} />
                <rect
                  x={midX - pillW / 2}
                  y={pillY}
                  width={pillW}
                  height={16}
                  rx={6}
                  fill={st.pillBg}
                  stroke={st.pillBorder}
                  strokeWidth="1.2"
                />
                <text
                  x={midX}
                  y={pillY + 11.5}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="800"
                  fill={st.text}
                >
                  {hop.label}
                </text>
              </g>
            );
          })}

          {/* Intermediate milestone numbers */}
          {intermediateTicks.map((tick, idx) => (
            <text
              key={idx}
              x={tick.x}
              y="125"
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="800"
              fill={tick.color}
            >
              {tick.label}
            </text>
          ))}

          <circle cx={startX} cy="106" r="6" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          <text x={startX} y="136" textAnchor="middle" fontSize="14" fontWeight="800" fill="#14532d">
            {startLabel}
          </text>

          <circle cx={endX} cy="106" r="6" fill="#facc15" stroke="#92400e" strokeWidth="2" />
          <text x={endX} y="136" textAnchor="middle" fontSize="15" fontWeight="800" fill="#b45309">
            {operation === 'div' ? String(a) : '?'}
          </text>
        </svg>
        <p className="mt-1 text-center text-xs font-extrabold text-[#475569]">{subtitle}</p>
      </div>
    </div>
  );
};

interface InteractiveBlock {
  id: number;
  value: 100 | 10 | 1;
  crossed: boolean;
  group: 'a' | 'b';
  note?: string;
}

function buildBlocksForNumber(
  n: number,
  startId: number,
  group: 'a' | 'b'
): InteractiveBlock[] {
  const pv = splitPlaceValues(n);
  const items: InteractiveBlock[] = [];
  let nextId = startId;
  for (let i = 0; i < Math.min(pv.h, 4); i++) {
    items.push({ id: nextId++, value: 100, crossed: false, group });
  }
  for (let i = 0; i < pv.t; i++) {
    items.push({ id: nextId++, value: 10, crossed: false, group });
  }
  for (let i = 0; i < pv.o; i++) {
    items.push({ id: nextId++, value: 1, crossed: false, group });
  }
  return items;
}

const BlockButton: React.FC<{
  block: InteractiveBlock;
  onToggle: (id: number) => void;
}> = ({ block, onToggle }) => {
  if (block.value === 100) {
    return (
      <button
        type="button"
        onClick={() => onToggle(block.id)}
        title="Click to cross out or restore 100 Flat"
        className={`relative flex h-10 w-10 items-center justify-center rounded border-2 text-[10px] font-extrabold transition ${
          block.crossed
            ? 'border-[#fca5a5] bg-[#fee2e2] text-[#dc2626] line-through opacity-45'
            : 'border-[#7e22ce] bg-[#e9d5ff] text-[#581c87] hover:scale-105'
        }`}
        style={
          block.crossed
            ? undefined
            : {
                backgroundImage:
                  'linear-gradient(#c084fc55 1px, transparent 1px), linear-gradient(90deg, #c084fc55 1px, transparent 1px)',
                backgroundSize: '4px 4px',
              }
        }
      >
        100
      </button>
    );
  }
  if (block.value === 10) {
    return (
      <button
        type="button"
        onClick={() => onToggle(block.id)}
        title={block.note ? `${block.note} — click to cross out or restore` : 'Click to cross out or restore 10 Rod'}
        className={`relative h-10 w-3.5 rounded border transition ${
          block.crossed
            ? 'border-[#fca5a5] bg-[#fee2e2] opacity-45'
            : block.note
              ? 'border-[#15803d] bg-[#86efac] ring-2 ring-[#22c55e]/50 hover:scale-105'
              : 'border-[#1d4ed8] bg-[#93c5fd] hover:scale-105'
        }`}
        style={
          block.crossed
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
    <button
      type="button"
      onClick={() => onToggle(block.id)}
      title="Click to cross out or restore 1 Cube"
      className={`h-4 w-4 rounded-sm border transition ${
        block.crossed
          ? 'border-[#fca5a5] bg-[#fee2e2] opacity-45'
          : 'border-[#b45309] bg-[#fde047] shadow-[inset_0_-1px_0_rgba(180,83,9,0.35)] hover:scale-110'
      }`}
    />
  );
};

const BaseBlocksView: React.FC<{
  problem: MathProblem;
  onSubmitAnswer?: (val: number) => void;
}> = ({ problem, onSubmitAnswer }) => {
  const nextIdRef = useRef(1);
  const makeInitial = () => {
    nextIdRef.current = 1;
    const base = buildBlocksForNumber(problem.a, 1, 'a');
    nextIdRef.current = base.length + 1;
    if (problem.operation === 'add') {
      const extra = buildBlocksForNumber(problem.b, nextIdRef.current, 'b');
      nextIdRef.current += extra.length;
      return [...base, ...extra];
    }
    return base;
  };

  const [blocks, setBlocks] = useState<InteractiveBlock[]>(makeInitial);
  const [targetTray, setTargetTray] = useState<'a' | 'b'>('a');
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  useEffect(() => {
    setBlocks(makeInitial());
    setTargetTray('a');
    setCheckMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  // Separate Set 2 display blocks for sub/mul/div so both numbers are always visibly distinct
  const referenceSetB = useMemo(
    () => buildBlocksForNumber(problem.b, 9000, 'b'),
    [problem.b]
  );

  const addBlock = (value: 100 | 10 | 1) => {
    setCheckMsg(null);
    const group: 'a' | 'b' = problem.operation === 'add' ? targetTray : 'a';
    setBlocks((prev) => [...prev, { id: nextIdRef.current++, value, crossed: false, group }]);
  };

  const toggleCross = (id: number) => {
    setCheckMsg(null);
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, crossed: !b.crossed } : b))
    );
  };

  const activeBlocks = blocks.filter((b) => !b.crossed);
  const activeHundreds = activeBlocks.filter((b) => b.value === 100).length;
  const activeTens = activeBlocks.filter((b) => b.value === 10).length;
  const activeOnes = activeBlocks.filter((b) => b.value === 1).length;
  const activeTotal = activeBlocks.reduce((sum, b) => sum + b.value, 0);

  const blocksA = blocks.filter((b) => b.group === 'a');
  const blocksB = problem.operation === 'add' ? blocks.filter((b) => b.group === 'b') : referenceSetB;
  const activeTotalA = blocksA.filter((b) => !b.crossed).reduce((s, b) => s + b.value, 0);
  const activeTotalB =
    problem.operation === 'add'
      ? blocksB.filter((b) => !b.crossed).reduce((s, b) => s + b.value, 0)
      : problem.b;
  const crossedTotalA = blocksA.filter((b) => b.crossed).reduce((s, b) => s + b.value, 0);

  const handleBreakTenToOnes = () => {
    setCheckMsg(null);
    setBlocks((prev) => {
      // Prefer breaking a Ten inside the selected tray first
      let idx = prev.findIndex((b) => !b.crossed && b.value === 10 && b.group === targetTray);
      if (idx === -1) {
        idx = prev.findIndex((b) => !b.crossed && b.value === 10);
      }
      if (idx === -1) return prev;
      const targetGroup = prev[idx].group;
      const copy = [...prev];
      copy.splice(idx, 1);
      for (let i = 0; i < 10; i++) {
        copy.push({
          id: nextIdRef.current++,
          value: 1,
          crossed: false,
          group: targetGroup,
          note: 'Broken from 10',
        });
      }
      return copy;
    });
  };

  const handleTradeOnesToTen = () => {
    setCheckMsg(null);
    setBlocks((prev) => {
      const activeOneBlocks = prev.filter((b) => !b.crossed && b.value === 1);
      if (activeOneBlocks.length < 10) return prev;
      const picked = activeOneBlocks.slice(0, 10);
      const idSet = new Set(picked.map((b) => b.id));
      const destGroup: 'a' | 'b' = problem.operation === 'add' ? 'a' : picked[0].group;
      return [
        ...prev.filter((b) => !idSet.has(b.id)),
        {
          id: nextIdRef.current++,
          value: 10,
          crossed: false,
          group: destGroup,
          note: 'Traded 10 Ones',
        },
      ];
    });
  };

  const set1Title =
    problem.operation === 'add'
      ? `Set 1 · Number ${problem.a}`
      : problem.operation === 'sub'
        ? `Set 1 · Start With ${problem.a}`
        : problem.operation === 'mul'
          ? `Set 1 · Groups (${problem.a})`
          : `Set 1 · Total (${problem.a})`;

  const set2Title =
    problem.operation === 'add'
      ? `Set 2 · Number ${problem.b}`
      : problem.operation === 'sub'
        ? `Set 2 · Take Away ${problem.b}`
        : problem.operation === 'mul'
          ? `Set 2 · Size (${problem.b})`
          : `Set 2 · Group Size (${problem.b})`;

  return (
    <div data-testid="interactive-base-blocks">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
          Interactive Base-10 Blocks
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="blocks-reset-btn"
            onClick={() => {
              setBlocks(makeInitial());
              setCheckMsg(null);
            }}
            className="rounded-lg border border-[#d6be9b] bg-[#fcf7ec] px-2 py-0.5 text-[11px] font-extrabold text-[#78532a] hover:bg-[#fef3c7]"
          >
            Reset
          </button>
          <button
            type="button"
            data-testid="blocks-clear-btn"
            onClick={() => {
              setBlocks([]);
              setCheckMsg(null);
            }}
            className="rounded-lg border border-[#fca5a5] bg-[#fef2f2] px-2 py-0.5 text-[11px] font-extrabold text-[#b91c1c] hover:bg-[#fee2e2]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Add Blocks Row */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[#e7d8c0] bg-[#fcf7ec] px-2.5 py-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-extrabold tracking-wide text-[#78532a] uppercase">
            Add:
          </span>
          <button
            type="button"
            data-testid="blocks-add-100"
            onClick={() => addBlock(100)}
            className="rounded-lg border border-[#7e22ce] bg-[#f3e8ff] px-2 py-1 text-xs font-extrabold text-[#581c87] hover:bg-[#e9d5ff]"
          >
            +100 Flat
          </button>
          <button
            type="button"
            data-testid="blocks-add-10"
            onClick={() => addBlock(10)}
            className="rounded-lg border border-[#1d4ed8] bg-[#dbeafe] px-2 py-1 text-xs font-extrabold text-[#1e3a8a] hover:bg-[#bfdbfe]"
          >
            +10 Rod
          </button>
          <button
            type="button"
            data-testid="blocks-add-1"
            onClick={() => addBlock(1)}
            className="rounded-lg border border-[#b45309] bg-[#fef9c3] px-2 py-1 text-xs font-extrabold text-[#854d0e] hover:bg-[#fef08a]"
          >
            +1 Cube
          </button>
        </div>
        {problem.operation === 'add' && (
          <div className="flex items-center gap-1 text-[10px] font-extrabold">
            <span className="text-[#78532a]">Into:</span>
            <button
              type="button"
              onClick={() => setTargetTray('a')}
              className={`rounded-md border px-1.5 py-0.5 ${
                targetTray === 'a'
                  ? 'border-[#0284c7] bg-[#e0f2fe] text-[#0c4a6e]'
                  : 'border-[#d6be9b] bg-white text-[#78532a]'
              }`}
            >
              Set 1
            </button>
            <button
              type="button"
              onClick={() => setTargetTray('b')}
              className={`rounded-md border px-1.5 py-0.5 ${
                targetTray === 'b'
                  ? 'border-[#16a34a] bg-[#dcfce7] text-[#14532d]'
                  : 'border-[#d6be9b] bg-white text-[#78532a]'
              }`}
            >
              Set 2
            </button>
          </div>
        )}
      </div>

      {/* Distinct Break vs Trade Action Cards */}
      <div className="mb-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="blocks-break-ten"
          disabled={activeTens < 1}
          onClick={handleBreakTenToOnes}
          className={`flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 text-left transition ${
            activeTens >= 1
              ? 'border-[#ea580c] bg-[#fff7ed] text-[#9a3412] shadow-[0_2px_0_#ea580c] hover:bg-[#ffedd5] active:translate-y-0.5'
              : 'cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] opacity-75'
          }`}
        >
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-[#fdba74] bg-white px-1 py-0.5"
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
            <span className="block whitespace-nowrap text-[10.5px] font-extrabold">Break 10 → 10 Ones</span>
            <span className="block text-[9.5px] font-bold opacity-85">
              {activeTens >= 1 ? 'Unpack 1 rod to borrow' : 'Need 1+ Ten rod'}
            </span>
          </span>
        </button>

        <button
          type="button"
          data-testid="blocks-trade-ones"
          disabled={activeOnes < 10}
          onClick={handleTradeOnesToTen}
          className={`flex items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 text-left transition ${
            activeOnes >= 10
              ? 'border-[#16a34a] bg-[#f0fdf4] text-[#166534] shadow-[0_2px_0_#16a34a] hover:bg-[#dcfce7] active:translate-y-0.5'
              : 'cursor-not-allowed border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] opacity-75'
          }`}
        >
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-[#86efac] bg-white px-1 py-0.5"
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
            <span className="block whitespace-nowrap text-[10.5px] font-extrabold">Trade 10 Ones → 10</span>
            <span className="block text-[9.5px] font-bold opacity-85">
              {activeOnes >= 10
                ? 'Bundle 10 cubes to carry'
                : `Need ${10 - activeOnes} more Ones`}
            </span>
          </span>
        </button>
      </div>

      {/* Two Separated Sets of Blocks Representing Both Numbers */}
      <div className="space-y-2 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-extrabold text-[#3f2208]">
          <span>Tap any block to cross out / restore</span>
          <span
            data-testid="blocks-active-total"
            className="rounded-lg bg-[#fef3c7] px-2 py-0.5 text-[#92400e] tabular-nums"
          >
            Active Total: {activeTotal} ({activeHundreds}×100, {activeTens}×10, {activeOnes}×1)
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          {/* Set 1 Tray */}
          <div
            data-testid="blocks-set-1"
            className="rounded-xl border-2 border-[#7dd3fc] bg-[#f0f9ff] p-2.5"
          >
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-[#0c4a6e]">{set1Title}</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-[#0369a1] tabular-nums">
                {activeTotalA}
              </span>
            </div>
            <div className="flex min-h-[56px] flex-wrap items-end gap-1.5">
              {blocksA.map((b) => (
                <BlockButton key={b.id} block={b} onToggle={toggleCross} />
              ))}
              {blocksA.length === 0 && (
                <span className="text-[11px] font-bold text-[#64748b]">Empty Set 1</span>
              )}
            </div>
          </div>

          {/* Operator Badge Between Sets */}
          <div className="flex items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#d6be9b] bg-[#fef3c7] font-display text-base font-bold text-[#78350f]">
              {problem.symbol}
            </span>
          </div>

          {/* Set 2 Tray */}
          <div
            data-testid="blocks-set-2"
            className={`rounded-xl border-2 p-2.5 ${
              problem.operation === 'add'
                ? 'border-[#86efac] bg-[#f0fdf4]'
                : 'border-[#fdba74] bg-[#fff7ed]'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span
                className={`text-[11px] font-extrabold ${
                  problem.operation === 'add' ? 'text-[#14532d]' : 'text-[#9a3412]'
                }`}
              >
                {set2Title}
              </span>
              <span
                className={`rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                  problem.operation === 'add' ? 'text-[#15803d]' : 'text-[#c2410c]'
                }`}
              >
                {problem.operation === 'sub'
                  ? `Crossed: ${crossedTotalA}/${problem.b}`
                  : activeTotalB}
              </span>
            </div>
            <div className="flex min-h-[56px] flex-wrap items-end gap-1.5">
              {problem.operation === 'add' ? (
                blocksB.length > 0 ? (
                  blocksB.map((b) => (
                    <BlockButton key={b.id} block={b} onToggle={toggleCross} />
                  ))
                ) : (
                  <span className="text-[11px] font-bold text-[#64748b]">Empty Set 2</span>
                )
              ) : (
                blocksB.map((b) => (
                  <span
                    key={b.id}
                    className="pointer-events-none opacity-85"
                    aria-hidden="true"
                  >
                    <BlockButton block={b} onToggle={() => {}} />
                  </span>
                ))
              )}
            </div>
            {problem.operation === 'sub' && (
              <p className="mt-1.5 text-[10px] font-bold text-[#9a3412]">
                Cross out {problem.b} from Set 1 above!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Use Total Action */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="blocks-check-btn"
          onClick={() => {
            if (activeTotal === problem.answer) {
              setCheckMsg(`Awesome! Your blocks make ${activeTotal}!`);
            } else {
              setCheckMsg(`Your blocks currently total ${activeTotal}. Keep adjusting!`);
            }
          }}
          className="rounded-xl border-2 border-[#0369a1] bg-[#0ea5e9] px-3 py-1.5 font-display text-xs font-bold text-white shadow-[0_2px_0_#0369a1] hover:bg-[#0284c7]"
        >
          Check Blocks ({activeTotal})
        </button>
        {onSubmitAnswer && activeTotal === problem.answer && (
          <button
            type="button"
            data-testid="blocks-submit-btn"
            onClick={() => onSubmitAnswer(activeTotal)}
            className="rounded-xl border-2 border-[#15803d] bg-[#22c55e] px-3 py-1.5 font-display text-xs font-bold text-white shadow-[0_2px_0_#15803d] hover:bg-[#16a34a]"
          >
            Submit {activeTotal} ★
          </button>
        )}
        {checkMsg && <span className="text-xs font-extrabold text-[#78350f]">{checkMsg}</span>}
      </div>
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
