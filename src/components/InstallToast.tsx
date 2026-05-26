/**
 * Cross-platform PWA install nudge.
 *
 * - Android/Chrome/Edge: uses the native `beforeinstallprompt` event.
 * - iOS Safari: that event doesn't exist, so we show a custom card
 *   teaching users to tap Share → Add to Home Screen.
 * - Both hide once dismissed (per-device localStorage) or once the app
 *   is running standalone.
 */
import { useEffect, useState } from 'react';
import * as I from '../icons/Icon';
import { onInstallPromptChange, triggerInstall, type InstallEvent } from '../lib/pwa';

const DISMISS_KEY = 'atlaasgo-install-dismissed';
const IOS_DISMISS_KEY = 'atlaasgo-ios-install-dismissed';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallToast() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );
  const [iosDismissed, setIosDismissed] = useState<boolean>(
    () => localStorage.getItem(IOS_DISMISS_KEY) === '1',
  );
  const [showIosSheet, setShowIosSheet] = useState(false);
  const standalone = isStandalone();
  const ios = isIos();

  useEffect(() => {
    return onInstallPromptChange((e) => setPrompt(e));
  }, []);

  // Already running as installed PWA → no nudge
  if (standalone) return null;

  // iOS Safari: show our custom nudge after 4s on first visit
  useEffect(() => {
    if (!ios || iosDismissed) return;
    const t = setTimeout(() => setShowIosSheet(true), 4000);
    return () => clearTimeout(t);
  }, [ios, iosDismissed]);

  // ── Android / Chrome / Edge ──────────────────────────────────────
  if (prompt && !dismissed) {
    return (
      <div className="pwa-toast" role="status" aria-live="polite">
        <I.Lightning size={18} />
        <div style={{ flex: 1 }}>Install AtlaasGo for offline access</div>
        <button className="install" onClick={async () => { await triggerInstall(); }}>
          Install
        </button>
        <button
          className="dismiss"
          onClick={() => { localStorage.setItem(DISMISS_KEY, '1'); setDismissed(true); }}
          aria-label="Dismiss"
        >
          <I.Close size={16} />
        </button>
      </div>
    );
  }

  // ── iOS bottom-sheet nudge ───────────────────────────────────────
  if (ios && showIosSheet && !iosDismissed) {
    return (
      <div
        className="pwa-ios-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-ios-title"
      >
        <button
          className="pwa-ios-close"
          onClick={() => {
            localStorage.setItem(IOS_DISMISS_KEY, '1');
            setIosDismissed(true);
            setShowIosSheet(false);
          }}
          aria-label="Close"
        >
          <I.Close size={14} />
        </button>
        <div style={{ fontSize: 36, marginBottom: 6 }}>📲</div>
        <h3 id="pwa-ios-title" style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 800,
          fontSize: 18,
          margin: '0 0 4px',
          color: 'var(--fg)',
        }}>
          Install AtlaasGo
        </h3>
        <p style={{ color: 'var(--fg-soft)', fontSize: 13, margin: '0 0 14px', lineHeight: 1.4 }}>
          Faster ordering, offline cart, push updates. 3 taps to install:
        </p>
        <ol className="pwa-ios-steps">
          <li>
            Tap <span className="pwa-ios-kbd">Share</span>
            <span className="pwa-ios-share-icon" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12M6 9l6-6 6 6M5 21h14" />
              </svg>
            </span>
            in Safari
          </li>
          <li>Scroll → <strong>Add to Home Screen</strong></li>
          <li>Tap <strong>Add</strong> in the top right</li>
        </ol>
        <style>{`
          .pwa-ios-sheet {
            position: fixed;
            left: 14px; right: 14px;
            bottom: calc(var(--tabbar-h) + var(--safe-bot) + 14px);
            z-index: 100;
            padding: 18px 18px 22px;
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 20px;
            box-shadow: 0 20px 48px -12px rgba(0,0,0,0.30);
            animation: pwa-ios-up 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes pwa-ios-up {
            from { transform: translateY(120%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .pwa-ios-close {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 28px; height: 28px;
            border-radius: 50%;
            background: rgba(0,0,0,0.06);
            color: var(--fg-soft);
            border: 0;
            display: grid; place-items: center;
            cursor: pointer;
          }
          .pwa-ios-steps {
            margin: 0;
            padding-left: 22px;
            font-size: 13px;
            color: var(--fg);
            line-height: 1.7;
          }
          .pwa-ios-steps li { margin-bottom: 4px; }
          .pwa-ios-kbd {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            margin: 0 4px;
            background: rgba(0,0,0,0.06);
            border-radius: 6px;
            font-weight: 700;
            font-size: 11.5px;
            color: var(--fg);
          }
          .pwa-ios-share-icon {
            display: inline-flex;
            color: var(--primary);
            margin: 0 4px;
            vertical-align: -2px;
          }
        `}</style>
      </div>
    );
  }

  return null;
}
