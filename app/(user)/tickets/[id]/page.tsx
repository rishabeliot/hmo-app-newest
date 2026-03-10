"use client";

import { useParams, useRouter } from "next/navigation";

const glassPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 28px",
  borderRadius: "40px",
  background: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  fontFamily: "var(--font-dm-sans)",
  cursor: "pointer",
  textDecoration: "none",
};

export default function TicketConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0D0D0D",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "62px",
        paddingBottom: "60px",
      }}
    >
      {/* Tick icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tick.png"
        alt="Success"
        width={28}
        height={28}
        style={{ marginBottom: "16px" }}
      />

      {/* "You're in. Here's your ticket." */}
      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          color: "white",
          margin: 0,
          textAlign: "center",
        }}
      >
        <span style={{ fontWeight: 700 }}>{"You're in."}</span>
        <span style={{ fontWeight: 400 }}>{" Here's your ticket."}</span>
      </p>

      {/* "See you on the floor." */}
      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          fontWeight: 400,
          color: "white",
          margin: "6px 0 0",
          textAlign: "center",
        }}
      >
        See you on the floor.
      </p>

      {/* Gap */}
      <div style={{ height: "32px" }} />

      {/* Ticket image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ticket.png"
        alt="Your ticket"
        style={{
          width: "85%",
          maxWidth: "320px",
          display: "block",
        }}
      />

      {/* Press and hold hint */}
      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          fontWeight: 400,
          color: "white",
          opacity: 0.6,
          margin: "12px 0 0",
          textAlign: "center",
        }}
      >
        Press and hold to download ticket
      </p>

      {/* Gap */}
      <div style={{ height: "12px" }} />

      {/* View QR code button */}
      <button
        onClick={() => window.open(`/api/tickets/${id}/qr`, "_blank")}
        style={{
          ...glassPill,
          fontSize: "13px",
          fontWeight: 400,
          padding: "9px 20px",
        }}
      >
        View QR code
      </button>

      {/* Gap */}
      <div style={{ height: "16px" }} />

      {/* Back to home button */}
      <button
        onClick={() => router.push("/events")}
        style={{
          ...glassPill,
          fontSize: "15px",
          fontWeight: 400,
        }}
      >
        Back to home
      </button>
    </main>
  );
}
