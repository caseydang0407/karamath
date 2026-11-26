import React from 'react';
import { BarChart3, Keyboard, LayoutGrid, Play, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { DIFFICULTY_LABELS, OPERATION_LABELS } from '../game/mathEngine';
import type { DifficultyLevel, Operation } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  selectedOps: Operation[];
  selectedDifficulty: DifficultyLevel;
  adaptiveDifficulty: boolean;
  selectedInputMode: 'choices' | 'keypad';
  stars: number;
  dailyStreak: number;
  muted: boolean;
  onToggleOp: (op: Operation) => void;
  onSelectAllOps: () => void;
  onSelectDifficulty: (tier: DifficultyLevel) => void;
  onToggleAdaptive: () => void;
  onSelectInputMode: (mode: 'choices' | 'keypad') => void;
  onStart: () => void;
  onOpenParentDashboard: () => void;
  onResetProgress: () => void;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedOps,
  selectedDifficulty,
  adaptiveDifficulty,
  selectedInputMode,
  stars,
  dailyStreak,
  muted,
  onToggleOp,
  onSelectAllOps,
  onSelectDifficulty,
  onToggleAdaptive,
  onSelectInputMode,
  onStart,
  onOpenParentDashboard,
  onResetProgress,
  onToggleMute,
}) => {
  const ops: Operation[] = ['add', 'sub', 'mul', 'div'];
  const tiers: DifficultyLevel[] = [1, 2, 3, 4];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar: Minimal status + Erase Progress + Mute */}
      <div className="flex items-start justify-between">
        <div className="pointer-events-auto flex items-center gap-3">
          {stars > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-[#b45309] bg-[#fff8e7] px-3.5 py-1.5 text-sm font-extrabold text-[#78350f] shadow-[0_3px_0_#d97706]">
              <span aria-hidden="true">★</span>
              <span className="tabular-nums">{stars}</span>
              <span className="text-xs font-bold text-[#92400e]">Stars</span>
            </div>
          )}
          {dailyStreak > 0 && (
            <div className="flex items-center gap-1.5 rounded-2xl border-2 border-[#15803d] bg-[#f0fdf4] px-3 py-1.5 text-sm font-extrabold text-[#166534] shadow-[0_3px_0_#22c55e]">
              <span className="tabular-nums">{dailyStreak}d</span>
              <span className="text-xs font-bold">Streak</span>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            data-testid="title-erase-progress-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onResetProgress();
            }}
            className="flex h-11 items-center gap-1.5 rounded-2xl border-2 border-[#78532a] bg-[#fff8e7] px-3 text-xs font-extrabold text-[#9a3412] shadow-[0_3px_0_#b69162] transition hover:bg-[#fef3c7] active:translate-y-0.5"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Erase Progress</span>
          </button>
          <PWAInstallButton compact />
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#78532a] bg-[#fff8e7] text-[#5c3d1e] shadow-[0_3px_0_#b69162] transition hover:bg-[#fef3c7] active:translate-y-0.5"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Left-aligned Title & Cozy Setup Card over calm negative space */}
      <div className="my-auto max-w-[450px]">
        {/* Bespoke inline SVG Title Lockup */}
        <svg
          viewBox="0 0 440 124"
          className="mb-2.5 w-full max-w-[395px] drop-shadow-[0_4px_0_rgba(77,47,22,0.28)]"
          role="img"
          aria-label="Kara's Math SUPER GAME"
        >
          <circle cx="54" cy="60" r="35" fill="#fde047" stroke="#92400e" strokeWidth="5" />
          <path
            d="M54 28 C54 10, 78 2, 86 18 C74 32, 62 34, 54 28 Z"
            fill="#4ade80"
            stroke="#166534"
            strokeWidth="4"
          />
          <path
            d="M54 28 C54 10, 30 2, 22 18 C34 32, 46 34, 54 28 Z"
            fill="#22c55e"
            stroke="#166534"
            strokeWidth="4"
          />
          <text
            x="54"
            y="72"
            textAnchor="middle"
            fontFamily="Fredoka, Nunito, sans-serif"
            fontWeight="700"
            fontSize="34"
            fill="#78350f"
          >
            +×
          </text>

          <text
            x="106"
            y="54"
            fontFamily="Fredoka, Nunito, sans-serif"
            fontWeight="700"
            fontSize="38"
            fill="#fffbeb"
            stroke="#5c3310"
            strokeWidth="9"
            paintOrder="stroke fill"
          >
            Kara&apos;s Math
          </text>
          <text
            x="108"
            y="102"
            fontFamily="Fredoka, Nunito, sans-serif"
            fontWeight="700"
            fontSize="38"
            letterSpacing="1"
            fill="#fde047"
            stroke="#5c3310"
            strokeWidth="9"
            paintOrder="stroke fill"
          >
            SUPER GAME
          </text>
        </svg>

        {/* Cozy Wooden Setup Card */}
        <div className="pointer-events-auto rounded-3xl border-4 border-[#8c5a2b] bg-[#fffaf0]/95 p-4 shadow-[0_8px_0_rgba(120,68,26,0.35)] sm:p-5">
          {/* Operations */}
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
                Pick Math Skills
              </span>
              <button
                type="button"
                onClick={onSelectAllOps}
                className="rounded-lg bg-[#fef3c7] px-2 py-0.5 text-xs font-extrabold text-[#92400e] hover:bg-[#fde68a]"
              >
                {selectedOps.length === 4 ? 'All 4 Active' : 'Mix All 4'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ops.map((op) => {
                const active = selectedOps.includes(op);
                const info = OPERATION_LABELS[op];
                const shortLabel =
                  op === 'add' ? 'Add' : op === 'sub' ? 'Sub' : op === 'mul' ? 'Times' : 'Divide';
                return (
                  <button
                    key={op}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggleOp(op)}
                    className={`flex flex-col items-center rounded-2xl border-2 py-1.5 transition active:translate-y-0.5 ${
                      active
                        ? 'border-[#b45309] bg-[#fef3c7] text-[#451a03] shadow-[0_3px_0_#d97706]'
                        : 'border-[#e7d8c0] bg-[#fcf7ec] text-[#8c7355] hover:border-[#c8ad84]'
                    }`}
                  >
                    <span className="font-display text-xl leading-none font-bold" style={{ color: active ? info.color : undefined }}>
                      {info.symbol}
                    </span>
                    <span className="mt-0.5 text-[11px] font-extrabold">{shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Tiers */}
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
                Number Level
              </span>
              <button
                type="button"
                aria-pressed={adaptiveDifficulty}
                onClick={onToggleAdaptive}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-extrabold transition ${
                  adaptiveDifficulty
                    ? 'bg-[#dcfce7] text-[#166534]'
                    : 'bg-[#f3ead8] text-[#78532a]'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {adaptiveDifficulty ? 'Auto Level Up: On' : 'Auto Level Up: Off'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tiers.map((tier) => {
                const active = selectedDifficulty === tier;
                const info = DIFFICULTY_LABELS[tier];
                return (
                  <button
                    key={tier}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectDifficulty(tier)}
                    className={`rounded-2xl border-2 px-2 py-1.5 text-left transition active:translate-y-0.5 ${
                      active
                        ? 'border-[#15803d] bg-[#dcfce7] text-[#14532d] shadow-[0_3px_0_#22c55e]'
                        : 'border-[#e7d8c0] bg-[#fcf7ec] text-[#6e563a] hover:border-[#c8ad84]'
                    }`}
                  >
                    <div className="font-display text-sm font-bold">{info.name}</div>
                    <div className="text-[10px] leading-tight font-bold opacity-85">{info.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Answer Style Picker: Multiple Choice vs Type Answer */}
          <div className="mb-3.5">
            <div className="mb-1.5 text-xs font-extrabold tracking-wide text-[#78350f] uppercase">
              Answer Style
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="input-mode-choices"
                aria-pressed={selectedInputMode === 'choices'}
                onClick={() => onSelectInputMode('choices')}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2 text-xs font-extrabold transition active:translate-y-0.5 ${
                  selectedInputMode === 'choices'
                    ? 'border-[#0369a1] bg-[#e0f2fe] text-[#0c4a6e] shadow-[0_3px_0_#0284c7]'
                    : 'border-[#e7d8c0] bg-[#fcf7ec] text-[#6e563a] hover:border-[#c8ad84]'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Multiple Choice
              </button>
              <button
                type="button"
                data-testid="input-mode-keypad"
                aria-pressed={selectedInputMode === 'keypad'}
                onClick={() => onSelectInputMode('keypad')}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2 text-xs font-extrabold transition active:translate-y-0.5 ${
                  selectedInputMode === 'keypad'
                    ? 'border-[#0369a1] bg-[#e0f2fe] text-[#0c4a6e] shadow-[0_3px_0_#0284c7]'
                    : 'border-[#e7d8c0] bg-[#fcf7ec] text-[#6e563a] hover:border-[#c8ad84]'
                }`}
              >
                <Keyboard className="h-4 w-4" />
                Type Answer
              </button>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStart();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#15803d] bg-[#22c55e] px-5 py-3 font-display text-lg font-bold text-white shadow-[0_4px_0_#15803d] transition hover:bg-[#16a34a] active:translate-y-0.5"
            >
              <Play className="h-5 w-5 fill-current" />
              Start Adventure
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenParentDashboard();
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#78532a] bg-[#fef3c7] px-4 py-3 text-sm font-extrabold text-[#5c3d1e] shadow-[0_4px_0_#b69162] transition hover:bg-[#fde68a] active:translate-y-0.5"
            >
              <BarChart3 className="h-4 w-4" />
              Parents
            </button>
          </div>
        </div>
      </div>

      {/* Single flat borderless control hint line */}
      <div className="text-center text-xs font-extrabold text-[#3f2812] drop-shadow-[0_1px_0_rgba(255,255,255,0.85)]">
        Enter/Space Start · Kara &amp; Kaitlyn · 1 ★ per Answer · S Methods · T × Table · U Upgrades · R Report
      </div>
    </div>
  );
};
