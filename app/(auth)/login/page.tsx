"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type Phase = "email" | "otp";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "otp") return;
    setCountdown(30);
    setCanResend(false);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  async function handleSendOtp() {
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError("");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error ?? "Failed to send OTP");
        return;
      }
      setPhase("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 350);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    setOtp(Array(6).fill(""));
    setPhase("email");
    setTimeout(() => setPhase("otp"), 50);
    await handleSendOtp();
  }

  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Invalid OTP");
        return;
      }
      if (data.is_new_user) {
        router.push(`/complete-profile?email=${encodeURIComponent(email)}`);
      } else {
        router.push("/events");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  const otpComplete = otp.every((d) => d !== "");

  const cardHeightEmail = 203;
  const cardHeightOtp = 300;

  return (
    <div className="relative min-h-dvh flex flex-col items-center">
      {/* HMO Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hmo-logo.png"
        alt="HMO"
        width={116}
        height={65}
        style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: "131px" }}
      />

      {/* Glass card */}
      <div style={{ position: "absolute", top: "205px", left: "50%", transform: "translateX(-50%)" }}>
        <motion.div
          className="glass"
          style={{ width: "292px", borderRadius: "18px", overflow: "visible", position: "relative" }}
          animate={{ height: phase === "otp" ? cardHeightOtp : cardHeightEmail }}
          initial={{ height: cardHeightEmail }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div style={{ padding: "24px 20px 32px" }}>
            {/* Description */}
            <p
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontSize: "14px",
                color: "rgba(255,255,255,0.8)",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              Add your email to verify
            </p>

            {/* Email input */}
            <input
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={phase === "otp"}
              onKeyDown={(e) => e.key === "Enter" && phase === "email" && handleSendOtp()}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: "1px dashed rgba(255,255,255,0.4)",
                color: "#ffffff",
                fontSize: "14px",
                fontFamily: "var(--font-dm-sans)",
                outline: "none",
                paddingBottom: "6px",
                opacity: phase === "otp" ? 0.5 : 1,
                boxSizing: "border-box",
              }}
            />
            {emailError && (
              <p style={{ color: "#ff6b6b", fontSize: "12px", marginTop: "4px", fontFamily: "var(--font-dm-sans)" }}>
                {emailError}
              </p>
            )}

            {/* OTP section — animated */}
            <AnimatePresence>
              {phase === "otp" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                >
                  {/* Edit email */}
                  <button
                    onClick={() => {
                      setPhase("email");
                      setOtp(Array(6).fill(""));
                      setError("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "12px",
                      fontFamily: "var(--font-dm-sans)",
                      cursor: "pointer",
                      marginTop: "10px",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    Edit email
                  </button>

                  {/* OTP boxes */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "20px", justifyContent: "center" }}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        style={{
                          width: "35px",
                          height: "44px",
                          textAlign: "center",
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.18)",
                          borderRadius: "8px",
                          color: "#ffffff",
                          fontSize: "18px",
                          fontFamily: "var(--font-dm-sans)",
                          outline: "none",
                        }}
                      />
                    ))}
                  </div>

                  {/* Resend */}
                  <div style={{ textAlign: "center", marginTop: "12px" }}>
                    {canResend ? (
                      <button
                        onClick={handleResend}
                        style={{
                          background: "none",
                          border: "none",
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "13px",
                          fontFamily: "var(--font-dm-sans)",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Resend OTP
                      </button>
                    ) : (
                      <span
                        style={{
                          color: "rgba(255,255,255,0.45)",
                          fontSize: "13px",
                          fontFamily: "var(--font-dm-sans)",
                        }}
                      >
                        Resend in {countdown}s
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <p style={{ color: "#ff6b6b", fontSize: "12px", marginTop: "8px", textAlign: "center", fontFamily: "var(--font-dm-sans)" }}>
                {error}
              </p>
            )}
          </div>

          {/* Arrow button — overlaps card bottom edge */}
          <button
            onClick={phase === "email" ? handleSendOtp : handleVerifyOtp}
            disabled={loading || (phase === "otp" && !otpComplete)}
            className="glass"
            style={{
              position: "absolute",
              bottom: "-32px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: (phase === "otp" && !otpComplete) || loading ? "not-allowed" : "pointer",
              opacity: (phase === "otp" && !otpComplete) || loading ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                style={{ animation: "spin 0.8s linear infinite" }}
              >
                <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <path d="M11 2a9 9 0 0 1 9 9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/arrow-right.png" alt="Continue" width={24} height={24} />
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
