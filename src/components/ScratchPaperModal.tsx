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
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { MathProblem, ScratchStrategy } from '../game/types';
import {
  breakEggContainer,
  buildEggUnits,
  type EggUnit,
  hatchExactEggs,
  sumEggUnits,
} from '../game/visualGroups';

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
  { id: 'visual', label: 'Visualization', shortLabel: 'Visual', icon: Sparkles },
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
  const [carryMarks, setCarryMarks] = useState<number[]>([0, 0, 0]);
  const [penColor, setPenColor] = useState<string>('#1e293b');
  const [eraserOn, setEraserOn] = useState(false);

  // Vertical alignment columns count (max 3 digits: H, T, O)
  const colCount = useMemo(() => {
    const maxVal = Math.max(problem.a, problem.b, problem.answer);
    return maxVal >= 100 ? 3 : 2;
  }, [problem]);

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
    setCarryMarks([0, 0, 0]);
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
    setCarryMarks([0, 0, 0]);
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
  }, [problem]);

  const colHeaders =
    colCount === 3
      ? [
          { label: 'H', name: 'Hundreds', color: 'text-[#7e22ce] bg-[#f3e8ff]' },
          { label: 'T', name: 'Tens', color: 'text-[#1d4ed8] bg-[#dbeafe]' },
          { label: 'O', name: 'Ones', color: 'text-[#15803d] bg-[#dcfce7]' },
        ]
      : [
          { label: 'T', name: 'Tens', color: 'text-[#1d4ed8] bg-[#dbeafe]' },
          { label: 'O', name: 'Ones', color: 'text-[#15803d] bg-[#dcfce7]' },
        ];

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
                          maxLength={3}
                          aria-label="Enter division quotient"
                          data-testid="vertical-div-input"
                          value={divInput}
                          onChange={(e) => {
                            setDivInput(e.target.value.replace(/\D/g, '').slice(0, 3));
                            setVerticalFeedback(null);
                          }}
                          placeholder="?"
                          className="h-11 w-20 rounded-xl border-2 border-[#0284c7] bg-white text-center font-display text-2xl font-bold text-[#0c4a6e] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
                        />
                      </div>
                      <div className="flex items-center gap-2 font-display text-4xl font-bold text-[#1e293b] tabular-nums">
                        <span className="rounded-xl bg-[#f3e8ff] px-3 py-1 text-[#6b21a8]">
                          {problem.b}
                        </span>
                        <div className="rounded-tl-md border-t-4 border-l-4 border-[#1e293b] px-5 pt-2 pb-1">
                          {problem.a}
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-extrabold text-[#475569]">
                        How many groups of {problem.b} go into {problem.a}?
                      </p>
                    </div>
                  ) : (
                    /* Stacked Place Value Alignment Grid with Borrow & Result Input */
                    <div className="flex flex-col items-center rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] px-4 py-4">
                      <div className="inline-block">
                        {/* Place Value Column Headers */}
                        <div
                          className="mb-2 grid items-center gap-2 text-center"
                          style={{
                            gridTemplateColumns: `44px repeat(${colCount}, 56px)`,
                          }}
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
                          className="mb-1.5 grid items-center gap-2 text-center"
                          style={{
                            gridTemplateColumns: `44px repeat(${colCount}, 56px)`,
                          }}
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
                                      className="inline-flex min-w-[36px] items-center justify-center rounded-full border-2 border-[#dc2626] bg-[#fee2e2] px-1.5 py-0.5 font-display text-sm font-bold text-[#b91c1c] tabular-nums"
                                    >
                                      {working}
                                    </span>
                                  ) : canBorrow ? (
                                    <button
                                      type="button"
                                      data-testid={`borrow-btn-${idx}`}
                                      onClick={() => handleBorrowFromColumn(idx)}
                                      className="rounded-lg border border-dashed border-[#f59e0b] bg-[#fef3c7] px-1.5 py-0.5 text-[10px] font-extrabold text-[#92400e] hover:bg-[#fde68a]"
                                    >
                                      Borrow
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
                                className={`mx-auto flex h-7 w-10 items-center justify-center rounded-full border-2 border-dashed text-xs font-extrabold transition ${
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
                          className="grid items-center gap-2 text-center font-display text-4xl font-bold text-[#1e293b] tabular-nums"
                          style={{
                            gridTemplateColumns: `44px repeat(${colCount}, 56px)`,
                          }}
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
                          className="mt-1.5 grid items-center gap-2 text-center font-display text-4xl font-bold text-[#1e293b] tabular-nums"
                          style={{
                            gridTemplateColumns: `44px repeat(${colCount}, 56px)`,
                          }}
                        >
                          <div className="text-3xl text-[#b45309]">{problem.symbol}</div>
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
                          className="grid items-center gap-2 text-center"
                          style={{
                            gridTemplateColumns: `44px repeat(${colCount}, 56px)`,
                          }}
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
                              className="h-12 w-full rounded-xl border-2 border-[#0284c7] bg-white text-center font-display text-2xl font-bold text-[#0f172a] tabular-nums placeholder:text-xs placeholder:font-extrabold placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]"
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
              {strategy === 'visual' && (
                <VisualGroupsView problem={problem} onSubmitAnswer={onSubmitAnswer} />
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

const NumberLineView: React.FC<{ problem: MathProblem }> = ({ problem }) => {
  const { a, b, operation } = problem;

  const hops: Array<{ label: string }> = [];
  let startLabel = String(a);
  let subtitle = '';

  if (operation === 'add') {
    const start = Math.max(a, b);
    const jump = Math.min(a, b);
    startLabel = String(start);
    if (jump <= 8) {
      for (let i = 0; i < jump; i++) hops.push({ label: '+1' });
      subtitle = `Start at ${start} and hop forward ${jump} times!`;
    } else {
      const tens = Math.floor(jump / 10);
      const ones = jump % 10;
      for (let i = 0; i < Math.min(tens, 5); i++) hops.push({ label: '+10' });
      if (tens > 5) hops.push({ label: `+${(tens - 5) * 10}` });
      if (ones > 0) {
        hops.push({ label: `+${ones}` });
        subtitle = `Start at ${start}, jump by tens, then add ${ones} ones!`;
      } else {
        subtitle = `Start at ${start} and jump forward by tens!`;
      }
    }
  } else if (operation === 'sub') {
    startLabel = String(a);
    if (b <= 8) {
      for (let i = 0; i < b; i++) hops.push({ label: '−1' });
      subtitle = `Start at ${a} and hop backward ${b} steps!`;
    } else {
      const tens = Math.floor(b / 10);
      const ones = b % 10;
      for (let i = 0; i < Math.min(tens, 5); i++) hops.push({ label: '−10' });
      if (tens > 5) hops.push({ label: `−${(tens - 5) * 10}` });
      if (ones > 0) {
        hops.push({ label: `−${ones}` });
        subtitle = `Start at ${a}, jump back by tens, then subtract ${ones} ones!`;
      } else {
        subtitle = `Start at ${a} and jump back by tens!`;
      }
    }
  } else if (operation === 'mul') {
    startLabel = '0';
    const shown = Math.min(a, 6);
    for (let i = 0; i < shown; i++) hops.push({ label: `+${b}` });
    if (a > 6) hops.push({ label: `... (${a} total)` });
    subtitle = `Skip-count from 0 by +${b}, doing ${a} equal jumps!`;
  } else {
    startLabel = '0';
    hops.push({ label: `+${b}` });
    if (a > b) {
      hops.push({ label: `+${b}` });
      hops.push({ label: '... (? jumps)' });
    }
    subtitle = `Count how many jumps of +${b} take you from 0 to ${a}!`;
  }

  const isBackward = operation === 'sub';
  const count = Math.max(1, hops.length);
  const startX = isBackward ? 350 : 50;
  const endX = isBackward ? 50 : 350;
  const stepX = (endX - startX) / count;

  return (
    <div>
      <div className="mb-2 text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
        Number Line Strategy
      </div>
      <div className="rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
        <svg viewBox="0 0 400 135" className="w-full" role="img" aria-label="Number line hops">
          <line x1="30" y1="95" x2="370" y2="95" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <polygon points="370,90 380,95 370,100" fill="#334155" />
          <polygon points="30,90 20,95 30,100" fill="#334155" />

          {hops.map((hop, idx) => {
            const x1 = startX + idx * stepX;
            const x2 = startX + (idx + 1) * stepX;
            const midX = (x1 + x2) / 2;
            const peakY = 38;
            return (
              <g key={idx}>
                <path
                  d={`M ${x1} 92 Q ${midX} ${peakY} ${x2} 92`}
                  fill="none"
                  stroke={isBackward ? '#ea580c' : '#0284c7'}
                  strokeWidth="2.5"
                  strokeDasharray={hop.label.startsWith('...') ? '4 3' : undefined}
                />
                <circle cx={x1} cy="95" r="4" fill="#334155" />
                <text
                  x={midX}
                  y="44"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill={isBackward ? '#c2410c' : '#0369a1'}
                >
                  {hop.label}
                </text>
              </g>
            );
          })}

          <circle cx={startX} cy="95" r="6" fill="#22c55e" stroke="#14532d" strokeWidth="2" />
          <text x={startX} y="120" textAnchor="middle" fontSize="14" fontWeight="800" fill="#14532d">
            {startLabel}
          </text>

          <circle cx={endX} cy="95" r="6" fill="#facc15" stroke="#92400e" strokeWidth="2" />
          <text x={endX} y="120" textAnchor="middle" fontSize="15" fontWeight="800" fill="#b45309">
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
}

function buildBlocksForNumber(n: number, startId: number): InteractiveBlock[] {
  const pv = splitPlaceValues(n);
  const items: InteractiveBlock[] = [];
  let nextId = startId;
  for (let i = 0; i < Math.min(pv.h, 4); i++) {
    items.push({ id: nextId++, value: 100, crossed: false });
  }
  for (let i = 0; i < pv.t; i++) {
    items.push({ id: nextId++, value: 10, crossed: false });
  }
  for (let i = 0; i < pv.o; i++) {
    items.push({ id: nextId++, value: 1, crossed: false });
  }
  return items;
}

const BaseBlocksView: React.FC<{
  problem: MathProblem;
  onSubmitAnswer?: (val: number) => void;
}> = ({ problem, onSubmitAnswer }) => {
  const nextIdRef = useRef(1);
  const makeInitial = () => {
    nextIdRef.current = 1;
    const base = buildBlocksForNumber(problem.a, 1);
    nextIdRef.current = base.length + 1;
    if (problem.operation === 'add') {
      const extra = buildBlocksForNumber(problem.b, nextIdRef.current);
      nextIdRef.current += extra.length;
      return [...base, ...extra];
    }
    return base;
  };

  const [blocks, setBlocks] = useState<InteractiveBlock[]>(makeInitial);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  useEffect(() => {
    setBlocks(makeInitial());
    setCheckMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  const addBlock = (value: 100 | 10 | 1) => {
    setCheckMsg(null);
    setBlocks((prev) => [...prev, { id: nextIdRef.current++, value, crossed: false }]);
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

  const handleBreakTenToOnes = () => {
    setCheckMsg(null);
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => !b.crossed && b.value === 10);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy.splice(idx, 1);
      for (let i = 0; i < 10; i++) {
        copy.push({ id: nextIdRef.current++, value: 1, crossed: false });
      }
      return copy;
    });
  };

  const handleTradeOnesToTen = () => {
    setCheckMsg(null);
    setBlocks((prev) => {
      const oneIds = prev.filter((b) => !b.crossed && b.value === 1).slice(0, 10).map((b) => b.id);
      if (oneIds.length < 10) return prev;
      const idSet = new Set(oneIds);
      return [
        ...prev.filter((b) => !idSet.has(b.id)),
        { id: nextIdRef.current++, value: 10, crossed: false },
      ];
    });
  };

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

      {/* Add & Regroup Controls */}
      <div className="mb-2 flex flex-wrap gap-1.5">
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
        {activeTens >= 1 && (
          <button
            type="button"
            data-testid="blocks-break-ten"
            onClick={handleBreakTenToOnes}
            className="rounded-lg border border-[#ea580c] bg-[#ffedd5] px-2 py-1 text-xs font-extrabold text-[#9a3412] hover:bg-[#fed7aa]"
          >
            Break 10 → 10 Ones
          </button>
        )}
        {activeOnes >= 10 && (
          <button
            type="button"
            data-testid="blocks-trade-ones"
            onClick={handleTradeOnesToTen}
            className="rounded-lg border border-[#15803d] bg-[#dcfce7] px-2 py-1 text-xs font-extrabold text-[#166534] hover:bg-[#bbf7d0]"
          >
            Trade 10 Ones → 10
          </button>
        )}
      </div>

      {/* Interactive Block Tray */}
      <div className="min-h-[120px] rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-[#3f2208]">
          <span>Tap any block to cross out / restore</span>
          <span data-testid="blocks-active-total" className="rounded-lg bg-[#fef3c7] px-2 py-0.5 text-[#92400e] tabular-nums">
            Total: {activeTotal} ({activeHundreds}×100, {activeTens}×10, {activeOnes}×1)
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {blocks.map((b) => {
            if (b.value === 100) {
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleCross(b.id)}
                  title="Click to cross out or restore 100 Flat"
                  className={`flex h-10 w-10 items-center justify-center rounded border-2 text-[10px] font-extrabold transition ${
                    b.crossed
                      ? 'border-[#fca5a5] bg-[#fee2e2] text-[#dc2626] line-through opacity-50'
                      : 'border-[#7e22ce] bg-[#e9d5ff] text-[#581c87] hover:scale-105'
                  }`}
                >
                  100
                </button>
              );
            }
            if (b.value === 10) {
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleCross(b.id)}
                  title="Click to cross out or restore 10 Rod"
                  className={`h-10 w-3.5 rounded border transition ${
                    b.crossed
                      ? 'border-[#fca5a5] bg-[#fee2e2] opacity-45'
                      : 'border-[#1d4ed8] bg-[#93c5fd] hover:scale-105'
                  }`}
                />
              );
            }
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleCross(b.id)}
                title="Click to cross out or restore 1 Cube"
                className={`h-4 w-4 rounded-sm border transition ${
                  b.crossed
                    ? 'border-[#fca5a5] bg-[#fee2e2] opacity-45'
                    : 'border-[#b45309] bg-[#fde047] hover:scale-110'
                }`}
              />
            );
          })}
          {blocks.length === 0 && (
            <span className="text-xs font-bold text-[#94a3b8]">
              Use the +100, +10, and +1 buttons above to build numbers!
            </span>
          )}
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

/* --- Cute SVG Eggs & Hatched Chicks Artwork for Visualization Methods --- */

const WholeEggSvg: React.FC<{ size?: number; dimmed?: boolean }> = ({
  size = 24,
  dimmed = false,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 32"
    aria-hidden="true"
    className={dimmed ? 'opacity-65' : undefined}
  >
    <path
      d="M14 2 C20 2 24 11 24 19 C24 26 20 30 14 30 C8 30 4 26 4 19 C4 11 8 2 14 2 Z"
      fill="#fef3c7"
      stroke="#b45309"
      strokeWidth="2.2"
    />
    <ellipse cx="10.5" cy="10" rx="2.4" ry="4" fill="#fffbeb" opacity="0.85" />
    <circle cx="17.5" cy="14" r="1.3" fill="#d97706" opacity="0.55" />
    <circle cx="15" cy="21" r="1.1" fill="#d97706" opacity="0.45" />
    <circle cx="10" cy="19" r="1.2" fill="#d97706" opacity="0.45" />
  </svg>
);

const HatchedChickSvg: React.FC<{ size?: number; crossed?: boolean; dimmed?: boolean }> = ({
  size = 28,
  crossed = false,
  dimmed = false,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    aria-hidden="true"
    className={crossed ? 'opacity-80' : dimmed ? 'opacity-65' : undefined}
  >
    {/* Fluffy yellow chick head & body peeking out */}
    <circle cx="16" cy="13.5" r="8.2" fill="#fde047" stroke="#b45309" strokeWidth="1.8" />
    {/* Little top tuft */}
    <path
      d="M15 5.2 Q16 2 18.2 4.5 Q19 2.6 20 5.5"
      fill="none"
      stroke="#b45309"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    {/* Eyes */}
    <circle cx="13" cy="12.5" r="1.35" fill="#1e293b" />
    <circle cx="19" cy="12.5" r="1.35" fill="#1e293b" />
    <circle cx="12.6" cy="12" r="0.45" fill="#ffffff" />
    <circle cx="18.6" cy="12" r="0.45" fill="#ffffff" />
    {/* Rosy cheeks */}
    <circle cx="10.6" cy="14.5" r="1.3" fill="#fb7185" opacity="0.55" />
    <circle cx="21.4" cy="14.5" r="1.3" fill="#fb7185" opacity="0.55" />
    {/* Orange beak */}
    <polygon points="14.2,14.2 17.8,14.2 16,17.2" fill="#f97316" stroke="#9a3412" strokeWidth="1" />
    {/* Cracked white bottom eggshell */}
    <path
      d="M6.5 18.5 L10 21.5 L13.5 18 L16.5 21.5 L19.8 18 L23 21.2 L25.5 18.5 C25.5 25.5 21.5 29.5 16 29.5 C10.5 29.5 6.5 25.5 6.5 18.5 Z"
      fill="#fffbeb"
      stroke="#92400e"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const EggContainerBadge: React.FC<{
  value: 1 | 10 | 100;
  hatched: boolean;
  kind: 'egg' | 'chick';
}> = ({ value, hatched, kind }) => {
  const isHundred = value === 100;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-xl border-2 px-2 py-1 font-display text-xs font-bold shadow-xs transition ${
        hatched
          ? 'border-[#f59e0b] bg-[#fef3c7] text-[#92400e]'
          : isHundred
            ? 'border-[#7e22ce] bg-[#f3e8ff] text-[#581c87]'
            : 'border-[#0284c7] bg-[#e0f2fe] text-[#0c4a6e]'
      }`}
    >
      {hatched || kind === 'chick' ? (
        <HatchedChickSvg size={18} />
      ) : (
        <WholeEggSvg size={16} />
      )}
      <span>{value}</span>
    </span>
  );
};

