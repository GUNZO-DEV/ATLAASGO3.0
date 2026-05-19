import { useEffect, useState } from 'react';
import * as I from '../icons/Icon';
import { onInstallPromptChange, triggerInstall, type InstallEvent } from '../lib/pwa';

const DISMISS_KEY = 'atlaasgo-install-dismissed';

export default function InstallToast() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    return onInstallPromptChange((e) => setPrompt(e));
  }, []);

  if (!prompt || dismissed) return null;

  return (
    <div className="pwa-toast" role="status" aria-live="polite">
      <I.Lightning size={18} />
      <div style={{ flex: 1 }}>Install AtlaasGo for offline access</div>
      <button
        className="install"
        onClick={async () => {
          await triggerInstall();
        }}
      >
        Install
      </button>
      <button
        className="dismiss"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
        aria-label="Dismiss"
      >
        <I.Close size={16} />
      </button>
    </div>
  );
}
