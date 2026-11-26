import React, { useState } from 'react';
import { Grid3X3, X } from 'lucide-react';
import type { MathProblem } from '../game/types';

interface MultiplicationTableModalProps {
  problem?: MathProblem;
  onClose: () => void;
}

const FACTORS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const MultiplicationTableModal: React.FC<MultiplicationTableModalProps> = ({
  problem,
  onClose,
}) => {
  const initialRow =
    problem?.operation === 'mul' && problem.a >= 0 && problem.a <= 10 ? problem.a : 3;
  const initialCol =
    problem?.operation === 'mul' && problem.b >= 0 && problem.b <= 10 ? problem.b : 4;

  const [selectedRow, setSelectedRow] = useState<number>(initialRow);
  const [selectedCol, setSelectedCol] = useState<number>(initialCol);

  const product = selectedRow * selectedCol;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="0 to 10 Multiplication Table"
      data-testid="multiplication-table-modal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-3 sm:p-5"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-4 border-[#8c5a2b] bg-[#fffaf0] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#e7d8c0] bg-[#fef3c7] px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-[#2563eb]" />
              <h2 className="font-display text-2xl font-bold text-[#451a03]">
                0–10 Multiplication Table
              </h2>
            </div>
            <p className="text-xs font-bold text-[#92400e]">
              Tap any square to highlight its row, column, and multiplication fact!
            </p>
          </div>
          <button
            type="button"
            aria-label="Close multiplication table"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#8c5a2b] bg-white text-[#5c3d1e] hover:bg-[#fde68a]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Fact Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#e7d8c0] bg-[#eff6ff] px-5 py-2.5">
          <div
            data-testid="mult-table-active-fact"
            className="font-display text-xl font-bold text-[#1e3a8a] tabular-nums"
          >
            {selectedRow} × {selectedCol} = {product}
          </div>
          <div className="text-xs font-extrabold text-[#1d4ed8]">
            {selectedRow === 0 || selectedCol === 0
              ? 'Zero Rule: Any number × 0 always equals 0!'
              : `${selectedRow} equal groups of ${selectedCol} stars = ${product}`}
          </div>
        </div>

        {/* 0-10 Matrix */}
        <div className="cozy-scroll flex-1 overflow-auto p-4">
          <div className="mx-auto min-w-[480px] max-w-[680px]">
            <div
              className="grid gap-1 text-center"
              style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}
            >
              {/* Top-left corner symbol */}
              <div className="flex h-9 items-center justify-center rounded-lg border border-[#d6be9b] bg-[#fef3c7] font-display text-sm font-bold text-[#92400e]">
                ×
              </div>
              {FACTORS.map((c) => (
                <button
                  key={`col-hdr-${c}`}
                  type="button"
                  onClick={() => setSelectedCol(c)}
                  className={`flex h-9 items-center justify-center rounded-lg border font-display text-sm font-bold tabular-nums transition ${
                    selectedCol === c
                      ? 'border-[#1d4ed8] bg-[#2563eb] text-white'
                      : 'border-[#d6be9b] bg-[#fef3c7] text-[#78350f] hover:bg-[#fde68a]'
                  }`}
                >
                  {c}
                </button>
              ))}

              {FACTORS.map((r) => (
                <React.Fragment key={`row-${r}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedRow(r)}
                    className={`flex h-9 items-center justify-center rounded-lg border font-display text-sm font-bold tabular-nums transition ${
                      selectedRow === r
                        ? 'border-[#1d4ed8] bg-[#2563eb] text-white'
                        : 'border-[#d6be9b] bg-[#fef3c7] text-[#78350f] hover:bg-[#fde68a]'
                    }`}
                  >
                    {r}
                  </button>
                  {FACTORS.map((c) => {
                    const isExact = selectedRow === r && selectedCol === c;
                    const inCrosshair = selectedRow === r || selectedCol === c;
                    const isProblemCell =
                      problem?.operation === 'mul' && problem.a === r && problem.b === c;

                    return (
                      <button
                        key={`cell-${r}-${c}`}
                        type="button"
                        data-testid={`mult-cell-${r}-${c}`}
                        aria-label={`${r} times ${c} equals ${r * c}`}
                        onClick={() => {
                          setSelectedRow(r);
                          setSelectedCol(c);
                        }}
                        className={`flex h-9 items-center justify-center rounded-lg border font-display text-sm font-bold tabular-nums transition ${
                          isExact
                            ? 'scale-105 border-[#15803d] bg-[#22c55e] text-white shadow-sm'
                            : isProblemCell
                              ? 'border-[#d97706] bg-[#fef08a] text-[#78350f]'
                              : inCrosshair
                                ? 'border-[#93c5fd] bg-[#dbeafe] text-[#1e3a8a]'
                                : 'border-[#e7d8c0] bg-white text-[#3f2208] hover:bg-[#fef9c3]'
                        }`}
                      >
                        {r * c}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
