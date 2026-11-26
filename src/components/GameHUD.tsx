import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Delete,
  Flame,
  Grid3X3,
  LocateFixed,
  Pause,
  PenLine,
  RotateCcw,
  RotateCw,
  Store,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DIFFICULTY_LABELS, ROUND_LENGTH } from '../game/mathEngine';
import type { MathProblem, VisitorSpecies } from '../game/types';

interface FeedbackToast {
  id: number;
  text: string;
  positive: boolean;
}

interface VisitingAnimalHUD {
  species: VisitorSpecies;
  streak: number;
  screenPos: { x: number; y: number } | null;
}

interface GameHUDProps {
  stars: number;
  correctStreak: number;
  todayCorrect: number;
  dailyGoal: number;
  dailyStreak: number;
  roundIndex: number;
  problem: MathProblem;
  inputMode: 'choices' | 'keypad';
  choicesDisabled: boolean;
  wrongAttempts: number;
  modalOpen: boolean;
  hintText: string | null;
  feedbackToast: FeedbackToast | null;
  canAffordAnyUpgrade: boolean;
  visitingAnimal: VisitingAnimalHUD | null;
  muted: boolean;
  onSubmitChoice: (choiceIndex: number) => void;
  onSubmitNumber: (val: number) => void;
  onToggleInputMode: () => void;
  onOpenMethods: () => void;
  onOpenMultiplicationTable: () => void;
  onOpenUpgrades: () => void;
  onOpenParentDashboard: () => void;
  onClickVisitor: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stars,
  correctStreak,
  todayCorrect,
  dailyGoal,
  dailyStreak,
  roundIndex,
  problem,
  inputMode,
  choicesDisabled,
  wrongAttempts,
  modalOpen,
  hintText,
  feedbackToast,
  canAffordAnyUpgrade,
  visitingAnimal,
  muted,
  onSubmitChoice,
  onSubmitNumber,
  onToggleInputMode,
  onOpenMethods,
  onOpenMultiplicationTable,
  onOpenUpgrades,
  onOpenParentDashboard,
  onClickVisitor,
  onToggleMute,
  onPause,
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  onResetCamera,
}) => {
  const [keypadValue, setKeypadValue] = useState('');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const dailyPct = Math.min(100, Math.round((todayCorrect / Math.max(1, dailyGoal)) * 100));

  useEffect(() => {
    setKeypadValue('');
  }, [problem.id, inputMode]);

  useEffect(() => {
    if (inputMode !== 'keypad' || modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (/^[0-9]$/.test(e.key)) {
        setKeypadValue((prev) => (prev.length >= 4 ? prev : prev + e.key));
      } else if (e.key === 'Backspace') {
        setKeypadValue((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter' && keypadValue.length > 0) {
        const parsed = Number.parseInt(keypadValue, 10);
        if (!Number.isNaN(parsed)) {
          onSubmitNumber(parsed);
          setKeypadValue('');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputMode, modalOpen, keypadValue, onSubmitNumber]);

  const handleKeypadDigit = (digit: string) => {
    if (keypadValue.length >= 4) return;
    setKeypadValue((prev) => prev + digit);
  };

  const handleKeypadSubmit = () => {
    if (keypadValue.length === 0) return;
    const parsed = Number.parseInt(keypadValue, 10);
    if (!Number.isNaN(parsed)) {
      onSubmitNumber(parsed);
      setKeypadValue('');
    }
  };

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 720;
  const bubbleX = Math.max(
    140,
    Math.min(viewportW - 140, visitingAnimal?.screenPos?.x ?? viewportW * 0.68)
  );
  const bubbleY = Math.max(
    125,
    Math.min(viewportH - 210, (visitingAnimal?.screenPos?.y ?? viewportH * 0.56) - 66)
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* TOP BAR: Left Stats Cluster | Center Question Plaque | Right Utility Icons */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left Perimeter Cluster */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Stars Counter */}
            <div
              aria-label={`Stars: ${stars}`}
              data-testid="hud-stars-count"
              className="flex items-center gap-2 rounded-2xl border-2 border-[#b45309] bg-[#fff8e7] px-3.5 py-1.5 shadow-[0_3px_0_#d97706]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9L12 2.5z"
                  fill="#facc15"
                  stroke="#92400e"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-display text-xl leading-none font-bold text-[#451a03] tabular-nums">
                {Math.round(stars)}
              </span>
            </div>

            {/* Fire Correct Streak Indicator */}
            <div
              aria-label={`Correct answer streak: ${correctStreak}`}
              data-testid="hud-fire-streak"
              title="Consecutive right answers — keep going to invite meadow animals for +1 ★!"
              className={`flex items-center gap-1.5 rounded-2xl border-2 px-3 py-1.5 transition ${
                correctStreak > 0
                  ? 'border-[#c2410c] bg-[#ffedd5] shadow-[0_3px_0_#ea580c]'
                  : 'border-[#c8ad84] bg-[#fff8e7] shadow-[0_3px_0_#d6be9b]'
              }`}
            >
              <Flame
                className={`h-4 w-4 ${
                  correctStreak > 0 ? 'fill-[#f97316] text-[#c2410c]' : 'text-[#9a7b56]'
                }`}
              />
              <span
                className={`font-display text-lg leading-none font-bold tabular-nums ${
                  correctStreak > 0 ? 'text-[#9a3412]' : 'text-[#6e563a]'
                }`}
              >
                {correctStreak}
              </span>
            </div>

            {/* 0–10 Multiplication Table Button at end of top-left corner */}
            <button
              type="button"
              tabIndex={-1}
              data-testid="open-mult-table-btn"
              aria-label="Open 0 to 10 Multiplication Table (T)"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenMultiplicationTable();
              }}
              className="flex items-center gap-1.5 rounded-2xl border-2 border-[#6d28d9] bg-[#f3e8ff] px-3 py-1.5 text-xs font-extrabold text-[#5b21b6] shadow-[0_3px_0_#7c3aed] transition hover:bg-[#e9d5ff] active:translate-y-0.5"
            >
              <Grid3X3 className="h-4 w-4" />
              <span>× Table (0–10)</span>
            </button>
          </div>

          {/* Daily Practice Goal Bar */}
          <div className="flex w-fit items-center gap-2 rounded-xl border-2 border-[#15803d] bg-[#f0fdf4] px-3 py-1 shadow-[0_2px_0_#22c55e]">
            <span className="text-[11px] font-extrabold text-[#166534] uppercase">Daily</span>
            <div className="h-2 w-20 overflow-hidden rounded-full bg-[#bbf7d0]">
              <div
                className="h-full bg-[#16a34a] transition-all duration-300"
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-[#14532d] tabular-nums">
              {todayCorrect}/{dailyGoal}
            </span>
            {dailyStreak > 0 && (
              <span className="text-[11px] font-extrabold text-[#15803d] tabular-nums">
                · {dailyStreak}d
              </span>
            )}
          </div>
        </div>

        {/* Top-Right Compact Utility Buttons */}
        <div className="pointer-events-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            tabIndex={-1}
            data-testid="open-methods-btn"
            aria-label="Open Solving Methods (S)"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMethods();
            }}
            className="flex h-8 items-center gap-1.5 rounded-xl border-2 border-[#0369a1] bg-[#e0f2fe] px-2 text-sm font-extrabold text-[#0c4a6e] shadow-[0_3px_0_#0284c7] transition hover:bg-[#bae6fd] active:translate-y-0.5 sm:h-11 sm:rounded-2xl sm:px-3"
          >
            <PenLine className="h-4 w-4" />
            <span className="hidden sm:inline">Methods</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="open-upgrades-btn"
            aria-label="Open Meadow & Character Upgrades (U)"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenUpgrades();
            }}
            className="relative flex h-8 items-center gap-1.5 rounded-xl border-2 border-[#b45309] bg-[#fff8e7] px-2 text-sm font-extrabold text-[#78350f] shadow-[0_3px_0_#d97706] transition hover:bg-[#fef3c7] active:translate-y-0.5 sm:h-11 sm:rounded-2xl sm:px-3"
          >
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Upgrades</span>
            {canAffordAnyUpgrade && (
              <span className="rounded-md bg-[#22c55e] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                NEW
              </span>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="pause-btn"
            aria-label="Meadow Break / Pause Game (P or Esc)"
            title="Meadow Break (P or Esc)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#78532a] bg-[#fff8e7] text-[#5c3d1e] shadow-[0_3px_0_#b69162] transition hover:bg-[#fef3c7] active:translate-y-0.5 sm:h-11 sm:w-11 sm:rounded-2xl"
          >
            <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute sound (M)' : 'Mute sound (M)'}
            title={muted ? 'Unmute sound (M)' : 'Mute sound (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#78532a] bg-[#fff8e7] text-[#5c3d1e] shadow-[0_3px_0_#b69162] transition hover:bg-[#fef3c7] active:translate-y-0.5 sm:h-11 sm:w-11 sm:rounded-2xl"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="parent-progress-btn"
            aria-label="Open Parent Progress Dashboard (R)"
            title="Parent Progress (R)"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenParentDashboard();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#78532a] bg-[#fff8e7] text-[#5c3d1e] shadow-[0_3px_0_#b69162] transition hover:bg-[#fef3c7] active:translate-y-0.5 sm:h-11 sm:w-11 sm:rounded-2xl"
          >
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Visiting Garden Animal Talking Speech Bubble */}
      {visitingAnimal && !modalOpen && (
        <button
          type="button"
          data-testid="visiting-animal-bubble"
          onClick={(e) => {
            e.currentTarget.blur();
            onClickVisitor();
          }}
          style={{ left: `${bubbleX}px`, top: `${bubbleY}px` }}
          className="pointer-events-auto fixed z-20 max-w-[235px] -translate-x-1/2 -translate-y-full rounded-2xl border-2 border-[#c2410c] bg-[#fffbeb] px-3.5 py-2.5 text-left shadow-[0_4px_0_#ea580c] transition hover:scale-[1.03] active:translate-y-[-96%]"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide text-[#c2410c] uppercase">
            <Flame className="h-3.5 w-3.5 fill-[#f97316]" />
            <span>
              {visitingAnimal.species === 'rabbit' ? 'Meadow Rabbit' : 'Acorn Squirrel'} · Smart Streak Gift
            </span>
          </div>
          <div className="mt-0.5 text-xs leading-snug font-extrabold text-[#451a03]">
            &ldquo;You&apos;re so smart! {visitingAnimal.streak} right in a row! Tap me for +1 Bonus ★!&rdquo;
          </div>
          <div
            aria-hidden="true"
            className="mx-auto mt-1 h-2.5 w-2.5 translate-y-2.5 rotate-45 border-r-2 border-b-2 border-[#c2410c] bg-[#fffbeb]"
          />
        </button>
      )}

      {/* UPPER-CENTER QUESTION PLAQUE */}
      <div
        className={`pointer-events-none relative z-20 mx-auto mt-2 mb-auto flex w-full flex-col items-center px-3 sm:fixed sm:top-5 sm:left-1/2 sm:m-0 sm:-translate-x-1/2 ${
          wrongAttempts >= 2 ? 'max-w-xl' : 'max-w-md'
        }`}
      >
        <div className="rounded-3xl border-4 border-[#8c5a2b] bg-[#fffbf0] px-6 py-2.5 text-center shadow-[0_6px_0_rgba(120,68,26,0.35)]">
          <div className="flex items-center justify-center gap-2 text-[11px] font-extrabold tracking-wide text-[#92400e] uppercase">
            <span>
              Question {Math.min(roundIndex + 1, ROUND_LENGTH)} / {ROUND_LENGTH}
            </span>
            <span>·</span>
            <span>{DIFFICULTY_LABELS[problem.tier].name}</span>
          </div>
          <div
            data-testid="math-question"
            className="font-display text-3xl leading-tight font-bold text-[#3f2208] tabular-nums sm:text-4xl"
          >
            {problem.a} {problem.symbol} {problem.b} = ?
          </div>
        </div>

        {/* Helpful Visual Hint Banner on Mistake (Enlarged after 2+ wrong answers) */}
        {hintText && (
          <div
            data-testid="struggle-hint-banner"
            data-enlarged={wrongAttempts >= 2 ? 'true' : 'false'}
            className={
              wrongAttempts >= 2
                ? 'pointer-events-auto mt-3 flex w-full flex-col items-center gap-3 rounded-3xl border-4 border-[#dc2626] bg-[#fef3c7] px-5 py-3.5 text-center shadow-[0_6px_0_rgba(180,83,9,0.35)] sm:flex-row sm:justify-between sm:text-left'
                : 'pointer-events-auto mt-2 flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-[#d97706] bg-[#fef3c7] px-4 py-1.5 text-center text-xs font-extrabold text-[#78350f] shadow-md'
            }
          >
            <div className={wrongAttempts >= 2 ? 'text-sm leading-snug font-extrabold text-[#78350f] sm:text-base' : ''}>
              {wrongAttempts >= 2 && (
                <div className="mb-0.5 text-[11px] font-extrabold tracking-wide text-[#b91c1c] uppercase">
                  Multiple Choice Locked · Let&apos;s Solve Together!
                </div>
              )}
              <span>Tip: {hintText}</span>
            </div>
            <button
              type="button"
              data-testid="hint-methods-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenMethods();
              }}
              className={
                wrongAttempts >= 2
                  ? 'inline-flex shrink-0 items-center gap-2 rounded-2xl border-2 border-[#0369a1] bg-[#0ea5e9] px-5 py-2.5 font-display text-base font-bold text-white shadow-[0_4px_0_#0369a1] transition hover:bg-[#0284c7] active:translate-y-0.5 sm:text-lg'
                  : 'inline-flex items-center gap-1 rounded-lg border border-[#0369a1] bg-[#e0f2fe] px-2.5 py-1 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd]'
              }
            >
              <PenLine className={wrongAttempts >= 2 ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
              <span>Try Methods</span>
            </button>
          </div>
        )}

        {/* Reward Floating Feedback Pop */}
        {feedbackToast && (
          <div
            key={feedbackToast.id}
            data-testid="feedback-toast"
            className={`animate-float-pop pointer-events-none absolute top-full left-1/2 mt-11 whitespace-nowrap rounded-2xl border-2 px-4 py-1 font-display text-xl font-bold shadow-lg ${
              feedbackToast.positive
                ? 'border-[#15803d] bg-[#dcfce7] text-[#14532d]'
                : 'border-[#b45309] bg-[#fef3c7] text-[#78350f]'
            }`}
          >
            {feedbackToast.text}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL DOCK + 3D CAMERA CONTROLS */}
      <div className="pointer-events-none flex flex-col items-center">
        <div className="pointer-events-auto mb-1.5 flex flex-wrap items-center justify-center gap-2">
          <div
            data-testid="camera-controls"
            className="flex items-center gap-1 rounded-2xl border-2 border-[#8c5a2b] bg-[#fff8e7]/95 px-2 py-1 shadow-[0_2px_0_#b69162]"
            title="Drag meadow to rotate · Scroll to zoom"
          >
            <button
              type="button"
              tabIndex={-1}
              data-testid="cam-rotate-left"
              aria-label="Rotate meadow left"
              title="Rotate Left"
              onClick={(e) => {
                e.currentTarget.blur();
                onRotateLeft();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d6be9b] bg-[#fffbeb] text-[#5c3d1e] transition hover:bg-[#fef3c7] active:translate-y-0.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              data-testid="cam-rotate-right"
              aria-label="Rotate meadow right"
              title="Rotate Right"
              onClick={(e) => {
                e.currentTarget.blur();
                onRotateRight();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d6be9b] bg-[#fffbeb] text-[#5c3d1e] transition hover:bg-[#fef3c7] active:translate-y-0.5"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <span className="mx-0.5 h-4 w-px bg-[#d6be9b]" aria-hidden="true" />
            <button
              type="button"
              tabIndex={-1}
              data-testid="cam-zoom-in"
              aria-label="Zoom in meadow"
              title="Zoom In"
              onClick={(e) => {
                e.currentTarget.blur();
                onZoomIn();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d6be9b] bg-[#fffbeb] text-[#5c3d1e] transition hover:bg-[#fef3c7] active:translate-y-0.5"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              data-testid="cam-zoom-out"
              aria-label="Zoom out meadow"
              title="Zoom Out"
              onClick={(e) => {
                e.currentTarget.blur();
                onZoomOut();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d6be9b] bg-[#fffbeb] text-[#5c3d1e] transition hover:bg-[#fef3c7] active:translate-y-0.5"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              data-testid="cam-reset"
              aria-label="Reset meadow camera view"
              title="Reset View"
              onClick={(e) => {
                e.currentTarget.blur();
                onResetCamera();
              }}
              className="flex h-7 items-center gap-1 rounded-lg border border-[#d6be9b] bg-[#fef3c7] px-2 text-[11px] font-extrabold text-[#78350f] transition hover:bg-[#fde68a] active:translate-y-0.5"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset View</span>
            </button>
          </div>

          <button
            type="button"
            tabIndex={-1}
            data-testid="toggle-dock-btn"
            aria-expanded={!dockCollapsed}
            onClick={(e) => {
              e.currentTarget.blur();
              setDockCollapsed((c) => !c);
            }}
            className="inline-flex h-9 items-center gap-1 rounded-2xl border-2 border-[#8c5a2b] bg-[#fff8e7]/95 px-3 text-[11px] font-extrabold text-[#78350f] shadow-[0_2px_0_#b69162] transition hover:bg-[#fef3c7]"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Show Answer Pad
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Hide Answer Pad
              </>
            )}
          </button>
        </div>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full max-w-[660px] rounded-3xl border-4 border-[#8c5a2b] bg-[#fffaf0]/95 p-3 shadow-[0_6px_0_rgba(120,68,26,0.35)]">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="text-[11px] font-extrabold tracking-wide text-[#8c5a2b] uppercase">
                {choicesDisabled
                  ? 'Multiple Choice Locked (2 Mistakes) · Type Answer Active'
                  : inputMode === 'choices'
                    ? 'Multiple Choice · Tap or Press 1–4'
                    : 'Type Answer · Number Pad or Keyboard + Enter'}
              </span>
              <button
                type="button"
                tabIndex={-1}
                disabled={choicesDisabled}
                data-testid="toggle-input-mode"
                onClick={(e) => {
                  e.currentTarget.blur();
                  if (choicesDisabled) return;
                  setKeypadValue('');
                  onToggleInputMode();
                }}
                className={
                  choicesDisabled
                    ? 'cursor-not-allowed rounded-lg border border-[#d6be9b] bg-[#f5efe4] px-2.5 py-0.5 text-xs font-extrabold text-[#9c8468]'
                    : 'rounded-lg border border-[#d97706] bg-[#fef3c7] px-2.5 py-0.5 text-xs font-extrabold text-[#78350f] hover:bg-[#fde68a]'
                }
              >
                {choicesDisabled
                  ? 'Multiple Choice Locked'
                  : inputMode === 'choices'
                    ? 'Switch to Type Answer'
                    : 'Switch to Multiple Choice'}
              </button>
            </div>

            {inputMode === 'choices' ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {problem.choices.map((choice, idx) => (
                  <button
                    key={`${problem.id}-${idx}`}
                    type="button"
                    data-testid={`answer-choice-${idx}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSubmitChoice(idx);
                    }}
                    className="group relative flex min-h-[54px] items-center justify-center rounded-2xl border-2 border-[#b45309] bg-[#fffbeb] px-4 py-2.5 font-display text-2xl font-bold text-[#451a03] tabular-nums shadow-[0_4px_0_#d97706] transition hover:bg-[#fef08a] active:translate-y-0.5"
                  >
                    <span className="absolute top-1.5 left-2 rounded-md bg-[#fde68a] px-1.5 py-0.5 font-sans text-[10px] font-extrabold text-[#92400e]">
                      {idx + 1}
                    </span>
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div
                  data-testid="keypad-display"
                  className="flex min-w-[120px] items-center justify-between rounded-2xl border-2 border-[#8c5a2b] bg-white px-4 py-2 font-display text-2xl font-bold text-[#3f2208] tabular-nums"
                >
                  <span>{keypadValue || '—'}</span>
                  <button
                    type="button"
                    aria-label="Backspace"
                    onClick={() => setKeypadValue((v) => v.slice(0, -1))}
                    className="text-[#92400e] hover:text-[#451a03]"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid flex-1 grid-cols-5 gap-1.5 sm:grid-cols-10">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      data-testid={`keypad-digit-${d}`}
                      onClick={() => handleKeypadDigit(d)}
                      className="min-h-[44px] rounded-xl border-2 border-[#c8ad84] bg-[#fffbeb] font-display text-lg font-bold text-[#451a03] shadow-[0_2px_0_#c8ad84] hover:bg-[#fef08a] active:translate-y-0.5"
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="keypad-submit-btn"
                  onClick={handleKeypadSubmit}
                  className="min-h-[44px] rounded-2xl border-2 border-[#15803d] bg-[#22c55e] px-5 py-2 font-display text-base font-bold text-white shadow-[0_3px_0_#15803d] hover:bg-[#16a34a] active:translate-y-0.5"
                >
                  Check
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
