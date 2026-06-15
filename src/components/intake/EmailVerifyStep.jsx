// src/components/intake/EmailVerifyStep.jsx
import { useState } from "react";
import { ProgressDots } from "./ProgressDots.jsx";
import { Button } from "../ui/Button.jsx";
import { Turnstile, TURNSTILE_SITE_KEY } from "./Turnstile.jsx";
import { startVerification, checkVerification } from "../../lib/api.js";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Step 4: capture + verify the owner's email before spending tokens on generation. On a
// valid code it hands a verification token up via onVerified(token).
export function EmailVerifyStep({ onBack, onVerified }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetNonce, setResetNonce] = useState(0); // bumped to re-challenge Turnstile per send
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [devCode, setDevCode] = useState(null);

  const needsToken = Boolean(TURNSTILE_SITE_KEY);
  const emailValid = EMAIL_RE.test(email.trim());
  const canSend = emailValid && (!needsToken || Boolean(turnstileToken)) && !busy;
  const canVerify = /^\d{6}$/.test(code.trim()) && !busy;

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await startVerification(email.trim(), turnstileToken);
      setSent(true);
      setDevCode(res?.devCode || null);
    } catch {
      setError("We couldn't send your code. Please try again.");
    } finally {
      setBusy(false);
      setTurnstileToken(""); // single-use
      setResetNonce((n) => n + 1); // re-challenge Turnstile so a resend gets a fresh token
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const { token } = await checkVerification(email.trim(), code.trim());
      if (!token) throw new Error("no token");
      onVerified(token);
    } catch {
      setError("That code isn't right or has expired. Try again, or resend a new code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="[animation:vfade_.4s_ease_both]">
      <ProgressDots step={4} />
      <h2 className="m-0 mb-[7px] text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.02em]">
        Where should we send your plan?
      </h2>
      <p className="m-0 mb-[26px] text-[15px] text-brand-slate">
        Verify your email and we'll show your plan here and send a copy to your inbox.
      </p>

      <label htmlFor="v-email" className="mb-2.5 block text-[14px] font-bold">
        Email
      </label>
      <input
        id="v-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={sent}
        placeholder="you@yourbusiness.com"
        className="w-full rounded-[12px] border border-brand-border px-[15px] py-[13px] text-[15px] outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)] disabled:bg-[#f6f4f0]"
      />

      {/* Kept mounted across send/resend so each send re-challenges for a fresh token. */}
      <Turnstile onVerify={setTurnstileToken} resetSignal={resetNonce} />

      {sent && (
        <div className="mt-[18px]">
          <label htmlFor="v-code" className="mb-2.5 block text-[14px] font-bold">
            6-digit code{" "}
            <span className="font-medium text-[#9aa7b1]">(sent to {email.trim()})</span>
          </label>
          <input
            id="v-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && canVerify && verify()}
            placeholder="123456"
            className="w-full rounded-[12px] border border-brand-border px-[15px] py-[13px] text-[18px] tracking-[0.3em] outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)]"
          />
          <button
            onClick={sendCode}
            disabled={!canSend}
            className="mt-2.5 text-[13px] font-semibold text-brand-ocean underline disabled:opacity-50"
          >
            Resend code
          </button>
          {devCode && (
            <p className="mt-2 text-[12px] text-[#9aa7b1]">Dev code: {devCode}</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[14px] font-semibold text-brand-coral">{error}</p>}

      <div className="mt-[34px] flex justify-between gap-3">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          ← Back
        </Button>
        {sent ? (
          <Button disabled={!canVerify} onClick={verify}>
            Verify &amp; see my plan →
          </Button>
        ) : (
          <Button disabled={!canSend} onClick={sendCode}>
            Send code →
          </Button>
        )}
      </div>
    </div>
  );
}