const VisualGroupsView: React.FC<{
  problem: MathProblem;
  onSubmitAnswer?: (val: number) => void;
}> = ({ problem, onSubmitAnswer }) => {
  const { a, b, operation } = problem;

  // Multiplication: Interactive Nests of Hatched Chicks
  const [builtNests, setBuiltNests] = useState(() => (a === 0 ? 0 : 1));
  // Division: Interactive Egg Basket -> Hatched Chicks in Nests
  const [dealtCount, setDealtCount] = useState(0);
  // Addition: Interactive Eggs (Group A) + Hatched Chicks (Group B)
  const [addUnitsA, setAddUnitsA] = useState<EggUnit[]>(() => buildEggUnits(a, 'addA', 24));
  const [addUnitsB, setAddUnitsB] = useState<EggUnit[]>(() => buildEggUnits(b, 'addB', 24));
  // Subtraction: Interactive Whole Eggs that hatch into Chicks when taken away
  const [subUnits, setSubUnits] = useState<EggUnit[]>(() => buildEggUnits(a, 'sub', 30));

  useEffect(() => {
    setBuiltNests(a === 0 ? 0 : 1);
    setDealtCount(0);
    setAddUnitsA(buildEggUnits(a, 'addA', 24));
    setAddUnitsB(buildEggUnits(b, 'addB', 24));
    setSubUnits(buildEggUnits(a, 'sub', 30));
  }, [problem.id, a, b]);

  if (operation === 'mul') {
    const shownTotal = builtNests * b;
    const perNestShown = Math.min(b, 12);
    return (
      <div data-testid="interactive-visual-mul">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
            Cozy Nests ({builtNests} / {a} nests × {b} chicks)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="visual-add-row-btn"
              disabled={builtNests >= a}
              onClick={() => setBuiltNests((r) => Math.min(a, r + 1))}
              className="rounded-lg border border-[#0369a1] bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd] disabled:opacity-50"
            >
              + Add Nest ({b})
            </button>
            <button
              type="button"
              onClick={() => setBuiltNests(a)}
              className="rounded-lg border border-[#d6be9b] bg-[#fcf7ec] px-2 py-0.5 text-xs font-extrabold text-[#78532a] hover:bg-[#fef3c7]"
            >
              Show All
            </button>
            <button
              type="button"
              onClick={() => setBuiltNests(a === 0 ? 0 : 1)}
              className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a] hover:bg-[#fef3c7]"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="space-y-1.5 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
          {builtNests === 0 ? (
            <div className="py-3 text-center text-xs font-bold text-[#64748b]">
              0 nests means 0 hatched chicks!
            </div>
          ) : (
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {Array.from({ length: builtNests }).map((_, r) => (
                <div
                  key={r}
                  className="flex items-center gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1.5"
                >
                  <span className="w-12 shrink-0 text-[10px] font-extrabold text-[#92400e] tabular-nums">
                    Nest #{r + 1}
                  </span>
                  <div className="flex flex-wrap items-center gap-0.5">
                    {Array.from({ length: perNestShown }).map((__, c) => (
                      <HatchedChickSvg key={c} size={22} />
                    ))}
                    {b > perNestShown && (
                      <span className="ml-1 text-[11px] font-bold text-[#92400e]">
                        +{b - perNestShown} more
                      </span>
                    )}
                  </div>
                  <span className="ml-auto shrink-0 text-[11px] font-extrabold text-[#0369a1] tabular-nums">
                    = {(r + 1) * b}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-[#e2e8f0] pt-2 text-xs font-extrabold text-[#475569]">
            <span>Running Total: {shownTotal} hatched chicks</span>
            {onSubmitAnswer && builtNests === a && (
              <button
                type="button"
                data-testid="visual-submit-btn"
                onClick={() => onSubmitAnswer(shownTotal)}
                className="rounded-lg border border-[#15803d] bg-[#22c55e] px-2.5 py-0.5 text-xs font-bold text-white"
              >
                Submit {shownTotal} ★
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (operation === 'div') {
    const nestCount = Math.max(1, b);
    const chicksPerNest = Math.floor(dealtCount / nestCount);
    const eggsLeft = Math.max(0, a - dealtCount);
    return (
      <div data-testid="interactive-visual-div">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
            Share {a} Eggs into {b} Equal Nests
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="visual-deal-round-btn"
              disabled={dealtCount >= a}
              onClick={() => setDealtCount((d) => Math.min(a, d + nestCount))}
              className="rounded-lg border border-[#0369a1] bg-[#e0f2fe] px-2.5 py-0.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd] disabled:opacity-50"
            >
              Hatch 1 in Each Nest (+{nestCount})
            </button>
            <button
              type="button"
              disabled={dealtCount >= a}
              onClick={() => setDealtCount(a)}
              className="rounded-lg border border-[#d6be9b] bg-[#fcf7ec] px-2 py-0.5 text-xs font-extrabold text-[#78532a] hover:bg-[#fef3c7] disabled:opacity-50"
            >
              Hatch All
            </button>
            <button
              type="button"
              onClick={() => setDealtCount(0)}
              className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="space-y-2 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[#64748b] tabular-nums">
            <WholeEggSvg size={16} />
            <span>
              Whole Eggs Left in Basket: {eggsLeft} of {a}
            </span>
          </div>
          <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {Array.from({ length: nestCount }).map((_, idx) => {
              const countInThis =
                Math.floor(dealtCount / nestCount) + (idx < dealtCount % nestCount ? 1 : 0);
              return (
                <div
                  key={idx}
                  className="rounded-xl border-2 border-[#d97706] bg-[#fffbeb] p-2"
                >
                  <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold text-[#92400e]">
                    <span>Nest {idx + 1}</span>
                    <span className="tabular-nums">{countInThis}</span>
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {countInThis === 0 ? (
                      <span className="text-[10px] font-bold text-[#a16207]">Empty nest</span>
                    ) : (
                      Array.from({ length: countInThis }).map((__, sIdx) => (
                        <HatchedChickSvg key={sIdx} size={20} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {onSubmitAnswer && dealtCount === a && (
            <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-2">
              <span className="text-xs font-extrabold text-[#15803d]">
                Each nest has {chicksPerNest} hatched chicks!
              </span>
              <button
                type="button"
                data-testid="visual-submit-btn"
                onClick={() => onSubmitAnswer(chicksPerNest)}
                className="rounded-lg border border-[#15803d] bg-[#22c55e] px-2.5 py-0.5 text-xs font-bold text-white"
              >
                Submit {chicksPerNest} ★
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (operation === 'sub') {
    const hatchedTotal = sumEggUnits(subUnits, true);
    const remainingTotal = sumEggUnits(subUnits, false);
    const hasContainerToBreak = subUnits.some((u) => !u.hatched && u.value > 1);
    return (
      <div data-testid="interactive-visual-sub">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
            Tap Whole Eggs to Hatch &amp; Take Away ({a} − {b})
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {hasContainerToBreak && (
              <button
                type="button"
                data-testid="visual-break-egg-btn"
                onClick={() => setSubUnits((prev) => breakEggContainer(prev))}
                className="rounded-lg border border-[#0284c7] bg-[#e0f2fe] px-2 py-0.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd]"
              >
                Unpack 10-Tray
              </button>
            )}
            <button
              type="button"
              data-testid="visual-hatch-b-btn"
              onClick={() => setSubUnits(hatchExactEggs(buildEggUnits(a, 'sub', 30), b))}
              className="rounded-lg border border-[#ea580c] bg-[#ffedd5] px-2 py-0.5 text-xs font-extrabold text-[#9a3412] hover:bg-[#fed7aa]"
            >
              Hatch {b} Away
            </button>
            <button
              type="button"
              onClick={() => setSubUnits(buildEggUnits(a, 'sub', 30))}
              className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
          <div className="mb-1.5 text-[11px] font-bold text-[#64748b]">
            Whole Eggs = still here · Hatched Chicks = taken away
          </div>
          <div className="flex max-h-48 flex-wrap items-center gap-1.5 overflow-y-auto pr-1">
            {subUnits.map((unit) => (
              <button
                key={unit.id}
                type="button"
                title={
                  unit.hatched
                    ? `Hatched (${unit.value}) — click to restore whole egg`
                    : `Whole (${unit.value}) — click to hatch & take away`
                }
                onClick={() =>
                  setSubUnits((prev) =>
                    prev.map((u) => (u.id === unit.id ? { ...u, hatched: !u.hatched } : u))
                  )
                }
                className={`inline-flex items-center justify-center rounded-xl border p-1 transition ${
                  unit.hatched
                    ? 'border-[#fca5a5] bg-[#fef2f2]'
                    : 'border-[#fde68a] bg-[#fffbeb] hover:scale-105'
                }`}
              >
                {unit.value > 1 ? (
                  <EggContainerBadge value={unit.value} hatched={unit.hatched} kind="egg" />
                ) : unit.hatched ? (
                  <HatchedChickSvg size={24} crossed />
                ) : (
                  <WholeEggSvg size={22} />
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#e2e8f0] pt-2 text-xs font-extrabold text-[#475569] tabular-nums">
            <span>
              Hatched Away: {hatchedTotal} · Whole Eggs Left: {remainingTotal}
            </span>
            {onSubmitAnswer && remainingTotal === problem.answer && (
              <button
                type="button"
                data-testid="visual-submit-btn"
                onClick={() => onSubmitAnswer(remainingTotal)}
                className="rounded-lg border border-[#15803d] bg-[#22c55e] px-2.5 py-0.5 text-xs font-bold text-white"
              >
                Submit {remainingTotal} ★
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Addition: Group A (Whole Eggs) + Group B (Hatched Chicks) — exact for all numbers!
  const countedA = sumEggUnits(addUnitsA, true);
  const countedB = sumEggUnits(addUnitsB, true);
  const totalCounted = countedA + countedB;

  return (
    <div data-testid="interactive-visual-add">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
          Tap Eggs &amp; Chicks to Count ({a} + {b})
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="visual-count-all-btn"
            onClick={() => {
              setAddUnitsA((prev) => prev.map((u) => ({ ...u, hatched: true })));
              setAddUnitsB((prev) => prev.map((u) => ({ ...u, hatched: true })));
            }}
            className="rounded-lg border border-[#15803d] bg-[#dcfce7] px-2 py-0.5 text-xs font-extrabold text-[#166534] hover:bg-[#bbf7d0]"
          >
            Count All
          </button>
          <button
            type="button"
            onClick={() => {
              setAddUnitsA(buildEggUnits(a, 'addA', 24));
              setAddUnitsB(buildEggUnits(b, 'addB', 24));
            }}
            className="rounded-lg border border-[#d6be9b] bg-white px-2 py-0.5 text-xs font-extrabold text-[#78532a]"
          >
            Reset
          </button>
          <span
            data-testid="visual-add-counted"
            className="rounded-lg bg-[#dcfce7] px-2 py-0.5 text-xs font-extrabold text-[#166534] tabular-nums"
          >
            Counted: {totalCounted}
          </span>
        </div>
      </div>
      <div className="space-y-2 rounded-2xl border-2 border-[#cbd5e1] bg-[#fffef8] p-3">
        <div>
          <div className="mb-1 text-xs font-extrabold text-[#15803d]">
            Group 1 · {a} Whole Eggs (tap to hatch &amp; count):
          </div>
          <div className="flex max-h-28 flex-wrap items-center gap-1 overflow-y-auto">
            {addUnitsA.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() =>
                  setAddUnitsA((prev) =>
                    prev.map((u) => (u.id === unit.id ? { ...u, hatched: !u.hatched } : u))
                  )
                }
                className={`inline-flex items-center justify-center rounded-xl border p-0.5 transition ${
                  unit.hatched
                    ? 'scale-105 border-[#16a34a] bg-[#dcfce7]'
                    : 'border-[#fde68a] bg-[#fffbeb] hover:scale-105'
                }`}
              >
                {unit.value > 1 ? (
                  <EggContainerBadge value={unit.value} hatched={unit.hatched} kind="egg" />
                ) : unit.hatched ? (
                  <HatchedChickSvg size={22} />
                ) : (
                  <WholeEggSvg size={20} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#e2e8f0] pt-2">
          <div className="mb-1 text-xs font-extrabold text-[#0369a1]">
            Group 2 · {b} Hatched Chicks (tap to count):
          </div>
          <div className="flex max-h-28 flex-wrap items-center gap-1 overflow-y-auto">
            {addUnitsB.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() =>
                  setAddUnitsB((prev) =>
                    prev.map((u) => (u.id === unit.id ? { ...u, hatched: !u.hatched } : u))
                  )
                }
                className={`inline-flex items-center justify-center rounded-xl border p-0.5 transition ${
                  unit.hatched
                    ? 'scale-105 border-[#0284c7] bg-[#e0f2fe]'
                    : 'border-[#e2e8f0] bg-white hover:scale-105'
                }`}
              >
                {unit.value > 1 ? (
                  <EggContainerBadge value={unit.value} hatched={unit.hatched} kind="chick" />
                ) : (
                  <HatchedChickSvg size={22} dimmed={!unit.hatched} />
                )}
              </button>
            ))}
          </div>
        </div>

        {onSubmitAnswer && totalCounted === problem.answer && (
          <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-2">
            <span className="text-xs font-extrabold text-[#15803d]">
              {a} + {b} = {totalCounted} eggs &amp; chicks!
            </span>
            <button
              type="button"
              data-testid="visual-submit-btn"
              onClick={() => onSubmitAnswer(totalCounted)}
              className="rounded-lg border border-[#15803d] bg-[#22c55e] px-2.5 py-0.5 text-xs font-bold text-white"
            >
              Submit {totalCounted} ★
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
