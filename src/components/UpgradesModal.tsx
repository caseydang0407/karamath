import React, { useMemo } from 'react';
import { Lock, X } from 'lucide-react';
import {
  getUpgradeCost,
  isUpgradeLocked,
  sortUpgradesForDisplay,
} from '../game/mathEngine';
import type { PlayerProgress, UpgradeId } from '../game/types';

interface UpgradesModalProps {
  progress: PlayerProgress;
  onBuyUpgrade: (id: UpgradeId) => void;
  onClose: () => void;
}

export const UpgradesModal: React.FC<UpgradesModalProps> = ({
  progress,
  onBuyUpgrade,
  onClose,
}) => {
  const sortedUpgrades = useMemo(() => sortUpgradesForDisplay(progress), [progress]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Meadow & Character Upgrades"
      data-testid="upgrades-modal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-4 border-[#8c5a2b] bg-[#fffaf0] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#e7d8c0] bg-[#fef3c7] px-5 py-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#451a03]">
              Meadow &amp; Character Upgrades
            </h2>
            <p className="text-xs font-bold text-[#92400e]">
              Ready upgrades jump to the top! Grow Kara first to unlock Kaitlyn, build your cottage, and expand the meadow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              data-testid="upgrades-stars-count"
              className="flex items-center gap-1.5 rounded-2xl border-2 border-[#b45309] bg-[#fffbeb] px-3 py-1.5 font-display text-lg font-bold text-[#451a03] tabular-nums"
            >
              <span>★</span>
              <span>{Math.round(progress.stars)}</span>
            </div>
            <button
              type="button"
              aria-label="Close upgrades"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#8c5a2b] bg-white text-[#5c3d1e] hover:bg-[#fde68a]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Unified Upgrade Grid (eligible upgrades sorted to top) */}
        <div className="cozy-scroll flex-1 overflow-y-auto p-5">
          <div data-testid="upgrades-grid" className="grid gap-3.5 sm:grid-cols-2">
            {sortedUpgrades.map((def) => {
              const lvl = progress.upgrades[def.id] ?? 0;
              const isMax = lvl >= def.maxLevel;
              const locked = isUpgradeLocked(progress, def.id);
              const cost = getUpgradeCost(def, lvl);
              const canAfford = !locked && !isMax && progress.stars >= cost;
              const nextStageName =
                def.stageNames && !isMax ? def.stageNames[lvl] : null;
              const currentStageName =
                def.stageNames && lvl > 0 ? def.stageNames[lvl - 1] : null;

              let zeroStageLabel = 'Current: Flat Meadow Ground';
              if (def.id === 'kara') {
                zeroStageLabel = 'Current: Tiny White Cotton Ball';
              } else if (def.id === 'kaitlyn') {
                zeroStageLabel = 'Current: Waiting for Kara (Lv 20)';
              } else if (def.id === 'orchard') {
                zeroStageLabel = 'Current: Round Brown Dirt Pad';
              }

              return (
                <div
                  key={def.id}
                  data-testid={`upgrade-card-${def.id}`}
                  className={`flex flex-col justify-between rounded-2xl border-2 p-4 shadow-sm ${
                    locked
                      ? 'border-[#e7d8c0] bg-[#fcf7ec] opacity-90'
                      : canAfford
                        ? 'border-[#22c55e] bg-[#f7fee7]'
                        : 'border-[#d6be9b] bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-[#3f2208]">
                        {def.name}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        {canAfford && (
                          <span className="rounded-lg bg-[#22c55e] px-2 py-0.5 text-[10px] font-extrabold text-white">
                            READY
                          </span>
                        )}
                        <span className="rounded-lg bg-[#fef3c7] px-2 py-0.5 text-xs font-extrabold text-[#92400e] tabular-nums">
                          Lv {lvl}/{def.maxLevel}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs font-bold text-[#78532a]">{def.tagline}</p>

                    {def.stageNames && (
                      <div className="mt-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1.5 text-xs font-extrabold text-[#92400e]">
                        {lvl === 0 ? zeroStageLabel : `Stage ${lvl}: ${currentStageName}`}
                        {!locked && nextStageName && (
                          <span className="block text-[#b45309]">
                            Next: {nextStageName}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Level Progress Bar */}
                    {def.maxLevel > 24 ? (
                      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#e7d8c0]">
                        <div
                          className="h-full rounded-full bg-[#22c55e] transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((lvl / def.maxLevel) * 100))}%`,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-0.5">
                        {Array.from({ length: def.maxLevel }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-2 flex-1 rounded-full ${
                              idx < lvl ? 'bg-[#22c55e]' : 'bg-[#e7d8c0]'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {locked ? (
                    <div
                      data-testid={`locked-upgrade-${def.id}`}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-[#e7d8c0] bg-[#f5efe4] py-2 text-xs font-extrabold text-[#9c8468]"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Finish Kara Lv 20 First ({progress.upgrades.kara ?? 0}/20)
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isMax || !canAfford}
                      data-testid={`buy-upgrade-${def.id}`}
                      onClick={() => onBuyUpgrade(def.id)}
                      className={`mt-4 w-full rounded-xl border-2 py-2 font-display text-sm font-bold transition ${
                        isMax
                          ? 'border-[#16a34a] bg-[#dcfce7] text-[#166534]'
                          : canAfford
                            ? 'border-[#b45309] bg-[#f59e0b] text-white shadow-[0_3px_0_#b45309] hover:bg-[#d97706] active:translate-y-0.5'
                            : 'cursor-not-allowed border-[#d6be9b] bg-[#f5efe4] text-[#9c8468]'
                      }`}
                    >
                      {isMax
                        ? 'Maxed Out!'
                        : nextStageName
                          ? `${def.id === 'orchard' || def.id === 'kara' || def.id === 'kaitlyn' ? 'Grow' : 'Build'} ${nextStageName} · ${cost} ★`
                          : `Upgrade · ${cost} ★`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
