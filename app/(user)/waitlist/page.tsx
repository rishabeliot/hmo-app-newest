"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "307px",
  height: "52px",
  borderRadius: "49px",
  border: "1px solid rgba(255,255,255,0.13)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  background: "transparent",
  color: "white",
  fontFamily: "var(--font-dm-sans)",
  fontSize: "14px",
  outline: "none",
  paddingLeft: "20px",
  paddingRight: "20px",
  boxSizing: "border-box" as const,
};

function WaitlistForm() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  const [name, setName] = useState("");
  const [igHandle, setIgHandle] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.email) setUserEmail(data.email); })
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ig_handle: igHandle.trim() || undefined,
          email: userEmail || undefined,
          event_id: eventId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  if (!eventId) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          backgroundImage: "url('/waitlist.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-jersey)",
            fontSize: "36px",
            fontWeight: 400,
            color: "white",
            textAlign: "center",
            margin: "0 0 12px",
          }}
        >
          No event selected
        </p>
        <p
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "16px",
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            margin: 0,
          }}
        >
          Please use the link from the events page to register.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundImage: "url('/waitlist.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        paddingTop: "45px",
        paddingBottom: "60px",
      }}
    >
      {/* Heading */}
      <h1
        style={{
          fontFamily: "var(--font-jersey)",
          fontSize: "55px",
          fontWeight: 400,
          color: "white",
          lineHeight: 1,
          margin: 0,
          paddingLeft: "53px",
        }}
      >
        Drop your details
      </h1>

      {/* Subheading */}
      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "21px",
          fontWeight: 400,
          color: "rgba(255,255,255,0.85)",
          maxWidth: "280px",
          marginTop: "8px",
          marginBottom: 0,
          paddingLeft: "53px",
        }}
      >
        We&apos;ll hit you up as soon as a spot opens up.
      </p>

      <div style={{ height: "32px" }} />

      {submitted ? (
        /* Success state */
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tick.png"
            alt="Success"
            width={28}
            height={28}
            style={{ display: "block", margin: "20px auto 0" }}
          />
          <p
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "18px",
              fontWeight: 700,
              textAlign: "center",
              color: "white",
              marginTop: "12px",
              marginBottom: 0,
            }}
          >
            You&apos;re on the list!
          </p>
          <p
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14px",
              fontWeight: 400,
              textAlign: "center",
              color: "rgba(255,255,255,0.7)",
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            We&apos;ll hit you up when a spot opens up.
          </p>
          <div style={{ height: "40px" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/waitlist_logo.png"
            alt="HMO"
            width={180}
            style={{ display: "block", marginLeft: "auto", marginRight: "auto" }}
          />
        </>
      ) : (
        /* Form state */
        <>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "307px" }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="@your_instagram_handle"
                value={igHandle}
                onChange={(e) => setIgHandle(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ height: "24px" }} />

            <div style={{ width: "307px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "107px",
                height: "50px",
                borderRadius: "49px",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                fontFamily: "var(--font-dm-sans)",
                fontSize: "17px",
                color: "white",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "..." : "Submit"}
            </button>
            </div>

            {error && (
              <p
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  color: "#ff6b6b",
                  margin: "8px 0 0",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}
          </div>

          <div style={{ height: "40px" }} />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/waitlist_logo.png"
            alt="HMO"
            width={180}
            style={{ display: "block", marginLeft: "auto", marginRight: "auto" }}
          />
        </>
      )}
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense>
      <WaitlistForm />
    </Suspense>
  );
}
