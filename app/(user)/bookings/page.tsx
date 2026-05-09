"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface BookingEvent {
  title: string;
  eventDate: string;
  venue: string | null;
  backgroundImageUrl: string | null;
}

interface Booking {
  id: string;
  eventId: string;
  bookingStatus: string;
  entryStatus: string;
  createdAt: string;
  event: BookingEvent;
}

function SkeletonCard() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "360px",
        height: "100px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.07)",
      }}
    />
  );
}

function QrModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button
          onClick={onClose}
          aria-label="Close QR"
          style={{
            position: "absolute",
            top: "-28px",
            right: "-17px",
            background: "none",
            border: "none",
            color: "#ffffff",
            fontSize: "28px",
            lineHeight: 1,
            cursor: "pointer",
            padding: 0,
            fontWeight: 300,
          }}
        >
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/tickets/${ticketId}/qr`}
          alt="QR code"
          width={240}
          height={240}
          style={{ borderRadius: "12px", display: "block" }}
        />
      </div>
    </motion.div>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrModalId, setQrModalId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) {
        setError("Failed to load bookings. Please try again.");
        return;
      }
      setBookings(await res.json());
    } catch {
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <main
      className="min-h-dvh"
      style={{
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: "80px",
      }}
    >
      {/* Logo */}
      <div style={{ paddingTop: "25px", paddingBottom: "8px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hmo-logo.png" alt="Hear Me Out" width={120} height={60} style={{ objectFit: "contain" }} />
      </div>

      {/* Nav buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "18px",
            fontWeight: 400,
            color: "white",
            textDecoration: "underline",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            minHeight: "5px",
          }}
        >
          {"< HOME"}
        </button>
        <button
          onClick={() => router.push("/events")}
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "18px",
            fontWeight: 400,
            color: "white",
            textDecoration: "underline",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            minHeight: "5px",
          }}
        >
          {"ALL EVENTS >"}
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          marginTop: "48px",
          width: "100%",
          paddingLeft: "16px",
          paddingRight: "16px",
          boxSizing: "border-box",
        }}
      >
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && (
          <div style={{ textAlign: "center", paddingTop: "40px" }}>
            <p
              style={{
                color: "rgba(255,255,255,0.8)",
                fontFamily: "var(--font-dm-sans)",
                marginBottom: "16px",
              }}
            >
              {error}
            </p>
            <button
              onClick={load}
              style={{
                padding: "12px 28px",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "white",
                fontFamily: "var(--font-dm-sans)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <p
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14px",
              color: "rgba(255,255,255,0.5)",
              marginTop: "40px",
              textAlign: "center",
            }}
          >
            No active bookings yet
          </p>
        )}

        {!loading && !error && bookings.map((booking) => (
          <div
            key={booking.id}
            style={{
              width: "100%",
              maxWidth: "360px",
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "16px",
              display: "flex",
              gap: "16px",
              alignItems: "center",
              boxSizing: "border-box",
            }}
          >
            {/* Left: event info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: "var(--font-jersey)",
                  fontSize: "20px",
                  color: "white",
                  margin: "0 0 6px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {booking.event.title}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.7)",
                  margin: "0 0 8px",
                }}
              >
                {new Date(booking.event.eventDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              {booking.event.venue && (
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  // TODO: replace with per-event map URL
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.7)",
                    textDecoration: "underline",
                  }}
                >
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M6 0C3.794 0 2 1.794 2 4c0 3 4 8 4 8s4-5 4-8c0-2.206-1.794-4-4-4zm0 5.5A1.5 1.5 0 1 1 6 2.5 1.5 1.5 0 0 1 6 5.5z"
                      fill="rgba(255,255,255,0.7)"
                    />
                  </svg>
                  {booking.event.venue}
                </a>
              )}
            </div>

            {/* Right: QR thumbnail with overlay */}
            <button
              onClick={() => setQrModalId(booking.id)}
              aria-label="View QR code"
              style={{
                flexShrink: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                position: "relative",
                width: "72px",
                height: "72px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/tickets/${booking.id}/qr`}
                alt="QR"
                width={72}
                height={72}
                style={{ borderRadius: "8px", display: "block", filter: "blur(3px)", opacity: 0.6 }}
              />
              {/* "View QR" toast overlay */}
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "20px",
                    padding: "4px 8px",
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "10px",
                    color: "white",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.04em",
                  }}
                >
                  View QR
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* QR modal */}
      <AnimatePresence>
        {qrModalId && (
          <QrModal key="qr-modal" ticketId={qrModalId} onClose={() => setQrModalId(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}
