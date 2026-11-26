import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl border-2 border-[#b45309] bg-[#fef3c7] px-3 py-1.5 text-xs font-extrabold text-[#78350f] shadow-md"
    >
      <WifiOff className="h-3.5 w-3.5 text-[#d97706]" />
      <span>Offline Mode — Playing with local save</span>
    </div>
  );
};
