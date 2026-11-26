import React from 'react';
import { Award, Calendar, CheckCircle2, Download, Medal, RotateCcw, Sparkles, TrendingUp, X } from 'lucide-react';
import { DIFFICULTY_LABELS, MILESTONE_DEFS, OPERATION_LABELS } from '../game/mathEngine';
import {
  buildParentRecommendation,
  exportProgressCsv,
  getLastNDaysChartData,
} from '../game/storage';
import type { Operation, PlayerProgress } from '../game/types';

interface ParentDashboardProps {
  progress: PlayerProgress;
  onUpdateDailyGoal: (goal: number) => void;
  onLoadSampleWeek: () => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  progress,
  onUpdateDailyGoal,
  onLoadSampleWeek,
  onResetProgress,
  onClose,
}) => {

  const accuracyPct =
    progress.totalAttempted > 0
      ? Math.round((progress.totalCorrect / progress.totalAttempted) * 100)
      : 0;

  const chartDays = getLastNDaysChartData(progress, 7);
  const maxSolved = Math.max(progress.dailyGoal, ...chartDays.map((d) => d.solved), 10);
  const recommendation = buildParentRecommendation(progress);
  const ops: Operation[] = ['add', 'sub', 'mul', 'div'];

  const handleExportCsv = () => {
    const csv = exportProgressCsv(progress);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karas-math-super-game-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Parent Progress Dashboard"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-3 sm:p-5"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#8c5a2b] bg-[#fffaf0] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#e7d8c0] bg-[#fef3c7] px-5 py-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#451a03]">
              Parent Progress &amp; Learning Reports
            </h2>
            <p className="text-xs font-bold text-[#92400e]">
              Track math fluency, accuracy trends, daily habits, and learning milestones—stored in cookies &amp; offline storage on this device.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {progress.totalAttempted === 0 && (
              <button
                type="button"
                onClick={onLoadSampleWeek}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#0284c7] bg-[#e0f2fe] px-3 py-1.5 text-xs font-extrabold text-[#0c4a6e] hover:bg-[#bae6fd]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Preview Sample Week
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#15803d] bg-[#dcfce7] px-3 py-1.5 text-xs font-extrabold text-[#166534] hover:bg-[#bbf7d0]"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              aria-label="Close parent dashboard"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#8c5a2b] bg-white text-[#5c3d1e] hover:bg-[#fde68a]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="cozy-scroll flex-1 space-y-5 overflow-y-auto p-5">
          {/* Summary KPI Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-3.5">
              <div className="text-xs font-extrabold text-[#8c7355] uppercase">Problems Solved</div>
              <div className="mt-1 font-display text-3xl font-bold text-[#3f2208] tabular-nums">
                {progress.totalCorrect}
              </div>
              <div className="text-xs font-bold text-[#78532a] tabular-nums">
                of {progress.totalAttempted} attempted
              </div>
            </div>

            <div className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-3.5">
              <div className="text-xs font-extrabold text-[#8c7355] uppercase">Accuracy</div>
              <div className="mt-1 font-display text-3xl font-bold text-[#15803d] tabular-nums">
                {accuracyPct}%
              </div>
              <div className="text-xs font-bold text-[#78532a]">Overall mastery</div>
            </div>

            <div className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-3.5">
              <div className="text-xs font-extrabold text-[#8c7355] uppercase">Daily Streak</div>
              <div className="mt-1 font-display text-3xl font-bold text-[#d97706] tabular-nums">
                {progress.currentDailyStreak}d
              </div>
              <div className="text-xs font-bold text-[#78532a] tabular-nums">
                Goal: {progress.dailyGoal}/day
              </div>
            </div>

            <div className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-3.5">
              <div className="text-xs font-extrabold text-[#8c7355] uppercase">Best Combo</div>
              <div className="mt-1 font-display text-3xl font-bold text-[#0284c7] tabular-nums">
                {progress.bestCombo}
              </div>
              <div className="text-xs font-bold text-[#78532a] tabular-nums">
                {progress.totalStarsEarned} ★ lifetime
              </div>
            </div>
          </div>

          {/* Learning Focus Recommendation */}
          <div className="flex items-start gap-3 rounded-2xl border-2 border-[#86efac] bg-[#f0fdf4] p-4">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#15803d]" />
            <div>
              <div className="text-xs font-extrabold tracking-wide text-[#166534] uppercase">
                Next Learning Recommendation
              </div>
              <p className="mt-0.5 text-sm font-bold text-[#14532d]">{recommendation}</p>
            </div>
          </div>

          {/* 7-Day Practice Trend Chart + Daily Goal Setting */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-4 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#b45309]" />
                  <h3 className="font-display text-base font-bold text-[#3f2208]">
                    7-Day Practice History
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#78532a]">
                  Green = Correct · Dashed = Daily Goal ({progress.dailyGoal})
                </span>
              </div>

              <svg viewBox="0 0 560 175" className="w-full" role="img" aria-label="7-day practice chart">
                {/* Daily goal reference line */}
                {(() => {
                  const goalY = 135 - (progress.dailyGoal / maxSolved) * 110;
                  return (
                    <line
                      x1="20"
                      y1={goalY}
                      x2="540"
                      y2={goalY}
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                  );
                })()}

                {chartDays.map((day, idx) => {
                  const barW = 42;
                  const slot = 520 / 7;
                  const x = 25 + idx * slot + (slot - barW) / 2;
                  const totalH = (day.solved / maxSolved) * 110;
                  const correctH = (day.correct / maxSolved) * 110;
                  const yTotal = 135 - totalH;
                  const yCorrect = 135 - correctH;

                  return (
                    <g key={day.date}>
                      {/* Background slot bar */}
                      <rect x={x} y={25} width={barW} height={110} rx="8" fill="#f7f2e7" />
                      {/* Total attempted */}
                      {day.solved > 0 && (
                        <rect x={x} y={yTotal} width={barW} height={totalH} rx="8" fill="#fde68a" />
                      )}
                      {/* Correct solved */}
                      {day.correct > 0 && (
                        <rect x={x} y={yCorrect} width={barW} height={correctH} rx="8" fill="#22c55e" />
                      )}
                      {/* Value above bar */}
                      <text
                        x={x + barW / 2}
                        y={Math.max(16, yTotal - 5)}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="800"
                        fill="#5c3d1e"
                      >
                        {day.correct > 0 ? day.correct : ''}
                      </text>
                      {/* Weekday label */}
                      <text
                        x={x + barW / 2}
                        y={156}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="800"
                        fill={idx === 6 ? '#b45309' : '#78532a'}
                      >
                        {day.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Parent Controls Card */}
            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#e7d8c0] bg-white p-4">
              <div>
                <h3 className="font-display text-base font-bold text-[#3f2208]">
                  Daily Practice Goal
                </h3>
                <p className="mt-1 text-xs font-bold text-[#78532a]">
                  Reaching this goal unlocks a Daily Treasure Chest bonus!
                </p>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fef3c7] px-3 py-2">
                  <button
                    type="button"
                    aria-label="Decrease daily goal"
                    onClick={() => onUpdateDailyGoal(Math.max(5, progress.dailyGoal - 5))}
                    className="h-8 w-8 rounded-lg bg-white font-display text-lg font-bold text-[#78350f] shadow-sm hover:bg-[#fde68a]"
                  >
                    −
                  </button>
                  <span className="font-display text-xl font-bold text-[#451a03] tabular-nums">
                    {progress.dailyGoal} / day
                  </span>
                  <button
                    type="button"
                    aria-label="Increase daily goal"
                    onClick={() => onUpdateDailyGoal(Math.min(50, progress.dailyGoal + 5))}
                    className="h-8 w-8 rounded-lg bg-white font-display text-lg font-bold text-[#78350f] shadow-sm hover:bg-[#fde68a]"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-4 border-t border-[#f0e5d1] pt-3">
                <button
                  type="button"
                  data-testid="parent-erase-progress-btn"
                  onClick={onResetProgress}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#9a3412] hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Erase Progress
                </button>
              </div>
            </div>
          </div>

          {/* Operation Mastery Breakdown */}
          <div>
            <h3 className="mb-2.5 font-display text-lg font-bold text-[#3f2208]">
              Skill Breakdown by Operation
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ops.map((op) => {
                const info = OPERATION_LABELS[op];
                const stat = progress.operationStats[op];
                const acc =
                  stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0;
                const avgSec =
                  stat.attempted > 0
                    ? (stat.totalResponseMs / stat.attempted / 1000).toFixed(1)
                    : '—';
                return (
                  <div
                    key={op}
                    className="rounded-2xl border-2 border-[#e7d8c0] bg-white p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-base font-bold text-[#3f2208]">
                        {info.name}
                      </span>
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
                        style={{ backgroundColor: info.color }}
                      >
                        {info.symbol}
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="font-display text-2xl font-bold text-[#3f2208] tabular-nums">
                        {stat.attempted > 0 ? `${acc}%` : '—'}
                      </span>
                      <span className="text-xs font-bold text-[#78532a] tabular-nums">
                        {stat.correct}/{stat.attempted} right
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#f3ead8]">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${acc}%`, backgroundColor: info.color }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] font-bold text-[#8c7355]">
                      <span>Avg: {avgSec}s</span>
                      <span>Best: {DIFFICULTY_LABELS[stat.highestTier].name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Learning Milestones & Streak Achievement Badges */}
          <div>
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#d97706]" />
                <h3 className="font-display text-lg font-bold text-[#3f2208]">
                  Learning Milestones ({progress.unlockedMilestones.length}/{MILESTONE_DEFS.length})
                </h3>
              </div>
              <span className="rounded-lg bg-[#fef3c7] px-2.5 py-0.5 text-xs font-extrabold text-[#92400e] tabular-nums">
                Best Streak: {Math.max(progress.bestCorrectStreak ?? 0, progress.currentCorrectStreak ?? 0)} in a row
              </span>
            </div>

            {/* Achievements: 10–100 Correct Answers in a Row Badges */}
            <div
              data-testid="achievements-section"
              className="mb-4 rounded-2xl border-2 border-[#fde68a] bg-[#fffbeb] p-3.5"
            >
              <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[#92400e] uppercase">
                <Medal className="h-4 w-4 text-[#d97706]" />
                <span>Achievements · Correct Answers in a Row Badges</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {MILESTONE_DEFS.filter((m) => m.category === 'achievement').map((m) => {
                  const val = m.getValue(progress);
                  const unlocked = progress.unlockedMilestones.includes(m.id) || val >= m.target;
                  return (
                    <div
                      key={m.id}
                      data-testid={`achievement-badge-${m.target}`}
                      data-unlocked={unlocked ? 'true' : 'false'}
                      className={`flex flex-col items-center rounded-xl border-2 p-2.5 text-center transition ${
                        unlocked
                          ? 'border-[#f59e0b] bg-[#fef3c7] shadow-sm'
                          : 'border-[#e7d8c0] bg-white/80 opacity-75'
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-sm font-bold tabular-nums ${
                          unlocked
                            ? 'border-[#b45309] bg-[#facc15] text-[#451a03]'
                            : 'border-[#d6be9b] bg-[#f5efe4] text-[#8c7355]'
                        }`}
                      >
                        {m.target}
                      </div>
                      <div className="mt-1 font-display text-xs font-bold text-[#3f2208]">
                        {m.title}
                      </div>
                      <div className="text-[10px] font-extrabold text-[#78532a] tabular-nums">
                        {unlocked ? 'Badge Earned!' : `${Math.min(val, m.target)}/${m.target}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {MILESTONE_DEFS.filter((m) => m.category !== 'achievement').map((m) => {
                const val = m.getValue(progress);
                const unlocked = progress.unlockedMilestones.includes(m.id) || val >= m.target;
                const pct = Math.min(100, Math.round((val / m.target) * 100));
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border-2 p-3 ${
                      unlocked
                        ? 'border-[#22c55e] bg-[#f0fdf4]'
                        : 'border-[#e7d8c0] bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-display text-sm font-bold text-[#3f2208]">
                          {m.title}
                        </div>
                        <div className="text-[11px] font-bold text-[#78532a]">{m.description}</div>
                      </div>
                      {unlocked && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#16a34a]" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7d8c0]">
                        <div
                          className={`h-full ${unlocked ? 'bg-[#16a34a]' : 'bg-[#f59e0b]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#5c3d1e] tabular-nums">
                        {Math.min(val, m.target)}/{m.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
