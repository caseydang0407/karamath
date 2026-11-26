import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showOfflineTip, setShowOfflineTip] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          void install();
        }}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border-2 border-[#b45309] bg-[#fff7e6] px-4 py-2 text-sm font-bold text-[#78350f] shadow-[0_3px_0_#d97706] transition hover:bg-[#fef3c7] active:translate-y-0.5"
      >
        <Download className="h-4 w-4" />
        {compact ? 'Install' : 'Install Offline App'}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setShowIOSGuide(true);
          }}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border-2 border-[#b45309] bg-[#fff7e6] px-4 py-2 text-sm font-bold text-[#78350f] shadow-[0_3px_0_#d97706] transition hover:bg-[#fef3c7]"
        >
          <Download className="h-4 w-4" />
          Install Offline
        </button>

        {showIOSGuide && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-3xl border-4 border-[#92400e] bg-[#fffbf0] p-6 shadow-2xl">
              <h3 className="font-display text-xl font-bold text-[#451a03]">
                Play Offline on iPhone / iPad
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#78350f]">
                1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                3. Launch Kara&apos;s Math Super Game anytime—even on airplane mode!
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl border-2 border-[#b45309] bg-[#f59e0b] py-2 text-sm font-bold text-white shadow-[0_3px_0_#b45309]"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback offline-ready indicator button on desktop browsers where beforeinstallprompt hasn't fired yet
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          setShowOfflineTip(true);
        }}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border-2 border-[#78532a] bg-[#fff9ec] px-3.5 py-2 text-xs font-bold text-[#5c3d1e] shadow-[0_3px_0_#b69162] transition hover:bg-[#fef3c7]"
      >
        <Download className="h-3.5 w-3.5" />
        {compact ? 'Offline Ready' : 'Offline Mode Info'}
      </button>

      {showOfflineTip && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl border-4 border-[#78532a] bg-[#fffbf0] p-6 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-[#451a03]">
              Ready for Offline Travel
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#78350f]">
              Kara&apos;s Math Super Game caches all 3D models, audio, and progress locally on your device.
              To install as a standalone app, use your browser&apos;s <strong>Install</strong> icon in the address bar or menu.
            </p>
            <button
              type="button"
              onClick={() => setShowOfflineTip(false)}
              className="mt-4 w-full rounded-xl border-2 border-[#b45309] bg-[#f59e0b] py-2 text-sm font-bold text-white shadow-[0_3px_0_#b45309]"
            >
              Awesome
            </button>
          </div>
        </div>
      )}
    </>
  );
};
