"use client";

import { useEffect, useRef, useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { identifyUser, track } from "@/lib/analytics";

interface Props {
  onSuccess: () => void;
}

export default function PhoneLogin({ onSuccess }: Props) {
  const [digits, setDigits]         = useState("");   // digits after +212
  const [code, setCode]             = useState("");
  const [step, setStep]             = useState<"phone" | "otp">("phone");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const confirmRef                  = useRef<ConfirmationResult | null>(null);
  const recaptchaRef                = useRef<RecaptchaVerifier | null>(null);

  // Invisible reCAPTCHA — required by Firebase Phone Auth
  useEffect(() => {
    if (recaptchaRef.current) return;
    recaptchaRef.current = new RecaptchaVerifier(auth, "ph-recaptcha", {
      size: "invisible",
    });
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  /** Strip leading zero then prepend +212 (Morocco) */
  const fullNumber = () => `+212${digits.replace(/^0+/, "")}`;

  const sendCode = async () => {
    if (digits.length < 9) {
      setError("Enter a valid Moroccan number (9 digits after the prefix).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      confirmRef.current = await signInWithPhoneNumber(
        auth,
        fullNumber(),
        recaptchaRef.current!
      );
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
      // Reset reCAPTCHA so the user can retry
      recaptchaRef.current?.clear();
      recaptchaRef.current = new RecaptchaVerifier(auth, "ph-recaptcha", { size: "invisible" });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) { setError("Enter the 6-digit code."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await confirmRef.current!.confirm(code);
      const user   = result.user;

      // Create Firestore profile if first sign-in
      const ref      = doc(db, "users", user.uid);
      const existing = await getDoc(ref);
      if (!existing.exists()) {
        await setDoc(ref, {
          phone:     user.phoneNumber,
          createdAt: new Date().toISOString(),
          role:      "customer",
        });
      }

      identifyUser(user.uid, { phone: user.phoneNumber ?? undefined, role: "customer" });
      track("user_registered", { uid: user.uid, email: user.phoneNumber ?? "" });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Invisible reCAPTCHA mount point */}
      <div id="ph-recaptcha" />

      {step === "phone" ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moroccan Phone Number
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-atlaasgo focus-within:border-emerald-atlaasgo">
              <span className="flex items-center px-3 bg-gray-50 border-r border-gray-300 text-gray-500 text-sm font-mono select-none">
                🇲🇦 +212
              </span>
              <input
                type="tel"
                value={digits}
                onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="6XXXXXXXX"
                className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white"
                inputMode="numeric"
                autoComplete="tel-national"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              e.g. 0612345678 → enter 612345678
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="button"
            onClick={sendCode}
            disabled={loading || digits.length < 9}
            className="btn-primary w-full"
          >
            {loading ? "Sending code…" : "Send Verification Code"}
          </button>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              6-Digit Code
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Sent to {fullNumber()}
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-emerald-atlaasgo"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="button"
            onClick={verifyCode}
            disabled={loading || code.length !== 6}
            className="btn-primary w-full"
          >
            {loading ? "Verifying…" : "Confirm & Sign In"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("phone"); setCode(""); setError(""); }}
            className="text-sm text-gray-400 hover:text-gray-600 text-center"
          >
            ← Use a different number
          </button>
        </>
      )}
    </div>
  );
}
