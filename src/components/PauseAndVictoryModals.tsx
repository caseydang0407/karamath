import React from 'react';
import { BarChart3, Home, Play, RotateCcw, Store, Trash2, Trophy } from 'lucide-react';
import type { RoundSummary } from '../game/types';
import { ConfettiOverlay } from './ConfettiOverlay';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenParentDashboard: () => void;
  onResetProgress?: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenParentDashboard,
  onResetProgress,
  onReturnTitle,
}) => {

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 p-4"
    >
      <div className="w-full max-w-sm rounded-3xl border-4 border-[#8c5a2b] bg-[#fffaf0] p-6 text-center shadow-2xl">
        <h2 className="font-display text-3xl font-bold text-[#451a03]">Meadow Break</h2>
        <p className="mt-1 text-sm font-bold text-[#78532a]">
          Your stars and streak are safely tucked away.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#15803d] bg-[#22c55e] py-3 font-display text-lg font-bold text-white shadow-[0_4px_0_#15803d] hover:bg-[#16a34a]"
          >
            <Play className="h-5 w-5 fill-current" />
            Resume Adventure
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#b45309] bg-[#fef3c7] py-2.5 font-display text-base font-bold text-[#78350f] shadow-[0_3px_0_#d97706] hover:bg-[#fde68a]"
          >
            <RotateCcw className="h-4 w-4" />
            Restart Round
          </button>

          <button
            type="button"
            onClick={onOpenParentDashboard}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#78532a] bg-white py-2.5 font-display text-base font-bold text-[#5c3d1e] hover:bg-[#fef3c7]"
          >
            <BarChart3 className="h-4 w-4" />
            Parent Reports
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#d6be9b] bg-[#fcf7ec] py-2.5 text-sm font-extrabold text-[#78532a] hover:bg-[#f3ead8]"
          >
            <Home className="h-4 w-4" />
            Title Screen
          </button>

          {onResetProgress && (
            <div className="mt-1 border-t border-[#e7d8c0] pt-2.5">
              <button
                type="button"
                data-testid="pause-erase-progress-btn"
                onClick={onResetProgress}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold text-[#9a3412] hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Erase Progress
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  summary: RoundSummary;
  onPlayNextRound: () => void;
  onOpenUpgrades: () => void;
  onReturnTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  summary,
  onPlayNextRound,
  onOpenUpgrades,
  onReturnTitle,
}) => {
  const accuracy =
    summary.questionsAnswered > 0
      ? Math.round((summary.correctCount / summary.questionsAnswered) * 100)
      : 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Round Complete"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 p-4"
    >
      <ConfettiOverlay />
      <div className="relative z-[36] w-full max-w-md rounded-3xl border-4 border-[#b45309] bg-[#fffaf0] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#b45309] bg-[#fde047] text-[#78350f]">
          <Trophy className="h-8 w-8" />
        </div>
        <h2 className="font-display text-3xl font-bold text-[#451a03]">Round Complete!</h2>
        <p className="mt-1 text-sm font-bold text-[#78532a]">
          Kara the Bunny &amp; Kaitlyn the Chick are cheering for your awesome math skills!
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-3">
            <div className="text-[11px] font-extrabold text-[#8c7355] uppercase">Stars</div>
            <div className="font-display text-2xl font-bold text-[#d97706] tabular-nums">
              +{summary.starsEarned}
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-3">
            <div className="text-[11px] font-extrabold text-[#8c7355] uppercase">Accuracy</div>
            <div className="font-display text-2xl font-bold text-[#15803d] tabular-nums">
              {accuracy}%
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-3">
            <div className="text-[11px] font-extrabold text-[#8c7355] uppercase">Best Combo</div>
            <div className="font-display text-2xl font-bold text-[#0284c7] tabular-nums">
              {summary.bestCombo}
            </div>
          </div>
        </div>

        {summary.chestBonus > 0 && (
          <div className="mt-3 rounded-2xl border-2 border-[#22c55e] bg-[#dcfce7] px-3 py-2 text-xs font-extrabold text-[#14532d]">
            Daily Goal Treasure Chest Unlocked: +{summary.chestBonus} Bonus Stars!
          </div>
        )}

        {(summary.cottageBonus ?? 0) > 0 && (
          <div className="mt-2 rounded-2xl border-2 border-[#f59e0b] bg-[#fef3c7] px-3 py-2 text-xs font-extrabold text-[#78350f]">
            Cozy Cottage Round Bonus: +{summary.cottageBonus} Bonus Stars!
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onPlayNextRound}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#15803d] bg-[#22c55e] py-3 font-display text-lg font-bold text-white shadow-[0_4px_0_#15803d] hover:bg-[#16a34a]"
          >
            <Play className="h-5 w-5 fill-current" />
            Play Next Round
          </button>

          <button
            type="button"
            onClick={onOpenUpgrades}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#b45309] bg-[#fef3c7] py-2.5 font-display text-base font-bold text-[#78350f] shadow-[0_3px_0_#d97706] hover:bg-[#fde68a]"
          >
            <Store className="h-4 w-4" />
            Visit Garden Upgrades
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#d6be9b] bg-[#fcf7ec] py-2 text-sm font-extrabold text-[#78532a] hover:bg-[#f3ead8]"
          >
            <Home className="h-4 w-4" />
            Change Math Skills
          </button>
        </div>
      </div>
    </div>
  );
};
