"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 14;

function dismissedRecently(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * A subtle, dismissible "install app" banner.
 *  • Android / desktop Chrome: one-tap install via beforeinstallprompt.
 *  • iOS Safari: shows the "Share → Add to Home Screen" steps (iOS has no
 *    programmatic install).
 * Renders nothing once installed or recently dismissed.
 */
export function InstallPrompt({ appName = "the app" }: { appName?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone() || dismissedRecently()) return;

    const ua = window.navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = !/crios|fxios|edgios|opios/i.test(ua);

    if (isIOS && isSafari) {
      setIos(true);
      setShow(true);
      return;
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label={`Install ${appName}`}
      style={{
        position: "fixed",
        left: "50%",
        bottom: "max(16px, env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 60,
        width: "min(440px, calc(100vw - 24px))",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 16,
        color: "#f2f0f7",
        background: "linear-gradient(180deg, rgba(24,25,33,.94), rgba(13,14,20,.94))",
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "0 24px 60px -24px rgba(0,0,0,.7)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 40,
          height: 40,
          flex: "0 0 auto",
          borderRadius: 11,
          background: "hsl(var(--brand) / 0.16)",
          color: "hsl(var(--brand))",
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="6" y="2" width="12" height="20" rx="3" />
          <path d="M11 18h2" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>
          Install {appName}
        </div>
        {ios ? (
          <div style={{ fontSize: 12, color: "#aab4cc", marginTop: 2, lineHeight: 1.4 }}>
            Tap the Share icon{" "}
            <svg
              aria-hidden
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "inline", verticalAlign: "-2px" }}
            >
              <path d="M12 16V4" />
              <path d="m8 8 4-4 4 4" />
              <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            </svg>{" "}
            then <b style={{ color: "#dbe2ef" }}>Add to Home Screen</b>.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#aab4cc", marginTop: 2, lineHeight: 1.4 }}>
            Add it to your home screen — opens like a real app.
          </div>
        )}
      </div>

      {!ios && (
        <button
          onClick={install}
          style={{
            flex: "0 0 auto",
            border: "none",
            cursor: "pointer",
            borderRadius: 999,
            padding: "9px 16px",
            fontSize: 13.5,
            fontWeight: 700,
            color: "#fff",
            background: "hsl(var(--brand))",
            fontFamily: "inherit",
          }}
        >
          Install
        </button>
      )}

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          flex: "0 0 auto",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#8892a8",
          padding: 4,
          lineHeight: 0,
          borderRadius: 8,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
