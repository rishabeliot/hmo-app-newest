"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type PopupPhase = "email" | "otp";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function LoginPopup({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<PopupPhase>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (phase !== "otp") return;
    setCountdown(30);
    setCanResend(false);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  async function handleSendOtp() {
    if (!isValidEmail(email)) { setEmailError("Enter a valid email address"); return; }
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
      if (!res.ok) { setError(data?.error ?? "Invalid OTP"); return; }
      if (data.is_new_user) {
        router.push(`/complete-profile?email=${encodeURIComponent(email)}&redirect=/bookings`);
      } else {
        router.push("/bookings");
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
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  const otpComplete = otp.every((d) => d !== "");
  const cardHeightEmail = 203;
  const cardHeightOtp = 300;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "-12px",
            right: "-12px",
            zIndex: 10,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            fontSize: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <motion.div
          className="glass"
          style={{ width: "292px", borderRadius: "18px", overflow: "visible", position: "relative" }}
          animate={{ height: phase === "otp" ? cardHeightOtp : cardHeightEmail }}
          initial={{ height: cardHeightEmail }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div style={{ padding: "24px 20px 32px" }}>
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

            <AnimatePresence>
              {phase === "otp" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                >
                  <button
                    onClick={() => { setPhase("email"); setOtp(Array(6).fill("")); setError(""); }}
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
                      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", fontFamily: "var(--font-dm-sans)" }}>
                        Resend in {countdown}s
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p style={{ color: "#ff6b6b", fontSize: "12px", marginTop: "8px", textAlign: "center", fontFamily: "var(--font-dm-sans)" }}>
                {error}
              </p>
            )}
          </div>

          {/* Arrow button */}
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
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
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
    </motion.div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [loaderHidden, setLoaderHidden] = useState(false);

  async function handleMyBookings() {
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        router.push("/bookings");
      } else {
        setShowPopup(true);
      }
    } catch {
      setShowPopup(true);
    } finally {
      setCheckingAuth(false);
    }
  }

  return (
    <main
      className="min-h-dvh"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Loading overlay */}
      {!loaderHidden && (
        <div
          onTransitionEnd={() => { if (videoReady) setLoaderHidden(true); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: videoReady ? 0 : 1,
            transition: "opacity 0.4s ease",
            pointerEvents: videoReady ? "none" : "auto",
          }}
        >
          <style>{`
            @keyframes wave {
              0%, 60%, 100% { transform: translateY(0); }
              30% { transform: translateY(-10px); }
            }
          `}</style>
          <div style={{ display: "flex", flexDirection: "row", gap: "16px", alignItems: "center" }}>
            {[0, 0.15, 0.3].map((delay, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "var(--font-jersey)",
                  fontSize: "48px",
                  color: "white",
                  animation: `wave 1.2s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                  display: "inline-block",
                }}
              >
                •
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        onCanPlayThrough={() => setVideoReady(true)}
        onError={() => setVideoReady(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      >
        <source src="https://res.cloudinary.com/dktcgelpr/video/upload/v1778337107/Backgroundmp4_xxgpig.mp4" type="video/mp4" />
      </video>

      {/* Content overlay */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: "270px",
        }}
      >
        {/* Logo */}
        <Image src="/hmo-logo.png" alt="Hear Me Out" width={300} height={150} style={{ objectFit: "contain" }} />

        {/* Text CTAs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginTop: "2px",
          }}
        >
          <Link
            href="/events"
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "18px",
              fontWeight: 400,
              letterSpacing: "0.12em",
              color: "white",
              textDecoration: "underline",
            }}
          >
            ALL EVENTS
          </Link>
          <span
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "18px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            |
          </span>
          <button
            onClick={handleMyBookings}
            disabled={checkingAuth}
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "18px",
              fontWeight: 400,
              letterSpacing: "0.12em",
              color: checkingAuth ? "rgba(255,255,255,0.5)" : "white",
              textDecoration: "underline",
              background: "none",
              border: "none",
              cursor: checkingAuth ? "default" : "pointer",
              padding: 0,
            }}
          >
            MY BOOKINGS
          </button>
        </div>
      </div>

      {/* Login popup */}
      <AnimatePresence>
        {showPopup && <LoginPopup key="login-popup" onClose={() => setShowPopup(false)} />}
      </AnimatePresence>
    </main>
  );
}
