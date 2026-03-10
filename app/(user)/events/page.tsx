"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  isAdmin: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  venue: string | null;
  backgroundImageUrl: string | null;
  youtubeUrl: string | null;
  razorpayItemId: string | null;
  isTicketingClosed: boolean;
  isUpcoming: boolean;
  createdAt: string;
  isAllowed: boolean;
  isBooked: boolean;
}

interface EventsData {
  upcoming: Event | null;
  past: Event[];
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "11px",
          color: "rgba(255,255,255,0.5)",
          margin: "0 0 4px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "16px",
          color: "white",
          margin: 0,
          wordBreak: "break-all",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ProfilePopup({ user, onClose }: { user: User; onClose: () => void }) {
  const dob = user.dateOfBirth
    ? new Date(user.dateOfBirth).toLocaleDateString("en-IN")
    : "—";

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
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "24px 24px 0 0",
          padding: "32px 28px 52px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close profile"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
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
        <h2
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 700,
            fontSize: "20px",
            color: "white",
            margin: "0 0 28px",
          }}
        >
          Profile
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <ProfileField label="Full Name" value={user.name ?? "—"} />
          <ProfileField label="Email" value={user.email} />
          <ProfileField label="Phone Number" value={user.phoneNumber ?? "—"} />
          <ProfileField label="Date of Birth" value={dob} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function UpcomingCard({ event }: { event: Event }) {
  const href = event.isAllowed
    ? `/events/${event.id}/welcome`
    : `/waitlist?event=${event.id}`;

  const pillBase: React.CSSProperties = {
    display: "block",
    padding: "10px 16px",
    borderRadius: "20px",
    backdropFilter: "blur(1px)",
    WebkitBackdropFilter: "blur(2px)",
    border: "0.5px solid rgba(255,255,255,0.1)",
    fontFamily: "var(--font-dm-sans)",
    fontSize: "13px",
    fontWeight: 400,
    whiteSpace: "nowrap" as const,
  };

  const ctaNode = event.isBooked ? (
    <div style={{ ...pillBase, color: "rgba(255,255,255,0.5)", cursor: "default", opacity: 0.5 }}>
      Booked ✓
    </div>
  ) : event.isTicketingClosed ? (
    <div style={{ ...pillBase, color: "rgba(255,255,255,0.4)", cursor: "default", opacity: 0.5 }}>
      Sold Out
    </div>
  ) : (
    <Link href={href} style={{ ...pillBase, textDecoration: "none" }}>
      {event.isAllowed ? "Buy ticket" : "Register"}
    </Link>
  );

  return (
    <div
      style={{
        width: "292px",
        height: "258px",
        borderRadius: "18px",
        backgroundImage: event.backgroundImageUrl
          ? `url('${event.backgroundImageUrl}')`
          : "none",
        backgroundColor: "#120830",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Dark gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* UPCOMING tag - top left */}
      <div style={{ position: "absolute", top: "12px", left: "12px" }}>
        <span
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "10px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "0.08em",
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "0.5px solid rgba(255,255,255,0.3)",
            borderRadius: "20px",
            padding: "4px 10px",
          }}
        >
          UPCOMING
          <span style={{ opacity: 0.5, margin: "0 6px" }}>|</span>
          {new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      {/* Title + venue */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "var(--font-jersey)",
              fontSize: "50px",
              color: "white",
              margin: 0,
              whiteSpace: "nowrap",
              lineHeight: 0.7,
            }}
          >
            {event.title}
          </p>
          {event.venue && (
            <p
              style={{
                fontFamily: "var(--font-jersey)",
                fontSize: "15px",
                color: "rgba(255,255,255,0.8)",
                margin: "0 0 0",
                textAlign: "right",
              }}
            >
              at {event.venue}
            </p>
          )}
        </div>
      </div>

      {/* CTA button */}
      <div style={{ position: "absolute", bottom: "12px", right: "12px" }}>
        {ctaNode}
      </div>
    </div>
  );
}

function PastEventCard({ event }: { event: Event }) {
  const handleClick = () => {
    if (event.youtubeUrl) window.open(event.youtubeUrl, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      style={{
        width: "300px",
        height: "47px",
        borderRadius: "83px",
        backgroundImage: event.backgroundImageUrl
          ? `url('${event.backgroundImageUrl}')`
          : "none",
        backgroundColor: "#120830",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        overflow: "hidden",
        cursor: event.youtubeUrl ? "pointer" : "default",
        border: "none",
        padding: 0,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
        }}
      />
      <span
        style={{
          position: "relative",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          color: "rgba(255,255,255,0.8)",
          zIndex: 1,
        }}
      >
        {event.title}
      </span>
    </button>
  );
}

function SkeletonCard({
  width,
  height,
  radius,
}: {
  width: number;
  height: number;
  radius: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: "rgba(255,255,255,0.07)",
      }}
    />
  );
}

export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [eventsData, setEventsData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, eventsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/events"),
      ]);
      if (!userRes.ok || !eventsRes.ok) {
        setError("Failed to load. Please try again.");
        return;
      }
      const [userData, eventsPayload] = await Promise.all([
        userRes.json(),
        eventsRes.json(),
      ]);
      setUser(userData);
      setEventsData(eventsPayload);
    } catch {
      setError("Failed to load. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <main
      className="min-h-dvh"
      style={{
        backgroundImage: "url('/purple2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        paddingBottom: "80px",
      }}
    >
      {/* Top bar */}
      <div style={{ paddingTop: "28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingRight: "11px",
          }}
        >
          <button
            onClick={() => setShowProfile(true)}
            aria-label="Open profile"
            style={{
              width: "44px",
              height: "44px",
              minWidth: "44px",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="14" cy="10" r="5" stroke="white" strokeWidth="2" />
              <path
                d="M4 26c0-5.523 4.477-10 10-10s10 4.477 10 10"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p
          style={{
            fontFamily: "var(--font-jersey)",
            fontSize: "40px",
            color: "white",
            margin: "8px 0 0",
            paddingLeft: "38px",
            lineHeight: 1.1,
            minHeight: "56px",
          }}
        >
          {!loading && firstName ? `Are you ready, ${firstName}?` : ""}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: "60px 38px", textAlign: "center" }}>
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

      {!error && (
        <>
          {/* Upcoming section */}
          <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {loading ? (
              <SkeletonCard width={292} height={258} radius={18} />
            ) : eventsData?.upcoming ? (
              <UpcomingCard event={eventsData.upcoming} />
            ) : (
              <div
                style={{
                  width: "292px",
                  height: "80px",
                  borderRadius: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    color: "rgba(255,255,255,0.6)",
                    margin: 0,
                    fontSize: "14px",
                  }}
                >
                  No upcoming events
                </p>
              </div>
            )}
          </div>

          {/* Past events section */}
          <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 600,
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.4em",
                margin: "0 0 16px",
              }}
            >
              PAST EVENTS
            </p>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[0, 1, 2].map((i) => (
                  <SkeletonCard key={i} width={300} height={47} radius={83} />
                ))}
              </div>
            ) : eventsData?.past.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {eventsData.past.map((event) => (
                  <PastEventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  color: "rgba(255,255,255,0.5)",
                  margin: 0,
                  fontSize: "14px",
                }}
              >
                No past events
              </p>
            )}
          </div>
        </>
      )}

      {/* Profile popup */}
      <AnimatePresence>
        {showProfile && user && (
          <ProfilePopup
            key="profile-popup"
            user={user}
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
