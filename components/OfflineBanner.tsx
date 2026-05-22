"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline  = () => setOffline(false);

    setOffline(!navigator.onLine);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online",  onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online",  onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-gray-900/90 text-white text-sm py-2 px-4 backdrop-blur-sm">
      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
      Connection lost. Retrying...
    </div>
  );
}
