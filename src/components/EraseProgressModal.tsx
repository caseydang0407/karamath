import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface EraseProgressModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const EraseProgressModal: React.FC<EraseProgressModalProps> = ({
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="erase-progress-title"
      data-testid="erase-progress-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl border-4 border-[#dc2626] bg-[#fffaf0] p-6 text-center shadow-2xl sm:p-7">
        <button
          type="button"
          aria-label="Close erase confirmation"
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#d6be9b] bg-white text-[#5c3d1e] hover:bg-[#fef3c7]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#dc2626] bg-[#fee2e2] text-[#b91c1c]">
          <AlertTriangle className="h-9 w-9" />
        </div>

        <h2
          id="erase-progress-title"
          className="font-display text-2xl font-bold text-[#451a03] sm:text-3xl"
        >
          Erase Progress
        </h2>

        <p
          data-testid="erase-progress-message"
          className="mt-2.5 text-base leading-snug font-extrabold text-[#78350f] sm:text-lg"
        >
          Are you sure to delete all progress which included upgrades?
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3.5">
          <button
            type="button"
            data-testid="erase-confirm-yes-btn"
            onClick={onConfirm}
            className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-[#991b1b] bg-[#dc2626] px-6 py-4 font-display text-2xl font-bold text-white shadow-[0_5px_0_#991b1b] transition hover:bg-[#b91c1c] active:translate-y-0.5"
          >
            Yes
          </button>
          <button
            type="button"
            data-testid="erase-confirm-no-btn"
            onClick={onCancel}
            className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-[#15803d] bg-[#22c55e] px-6 py-4 font-display text-2xl font-bold text-white shadow-[0_5px_0_#15803d] transition hover:bg-[#16a34a] active:translate-y-0.5"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};
