import { useEffect, useRef } from "react";

// Public Turnstile site key. Set in .env.production (and ignored in mock `npm run dev`,
// where it's undefined so the widget is disabled and the intake stays frictionless).
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

// Renders a Cloudflare Turnstile widget and reports the token via onVerify(token).
// Calls onVerify("") when the token expires or errors so the caller can re-gate submit.
// Renders nothing when no site key is configured.
export function Turnstile({ onVerify }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: "turnstile-spin-v1",
        callback: (token) => onVerify(token),
        "expired-callback": () => onVerify(""),
        "error-callback": () => onVerify(""),
      });
    };

    let pollId;
    if (window.turnstile) {
      render();
    } else {
      pollId = setInterval(() => {
        if (window.turnstile) {
          clearInterval(pollId);
          render();
        }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onVerify]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={containerRef} className="mt-6" />;
}
