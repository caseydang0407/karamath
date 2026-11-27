import { jsPDF } from 'jspdf';
import { DIFFICULTY_LABELS, MILESTONE_DEFS, OPERATION_LABELS } from './mathEngine';
import { buildParentRecommendation, getLastNDaysChartData } from './storage';
import type { Operation, PlayerProgress } from './types';

export function buildParentReportPdf(progress: PlayerProgress, now: Date = new Date()): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 44;
  let y = 48;

  const accuracyPct =
    progress.totalAttempted > 0
      ? Math.round((progress.totalCorrect / progress.totalAttempted) * 100)
      : 0;

  // Header Banner
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(140, 90, 43);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 62, 10, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(69, 26, 3);
  doc.text("Kara's Math SUPER GAME — Parent Learning Report", margin + 16, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(146, 64, 14);
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(`Generated ${dateStr}  |  Daily Goal: ${progress.dailyGoal} problems/day`, margin + 16, y + 46);
  y += 82;

  // Summary KPIs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(63, 34, 8);
  doc.text('Overview', margin, y);
  y += 14;

  const kpis = [
    { label: 'Problems Solved', value: `${progress.totalCorrect} / ${progress.totalAttempted}` },
    { label: 'Overall Accuracy', value: `${accuracyPct}%` },
    { label: 'Daily Streak', value: `${progress.currentDailyStreak} day(s)` },
    { label: 'Best Combo / Stars', value: `${progress.bestCombo}x / ${progress.totalStarsEarned} stars` },
  ];

  const boxW = (pageWidth - margin * 2 - 24) / 4;
  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (boxW + 8);
    doc.setFillColor(255, 250, 240);
    doc.setDrawColor(214, 190, 155);
    doc.roundedRect(x, y, boxW, 48, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 115, 85);
    doc.text(kpi.label.toUpperCase(), x + 8, y + 16);
    doc.setFontSize(12);
    doc.setTextColor(63, 34, 8);
    doc.text(kpi.value, x + 8, y + 36);
  });
  y += 68;

  // Recommendation
  const recommendation = buildParentRecommendation(progress);
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(134, 239, 172);
  const recLines = doc.splitTextToSize(`Next Recommendation: ${recommendation}`, pageWidth - margin * 2 - 24);
  const recHeight = Math.max(38, recLines.length * 13 + 18);
  doc.roundedRect(margin, y, pageWidth - margin * 2, recHeight, 6, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 83, 45);
  doc.text(recLines, margin + 12, y + 20);
  y += recHeight + 20;

  // Operation Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(63, 34, 8);
  doc.text('Skill Breakdown by Operation', margin, y);
  y += 14;

  const ops: Operation[] = ['add', 'sub', 'mul', 'div'];
  doc.setFillColor(245, 239, 228);
  doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
  doc.setFontSize(9.5);
  doc.setTextColor(92, 61, 30);
  doc.text('Operation', margin + 10, y + 13);
  doc.text('Accuracy', margin + 160, y + 13);
  doc.text('Solved / Attempted', margin + 245, y + 13);
  doc.text('Avg Speed', margin + 375, y + 13);
  doc.text('Highest Level', margin + 450, y + 13);
  y += 22;

  doc.setFont('helvetica', 'normal');
  ops.forEach((op, idx) => {
    const info = OPERATION_LABELS[op];
    const stat = progress.operationStats[op];
    const opAcc = stat.attempted > 0 ? `${Math.round((stat.correct / stat.attempted) * 100)}%` : '—';
    const avgSec =
      stat.attempted > 0 ? `${(stat.totalResponseMs / stat.attempted / 1000).toFixed(1)}s` : '—';

    if (idx % 2 === 1) {
      doc.setFillColor(255, 252, 245);
      doc.rect(margin, y - 2, pageWidth - margin * 2, 20, 'F');
    }
    doc.setTextColor(63, 34, 8);
    doc.text(info.name, margin + 10, y + 12);
    doc.text(opAcc, margin + 160, y + 12);
    doc.text(`${stat.correct} / ${stat.attempted}`, margin + 245, y + 12);
    doc.text(avgSec, margin + 375, y + 12);
    doc.text(DIFFICULTY_LABELS[stat.highestTier].name, margin + 450, y + 12);
    y += 20;
  });
  y += 18;

  // 7-Day Practice History
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(63, 34, 8);
  doc.text('Last 7 Days Practice Log', margin, y);
  y += 14;

  const days = getLastNDaysChartData(progress, 7);
  doc.setFillColor(245, 239, 228);
  doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
  doc.setFontSize(9.5);
  doc.setTextColor(92, 61, 30);
  doc.text('Date', margin + 10, y + 13);
  doc.text('Day', margin + 140, y + 13);
  doc.text('Attempted', margin + 230, y + 13);
  doc.text('Correct', margin + 330, y + 13);
  doc.text('Stars Earned', margin + 425, y + 13);
  y += 22;

  doc.setFont('helvetica', 'normal');
  days.forEach((d, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(255, 252, 245);
      doc.rect(margin, y - 2, pageWidth - margin * 2, 18, 'F');
    }
    doc.setTextColor(63, 34, 8);
    doc.text(d.date, margin + 10, y + 11);
    doc.text(d.label, margin + 140, y + 11);
    doc.text(String(d.solved), margin + 230, y + 11);
    doc.text(String(d.correct), margin + 330, y + 11);
    doc.text(String(d.starsEarned), margin + 425, y + 11);
    y += 18;
  });
  y += 18;

  // Milestones & Earned Badges
  const earnedTitles = MILESTONE_DEFS.filter(
    (m) => progress.unlockedMilestones.includes(m.id) || m.getValue(progress) >= m.target
  ).map((m) => m.title);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(63, 34, 8);
  doc.text(`Learning Milestones (${earnedTitles.length}/${MILESTONE_DEFS.length})`, margin, y);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(92, 61, 30);
  const milestoneSummary =
    earnedTitles.length > 0
      ? `Unlocked: ${earnedTitles.join(', ')}`
      : 'No milestones unlocked yet — keep practicing!';
  const wrappedMilestones = doc.splitTextToSize(milestoneSummary, pageWidth - margin * 2);
  doc.text(wrappedMilestones, margin, y);

  return doc;
}

export function buildParentReportPdfBytes(
  progress: PlayerProgress,
  now: Date = new Date()
): Uint8Array {
  const doc = buildParentReportPdf(progress, now);
  return new Uint8Array(doc.output('arraybuffer'));
}

export function downloadParentReportPdf(progress: PlayerProgress, now: Date = new Date()): void {
  const doc = buildParentReportPdf(progress, now);
  doc.save('karas-math-super-game-report.pdf');
}
