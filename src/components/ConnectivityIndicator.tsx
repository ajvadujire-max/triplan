import React from 'react';
import { useConnectivity } from '../lib/useConnectivity';

export function ConnectivityIndicator() {
  const isOnline = useConnectivity();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-16 w-full bg-amber-500 text-white text-xs py-1 px-3 text-center z-50">
      You're offline. Previously synced trip information is still available.
    </div>
  );
}
